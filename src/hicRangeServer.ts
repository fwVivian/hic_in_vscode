import * as crypto from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

export interface Disposable {
  dispose(): void | Promise<void>;
}

export interface UriLike {
  scheme: string;
  fsPath: string;
  toString(): string;
}

export interface HicFileRegistration extends Disposable {
  id: string;
  name: string;
  url: string;
}

interface StoredFile {
  path: string;
  name: string;
}

export interface RangeServerOptions {
  debugLogging?: boolean;
  logger?: (message: string) => void;
}

export interface ByteRange {
  start: number;
  end: number;
}

export function parseByteRange(header: string | undefined, size: number): ByteRange | null | undefined {
  if (!header) {
    return null;
  }

  if (!Number.isFinite(size) || size < 0) {
    return undefined;
  }

  if (size === 0) {
    return undefined;
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) {
    return undefined;
  }

  const startText = match[1];
  const endText = match[2];

  if (!startText && !endText) {
    return undefined;
  }

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return undefined;
    }

    const start = Math.max(0, size - suffixLength);
    return { start, end: size - 1 };
  }

  const start = Number(startText);
  if (!Number.isInteger(start) || start < 0 || start >= size) {
    return undefined;
  }

  let end = endText ? Number(endText) : size - 1;
  if (!Number.isInteger(end) || end < 0) {
    return undefined;
  }

  end = Math.min(end, size - 1);
  if (end < start) {
    return undefined;
  }

  return { start, end };
}

export class HicRangeServer implements Disposable {
  private readonly files = new Map<string, StoredFile>();
  private readonly token = crypto.randomBytes(24).toString('hex');
  private readonly debugLogging: boolean;
  private readonly logger: (message: string) => void;
  private server?: http.Server;
  private port?: number;
  private started?: Promise<void>;

  constructor(options: RangeServerOptions = {}) {
    this.debugLogging = options.debugLogging ?? false;
    this.logger = options.logger ?? ((message: string) => console.log(message));
  }

  async registerFile(uri: UriLike): Promise<HicFileRegistration> {
    if (uri.scheme !== 'file') {
      throw new Error('This viewer currently supports local file URIs only.');
    }

    await this.ensureStarted();

    const id = crypto.randomBytes(12).toString('hex');
    const name = path.basename(uri.fsPath);
    this.files.set(id, {
      path: uri.fsPath,
      name
    });

    if (this.debugLogging) {
      this.logger(`[hic] registered ${id} (${name})`);
    }

    return {
      id,
      name,
      url: this.buildUrl(id, name),
      dispose: () => this.unregisterFile(id)
    };
  }

  async dispose(): Promise<void> {
    this.files.clear();

    await new Promise<void>((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => resolve());
      this.server = undefined;
      this.port = undefined;
      this.started = undefined;
    });
  }

  private unregisterFile(id: string): void {
    this.files.delete(id);
    if (this.debugLogging) {
      this.logger(`[hic] unregistered ${id}`);
    }
  }

  private buildUrl(id: string, name: string): string {
    if (!this.port) {
      throw new Error('Local range server is not ready.');
    }

    return `http://127.0.0.1:${this.port}/files/${encodeURIComponent(id)}/${encodeURIComponent(name)}?token=${this.token}`;
  }

  private async ensureStarted(): Promise<void> {
    if (this.server) {
      return;
    }

    if (!this.started) {
      this.started = new Promise<void>((resolve, reject) => {
        const server = http.createServer((req, res) => {
          void this.handleRequest(req, res).catch((error) => {
            if (this.debugLogging) {
              this.logger(`[hic] range server error: ${String(error)}`);
            }

            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            }
            res.end('Internal server error');
          });
        });

        server.once('error', (error) => {
          this.started = undefined;
          reject(error);
        });

        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          if (typeof address === 'object' && address) {
            this.port = address.port;
            this.server = server;
            this.server.unref();
            if (this.debugLogging) {
              this.logger(`[hic] range server listening on 127.0.0.1:${this.port}`);
            }
            resolve();
            return;
          }

          reject(new Error('Unable to bind local range server.'));
        });
      });
    }

    await this.started;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    this.setCommonHeaders(res);

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
    if (url.searchParams.get('token') !== this.token) {
      this.sendText(res, 401, 'Unauthorized');
      return;
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      this.sendText(res, 405, 'Method not allowed');
      return;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2 || segments[0] !== 'files') {
      this.sendText(res, 404, 'Not found');
      return;
    }

    const id = segments[1];
    const entry = this.files.get(id);
    if (!entry) {
      this.sendText(res, 404, 'Not found');
      return;
    }

    const stat = await fs.promises.stat(entry.path).catch(() => undefined);
    if (!stat || !stat.isFile()) {
      this.sendText(res, 404, 'File not found');
      return;
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `inline; filename="${entry.name}"`);

    const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;
    const parsedRange = parseByteRange(rangeHeader, stat.size);

    if (rangeHeader && parsedRange === undefined) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${stat.size}`);
      res.end();
      return;
    }

    if (stat.size === 0) {
      res.statusCode = rangeHeader ? 416 : 200;
      res.setHeader('Content-Length', '0');
      if (rangeHeader) {
        res.setHeader('Content-Range', 'bytes */0');
      }
      res.end();
      return;
    }

    const range = parsedRange ?? { start: 0, end: stat.size - 1 };
    const contentLength = range.end - range.start + 1;
    res.statusCode = parsedRange ? 206 : 200;
    res.setHeader('Content-Length', String(contentLength));
    if (parsedRange) {
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`);
    }

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    if (this.debugLogging) {
      this.logger(`[hic] serve ${entry.name} ${range.start}-${range.end}`);
    }

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(entry.path, {
        start: range.start,
        end: range.end
      });

      stream.once('error', reject);
      res.once('finish', resolve);
      stream.pipe(res);
    });
  }

  private setCommonHeaders(res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  private sendText(res: http.ServerResponse, statusCode: number, message: string): void {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(message);
  }
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import test from 'node:test';
import { HicRangeServer, parseByteRange } from '../src/hicRangeServer';

test('parseByteRange handles common range forms', () => {
  assert.deepEqual(parseByteRange(undefined, 10), null);
  assert.deepEqual(parseByteRange('bytes=0-3', 10), { start: 0, end: 3 });
  assert.deepEqual(parseByteRange('bytes=4-', 10), { start: 4, end: 9 });
  assert.deepEqual(parseByteRange('bytes=-4', 10), { start: 6, end: 9 });
  assert.equal(parseByteRange('bytes=20-30', 10), undefined);
  assert.equal(parseByteRange('nonsense', 10), undefined);
});

test('HicRangeServer streams byte ranges', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hic-range-'));
  const filePath = path.join(tempDir, 'sample.hic');
  fs.writeFileSync(filePath, Buffer.from('0123456789abcdef'));

  const server = new HicRangeServer({ debugLogging: false, logger: () => undefined });
  const registration = await server.registerFile({
    scheme: 'file',
    fsPath: filePath,
    toString: () => `file://${filePath}`
  });

  const response = await requestBuffer(registration.url, 'bytes=4-7');
  assert.equal(response.statusCode, 206);
  assert.equal(response.body.toString('utf8'), '4567');
  assert.equal(response.headers['content-range'], 'bytes 4-7/16');
  assert.equal(response.headers['accept-ranges'], 'bytes');

  registration.dispose();
  await server.dispose();
});

function requestBuffer(url: string, range: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, {
      headers: {
        Range: range
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });

    req.on('error', reject);
  });
}


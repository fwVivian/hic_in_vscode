import * as vscode from 'vscode';
import { escapeHtml } from './util';
import { HicViewerBootstrap } from './hicTypes';

export function buildHicViewerHtml(webview: vscode.Webview, extensionUri: vscode.Uri, bootstrap: HicViewerBootstrap): string {
  const nonce = getNonce();
  const assets = {
    viewScriptUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'view.js')).toString(),
    viewStyleUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'view.css')).toString(),
    juiceboxModuleUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', 'juicebox.js', 'dist', 'juicebox.esm.js')).toString(),
    juiceboxCssUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', 'juicebox.js', 'dist', 'css', 'juicebox.css')).toString(),
    fontAwesomeCssUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', 'font-awesome', 'css', 'font-awesome.min.css')).toString(),
    codiconCssUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')).toString()
  };

  const payload: HicViewerBootstrap = {
    ...bootstrap,
    assets
  };

  const connectSrc = bootstrap.settings.enableExternalTracks
    ? `http://127.0.0.1:* https: http:`
    : `http://127.0.0.1:*`;

  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data: blob:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `script-src 'nonce-${nonce}' ${webview.cspSource}`,
    `connect-src ${connectSrc} ${webview.cspSource}`,
    `worker-src blob:`,
    `base-uri 'none'`,
    `form-action 'none'`,
    `frame-ancestors 'none'`
  ].join('; ');

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${assets.fontAwesomeCssUri}">
  <link rel="stylesheet" href="${assets.juiceboxCssUri}">
  <link rel="stylesheet" href="${assets.codiconCssUri}">
  <link rel="stylesheet" href="${assets.viewStyleUri}">
  <script nonce="${nonce}">
    window.__HIC_VIEW_BOOTSTRAP__ = ${safeJson(payload)};
  </script>
  <script nonce="${nonce}" type="module" src="${assets.viewScriptUri}"></script>
</head>
<body>
  <div class="app-shell">
    <header class="app-header">
      <div class="title-block">
        <div class="file-name" id="file-name"></div>
        <div class="file-state" id="file-state"></div>
      </div>
      <div class="header-actions">
        <button class="icon-button" id="go-reset" type="button" title="Reset view">
          <span class="codicon codicon-undo"></span>
        </button>
        <button class="icon-button" id="go-reload" type="button" title="Reload file">
          <span class="codicon codicon-refresh"></span>
        </button>
        <button class="icon-button" id="go-copy-locus" type="button" title="Copy locus">
          <span class="codicon codicon-copy"></span>
        </button>
        <button class="icon-button" id="go-copy-state" type="button" title="Copy viewer state">
          <span class="codicon codicon-json"></span>
        </button>
        <button class="icon-button" id="go-external" type="button" title="Open in external Juicebox Desktop">
          <span class="codicon codicon-link-external"></span>
        </button>
      </div>
    </header>

    <main class="app-main">
      <section class="viewer-pane">
        <div class="viewer-shell" id="viewer-shell">
          <div class="viewer" id="viewer"></div>
          <div class="loading-overlay" id="loading-overlay">
            <div class="loading-title" id="loading-title">Reading HIC metadata...</div>
            <div class="loading-detail" id="loading-detail"></div>
          </div>
        </div>
      </section>

      <aside class="metadata-pane" aria-label="Metadata">
        <div class="meta-group">
          <div class="meta-label">Genome</div>
          <div class="meta-value" id="genome-id">-</div>
        </div>
        <div class="meta-group">
          <div class="meta-label">Current locus</div>
          <div class="meta-value mono" id="current-locus">-</div>
        </div>
        <div class="meta-group">
          <div class="meta-label">Bin size</div>
          <div class="meta-value" id="bin-size">-</div>
        </div>
        <div class="meta-group">
          <div class="meta-label">Normalization</div>
          <div class="meta-value" id="normalization">-</div>
        </div>
        <div class="meta-group">
          <div class="meta-label">Chromosomes</div>
          <div class="meta-value scrollbox" id="chromosomes"></div>
        </div>
        <div class="meta-group">
          <div class="meta-label">Resolutions</div>
          <div class="meta-value scrollbox" id="resolutions"></div>
        </div>
        <div class="meta-group">
          <div class="meta-label">Available normalizations</div>
          <div class="meta-value scrollbox" id="normalizations"></div>
        </div>
      </aside>
    </main>

    <footer class="app-footer">
      <div class="status-text mono" id="status-text">Waiting for viewer.</div>
    </footer>
  </div>
</body>
</html>`;
}

export function buildErrorHtml(title: string, message: string, detail?: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      color-scheme: light dark;
      --bg: #1e1e1e;
      --fg: #d4d4d4;
      --muted: #9da0a6;
      --border: #3c3c3c;
      --accent: #d16969;
    }
    body {
      margin: 0;
      padding: 24px;
      font-family: var(--vscode-font-family, Segoe UI, sans-serif);
      background: var(--vscode-editor-background, var(--bg));
      color: var(--vscode-editor-foreground, var(--fg));
    }
    .panel {
      max-width: 860px;
      border: 1px solid var(--vscode-panel-border, var(--border));
      border-radius: 4px;
      padding: 20px;
      background: var(--vscode-editor-background, var(--bg));
    }
    h1 {
      margin: 0 0 12px;
      font-size: 18px;
      font-weight: 600;
    }
    p {
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .detail {
      white-space: pre-wrap;
      color: var(--vscode-descriptionForeground, var(--muted));
      font-family: var(--vscode-editor-font-family, Consolas, monospace);
      font-size: 12px;
    }
    .accent {
      color: var(--vscode-errorForeground, var(--accent));
    }
  </style>
</head>
<body>
  <div class="panel">
    <h1 class="accent">${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    ${detail ? `<div class="detail">${escapeHtml(detail)}</div>` : ''}
  </div>
</body>
</html>`;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function getNonce(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}

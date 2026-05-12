# HIC in VS Code

## 项目简介 / Project Overview

**中文**：HIC in VS Code 是一个本地优先的 VS Code 插件，用于在编辑器内直接打开和查看 `.hic` Hi-C contact map 文件。无需离开 VS Code，也不会上传本地 `.hic` 文件。

**English**: HIC in VS Code is a local-first VS Code extension for opening and inspecting `.hic` Hi-C contact maps directly inside the editor. Local `.hic` files stay on your machine and are not uploaded.

## 快速安装 / Quick Install

**中文**：发布页提供打包好的 `.vsix` 文件。下载后可以直接拖进 VS Code 窗口或扩展面板安装，然后打开本地 `.hic` 文件即可使用。

**English**: A packaged `.vsix` file is available on the release page. Download it, drag it into the VS Code window or Extensions view to install, then open a local `.hic` file to start using the viewer.

## Features

- Registers a readonly custom editor for `*.hic`.
- Streams local files through a token-protected `127.0.0.1` range server.
- Renders contact maps with bundled `juicebox.js` assets, with no CDN dependency.
- Shows file metadata, chromosomes, resolutions, normalizations, current locus, and status.
- Provides reload, copy current locus, copy viewer state, and optional Juicebox Desktop fallback commands.

## Quick Start

To install from a release, download the `.vsix` asset from the release page and drag it into VS Code.

For development:

1. Run `npm install`.
2. Run `npm run compile`.
3. Press `F5` in VS Code to launch an Extension Development Host.
4. Open a `.hic` file from the Explorer.

## Privacy

Local `.hic` files are not uploaded. The webview reads them through a temporary localhost URL scoped to the active viewer session and protected by a random token.

External HTTPS requests for tracks or lookups are blocked by default. Enable `hicInVscode.enableExternalTracks` only when you explicitly want that behavior.

## Settings

- `hicInVscode.defaultNormalization`
- `hicInVscode.defaultResolution`
- `hicInVscode.enableLocalRangeServer`
- `hicInVscode.enableExternalTracks`
- `hicInVscode.maxCacheSizeMb`
- `hicInVscode.externalJuiceboxJar`
- `hicInVscode.javaExecutable`
- `hicInVscode.debugLogging`

## Known Limitations

- The MVP targets `.hic` inspection, not editing or assembly correction.
- `.cool` and `.mcool` rendering are not implemented.
- Remote SSH behavior depends on whether the webview can reach the extension host's forwarded localhost route.
- The external Juicebox Desktop command requires `hicInVscode.externalJuiceboxJar` to be configured.
- Screenshot export and per-file state persistence are planned after the MVP.

## Development

```bash
npm install
npm run compile
npm test
```

The extension host code lives in `src/`. The webview shell lives in `media/`.

## Attribution

Powered by `juicebox.js`. See `THIRD_PARTY_NOTICES.md` for bundled dependency notices.

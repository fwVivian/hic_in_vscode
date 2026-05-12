# HIC in VS Code

Local-first VS Code extension for opening `.hic` Hi-C contact maps without leaving the editor.

## Features

- Registers a readonly custom editor for `*.hic`.
- Streams local files through a token-protected `127.0.0.1` range server.
- Renders contact maps with bundled `juicebox.js` assets, with no CDN dependency.
- Shows file metadata, chromosomes, resolutions, normalizations, current locus, and status.
- Provides reload, copy current locus, copy viewer state, and optional Juicebox Desktop fallback commands.

## Quick Start

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

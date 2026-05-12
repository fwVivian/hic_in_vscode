# Security

## Local File Access

The extension serves only files that are explicitly opened in a HIC custom editor. Each route uses an opaque file id and a random per-session token. Paths are never resolved from webview input.

The local range server binds to `127.0.0.1` and supports `GET`, `HEAD`, and `OPTIONS` only.

## External Network Access

Production webview assets are loaded locally. CDN scripts are not used.

External HTTPS requests are blocked by default in the webview Content Security Policy. Set `hicInVscode.enableExternalTracks` to `true` only when external tracks or lookups are intentionally needed.

## Reporting

Please report security issues privately to the repository maintainers. Include the extension version, operating system, VS Code environment, and reproduction steps.

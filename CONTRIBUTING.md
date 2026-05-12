# Contributing

## Development Setup

```bash
npm install
npm run compile
npm test
```

Use the VS Code extension development host (`F5`) for manual testing.

## Pull Requests

- Keep changes scoped to the feature or bug being addressed.
- Add or update tests for range-server behavior and extension-host logic when practical.
- Do not add CDN dependencies to the production webview.
- Do not introduce whole-file `.hic` reads for normal viewer operation.
- Update `THIRD_PARTY_NOTICES.md` when dependencies change.

## Manual Checks

Before a release candidate, test at least one small valid `.hic` file, one invalid `.hic` file, and one large local file.

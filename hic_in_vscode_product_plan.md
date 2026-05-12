# hic_in_vscode Product Plan

Last updated: 2026-05-12

## 1. Product Summary

`hic_in_vscode` is a VS Code extension that opens `.hic` files directly inside VS Code as an interactive Hi-C contact map viewer.

The product goal is not to replace Juicebox Desktop. The goal is to make lightweight inspection, navigation, and validation of `.hic` files available exactly where computational biologists already inspect scripts, logs, metadata, and generated outputs.

The recommended implementation is a VS Code custom readonly editor powered by a local webview, bundled `juicebox.js`, and secure range-based local file access.

## 2. Product Vision

Hi-C analysis often produces large `.hic` files, but inspecting them usually requires switching to external desktop or browser tools. That context switch interrupts debugging, workflow validation, and result review.

`hic_in_vscode` should make `.hic` files feel like first-class project artifacts in VS Code:

- Open a `.hic` file from the Explorer.
- See a contact map quickly.
- Jump to loci while reading scripts or logs.
- Confirm that pipeline outputs are valid.
- Avoid uploading local data.
- Keep advanced analysis in specialized tools when needed.

## 3. Target Users

### Primary Users

Computational biologists and bioinformaticians running Hi-C pipelines locally, on WSL, or through remote VS Code sessions.

Common needs:

- Check whether a generated `.hic` file is valid.
- Inspect genome-wide and chromosome-level contact maps.
- Debug Juicer, HiC-Pro, or conversion workflows.
- Compare file outputs during pipeline development.
- Avoid opening a separate Java GUI for every quick inspection.

### Secondary Users

Genome researchers and wet-lab collaborators who use VS Code as a project workspace but do not want to learn command-line visualization tools.

Common needs:

- Open a received `.hic` file.
- Navigate to a known locus.
- Capture a screenshot for discussion.
- Verify that a file corresponds to the expected genome/build.

### Non-Target Users

- Users who need full genome assembly correction workflows.
- Users who need every Juicebox Desktop feature.
- Users who only work with `.cool` or `.mcool` files.
- Users who expect cloud-hosted sharing and collaboration as the main workflow.

## 4. Jobs To Be Done

1. When I generate a `.hic` file, I want to open it immediately in VS Code so I can confirm that the output is readable.
2. When I inspect a pipeline result, I want to jump to a genomic region so I can verify expected interactions.
3. When I compare analysis runs, I want quick visual feedback so I can identify obvious issues before deeper analysis.
4. When I work on a remote server, I want visualization without copying large files to my laptop.
5. When I review a result with others, I want to capture the current view and region cleanly.

## 5. Core Value Proposition

`hic_in_vscode` provides fast, local, privacy-preserving `.hic` visualization inside VS Code.

The key product promise:

> Open `.hic` files from your project tree and inspect contact maps without leaving VS Code.

## 6. Competitive Landscape

### Existing Strong Tools

- Juicebox Desktop: full-featured Java desktop application for `.hic` visualization.
- Juicebox Web: browser-based `.hic` viewing and sharing.
- HiGlass: strong web-based visualization, especially for `.cool` and `.mcool`.
- H5Web and HDF5 viewers: useful for `.cool` and `.mcool` structure inspection, not `.hic` visualization.

### Product Gap

There is no known mature VS Code extension that directly opens `.hic` files as an interactive Hi-C contact map viewer.

Searches on VS Marketplace, Open VSX, GitHub, and web search produced unrelated false positives such as AI editing tools, color themes, and generic viewers. As of 2026-05-12, the opportunity appears open.

### Differentiation

`hic_in_vscode` should win by being:

- Native to VS Code workflows.
- Fast enough for inspection.
- Local-first and privacy-preserving.
- Lightweight compared with external desktop tools.
- Focused on `.hic` file review, not broad genome browser replacement.

## 7. Product Principles

1. Fast first visual feedback is more important than feature completeness.
2. Never upload user data by default.
3. Do not read whole `.hic` files into memory.
4. Reuse mature Hi-C visualization logic instead of rebuilding the contact map renderer from scratch.
5. Keep the extension honest about scope: quick inspection and navigation, not full Juicebox Desktop parity.
6. Work well in local, WSL, and Remote SSH VS Code environments.
7. Fail clearly when files are invalid, unsupported, or too large for a specific operation.

## 8. MVP Scope

### MVP Features

- Register a custom readonly editor for `*.hic`.
- Open `.hic` files from VS Code Explorer.
- Render an initial contact map using bundled `juicebox.js`.
- Support local `.hic` files through secure range-based access.
- Display basic metadata:
  - file name
  - genome/build if available
  - chromosome list
  - available resolutions
  - available normalizations
- Provide basic navigation:
  - chromosome selector
  - locus input
  - zoom in/out
  - reset view
- Provide basic visual controls:
  - normalization selector
  - resolution selector
  - color scale control
- Show explicit loading and error states.
- Provide "Open in External Juicebox Desktop" as an optional fallback command.

### MVP Non-Goals

- No editing `.hic` files.
- No assembly correction workflows.
- No `.cool` or `.mcool` rendering in the first release.
- No cloud upload or hosted sharing.
- No multi-file synchronized comparison.
- No full replacement for Juicebox Desktop menus and workflows.

## 9. Post-MVP Feature Roadmap

### Version 0.2: Usability Polish

- Persist last locus, normalization, resolution, and color scale per file.
- Add command palette actions:
  - `hic_in_vscode: Open HIC Viewer`
  - `hic_in_vscode: Copy Current Locus`
  - `hic_in_vscode: Copy Viewer State`
  - `hic_in_vscode: Reload HIC File`
- Add screenshot export.
- Add recent loci history.
- Improve error messages with suggested fixes.

### Version 0.3: Remote Workflow Support

- Harden WSL and Remote SSH behavior.
- Add automatic tunnel support for the local range server.
- Add remote file access diagnostics.
- Add large-file performance telemetry that is local-only and opt-in.

### Version 0.4: Scientific Workflow Features

- Add optional annotation tracks supported by `juicebox.js`.
- Add BED/2D annotation loading if practical.
- Add session export/import.
- Add side-by-side viewer tabs for manual comparison.

### Version 1.0: Stable Public Release

- Stable `.hic` viewing for local, WSL, and Remote SSH.
- Documented limitations.
- Automated tests for file serving and extension activation.
- Marketplace-ready README, screenshots, and license notices.
- Clear open-source contribution guidelines.

## 10. User Experience Design

### First Open Experience

When a user opens a `.hic` file:

1. VS Code opens a custom editor tab.
2. The tab title uses the file name.
3. The webview shows a loading state: `Reading HIC metadata...`
4. The first render defaults to a safe genome-wide or chromosome-level overview.
5. If metadata cannot be read, the user sees a clear failure message.

### Main Viewer Layout

Recommended layout:

- Top toolbar:
  - locus input
  - chromosome selector
  - resolution selector
  - normalization selector
  - color scale control
  - reset button
  - external open button
- Center:
  - interactive contact map
- Bottom or compact side status:
  - genome/build
  - current locus
  - bin size
  - normalization
  - loading status

### Empty and Error States

Required states:

- File not found.
- File is empty.
- File is not a valid `.hic`.
- Unsupported `.hic` version.
- Could not bind local range server.
- Remote URI could not be exposed to the webview.
- File access denied.
- Renderer failed to load.

Good error messages should include:

- What failed.
- Why it likely failed.
- What the user can try next.

Example:

> This file could not be opened as a HIC contact map. It may be corrupt, incomplete, or written with an unsupported `.hic` version. Try opening it in Juicebox Desktop or regenerating the file.

## 11. Performance Requirements

### MVP Performance Targets

- Extension activation: under 1 second.
- Metadata read for typical local file: under 3 seconds.
- First useful render for small or moderate files: under 5 seconds.
- First useful render for large local files: under 10 seconds.
- Pan/zoom after cache warmup: under 2 seconds.
- Memory usage: avoid loading whole files; target bounded cache behavior.

### Performance Strategy

- Use HTTP Range requests or equivalent random-access reads.
- Serve only byte ranges requested by the viewer.
- Cache metadata and recently accessed blocks.
- Do not preload high-resolution whole-genome matrices.
- Use progressive loading indicators.
- Defer optional tracks until the base map is visible.

### Performance Acceptance Criteria

The MVP is acceptable if:

- It opens a valid small `.hic` file reliably.
- It opens a large local `.hic` without full-file memory load.
- It remains responsive during pan and zoom.
- It does not block the VS Code extension host during large file reads.

## 12. Technical Product Requirements

### Recommended Architecture

- VS Code extension host written in TypeScript.
- `CustomReadonlyEditorProvider` for `*.hic`.
- Webview renderer bundled with local assets.
- `juicebox.js` as the primary contact map viewer.
- `hic-straw` or compatible `.hic` reader support where needed.
- Token-protected localhost range server for local file access.

### Local File Access Requirements

The range server must:

- Bind to `127.0.0.1` by default.
- Serve only explicitly opened files.
- Require a random per-session token.
- Support `Range` requests.
- Reject path traversal.
- Close file routes when editor tabs close.
- Avoid logging full file paths unless debug mode is enabled.

### VS Code Environment Requirements

The extension should support:

- Windows local VS Code.
- WSL VS Code.
- Linux local VS Code.
- macOS local VS Code.
- Remote SSH, if the extension host can safely expose the local file route.

## 13. Privacy and Security

Privacy promise:

> By default, `.hic` files are read locally and are not uploaded to any external service.

Security requirements:

- No CDN dependencies in the production extension.
- Strict webview Content Security Policy.
- No arbitrary file serving.
- Tokenized requests from webview to file server.
- No external network access unless the user explicitly opens a remote URL or track.
- Clear setting to disable external tracks.
- Document that local server URLs are temporary and scoped to active viewer sessions.

## 14. Settings

Recommended extension settings:

- `hicInVscode.defaultNormalization`
- `hicInVscode.defaultResolution`
- `hicInVscode.enableLocalRangeServer`
- `hicInVscode.enableExternalTracks`
- `hicInVscode.maxCacheSizeMb`
- `hicInVscode.externalJuiceboxJar`
- `hicInVscode.javaExecutable`
- `hicInVscode.debugLogging`

## 15. Success Metrics

### Product Metrics

- Successful `.hic` open rate.
- Median time to first render.
- Error rate by environment: local, WSL, Remote SSH.
- Reopen rate within the same project.
- Number of users using locus navigation.
- Number of users using external Juicebox fallback.

### Quality Metrics

- Crash-free sessions.
- Range server failures.
- Renderer initialization failures.
- Memory-related failures.
- Issue resolution time.

### Community Metrics

- GitHub stars.
- Marketplace installs.
- Open VSX installs.
- Issue volume and issue quality.
- External contributions.

## 16. Product Risks

### Risk: Large Files Feel Slow

Mitigation:

- Use range requests.
- Show progressive loading.
- Cache metadata and blocks.
- Default to safe overview resolution.

### Risk: Remote SSH Support Is Inconsistent

Mitigation:

- Treat remote support as a deliberate milestone.
- Add diagnostics.
- Document limitations.
- Use VS Code URI forwarding APIs where possible.

### Risk: Users Expect Full Juicebox Desktop

Mitigation:

- Position the extension as quick inspection inside VS Code.
- Add external Juicebox command.
- Document non-goals clearly.

### Risk: Licensing or Attribution Mistakes

Mitigation:

- Keep third-party notices from the first commit.
- Use MIT-compatible dependencies where possible.
- Avoid bundling Juicebox Desktop jars until dependency audit is complete.

### Risk: Webview Security Mistakes

Mitigation:

- No remote scripts.
- Strict CSP.
- Tokenized localhost routes.
- No arbitrary file system bridge.

## 17. Licensing and Open Source Plan

Recommended project license: MIT.

Third-party dependency plan:

- `juicebox.js`: MIT license.
- `hic-straw`: MIT license.
- Juicebox Desktop source: MIT license, but avoid bundling desktop jars in MVP.

Required repository files:

- `LICENSE`
- `README.md`
- `THIRD_PARTY_NOTICES.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`

Branding guidance:

- Do not call the extension "Juicebox for VS Code" as the primary name.
- Do not imply official endorsement from Aiden Lab, IGV, or Juicebox maintainers.
- Safe wording: "HIC contact map viewer for VS Code, powered by juicebox.js."

## 18. Marketplace Release Requirements

### VS Code Marketplace

Required:

- Microsoft publisher account.
- `vsce` packaging.
- Valid `publisher`, `name`, `displayName`, `description`, `license`, `repository`, and `icon`.
- README with screenshots.
- HTTPS image links if remote images are used.
- No unexpected network behavior.
- Clear privacy statement.

### Open VSX

Required:

- Open VSX publisher namespace.
- License metadata.
- `ovsx` publishing setup.
- Same package quality as VS Marketplace.

## 19. Documentation Plan

### README Sections

- What the extension does.
- Supported file types.
- Quick start.
- Screenshots.
- Local privacy statement.
- Known limitations.
- Performance notes.
- External Juicebox fallback.
- Troubleshooting.
- License and attribution.

### User Documentation

- How to open `.hic` files.
- How to jump to a locus.
- How to change normalization.
- How to change resolution.
- How to use with WSL.
- How to use with Remote SSH.
- What to do when a file does not open.

### Developer Documentation

- Architecture overview.
- Webview build process.
- Range server design.
- Testing strategy.
- Release process.
- Dependency/license update process.

## 20. MVP Release Checklist

- `.hic` custom editor registered.
- Local `.hic` file opens from VS Code Explorer.
- Viewer renders a valid contact map.
- Range server supports byte-range requests.
- Local server is token-protected.
- No full-file memory loading.
- Error states are readable.
- Production build has no CDN dependency.
- Third-party notices are included.
- README includes limitations.
- Extension packages with `vsce`.
- Manual tests pass on Windows and WSL.

## 21. Recommended Milestones

### Milestone 1: Technical Spike

Duration: 3-5 days.

Outcome:

- Prove that `juicebox.js` can render inside a VS Code webview.
- Prove that a local `.hic` file can be accessed through a range-capable bridge.

### Milestone 2: MVP Viewer

Duration: 1-2 weeks.

Outcome:

- Open `.hic` files from Explorer.
- Render contact maps.
- Navigate by locus.
- Handle core errors.

### Milestone 3: Product-Ready Beta

Duration: 1-2 weeks.

Outcome:

- Polish UX.
- Add settings.
- Add external Juicebox fallback.
- Add documentation.
- Test local and WSL workflows.

### Milestone 4: Public Release

Duration: 1 week.

Outcome:

- Publish to GitHub.
- Publish VSIX release.
- Publish to VS Code Marketplace and optionally Open VSX.

## 22. Final Product Positioning

`hic_in_vscode` should be positioned as a practical developer-scientist tool:

> A local-first VS Code extension for opening and inspecting `.hic` Hi-C contact maps without leaving your workspace.

The best first version is narrow, fast, and reliable. It should make `.hic` inspection convenient enough to become part of daily Hi-C pipeline development, while leaving advanced visualization and assembly workflows to Juicebox Desktop and other specialized tools.

<div align="center">
  <img src="public/icons/icon128.png" width="96" height="96" alt="FavGrove icon">

  # FavGrove - 本地书签管理器

  **A local-first bookmark workspace for Chrome and Edge.**

  面向大型书签库的本地优先管理、扫描、整理与备份工具。

  [![Release](https://img.shields.io/github/v/release/everett7623/FavGrove?include_prereleases&label=beta)](https://github.com/everett7623/FavGrove/releases)
  [![Manifest](https://img.shields.io/badge/Manifest-V3-4285F4)](manifest.json)
  [![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](tsconfig.json)
  [![Tests](https://img.shields.io/badge/tests-137%20Vitest%20%2B%2012%20E2E-success)](#quality)
  [![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)
</div>

> [!IMPORTANT]
> `v0.3.0` is the FavGrove multi-provider AI beta candidate. It is not yet a Chrome Web Store or Edge Add-ons stable release. The published `v0.1.0` release remains available under the former Markora name.

## Why FavGrove

Browser bookmark managers become difficult to use once a collection grows into the thousands. FavGrove opens as a full-screen extension workspace and keeps bookmark processing on the user's device.

- Handles large bookmark collections with a virtualized manager list.
- Detects exact duplicate URLs, duplicate folders, empty folders, and link issues.
- Separates confirmed broken links from links blocked by networks, proxies, Cloudflare, or browser-protected stores.
- Creates local backups before destructive operations.
- Does not include analytics, telemetry, cloud sync, a developer-operated AI proxy, or automatic bookmark uploads.

## Current Features

| Area | Available in `v0.3.0 Beta` |
|---|---|
| Dashboard | Bookmark and folder statistics, quick actions, local recommendations, search history, recent activity |
| Search | Title, URL, folder-path, full-pinyin, and pinyin-initial search with 300 ms debounce and `Ctrl/Cmd+K` |
| Scanner | Duplicate bookmarks, duplicate folders, individual and batch empty-folder cleanup, broken-link review |
| Link review | HTTP error classification, network/proxy distinction, pagination, edit/open/delete actions |
| Manager | Folder filtering, collapsible tree, virtualized list, rename, move, reorder, tags, batch edit, batch delete, undo |
| Import | HTML, JSON, CSV, TXT, and OPML with preview, conflict handling, and backup |
| Export | HTML, JSON, CSV, TXT, and OPML |
| Settings | Theme, language, scanner, cache, automatic scan, backup retention, and non-destructive missing-bookmark recovery |
| Updates | Browser-managed Chrome/Edge store updates with an in-app reload notice when a new version is ready |
| AI analysis | Disabled by default; OpenAI, Claude, Gemini, Grok, and third-party OpenAI-compatible analysis with provider-aware request previews, URL redaction, cancellation, and read-only structured results |
| Privacy | Local storage by default; no analytics, telemetry, shared AI key, developer-controlled bookmark server, or AI proxy |

The remaining roadmap is tracked in [SESSION.md](SESSION.md) and [docs/roadmap/post-beta-ai.md](docs/roadmap/post-beta-ai.md). Known gaps include final visible browser click-through checks, live-provider compatibility testing with user-owned credentials, store portal submission, and later automatic recommendation work. Full destructive replacement restore is documented as deferred.

## Link Scanner

FavGrove uses a Web Worker for scheduling, URL deduplication, concurrency, and progress calculation. HTTPS requests are sent through the Manifest V3 background service worker using optional host permission.

- Failed `HEAD` checks are verified with `GET`.
- Authentication, rate limiting, Cloudflare challenges, and network failures are not automatically treated as broken links.
- Plain HTTP and browser-store links are marked for manual verification to avoid browser security and CORS errors.
- The scanner uses the browser or system proxy configuration; FavGrove does not operate a remote scanning proxy.

## Installation

### Beta Release

1. After the beta is published, download `favgrove-v0.3.0.zip` from [GitHub Releases](https://github.com/everett7623/FavGrove/releases).
2. Extract the ZIP to a permanent local folder.
3. Open `chrome://extensions` or `edge://extensions`.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted folder.

### Build From Source

```bash
git clone https://github.com/everett7623/FavGrove.git
cd FavGrove
npm install
npm run build:extension
```

In Chrome or Edge, select **Load unpacked** and choose the generated `dist/chrome-mv3/` directory:

```text
D:\EvenFrank\Workspace\Plugins\Google\FavGrove\dist\chrome-mv3
```

The release ZIP sits beside it as `dist/favgrove-v<version>-chrome.zip`. Do **not** choose the project root (`FavGrove/`), `dist/` itself, or `.crx-dev/`. Only `dist/chrome-mv3/` is the validated unpacked extension.

## Development

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run validate:extension
npm run package:release
```

The release package is generated at:

```text
dist/favgrove-v0.3.0-chrome.zip
```

## Quality

The `v0.3.0` beta candidate currently passes:

- ESLint with zero errors and zero warnings.
- TypeScript strict type checking.
- 125 Vitest unit, component, and release-tool tests.
- 12 Playwright end-to-end flows.
- Production extension validation.
- Permission audit for the release manifest and privacy copy.
- Positive isolated Chrome and Edge `dist/` load checks through the supported DevTools extension API, including protected-root handling, the MV3 service worker, primary routes, disabled AI state, and zero pre-confirmation external requests.
- A Chrome-only installed-extension data-safety gate covering real bookmark CRUD, bookmark and empty-folder Undo with Chrome-generated IDs, tag migration, and nested import consistency.
- Release ZIP packaging.

The Windows [quality workflow](.github/workflows/quality.yml) runs these gates on pushes, pull requests, and manual dispatches. The previous remote run exposed a newly published transitive dependency advisory; the local fix now passes the dependency gate, and the updated workflow will rerun after these changes are reviewed and pushed.

## Architecture

```text
src/
├── background/       Manifest V3 service worker and message routing
├── workers/          Scanner, link scheduling, import/export, and AI preprocessing
├── services/         Chrome API, storage, scan, import/export, backup, and AI provider boundaries
├── stores/           Zustand application state
├── shared/           Shared components, hooks, types, utilities, and i18n
├── features/         Dashboard, scanner, manager, import/export, and settings
└── router/           HashRouter route definitions
```

Core stack: React 19, TypeScript 5, Vite 5, CRXJS, Manifest V3, Zustand, React Router 8, Tailwind CSS, react-i18next, Vitest, and Playwright.

## Browser Support

| Browser | Status |
|---|---|
| Google Chrome 120+ | Supported |
| Microsoft Edge 120+ | Supported |
| Firefox | Not currently supported |

## Privacy

FavGrove does not collect personal data or operate a bookmark/AI proxy service. Settings, tags, history, scan caches, and backups remain in browser extension storage. Optional AI analysis is disabled by default and sends only previewed, minimized metadata to the user-selected endpoint after confirmation. See [PRIVACY.md](PRIVACY.md) for permission and network details.

## Documentation

- [Development guide and architecture](CLAUDE.md)
- [Privacy policy](PRIVACY.md)
- [Current session and open work](SESSION.md)
- [Post-beta AI roadmap](docs/roadmap/post-beta-ai.md)
- [Release checklist](RELEASE_CHECKLIST.md)
- [Browser click-through checklist](docs/release/browser-clickthrough.md)
- [Restore strategy decision](docs/decisions/restore-strategy.md)
- [AI provider and data boundary](docs/decisions/ai-provider-boundary.md)
- [Store submission fields](store/submission-fields.md)
- [Provider compatibility diagnostics](docs/diagnostics/template-ai-provider-compatibility.md)
- [Dependency audit policy](docs/security/dependency-audit.md)
- [Release checklist and versioning](RELEASE_CHECKLIST.md)
- [Changelog](CHANGELOG.md)

## License

[GNU GPL v3 or later](LICENSE) © 2026 everettlabs.

## Links

- Repository: [github.com/everett7623/FavGrove](https://github.com/everett7623/FavGrove)
- Author: **everettlabs** ([GitHub](https://github.com/everett7623), [Email](mailto:everett7623@gmail.com))
- Website: [seedloc.com](https://seedloc.com)

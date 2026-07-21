# Changelog

All notable changes to FavGrove, formerly Markora, are documented in this file.

## [0.2.0] - Unreleased

### Added

- Added a Windows GitHub Actions workflow that runs the release quality gates, real Chrome/Edge extension loading, E2E tests, and release packaging on pushes and pull requests.
- Added an automatically generated SHA-256 checksum file for each packaged release ZIP.
- Added an isolated visible Chrome/Edge runner for the final production-extension click-through checklist.
- Added an AST-based localization regression test that rejects static English copy in production React markup.
- Added release gates that reject invalid or mismatched versions across package metadata, source Manifest, and production `dist/`.
- Made release ZIP generation deterministic by sorting entries and normalizing ZIP timestamps, with a Windows reproducibility test.
- Added post-package verification that requires every ZIP entry to match production `dist/` by path, order, length, timestamp, and SHA-256.
- Added a production dependency security audit gate and documented the remaining Vite 5 development-tool advisories.
- Added optional, read-only AI bookmark-library analysis with user-provided Chat Completions endpoints, explicit request preview, privacy modes, cancellation, and structured evidence validation.
- Improved OpenAI-compatible provider handling with base-URL completion, exact resolved endpoint previews, text-part response support, per-finding evidence filtering, and actionable contract errors.
- Added a localized in-app notice when Chrome or Edge has downloaded a newer store version, with an explicit action to reload FavGrove and apply it.

### Changed

- Updated CRXJS to `2.7.1`, Vitest to `3.2.7`, and vulnerable transitive development dependencies while retaining the approved Vite 5 stack.
- Browser release verification now installs `dist/` through the supported DevTools extension API in isolated Chrome and Edge profiles, then requires the real MV3 service worker, primary routes, disabled AI state, and zero pre-confirmation external requests.
- Export now serializes only the selected format in a Web Worker, with immediate busy feedback instead of generating all five formats on the options-page main thread.
- Replaced destructive backup restore with additive missing-bookmark recovery, parent-ID/path mapping, safety backups, and rollback of failed restore writes.
- Update notices now appear without reopening FavGrove when Chrome or Edge downloads an update while the page is open, and stale update records are cleared locally.
- Localized the route-loading fallback and beta status badge in English and Chinese.
- Renamed the product from `Markora - Bookmark Atlas` to `FavGrove - Bookmark Manager`.
- Updated English and Chinese product copy, release metadata, promotional assets, and package naming for the FavGrove brand.
- Preserved browser storage contracts, import schemas, and the existing automatic-scan alarm identifier for upgrade compatibility.

## [0.1.0] - 2026-06-07

First public beta, released under the Markora name.

### Added

- Full-screen Manifest V3 options application for Chrome and Edge.
- Dashboard statistics, bookmark search history, and recent activity.
- Worker-based duplicate bookmark, duplicate folder, empty-folder, and link scanning.
- Dedicated link-issue workflow with classification, pagination, manual verification, URL editing, and backup-protected deletion.
- Virtualized bookmark manager with rename, move, reorder, tags, batch delete, and undo.
- Duplicate bookmark cleanup and duplicate-folder merge with backup and refreshed scan cache.
- Netscape HTML import with preview, conflict handling, hierarchy recreation, and backup.
- HTML, JSON, CSV, TXT, and OPML export.
- Theme, language, scanner, cache, and backup settings.
- Local backup listing, restore, and deletion.
- English and Chinese interface resources.
- Privacy policy, release validation, E2E automation, and versioned ZIP packaging.

### Security And Reliability

- No analytics, telemetry, cloud sync, or bookmark upload.
- Optional host permission is requested only for link checking.
- HTTPS checks run through the background service worker.
- Plain HTTP and browser-store URLs are reserved for manual verification.
- Cloudflare challenges, authentication failures, rate limiting, proxy failures, and timeouts are not treated as confirmed broken links.

### Known Limitations

- This release is a beta and is not a browser-store stable release.
- Chinese and English localization coverage is not yet complete.
- Import currently supports HTML only.
- Empty-folder cleanup, persisted backup retention behavior, pinyin search, and several dashboard/manager refinements remain on the roadmap.

# Current Session

Date: 2026-10-17

## Latest Review — 2026-10-17

- Fetched `origin`; local `main` and `origin/main` both pointed to `9e39f5a4`, with a clean working tree before this phase.
- Reviewed scanner orchestration, local storage, backup retention, and settings persistence.
- Fixed settings state drift when retention cleanup fails after settings have already been saved. Persisted settings now become visible before cleanup starts, while cleanup failures still surface as errors.
- Fixed pending retention cleanup overwriting a later settings edit; added regression coverage for both failure and delayed-cleanup paths.
- Passed dependency audit (zero production vulnerabilities), lint, typecheck, all 36 Vitest files / 147 tests, and `build:extension` including extension validation and permission audit.
- `npm run test:e2e` passed all 12 browser flows. Installed Chrome/Edge checks and release packaging were not rerun for this settings-only patch.
- No version change, commit, push, or publication was performed. Existing visible-browser and authenticated AI-provider release checks remain open.

## Working On

AI Bookmark Analysis And Release Readiness

## Current Goal

Complete and verify the `0.3.0` multi-provider AI analysis milestone while preserving the local-first consent boundary and existing release gates.

## Current Status

- P0 Foundation is complete and verified.
- Dashboard statistics are implemented.
- Search history is persisted locally and capped to the latest 10 terms.
- Recent Activity stores bookmark-action translation keys and values, so current-session entries rerender when the language changes while legacy message records remain readable.
- Scanner worker currently handles:
  - Duplicate bookmark detection by exact URL.
  - Duplicate folder detection by parent/title grouping.
  - Empty folder detection.
  - Progress updates for the existing scan phases.
  - 24-hour scan cache via `scanService`.
- Broken Link Checker is connected through `scanService` and `linkChecker.worker.ts`.
- Link-check scheduling remains in the Web Worker, while privileged HTTPS requests are bridged through the background service worker to avoid options-page CORS errors.
- Plain HTTP links are not fetched automatically and are classified for manual verification to avoid insecure-origin response-header errors.
- Chrome Web Store and Edge Add-ons links are skipped before fetch and classified for manual verification because browser-protected store pages reject automated extension requests.
- Broken link scanning uses:
  - Optional host permission request.
  - Timeout handling.
  - Retry handling.
  - HEAD request with GET fallback.
  - Concurrency control capped at 12.
  - Progress updates from the link-checking stage.
  - GET verification for every failed HEAD request.
  - Protected, rate-limited, and Cloudflare/WAF challenge responses are not counted as confirmed broken links.
- Scanner UI now displays invalid link results.
- Manager currently supports:
  - Folder filtering.
  - Virtualized bookmark rendering.
  - Batch delete with backup creation.
  - Bookmark rename.
  - Folder rename.
  - Bookmark move.
  - Folder move.
  - Drag/drop move to folder.
  - Drag/drop bookmark ordering before a target row.
  - Undo delete.
  - Local tags.
  - Tag filtering.
  - Duplicate folder merge from Scanner results.
  - Backup-before-merge.
- Scanner duplicate-bookmark results can keep the oldest item and remove the remaining copies through the existing backup and undo flow.
- Scanner repair actions rerun structural detection and update the persisted scan cache, so resolved duplicate folders and bookmarks do not return after refresh.
- Link scanning deduplicates exact URLs, preserves per-bookmark results, interleaves hostnames, and limits each hostname to two concurrent requests.
- Default global link-check concurrency is eight for new settings, while cached scan loading now honors the persisted cache duration.
- Link scan results now separate confirmed broken links from links that could not be verified because of timeout, server, network, proxy, DNS, TLS, or regional access conditions.
- `/scanner/links` provides filtering, 50-row pagination, manual open-and-check, and backup-protected batch deletion.
- Link issue rows provide separate open, edit URL, and confirmed delete actions.
- The product brand is `FavGrove - Bookmark Manager` / `FavGrove 书签管理器` for the `0.3.0` multi-provider AI beta candidate; the published `0.1.0` Markora release remains historical.
- Import/Export currently supports:
  - JSON, CSV, TXT, OPML, and HTML export.
  - Worker-based Netscape HTML import parsing.
  - Import preview.
  - URL conflict detection.
  - Conflict resolver for skipping existing URLs or importing all.
  - Backup-before-import.
  - Nested folder recreation from Netscape bookmark paths.
  - Requested-format-only export serialization in a dedicated Web Worker.
  - Localized export busy feedback and reliable import parsing-state cleanup.
- Settings persistence is implemented for:
  - Theme.
  - Language.
  - Scanner timeout, concurrency, and retry count.
  - Scan cache duration.
  - Backup retention.
- Settings backup management supports listing backups, restoring a backup, and deleting backups.
- Restore keeps the current collection intact and adds only bookmark occurrences missing from the selected backup snapshot, after creating a safety backup.
- App now applies persisted theme and language on startup.
- Playwright E2E smoke tests pass for route navigation, import/settings visibility, and manager controls.
- Expanded E2E covers scanner execution, HTML import preview/conflict handling, and manager rename/tag/move/delete/undo flows.
- HTML import parsing is Worker-safe and no longer depends on `DOMParser`.
- `npm run test:e2e` uses `scripts/run-e2e.mjs` to start and stop Vite cleanly on Windows.
- `PRIVACY.md` documents local data handling, permissions, and the absence of analytics, telemetry, and remote bookmark uploads.
- `RELEASE_CHECKLIST.md` records the quality, manifest, privacy, manual, store, and artifact release gates.
- `npm run package:release` validates the built manifest and creates a versioned extension ZIP.
- Release packaging produced `release/markora-v0.1.0.zip`, and its contents were inspected successfully.
- Fixed an extension reload failure caused by the E2E Vite server writing CRXJS development output into `dist/`.
- Vite serve output now uses `.crx-dev`, while production builds exclusively use `dist/`.
- `npm run validate:extension` rejects development URLs, broad resource exposure, and missing background service workers.
- Multi-format import requirements are now recorded for JSON, CSV, TXT, and OPML.
- Localization audit found 15 English locale keys missing from Chinese and additional hardcoded user-facing English strings.
- `VERSIONING.md` defines `0.3.0` as the FavGrove multi-provider AI beta candidate, preserves `0.1.0` as the historical Markora beta, and reserves `1.0.0` for the first stable store release.
- Locale key parity was improved for `en` and `zh_CN`, and multiple Manager/Scanner/Settings hardcoded UI strings were switched to i18n keys.
- `bookmarkStore` activity log messages and URL validation error text were migrated to i18n keys.
- Service-layer fallback error messages in storage/import/bookmark/scan/link-request services were migrated to i18n keys.
- Related unit tests were updated to assert i18n-derived messages instead of hardcoded English strings.
- Import/Export page fallback `defaultValue` strings were removed in favor of direct locale keys, and Settings language option labels were localized.
- `AGENTS.md` was rewritten as the primary Codex handoff guide with project snapshot, architecture rules, workflow, verification, release rules, data safety, and performance expectations.
- `CLAUDE.md` is the single source of truth for source layout, layer responsibilities, verification gates, coding standards, and the review checklist.
- Shared `ConfirmDialog` and `PromptDialog` components were added on top of the existing `Dialog` primitive.
- Dashboard statistic cards now use skeleton placeholders while bookmark data is loading.
- Manager uses `useContainerHeight` for the virtualized list viewport instead of a fixed `620px` height.
- Manager loading now renders skeleton rows matching the virtual row layout.
- Manager bookmark rename, folder rename, tag editing, bulk delete confirmation, and bulk move confirmation now use custom dialogs instead of native browser prompts.
- Link issue URL editing, single deletion, and selected batch deletion now use custom dialogs instead of native browser prompts/confirms.
- Settings backup restore now requires a custom confirmation dialog before calling `restoreBackup`.
- Scanner now has backup-protected batch actions for deleting all detected empty folders and cleaning all duplicate bookmark groups by keeping the oldest entry.
- Scanner repair actions for the new batch buttons reuse `runRepair`, refresh structure results, and save the updated scan cache.
- Playwright E2E was updated to interact with in-app dialogs instead of browser-native dialogs.
- Manager now supports select-all for visible bookmarks, session-only sort options, keyboard shortcuts for select/delete/clear, a shortcut tooltip, and tag counts in the tag filter.
- `sortBookmarks` was added as a shared pure utility with unit coverage for title/date/URL sorting and undefined field handling.
- `scanStore` now tracks the last scan timestamp, and `scanService.getCache` exposes scan-cache metadata for UI use.
- Dashboard now shows a localized "Last scanned" link backed by scan-cache metadata.
- E2E smoke coverage now checks Dashboard last-scan visibility and Manager select-all/sort/shortcut controls.
- Legacy planning files were removed from the workspace; active handoff now lives in `CLAUDE.md`, `AGENTS.md`, `SESSION.md`, `PROGRESS.md`, and `TASKS.md`.
- Automatic daily scan is implemented with persisted `autoScan` settings, Manifest V3 `alarms` permission, background alarm registration, a Settings toggle, and a shared structural-scan utility reused by the scanner worker and background alarm.
- Auto-scan saves duplicate bookmark, duplicate folder, and empty-folder scan results to the existing scan cache. Broken-link checks remain manual.
- `PRIVACY.md` documents the new `alarms` permission.
- Backup creation now honors the persisted backup retention setting, and lowering retention trims excess backups safely.
- JSON, CSV, TXT, OPML, and HTML imports now share the existing preview, conflict resolver, and backup-before-import flow through a Worker parser.
- English and Chinese locale key parity is enforced by a unit test; English route smoke coverage remains green.
- A TypeScript AST regression test prevents static English JSX text and user-facing string attributes from being added to production React markup.
- Manager now supports batch tag add/remove for selected bookmarks and expand/collapse controls for nested folders.
- Dashboard now includes quick actions, local scan-result recommendations, and pinyin/full-initial search support through the shared bookmark search utility.
- Chinese primary route smoke coverage was added to Playwright and passes after switching the app language in Settings.
- Scanner now supports deleting one detected empty folder with confirmation, backup creation, structure refresh, and scan-cache refresh.
- 10,000-bookmark structural scan and pinyin search benchmarks are covered by `npm run benchmark:performance`.
- Store listing copy, promotional SVG sources, and 1280x800 page screenshots now live under `store/`.
- `npm run check:browsers` installs `dist/` through the supported DevTools extension API in isolated official Chrome and Edge profiles, then verifies the enabled extension metadata, MV3 service worker, six primary routes, disabled AI state, zero pre-confirmation external requests, and zero page errors.
- `npm run check:browsers:visible -- chrome|edge` launches one official browser at a time with an isolated temporary profile for the final click-through pass, then removes that profile when the browser closes.
- A Windows GitHub Actions workflow runs lint, type checking, unit/performance tests, production extension validation, installed Chrome/Edge verification, E2E tests, and release packaging on pushes, pull requests, and manual dispatches. The remote `0.3.0` quality run passed on 2026-08-04.
- Dependency auditing now runs through the official npm registry in local checks and Windows CI; production must be clean, and only the documented Vite 5/esbuild development advisory IDs are allowed pending a Vite-major decision.
- Shared Vite development and preview configuration now binds to `127.0.0.1` and restricts Host/CORS origins as defense in depth for the remaining Vite 5 advisories.
- Release packaging writes a versioned SHA-256 file beside the ZIP and verifies both artifacts against the synchronized release version.
- Release ZIP generation is deterministic across identical production content by sorting entry paths and normalizing ZIP timestamps; a Windows regression test covers differing source order and file times.
- Packaging now reopens the ZIP and verifies every entry against `dist/` before generating the checksum; invalid or stale archives are deleted.
- Build validation and release packaging now reject invalid or mismatched versions across package metadata, source Manifest, and the built Manifest, preventing stale `dist/` archives.
- Manifest required permissions are now limited to `alarms`, `bookmarks`, and `storage`; the unused `tabs` permission was removed after a source audit found no `chrome.tabs` usage.
- `npm run audit:permissions` verifies the manifest permission boundary and `PRIVACY.md` permission copy.
- Visible browser click-through steps and an isolated visible runner are prepared in `docs/release/browser-clickthrough.md`; the final human-visible Chrome and Edge results still need to be recorded before store submission.
- Full destructive replacement restore is deferred by `docs/decisions/restore-strategy.md`; the current recovery flow is additive, backup-protected, path-mapped, and service-boundary scoped.
- The previous `0.2.1` GitHub pre-release metadata remains in `docs/release/github-prerelease-v0.2.1.md`; store submission fields and post-beta AI guardrails remain in `store/submission-fields.md` and `docs/roadmap/post-beta-ai.md`.
- Link checking now treats ambiguous 4xx responses, including 404, authentication, proxy, and rate-limit responses, as requiring manual verification; only HTTP 410 is automatically classified as confirmed broken.
- Legacy cached 404 results are reclassified under the conservative policy, and link issue rows can be dismissed with "Works for me" / "确认可打开" without changing the bookmark.
- Manually dismissed link URLs are now persisted locally and filtered from future scans and cached results.
- Settings now manages ignored link-check URLs with local search, per-URL re-enable, and confirmation-protected clear-all actions.
- Link issue rows now support an in-place single-link recheck using the current scanner settings; successful checks remove the issue, while failures refresh its status and classification without adding an ignore rule.
- AI analysis remains optional, disabled by default, and read-only, with adapters for OpenAI, Claude, Gemini, Grok, and generic third-party OpenAI-compatible endpoints.
- AI supports whole-library or folder scope, domain-only or redacted metadata modes, provider-aware request preview, transient API keys/results, separate endpoint permission, timeout, cancellation, provider error handling, and strict structured result validation.
- Official provider endpoints are fixed, third-party compatible endpoints accept an origin, `/v1` base URL, or full Chat Completions URL, and legacy settings migrate without losing endpoint/model/privacy values.
- Local AI preprocessing runs in a Worker, strips URL queries/fragments, caps samples at 200, and covers full-scope aggregates for at least 10,000 bookmarks.
- AI evidence validation accepts sampled item hostnames as well as aggregate domains and item references, while endpoint-permission API failures now return an actionable error instead of leaving analysis in the running state.
- Store-installed updates now use the Chrome/Edge-managed `runtime.onUpdateAvailable` lifecycle. FavGrove persists only the pending version and detection time, shows a localized global notice, and reloads only after the user chooses to apply the downloaded update. No remote version polling or new permission was added.
- The update notice now appears immediately if Chrome or Edge downloads an update while FavGrove is already open, and stale non-newer update records are cleared locally.
- The route-loading fallback and beta status badge now use the shared English and Chinese locale resources.
- React `19.2.7`, React DOM `19.2.7`, and React Router `8.3.0` replace the prior React 18 / Router v6-v7 stack after newly published security advisories. Declarative `HashRouter` routing remains unchanged, imports use the supported `react-router` v8 package, and production dependencies again have zero reported vulnerabilities.
- Chrome/Edge synthetic bookmark roots are normalized out of the application tree; permanent browser roots remain visible and usable as destinations but are read-only, while managed nodes and descendants are excluded from mutation and cleanup candidates.
- Multi-step delete, move, merge, import, and Undo flows reconcile the live Chrome tree after success or partial failure instead of trusting a hand-built local mirror.
- Undo now restores both bookmarks and empty folders with browser-generated IDs, migrates local tags to restored bookmark IDs, and supports an immediate second mutation without reloading.
- Import uses an explicit writable target, rolls back created nodes on failure, and displays the live Chrome hierarchy immediately without requiring a reload.
- A Chrome-only installed-extension data-safety gate verifies real CRUD, bookmark/empty-folder Undo, tag-ID migration, and nested import consistency; Chrome and Edge smoke checks also verify synthetic roots are hidden and permanent roots are read-only.
- `brace-expansion` is locked to safe `1.1.18` and `5.0.9` releases after the first remote quality run exposed a newly published high-severity development advisory.
- Newly published `js-yaml` and `nanoid` denial-of-service advisories are fixed by locking the existing ESLint and PostCSS dependency chains to `js-yaml` `4.3.1` and `nanoid` `3.3.18`; the dependency audit allowlist remains limited to the documented Vite 5/esbuild findings.
- Link Issues now prevents selection, URL edits, and deletion for managed/read-only bookmarks, bookmark reordering handles a missing source safely, and the process-based Vite security test has bounded timeouts that remain stable in the full suite.
- FavGrove beta metadata is synchronized at `0.3.0`; the responsive footer displays `v0.3.0 · everettlabs · everett7623@gmail.com`, Manifest/npm metadata uses the same author identity, and active release/package references use the matching version.

## Next Step

Load the rebuilt `dist/` in visible Chrome and Edge, complete the checklist including AI disabled/preview/cancel states, and perform one disposable live-provider compatibility check with user-owned credentials.

## After E2E

1. Run the visible Chrome and Edge checklist in `docs/release/browser-clickthrough.md`.
2. Copy the verified public privacy policy URL and support URL into the store portals.
3. Prepare and create the `0.3.0` GitHub beta pre-release after the current gates pass.
4. Upload the verified release ZIP only after the visible browser pass is recorded.
5. Record a live-provider AI compatibility result without persisting the user-owned API key.

## Verification Required Before Commit

- `git status`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run audit:permissions`
- `npm run build`

Quality gates must pass before marking the next phase complete.

Latest verification:

- ESLint: passed, 0 errors and 0 warnings.
- TypeScript strict check: passed.
- Vitest: passed, 36 test files and 139 tests.
- Vite production extension build, validation, and permission audit: passed.
- Isolated installed Chrome and Edge production `dist/` verification: passed.
- Playwright E2E: passed, 12 tests.
- Release packaging: passed.
- Release archive inspection: passed.
- Production extension validation: passed.
- E2E isolation check: passed; `dist/` hashes remained unchanged.
- Release audit rerun passed: ESLint, TypeScript, 42 Vitest tests, 7 Playwright tests, production build, extension validation, and release packaging.
- Current release classification: `0.3.0` FavGrove multi-provider AI beta candidate. The public `0.1.0` Markora beta remains historical; stable store publication is not yet approved.
- Link-check transport regression verification passed with 46 Vitest tests and 7 Playwright tests after moving HTTPS requests to the background service worker.
- Browser-store URL protection verification passed with 48 Vitest tests and 7 Playwright tests; protected store links are skipped before `fetch`.
- GitHub README was rebuilt for the public beta, with honest feature status, installation instructions, privacy boundaries, browser support, quality gates, and the new repository URL.
- Added `CHANGELOG.md` and the missing MIT `LICENSE`.
- ESLint passed with 0 errors and 0 warnings after locale key and UI text alignment.
- TypeScript strict check passed after localization updates.
- Vitest passed: 12 test files and 48 tests.
- Vite build passed.
- On 2026-07-08, ESLint passed with 0 errors and 0 warnings after Codex docs, dialog, skeleton, Manager, Scanner, Link Issues, and Settings updates.
- On 2026-07-08, TypeScript strict check passed.
- On 2026-07-08, Vitest passed: 12 test files and 48 tests.
- On 2026-07-08, production extension build and validation passed through `npm run build:extension`.
- On 2026-07-08, Playwright E2E passed: 7 tests, including the updated in-app dialog workflows.
- On 2026-07-08, after Manager select-all/sort/keyboard/tag-count and Dashboard last-scan updates, ESLint passed with 0 warnings, TypeScript strict check passed, Vitest passed with 12 files and 49 tests, `npm run build:extension` passed, and Playwright E2E passed with 7 tests.
- On 2026-07-08, after automatic daily scan and legacy planning cleanup, ESLint passed with 0 warnings, TypeScript strict check passed, Vitest passed with 12 files and 49 tests, `npm run build:extension` passed, and Playwright E2E passed with 7 tests.
- On 2026-07-08, after backup retention, locale parity, multi-format import, Manager batch tags/collapsible folders, and Dashboard quick actions/recommendations/pinyin search, ESLint passed with 0 warnings, TypeScript strict check passed, Vitest passed with 15 files and 60 tests, `npm run build:extension` passed, and Playwright E2E passed with 7 tests.
- On 2026-07-08, after Chinese route smoke, individual empty-folder deletion, 10,000-bookmark benchmarks, store assets/screenshots, and Chrome/Edge headless load checks, ESLint passed with 0 warnings, TypeScript strict check passed, Vitest passed with 16 files and 62 tests, `npm run benchmark:performance` passed, `npm run build:extension` passed, `npm run check:browsers` passed, and Playwright E2E passed with 8 tests.
- On 2026-07-08, after release permission tightening, browser click-through preparation, restore strategy decision, pre-release/store metadata, and post-beta AI guardrails, ESLint passed with 0 warnings, TypeScript strict check passed, Vitest passed with 16 files and 62 tests, `npm run benchmark:performance` passed, `npm run build:extension` passed with permission audit, `npm run check:browsers` passed, Playwright E2E passed with 8 tests, and `npm run package:release` regenerated `release/markora-v0.1.0.zip`.
- On 2026-07-12, after conservative link-status classification and the manual "Works for me" action, ESLint passed with 0 warnings, TypeScript strict check passed, Vitest passed with 16 files and 63 tests, `npm run build:extension` passed with validation and permission audit, and Playwright E2E passed with 8 tests.
- On 2026-07-12, persisted ignored-link URLs were added; ESLint, TypeScript, 63 Vitest tests, and 8 Playwright E2E tests passed.
- On 2026-07-12, ignored-link management was added to Settings; ESLint passed with 0 warnings, TypeScript strict check passed, Vitest passed with 16 files and 64 tests, `npm run build:extension` passed, and Playwright E2E passed with 8 tests.
- On 2026-07-13, single-link rechecking was added; ESLint passed with 0 warnings, TypeScript strict check passed, Vitest passed with 16 files and 66 tests, `npm run build:extension` passed, and Playwright E2E passed with 8 tests.
- On 2026-07-15, the FavGrove `0.2.0` rebrand passed ESLint with 0 warnings, TypeScript strict checking, 66 Vitest tests, `npm run benchmark:performance`, production extension build validation and permission audit, `npm run check:browsers`, regenerated and visually checked store screenshots, 8 Playwright E2E tests, and release packaging/inspection for `favgrove-v0.2.0.zip`.
- On 2026-07-15, the GitHub repository was renamed to `everett7623/FavGrove`; the local `origin`, README, privacy/support links, store metadata, and `v0.2.0` pre-release notes now use the new URL.
- On 2026-07-15, project author attribution was normalized to `everettlabs` across the MIT license, README, npm package metadata, and repository-local Git configuration. At that time, the extension Manifest author field was omitted because no public email had been provided.
- On 2026-07-15, the complete local repository was moved to `D:\EvenFrank\Workspace\Plugins\Google\FavGrove`; Git object integrity, branch tracking, remote configuration, and working-tree changes were verified after the move.
- On 2026-07-15, the FavGrove `0.2.0` development line and future releases were relicensed under `GPL-3.0-or-later`. Production builds and release archives now include the matching license text; previously granted MIT rights, historical release assets, and third-party dependency licenses were not rewritten.
- On 2026-07-16, the browser-managed extension update notice passed ESLint with 0 warnings, TypeScript strict checking, 19 Vitest files with 74 tests, production extension build validation and permission audit, Chrome/Edge headless load checks, and 8 Playwright E2E tests. The required permission set remains `alarms`, `bookmarks`, and `storage`.
- On 2026-07-16, non-destructive missing-bookmark recovery passed ESLint with 0 warnings, TypeScript strict checking, 21 Vitest files with 82 tests, production extension build validation and permission audit, Chrome/Edge headless load checks, and 8 Playwright E2E tests.
- On 2026-07-16, requested-format export moved to a dedicated Worker with import/export busy feedback; ESLint, TypeScript, 21 Vitest files with 83 tests, the 10,000-bookmark benchmark, production extension validation and permission audit, Chrome/Edge headless load checks, and 9 Playwright E2E tests passed. A Chrome 10,000-bookmark CSV run completed in 105 ms with no observed Long Task.
- On 2026-07-16, the first read-only AI analysis milestone passed ESLint with 0 warnings, TypeScript strict checking, 26 Vitest files with 97 tests, the 10,000-bookmark benchmark, production extension validation and permission audit, Chrome/Edge headless load checks, and 11 Playwright E2E tests. The rebuilt `dist/` includes the AI preprocessing Worker and analysis route; a live-provider check still requires user-owned credentials.
- On 2026-07-16, the OpenAI-compatible endpoint follow-up passed ESLint with 0 warnings, TypeScript strict checking, 26 Vitest files with 100 tests, the 10,000-bookmark benchmark, production extension validation and permission audit, Chrome/Edge headless load checks, and 11 Playwright E2E tests. A credential-free real-endpoint probe confirmed the Chat Completions and Bearer-auth transport contract; an authenticated rerun with the rebuilt extension remains open.
- On 2026-07-21, the current compatibility candidate was reverified with ESLint at 0 warnings, TypeScript strict checking, 26 Vitest files with 100 tests, the focused 10,000-bookmark benchmark, production extension validation and permission audit, 11 Playwright E2E tests, and release ZIP packaging. A follow-up audit found that the old browser script only checked branded-browser exit codes after Chrome removed unpacked-extension command-line loading; the gate now installs `dist/` through the supported DevTools extension API and positively verifies it in isolated installed Chrome 150 and Edge 150 profiles. The public repository, privacy policy, and Issues support URLs were also verified as anonymously accessible.
- On 2026-07-21, `.github/workflows/quality.yml` was added to reproduce the verified release gates on `windows-latest`; local validation is complete, while the first remote run requires a later push.
- On 2026-07-22, dependency hardening upgraded CRXJS to `2.7.1`, Vitest to `3.2.7`, and safe transitive packages without changing Vite 5. A clean install, production audit, lint, type checking, 107 Vitest tests, benchmark, production build, Chrome/Edge verification, 11 E2E tests, and release packaging passed.
- On 2026-07-22, Vite development/preview loopback and CORS hardening passed lint, TypeScript strict checking, 31 Vitest files with 112 tests, production build validation, and 11 E2E tests. README test counts now match the current suite.
- On 2026-07-22, the post-hardening `0.2.0` candidate was rebuilt and reverified in isolated Chrome `150.0.7871.125` and Edge `150.0.4078.83` profiles. Both browsers loaded the enabled MV3 extension, service worker, six primary routes, disabled AI state, and zero pre-confirmation external requests. Release packaging and archive verification produced a 320,972-byte ZIP with matching SHA-256 `e25549d37d7701f070fcdac41a4f49ef8c7992cf895ef8b80e89cd6d61298412`.
- On 2026-07-22, local English/Chinese desktop and 390px visual QA fixed Manager page overflow, made the narrow table prioritize title/actions, and made Recent Activity follow live language changes. ESLint, TypeScript strict checking, 31 Vitest files with 112 tests, production extension validation, permission audit, isolated installed Chrome/Edge verification, and 12 Playwright E2E tests passed. Verified packaging produced a 321,078-byte ZIP with SHA-256 `ee1a8c7665c561e17ad02b7b72e8ffea1ccdcfeb00287a4d4be7703314e69c9e`; final human-visible Chrome/Edge checks remain open.
- On 2026-07-23, the visible-browser runner cleanup now waits for the browser disconnect event and retries transient Windows profile-handle removal errors. ESLint now ignores Vite's transient timestamped config modules, and the Vite security check allocates a real free port instead of colliding with an occupied `5173`. ESLint, TypeScript strict checking, 32 Vitest files with 115 tests, and production extension validation with permission audit passed. The final human-visible Chrome/Edge checks remain open.
- On 2026-07-25, React Router `7.18.1` migration passed a clean `npm ci`, the zero-vulnerability production dependency audit, ESLint with 0 warnings, TypeScript strict checking, 32 Vitest files with 115 tests, the 10,000-bookmark performance gate, production extension validation and permission audit, 12 Playwright E2E tests, and isolated installed Chrome `150.0.7871.129` / Edge `150.0.4078.96` verification. Verified packaging produced a 326,464-byte ZIP with SHA-256 `50e2871271d020a89489748c6733321070596f689a44610fdbea747f9e96eba9`; the documented Vite 5/esbuild development advisories remain the only allowed audit findings.
- A later 2026-07-25 registry refresh added high-severity `GHSA-qwww-vcr4-c8h2` for React Router's unstable RSC APIs, causing the production dependency gate to fail again. FavGrove has no RSC, server rendering, or action endpoints, but the release policy does not waive production-package findings. Router `8.3.0` requires React `19.2.7+`, so no stack migration or commit was made without explicit approval.
- On 2026-07-25, the approved React `19.2.7` / React DOM `19.2.7` / React Router `8.3.0` migration replaced `react-router-dom` imports with `react-router`, added matching React 19 type packages, and patched PostCSS/Nanoid after a fresh development audit. The production dependency audit again passes with zero vulnerabilities; ESLint with 0 warnings, TypeScript strict checking, 32 Vitest files with 115 tests, the 10,000-bookmark performance gate, production extension validation and permission audit, 12 Playwright E2E tests, and isolated installed Chrome `150.0.7871.129` / Edge `150.0.4078.96` verification passed. The browser checker now waits for the lazy AI route before asserting its disabled state. Verified packaging produced a 340,358-byte ZIP with SHA-256 `c4bc13f4e6982e0811d95612ee5b63f70509035f3212784db4b45cd25a87b999`.
- On 2026-08-04, the `0.2.1` stabilization pass fixed the installed Chrome data-safety move/delete race, converted the Vite server security child process to bounded asynchronous execution, and synchronized the responsive version/author/email attribution with Manifest/npm metadata. Production dependencies remained at zero vulnerabilities; ESLint, TypeScript strict checking, 35 Vitest files with 129 tests, production extension validation and permission audit, Chrome `151.0.7922.72` / Edge `151.0.4129.59` installed checks, Chrome real-data safety, and 12 Playwright E2E tests passed. Verified packaging produced a 343,770-byte ZIP with SHA-256 `4a0f56ccd57766045537bc7329e63b365b64d0fa18bcbfd0f0f97f3a907cf73f`.
- On 2026-08-04, the `0.3.0` multi-provider AI phase added OpenAI, Claude, Gemini, Grok, and generic OpenAI-compatible adapters; fixed official endpoints; provider-aware model suggestions and previews; transient credential handling; and legacy settings migration. ESLint passed with 0 warnings, TypeScript strict checking passed, all 36 Vitest files with 137 tests passed, production extension validation and permission audit passed, and all 12 Playwright E2E flows passed. Authenticated live-provider checks remain user-credential dependent and were not run.
- On 2026-08-06, AI evidence and permission error handling were hardened. ESLint passed with 0 warnings, TypeScript strict checking passed, all 36 Vitest files with 139 tests passed, production dependency and permission audits passed, production extension build validation passed, and all 12 Playwright E2E flows passed.
- On 2026-08-19, `js-yaml` was updated from `4.3.0` to `4.3.1` and `nanoid` from `3.3.16` to `3.3.18` after new development-tool advisories appeared. Production dependencies remain at zero vulnerabilities, and the full audit again reports only the documented Vite 5/esbuild findings. ESLint passed with 0 warnings, TypeScript strict checking passed, all 36 Vitest files with 139 tests passed, production extension build validation and permission audit passed, and all 12 Playwright E2E flows passed.
- On 2026-10-13, newly published advisories were dispositioned: Vitest was upgraded from `3.2.7` to `4.1.11`, clearing the critical `@vitest/mocker` path traversal and `tinypool` RCE findings while keeping Vite `7.3.6`; the lockfile was refreshed to `brace-expansion` `1.1.21` and `source-map-js` `1.2.2`; and the unfixable Tailwind CSS 3 toolchain findings were allowlisted as the only documented exceptions pending the Tailwind 4 migration. The export Worker test mock was updated for Vitest 4 constructor semantics. The dependency audit, ESLint with 0 warnings, TypeScript strict checking, all 36 Vitest files with 145 tests, the 10,000-bookmark benchmark, production extension build validation with permission audit, isolated installed Chrome `155.0.8059.39` / Edge `155.0.4283.45` verification, the Chrome real-data safety check, all 12 Playwright E2E flows, and release packaging passed.
- On 2026-10-13, the first remote Vitest 4 quality run exposed a Windows hosted-runner timing issue: the PowerShell-backed deterministic archive test took 7.16 seconds and exceeded Vitest's 5-second default despite completing successfully. Both archive integration cases now use a scoped 15-second timeout; production archive code and the global unit-test timeout remain unchanged.

## Notes

- Do not reuse stale environment assumptions. The Windows 11 environment has been verified with Git, Node.js v24.16.0, npm v11.13.0, build, lint, and test passing.
- Do not automatically push.
- Update both `SESSION.md` and `PROGRESS.md` after completing each development phase.
- Current restore flow adds only missing bookmarks, preserves existing items, recreates missing non-root folders by path, and creates a safety backup before writing.
- Use `npm run test:e2e` for Playwright; direct `playwright test` can leave the local web server hanging on this Windows setup.

## Design Notes / Pending Decisions

- Backup restore is non-destructive: it matches URL occurrences by parent, prefers live parent IDs, falls back to folder paths, and rolls back newly created items after a failure.
- Full destructive replacement restore is intentionally deferred to post-beta work.
- HTML import now recreates nested folders; folder conflict behavior currently creates/imports new folders for the import batch.
- Folder merge keeps the first duplicate folder as the target, moves all source children, preserves URL conflicts, and creates a backup first.
- Advanced drag/drop ordering now supports bookmark ordering before a target row; folder ordering polish can be added after E2E coverage.
- Core feature audit added to `TASKS.md`: a saved setting is not considered complete until its service behavior uses it.
- Manual unpacked-extension testing must load `dist/`; `.crx-dev/manifest.json` is development-only and may reference the local Vite server.
- The current release artifact is a local build output and is intentionally ignored by Git.

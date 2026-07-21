# PROGRESS

Last updated: 2026-07-22

## Current Project Completion

- Beta core completion: about 96% against the explicitly scoped `0.2.0` release checklist. This is not 96% of the full roadmap; later automatic AI actions and deferred features are excluded.
- P0 Foundation: complete and verified.
- P1 Dashboard: about 94% complete.
- P2 Scanner: about 97% complete.
- P3 Manager: about 97% complete.
- P4 Import/Export: about 96% complete after multi-format import and non-blocking requested-format export.
- P5 Settings: about 94% complete.
- P7 AI: the first optional, read-only model-backed analysis milestone is implemented; automatic recommendation and mutation tasks remain open.
- P6 Optimization through P8 Release: mostly complete; visible browser checks and store portal submission remain open.

## Completed

- React 18, TypeScript strict mode, Vite, CRXJS, Manifest V3, Tailwind CSS, Zustand, React Router HashRouter, Lucide React, react-i18next, Vitest, Testing Library, and Playwright are configured.
- Required source architecture exists under `src/`: `background`, `workers`, `services`, `stores`, `shared`, `features`, `router`, `styles`, `App.tsx`, and `main.tsx`.
- Manifest V3 full-screen options page is configured with no popup page.
- Shared types live under `src/shared/types/`.
- Chrome bookmark and storage APIs are wrapped in services instead of React components.
- Dashboard shows total bookmarks, total folders, duplicate count, invalid count, persisted last 10 search terms, and recent activity.
- Search history persists locally.
- Recent Activity records bookmark loading, search, and delete actions.
- Scanner uses workers for duplicate bookmark groups, duplicate folder groups, empty folder scans, and broken-link checks.
- Broken-link checks support optional host permission, timeout handling, retry handling, HEAD/GET fallback, concurrency control, and progress updates.
- Cross-origin HTTPS checks are routed through the Manifest V3 background service worker instead of the options-page Worker.
- Chrome Web Store and Edge Add-ons URLs are detected before network access and marked for manual verification because browser-protected stores can reject extension requests even with host permission.
- Plain HTTP links are marked for manual verification without an automatic request, avoiding `Clear-Site-Data` security errors from insecure origins.
- Broken-link checks verify failed HEAD requests with GET and avoid treating authentication, rate limiting, or Cloudflare/WAF challenges as confirmed broken links.
- Link results distinguish confirmed HTTP failures from timeout, server, network, proxy, DNS, TLS, and regional access failures that could not be verified.
- Ambiguous 4xx responses, including 404 and proxy/authentication/rate-limit responses, are conservatively routed to manual verification; HTTP 410 remains the only automatically confirmed permanent removal.
- Link issue review supports dismissing a manually verified working link from the current result and persisted scan cache without modifying the bookmark.
- Dismissed working URLs are persisted locally and excluded from future scans and cached result loading.
- Settings provides searchable ignored-link management with single-URL re-enable and confirmation-protected clear-all controls.
- Link issue review supports rechecking one URL with current scanner settings and updates or removes the cached issue based on the new result.
- A dedicated link-issue page supports filtering, 50-row pagination, manual open-and-check, and backup-protected batch deletion.
- Each link issue now supports three explicit actions: open for manual verification, edit and validate the bookmark URL, or delete it after confirmation and backup creation.
- Product branding is now `FavGrove - Bookmark Manager` / `FavGrove 书签管理器` for the `0.2.0` beta candidate; the published `0.1.0` Markora release remains historical.
- Localization parity was improved for Scanner, Manager, Import/Export, and Settings locale keys, reducing fallback usage and hardcoded UI copy.
- Bookmark store activity logs and URL validation error messages now use i18n locale keys instead of hardcoded English strings.
- Service-layer fallback errors (storage, import, bookmark operations, scan flow, link request flow) now use i18n locale keys instead of hardcoded English strings.
- Import/Export page i18n fallback `defaultValue` usage was removed and Settings language option labels now use i18n locale keys.
- Scanner result cache support exists through `scanService`.
- Link scanning checks each exact URL once, maps the result back to duplicate bookmarks, interleaves hostnames, and caps each hostname at two concurrent requests.
- New installations default to eight global link-check workers while retaining the per-host safety cap.
- Scanner cache loading now uses the persisted cache-duration setting.
- Manager has folder filtering, virtualized bookmark list rendering, batch delete with backup creation, bookmark rename, folder rename, bookmark move, folder move, drag/drop move to folder, drag/drop bookmark ordering, undo delete, local tags, and tag filtering.
- Scanner duplicate-folder results support merging into the first folder in each group.
- Folder merge moves all source children, preserves duplicate bookmarks, removes source folders, and creates a backup first.
- Duplicate bookmark results support keeping the oldest entry and deleting the remaining copies with backup and undo support.
- Duplicate cleanup and folder merge now rerun the structural scan and replace stale cached results immediately.
- Import/Export supports JSON, CSV, TXT, OPML, and HTML export generation.
- Export serializes only the selected format in a dedicated Web Worker, shows immediate busy feedback, and no longer performs five synchronous main-thread serializations per click.
- HTML import parses Netscape bookmark files in a Web Worker.
- HTML import parsing is Worker-safe and does not depend on `DOMParser`.
- Import preview detects URL conflicts before writing.
- Conflict resolver supports skipping matching URLs or importing all as duplicates.
- Backup-before-import is implemented.
- HTML import recreates imported folder hierarchy from Netscape bookmark paths.
- Settings persistence is implemented for theme, language, scanner config, cache config, and backup config.
- Settings includes backup management with backup list, restore, and delete actions.
- Restore creates a safety backup and adds only bookmark occurrences missing from the selected snapshot without deleting or overwriting current bookmarks and folders.
- App applies persisted theme and language.
- Chrome/Edge store update readiness is persisted locally and shown in a localized global banner, including updates detected while the options page is open; stale records are cleared, and applying an update uses an explicit user-triggered extension reload without new permissions or remote version polling.
- The route-loading fallback and beta status badge use shared English and Chinese locale resources.
- Baseline unit/component tests exist and pass.
- Playwright E2E covers route navigation, scanner execution, HTML import preview and conflict handling, and manager mutation flows.
- A local-first privacy policy documents permissions, data handling, and the absence of analytics or remote bookmark uploads.
- A release checklist covers quality gates, manifest review, privacy review, manual checks, store preparation, and artifact validation.
- `npm run package:release` creates a versioned ZIP from the verified `dist/` extension build.
- Development and E2E extension output is isolated under `.crx-dev`; it no longer overwrites the production `dist/` directory.
- Production build validation rejects localhost references, CRXJS/Vite development clients, missing service workers, and manifests that expose every extension resource.
- Development environment has been restored and verified on Windows 11.
- Versioning policy is documented. The current development version is `0.2.0`; `0.1.0` remains the historical Markora beta baseline and should not be rewritten.
- `AGENTS.md` and `DEVELOPMENT_GUIDE.md` now provide a Codex-friendly handoff and development guide with architecture rules, verification commands, current priorities, and release constraints.
- Shared `Dialog`, `ConfirmDialog`, `PromptDialog`, `Skeleton`, and `useContainerHeight` primitives are available for reuse.
- Manager virtualized list height now follows its actual container height instead of a fixed `620px` viewport.
- Dashboard and Manager initial loading states now use skeleton placeholders.
- Dashboard shows a last-scan indicator backed by scan-cache metadata and links to Scanner.
- Manager rename, folder rename, tag editing, bulk delete confirmation, and bulk move confirmation use custom dialogs instead of native browser prompts.
- Manager supports select-all for visible bookmarks, session-only sort options, keyboard shortcuts, shortcut tooltip, and tag counts in the tag filter.
- Link issue URL editing, single delete, and batch delete now use custom dialogs instead of native browser prompts/confirms.
- Settings backup restore now requires an in-app confirmation dialog.
- Scanner supports confirmed "Clean all duplicates" and "Delete all empty folders" batch actions through the existing backup-protected repair flow, with refreshed scan cache after repair.
- Legacy planning files were removed; Codex handoff now uses `AGENTS.md`, `DEVELOPMENT_GUIDE.md`, `SESSION.md`, `PROGRESS.md`, and `TASKS.md`.
- Automatic daily structure scan is implemented behind a Settings toggle using the Manifest V3 `alarms` permission.
- Background auto-scan saves duplicate bookmark, duplicate folder, and empty-folder results to the existing scan cache; broken-link checks remain manual.
- `PRIVACY.md` documents the `alarms` permission.
- Backup creation now uses the persisted retention setting, and lowering retention trims excess backups safely.
- Import/Export now imports JSON, CSV, TXT, OPML, and HTML through the shared Worker preview, conflict resolver, and backup-before-import flow.
- English and Chinese locale key parity is enforced by a unit test.
- Production React markup is scanned by a TypeScript AST regression test for static English JSX text and user-facing string attributes.
- Manager supports batch tag add/remove for selected bookmarks and expand/collapse controls in the folder tree.
- Dashboard includes quick actions, local scan-result recommendations, and full-pinyin/pinyin-initial search support.
- Chinese primary route smoke coverage passes through Playwright after switching language in Settings.
- Scanner supports deleting one detected empty folder with confirmation, backup creation, bookmark refresh, and scan-cache refresh.
- 10,000-bookmark structural scan, pinyin search, and selected-format export performance benchmarks are covered by `npm run benchmark:performance`.
- Store listing copy, promotional SVG sources, and 1280x800 screenshots are available under `store/`.
- `npm run check:browsers` installs `dist/` through the supported DevTools extension API in isolated official Chrome and Edge profiles and verifies enabled extension metadata, the MV3 service worker, six primary routes, disabled AI state, zero pre-confirmation external requests, and zero page errors.
- `npm run check:browsers:visible -- chrome|edge` provides the final human click-through pass with one official browser at a time, an isolated temporary profile, production `dist/`, and automatic profile cleanup after the window closes.
- `.github/workflows/quality.yml` runs the release quality gates on a Windows GitHub Actions runner for pushes, pull requests, and manual dispatches; its first remote run remains pending until these local commits are pushed.
- `npm run package:release` creates both the versioned ZIP and a matching SHA-256 checksum file for GitHub pre-release verification.
- Release ZIP entries use stable path ordering and normalized timestamps; rebuilding identical `dist/` content reproduces the same archive SHA-256.
- Release packaging reopens the generated ZIP and verifies its complete entry set against `dist/` by path, order, length, timestamp, and content hash before writing the checksum file.
- Production build validation and release packaging reject non-`x.y.z` or mismatched versions across `package.json`, `package-lock.json`, source `manifest.json`, and `dist/manifest.json`.
- Manifest required permissions are limited to `alarms`, `bookmarks`, and `storage`; the unused `tabs` permission was removed after confirming no `chrome.tabs` usage.
- `npm run audit:permissions` validates the manifest permission boundary and permission documentation in `PRIVACY.md`.
- Visible Chrome and Edge click-through steps and an isolated visible runner are prepared in `docs/release/browser-clickthrough.md`.
- Full destructive replacement restore is deferred by `docs/decisions/restore-strategy.md`; additive, path-mapped missing-bookmark recovery is the current release path.
- GitHub pre-release metadata is prepared in `docs/release/github-prerelease-v0.2.0.md`.
- Store portal submission fields are prepared in `store/submission-fields.md`.
- The public repository, privacy policy, and Issues support URLs were verified as anonymously accessible on 2026-07-21.
- Post-beta AI and local recommendation guardrails are documented in `docs/roadmap/post-beta-ai.md`.
- `TASK-705` and `.codex/tasks/ai-analysis-integration-2026-07-15.md` define the first model-backed milestone as opt-in, read-only bookmark-library analysis with explicit provider, privacy, schema, cancellation, and large-library acceptance gates.
- AI Analysis now supports disabled-by-default opt-in, whole-library or folder scope, domain-only or metadata privacy modes, Web Worker preprocessing, exact request preview, user-provided Chat Completions endpoints/models, transient API keys/results, 60-second timeout, cancellation, strict response/evidence validation, and read-only results.
- OpenAI-compatible endpoint handling accepts an origin or `/v1` base URL, previews the exact resolved request URL, supports string and text-part response content, filters unsupported findings individually, and reports distinct content/schema/evidence failures without retaining raw responses.
- AI payloads remove URL queries and fragments, cap metadata samples at 200, and keep full-scope aggregate counts for at least 10,000 bookmarks.

## Not Completed

- The full post-beta roadmap is not implemented; the completion percentage above applies only to the `0.2.0` beta scope.
- Visible Chrome and Edge click-through checks from `dist/` remain open.
- Store portal submission fields and GitHub pre-release metadata are prepared locally but not finalized in the portals.
- The new GitHub Actions quality workflow is locally reviewed but has not run remotely because the current commits have not been pushed.
- A visible live-provider compatibility check remains open because FavGrove intentionally bundles no provider endpoint, model, or credential; automated success/failure/cancellation coverage uses a simulated compatible provider.
- Full destructive replacement restore remains a deferred post-beta feature and is not part of the current release path.

## Verification

Environment verified on Windows 11:

- Git available.
- Node.js v24.16.0.
- npm v11.13.0.
- `npm install` passed.
- `npm run build` passed.
- `npm run lint` passed.
- `npm run test` passed.
- Broken Link Checker phase verified after implementation.
- Settings persistence phase verified after implementation.
- Search history and Recent Activity phase verified after implementation.
- Manager rename, move, drag/drop move, undo delete, tags, and tag filtering phase verified after implementation.
- HTML import, conflict resolver, and backup-before-import phase verified after implementation.
- Backup restore UI and backup management phase verified after implementation.
- Nested-folder recreation for HTML import phase verified after implementation.
- Manager folder rename, folder move, and drag/drop ordering phase verified after implementation.
- E2E smoke verification passed after stabilizing the local Playwright server runner.
- Folder merge implementation and backup behavior verified.
- Quality gates currently passing.

Additional verification in this Codex session on 2026-06-06:

- `git status --short`: passed; current working tree shows documentation changes.
- `git log --oneline -5`: passed.
- ESLint gate passed with 0 errors and 0 warnings when executed through the installed Node runtime.
- TypeScript strict check passed when executed through the installed Node runtime.
- Vitest passed, 11 test files and 42 tests.
- Vite build passed when executed through the installed Node runtime.
- Playwright E2E passed, 7 tests, including duplicate cleanup persistence and link-issue classification/detail coverage.
- Release packaging passed and created `release/markora-v0.1.0.zip`.
- The release archive was inspected and contains only the built extension files.
- Extension build validation passed with a production service worker and no development URLs.
- Playwright E2E passed without changing any file hash under `dist/`.
- Release audit rerun passed: ESLint, TypeScript strict mode, 42 Vitest tests, 7 Playwright tests, production build, extension validation, and release packaging.
- Link-check transport regression verification passed: 12 Vitest files with 46 tests, 7 Playwright tests, production build, and extension validation.
- Protected browser-store regression verification passed: 12 Vitest files with 48 tests, 7 Playwright tests, production build, extension validation, and release packaging.

Additional verification in this Codex session on 2026-06-30:

- ESLint passed with 0 errors and 0 warnings after locale key and UI text alignment.
- TypeScript strict check passed after localization updates.
- Vitest passed: 12 test files, 48 tests.
- Production build passed.

Additional verification in this Codex session on 2026-07-08:

- ESLint passed with 0 errors and 0 warnings after Codex docs, dialog, skeleton, Manager, Scanner, Link Issues, and Settings updates.
- TypeScript strict check passed.
- Vitest passed: 12 test files and 48 tests.
- Production extension build and validation passed through `npm run build:extension`.
- Playwright E2E passed: 7 tests, including updated custom-dialog flows for link URL editing and Manager rename/tag actions.
- A later 2026-07-08 verification passed after Manager select-all, sort options, keyboard shortcuts, tag counts, and Dashboard last-scan updates: ESLint 0 warnings, TypeScript strict check, 49 Vitest tests, production extension build validation, and 7 Playwright E2E tests.
- A later 2026-07-08 verification passed after automatic daily scan and legacy planning cleanup: ESLint 0 warnings, TypeScript strict check, 49 Vitest tests, production extension build validation, and 7 Playwright E2E tests.
- A later 2026-07-08 verification passed after backup retention, locale parity, multi-format import, Manager batch tags/collapsible folders, and Dashboard quick actions/recommendations/pinyin search: ESLint 0 warnings, TypeScript strict check, 60 Vitest tests, production extension build validation, and 7 Playwright E2E tests.
- A later 2026-07-08 verification passed after Chinese route smoke, individual empty-folder deletion, 10,000-bookmark benchmarks, store assets/screenshots, and Chrome/Edge headless load checks: ESLint 0 warnings, TypeScript strict check, 62 Vitest tests, focused performance benchmark, production extension build validation, browser load checks, and 8 Playwright E2E tests.
- A later 2026-07-08 verification passed after release permission tightening, browser click-through preparation, restore strategy decision, pre-release/store metadata, and post-beta AI guardrails: ESLint 0 warnings, TypeScript strict check, 62 Vitest tests, focused performance benchmark, production extension build validation with permission audit, Chrome/Edge headless browser load checks, 8 Playwright E2E tests, and release ZIP packaging.
- On 2026-07-12, conservative link classification and manual working-link dismissal passed ESLint with 0 warnings, TypeScript strict checking, 63 Vitest tests, production extension build validation with permission audit, and 8 Playwright E2E tests.
- On 2026-07-12, persisted ignored-link URL filtering passed ESLint, TypeScript strict checking, 63 Vitest tests, and 8 Playwright E2E tests.
- On 2026-07-12, Settings ignored-link management passed ESLint with 0 warnings, TypeScript strict checking, 64 Vitest tests, production extension build validation with permission audit, and 8 Playwright E2E tests.
- On 2026-07-13, single-link rechecking passed ESLint with 0 warnings, TypeScript strict checking, 66 Vitest tests, production extension build validation with permission audit, and 8 Playwright E2E tests.
- On 2026-07-15, the FavGrove `0.2.0` rebrand passed ESLint with 0 warnings, TypeScript strict checking, 66 Vitest tests, the focused 10,000-bookmark benchmark, production extension build validation and permission audit, installed Chrome/Edge checks, regenerated store screenshots, 8 Playwright E2E tests, and release ZIP packaging/inspection for `favgrove-v0.2.0.zip`.
- On 2026-07-15, the GitHub repository was renamed from `everett7623/Markora` to `everett7623/FavGrove`; repository documentation, store URLs, and the local `origin` now use the FavGrove URL.
- On 2026-07-15, current project package metadata, README attribution, MIT copyright, and repository-local Git author were normalized to `everettlabs`; the GitHub account path remains `everett7623` because it is the repository owner URL. The extension manifest omits its email-only author object rather than inventing an address.
- On 2026-07-15, the local workspace was relocated from `D:\EvenFrank\Workspace\Plugins\Google\markora` to `D:\EvenFrank\Workspace\Plugins\Google\FavGrove`; Git state, uncommitted changes, and the FavGrove remote were preserved.
- On 2026-07-15, the FavGrove `0.2.0` development line and future releases were relicensed under `GPL-3.0-or-later`; production builds and release archives include the matching license text, while historical MIT grants, existing release artifacts, and third-party dependency licenses remain unchanged.
- On 2026-07-16, the browser-managed update notice passed ESLint with 0 warnings, TypeScript strict checking, 19 Vitest files with 74 tests, production extension build validation and permission audit, Chrome/Edge headless load checks, and 8 Playwright E2E tests. No required or optional host permission changed.
- On 2026-07-16, release polish for live update-state refresh, stale-record cleanup, and localized loading/beta labels passed ESLint with 0 warnings, TypeScript strict checking, 19 Vitest files with 77 tests, production extension build validation and permission audit, Chrome/Edge headless load checks, and 8 Playwright E2E tests.
- On 2026-07-16, non-destructive missing-bookmark recovery passed ESLint with 0 warnings, TypeScript strict checking, 21 Vitest files with 82 tests, production extension build validation and permission audit, Chrome/Edge headless load checks, and 8 Playwright E2E tests.
- On 2026-07-16, requested-format export moved to a dedicated Worker with import/export busy feedback; ESLint, TypeScript, 83 Vitest tests, the 10,000-bookmark benchmark, production extension validation and permission audit, Chrome/Edge headless load checks, and 9 Playwright E2E tests passed. A Chrome 10,000-bookmark CSV run completed in 105 ms with no observed Long Task.
- On 2026-07-16, the optional read-only AI analysis milestone passed ESLint with 0 warnings, TypeScript strict checking, 26 Vitest files with 97 tests, the 10,000-bookmark benchmark, production extension validation and permission audit, Chrome/Edge headless load checks, and 11 Playwright E2E tests. Automated provider checks cover opt-in, privacy redaction, exact preview, success, cancellation, failure, and untrusted-response rejection; a live-provider check remains open.
- On 2026-07-16, OpenAI-compatible endpoint normalization and response diagnostics passed ESLint with 0 warnings, TypeScript strict checking, 26 Vitest files with 100 tests, the 10,000-bookmark benchmark, production extension validation and permission audit, Chrome/Edge headless load checks, and 11 Playwright E2E tests. A credential-free probe confirmed that the reported real endpoint recognizes Chat Completions and Bearer authentication; the rebuilt extension still needs an authenticated user rerun.
- On 2026-07-21, the current AI provider compatibility candidate was reverified with ESLint at 0 warnings, TypeScript strict checking, 26 Vitest files with 100 tests, the focused 10,000-bookmark benchmark, production extension validation and permission audit, 11 Playwright E2E tests, and release ZIP packaging. A follow-up audit replaced the old browser exit-code check with supported DevTools installation and positive production-extension verification in isolated installed Chrome 150 and Edge 150 profiles; toolbar clicking, permission prompts, destructive flows, and restart persistence remain manual.

## Release Decision

- GitHub source push: suitable as a `0.2.0` FavGrove beta candidate after reviewing and committing the current working tree.
- Chrome Web Store / Edge Add-ons stable publication: not ready.
- Current release blockers include visible browser click-through checks, an authenticated live-provider compatibility check, GitHub pre-release creation, and final store portal submission. The public privacy and support URLs are accessible and ready to enter in the portals.
- Do not label the current build `1.0.0`.

Required standards:

- TypeScript strict mode remains enabled.
- ESLint has 0 errors and 0 warnings in the verified run.
- Tests pass.
- Build passes.
- Existing working behavior must not be broken.

## Next Stage Development Plan

1. Run and record final visible Chrome and Edge click-through checks from `dist/`.
2. Copy the verified public privacy policy and support URLs into the store portals.
3. Create the GitHub beta pre-release from `docs/release/github-prerelease-v0.2.0.md`.
4. Upload the verified release ZIP only after the visible browser pass is recorded.
5. Run a disposable live-provider AI check with user-owned credentials and record the result without storing the key.

## Design Notes / Pending Decisions

- Backup restore is non-destructive and idempotent, with parent-ID/path mapping, missing-folder recreation, a pre-write safety backup, and rollback of newly created items on failure.
- Full destructive replacement restore is intentionally deferred to post-beta work.
- HTML import now recreates nested folders; folder conflict behavior currently creates/imports new folders for the import batch.
- Folder merge keeps the first duplicate folder as the target and moves all source children without silently deleting URL conflicts.
- Advanced drag/drop ordering now supports bookmark ordering before a target row; folder ordering polish can be added after E2E coverage.
- Use `npm run test:e2e` for Playwright; it starts Vite through `scripts/run-e2e.mjs` so the server exits cleanly on Windows.
- Do not load `.crx-dev` as an unpacked extension for manual testing; Chrome and Edge must load `dist/`.

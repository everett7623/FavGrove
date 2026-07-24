
# FavGrove - Bookmark Manager

Roadmap

---

# P0 Foundation

TASK-001

Initialize Vite project

Acceptance:

- React works
    
- Build passes
    

---

TASK-002

Configure CRXJS

Acceptance:

- Extension loads
    

---

TASK-003

Create Manifest V3

Acceptance:

- No warnings
    

---

TASK-004

Setup Tailwind

Acceptance:

- Tailwind classes available
    

---

TASK-005

Setup Zustand

Acceptance:

- Store working
    

---

TASK-006

Setup Router

Acceptance:

- HashRouter working
    

---

TASK-007

Create Application Layout

Acceptance:

- Header
    
- Sidebar
    
- Footer
    
- Content Area
    

---

# P1 Dashboard

TASK-101

Statistics Cards

Acceptance:

- Total bookmarks
    
- Total folders
    
- Duplicate count
    
- Invalid count
    

---

TASK-102

Global Search

Acceptance:

- 300ms debounce
    

---

TASK-103

Search History

Acceptance:

- Last 10 searches
    

---

TASK-104

Keyboard Shortcut

Acceptance:

Ctrl+K

---

TASK-105

Recent Activity

Acceptance:

- Latest operations

---

TASK-106

Pinyin Search

Status:

- Implemented

Acceptance:

- Chinese bookmark titles can be matched by full pinyin
- Chinese bookmark titles can be matched by pinyin initials
- Existing title, URL, and folder path search remains available
- Search remains debounced at 300ms

---

TASK-107

Dashboard Quick Actions

Status:

- Implemented

Acceptance:

- Start scan from Dashboard
- Open import flow from Dashboard
- Open bookmark cleanup or manager flow from Dashboard
- Actions use existing routes and services

---

TASK-108

Dashboard Smart Recommendations

Status:

- Implemented

Acceptance:

- Show local recommendations derived from scan results
- Recommend duplicate cleanup, empty-folder cleanup, or broken-link review
- Do not upload bookmark data
- Recommendations link to the relevant repair workflow
    

---

# P2 Scanner

TASK-201

Duplicate Bookmark Scanner

Acceptance:

- URL exact match
    

---

TASK-202

Duplicate Folder Scanner

Acceptance:

- Same folder name
    

---

TASK-203

Empty Folder Scanner

Acceptance:

- Recursive scan
    

---

TASK-204

Broken Link Worker

Acceptance:

- Worker based
    

---

TASK-205

Progress UI

Acceptance:

- Real-time updates
    

---

TASK-206

Result Cache

Acceptance:

- 24h cache

---

TASK-207

Empty Folder Cleanup

Status:

- Implemented

Acceptance:

- Delete one detected empty folder
- Support batch cleanup
- Create a backup before deletion
- Refresh bookmark state and scan cache after cleanup
- Do not delete protected browser root folders

---

TASK-208

Link Issue Review Workflow

Status:

- Implemented

Acceptance:

- Scanner summary links to a dedicated detail page
- Separate confirmed broken links from links that could not be verified
- Explain timeout, network, proxy, DNS, TLS, region, and HTTP failures
- Paginate large result sets
- Open links for manual verification
- Batch delete selected bookmarks with backup creation
    

---

# P3 Manager

TASK-301

Folder Tree

TASK-302

Drag Drop

TASK-303

Rename Folder

TASK-304

Move Bookmarks

TASK-305

Batch Delete

TASK-306

Undo Operation

TASK-307

Tag System

TASK-308

Filter By Tag

---

TASK-309

Batch Edit

Status:

- Batch move and batch delete implemented
- Batch tag editing implemented

Acceptance:

- Apply tags to multiple selected bookmarks
- Remove tags from multiple selected bookmarks
- Validate changes before writing
- Keep existing batch move and delete behavior

---

TASK-310

Collapsible Folder Tree

Status:

- Hierarchical indentation and folder filtering implemented
- Expand and collapse controls implemented

Acceptance:

- Preserve real parent-child hierarchy
- Expand and collapse nested folders
- Keep selection and drag/drop behavior
- Remain responsive with large folder collections

---

# P4 Import Export

TASK-401

HTML Import

TASK-402

JSON Export

TASK-403

CSV Export

TASK-404

TXT Export

TASK-405

OPML Export

TASK-406

Conflict Resolver

TASK-407

Backup Before Import

---

TASK-408

JSON Import

Status:

- Implemented

Acceptance:

- Parse FavGrove JSON exports in a Web Worker
- Validate schema, URLs, titles, and folder paths
- Show the existing import preview and conflict resolver
- Create a backup before writing bookmarks
- Recreate the exported folder hierarchy

---

TASK-409

CSV Import

Status:

- Implemented

Acceptance:

- Parse UTF-8 CSV files with quoted fields in a Web Worker
- Support title, URL, and folder path columns
- Reject malformed or unsupported rows with a useful summary
- Use the existing import preview, conflict resolver, and backup flow

---

TASK-410

TXT Import

Status:

- Implemented

Acceptance:

- Parse FavGrove TXT exports in a Web Worker
- Validate HTTP and HTTPS URLs
- Preserve titles and folder paths when present
- Use the existing import preview, conflict resolver, and backup flow

---

TASK-411

OPML Import

Status:

- Implemented

Acceptance:

- Parse OPML link outlines in a Web Worker
- Validate XML structure without unsafe HTML rendering
- Preserve nested outline paths
- Use the existing import preview, conflict resolver, and backup flow

---

TASK-412

Responsive Multi-Format Export

Status:

- Implemented

Acceptance:

- Serialize only the format selected by the user
- Run large export serialization outside the options-page main thread
- Show immediate localized busy feedback and block duplicate clicks
- Cover the Worker request, real browser download, and 10,000-bookmark path

---

# P5 Settings

TASK-501

Theme

TASK-502

Language

TASK-503

Scanner Config

TASK-504

Cache Config

TASK-505

Backup Config

---

TASK-506

Apply Backup Retention Setting

Status:

- Implemented

Acceptance:

- Backup creation uses the persisted retention setting
- Changing retention trims excess backups safely
- Default remains 10 backups
- Retention supports the configured 1-50 range

---

TASK-508

Scheduled Auto Scan

Status:

- Implemented

Acceptance:

- Settings can enable or disable a daily automatic structure scan
- Background registers or clears a `chrome.alarms` alarm from persisted settings
- Alarm scans duplicate bookmarks, duplicate folders, and empty folders locally
- Alarm results are written to the existing scan cache
- Broken-link checks remain manual

---

TASK-507

Apply Cache Duration Setting

Status:

- Implemented

Acceptance:

- Scanner cache reads use the persisted cache duration
- Expired cache is ignored
- Manual scans always refresh and replace cached results

---

TASK-606

Accuracy-Preserving Link Scan Acceleration

Status:

- Implemented

Acceptance:

- Check each exact URL only once per scan
- Map one URL result back to every matching bookmark
- Calculate progress from the real bookmark count
- Interleave different hostnames
- Limit a single hostname to two concurrent requests
- Support at least 10,000 bookmarks in grouping tests

---

# P6 Optimization

TASK-601

Virtual List

TASK-602

Worker Pool

TASK-603

Lazy Loading

TASK-604

Memo Optimization

TASK-605

Performance Monitoring

Status:

- Implemented

Acceptance:

- 10,000-bookmark structural scan benchmark is covered
- 10,000-bookmark pinyin search benchmark is covered
- `npm run benchmark:performance` provides a focused performance gate

---

# P7 AI

TASK-701

Tag Recommendation

TASK-702

Folder Merge Recommendation

TASK-703

Bookmark Classification

TASK-704

Smart Search

TASK-705

AI Bookmark Library Analysis

Status:

- Implemented: first read-only model-backed milestone
- Live-provider compatibility check remains user-configured because FavGrove bundles no endpoint or credential
- Detailed scope: `.codex/tasks/ai-analysis-integration-2026-07-15.md`

Acceptance:

- AI analysis is disabled by default and starts only after explicit scope preview and confirmation
- The first milestone is read-only and cannot directly mutate bookmarks
- Local preprocessing minimizes and redacts data before an approved remote request
- The user selects a compatible endpoint and model; the API key remains in current-page memory only
- Provider calls stay behind service/background boundaries and return provider-neutral structured results
- Large-library analysis supports cancellation, timeout, bounded 200-item samples, full-scope aggregates, and at least 10,000 bookmarks
- Invalid or malicious model output cannot trigger bookmark operations
- Unit, performance, E2E, privacy, store disclosure, and release-note requirements are complete before shipping

---

# P8 Release

TASK-801

Privacy Policy

TASK-802

Store Assets

Status:

- Implemented

Acceptance:

- Store listing draft is available under `store/listing.md`
- 1280x800 screenshots are generated under `store/screenshots/`
- Promotional SVG sources are available under `store/assets/`
- 128x128 icon source is available under `public/icons/icon128.png`

TASK-803

Chrome Store Package

Status:

- Production package tooling implemented
- Positive isolated installed Chrome/Edge `dist/` verification through the supported DevTools extension API implemented
- Store portal upload is not performed from this repository

TASK-804

Release Build

Status:

- Implemented
- Windows GitHub Actions release-gate workflow implemented locally; first remote run pending push

Acceptance:

- `npm run build:extension` validates production extension output
- `npm run package:release` creates the versioned ZIP artifact
- Release packaging creates a matching SHA-256 checksum file for the ZIP
- Identical production content reproduces the same ZIP SHA-256 regardless of source file order or timestamps
- Packaging verifies the generated ZIP entry set and content against `dist/` before writing the checksum
- `npm run check:browsers` verifies enabled extension metadata, the MV3 service worker, primary routes, disabled AI state, and zero pre-confirmation external requests in isolated installed Chrome/Edge profiles
- Visible unpacked-extension loading is recorded separately in official Chrome and Edge
- `.github/workflows/quality.yml` runs lint, type checking, tests, production validation, browser checks, E2E, and release packaging on Windows

---

TASK-805

Complete English And Chinese Localization

Status:

- Translation resources exist for both languages
- English and Chinese locale key parity is enforced by unit test
- Production React markup is guarded against static English JSX text and user-facing string attributes
- English route smoke checks pass through Playwright
- Chinese primary route smoke checks pass through Playwright
- Route loading and beta status labels use shared locale resources
- Recent Activity persists translation keys and values so current-session messages follow language changes

Acceptance:

- English and Chinese locale files have identical key sets
- No user-facing English strings remain hardcoded in React components, with direct production JSX copy covered by an AST regression test
- Recent Activity messages render in the selected language, including after a live language change
- Service and Worker errors are mapped to localized user-facing messages
- English and Chinese manual route checks pass

---

TASK-806

Release Versioning

Status:

- Version policy documented in `VERSIONING.md`
- Current development version is `0.2.0`
- Build and package gates enforce matching semantic versions across package metadata, source Manifest, and production `dist/`

Acceptance:

- `package.json`, `package-lock.json`, `manifest.json`, built Manifest, UI footer, and release filename use the same version
- Git tags use `v<version>`
- Pre-release status is marked in GitHub or store metadata
- Stable `1.0.0` is not published until all release gates pass

---

TASK-807

Repository License

Status:

- Implemented

Acceptance:

- GNU GPL version 3 `LICENSE` file is present
- Project metadata declares `GPL-3.0-or-later`
- README license claim matches the repository file
- Production extension builds and release archives include the matching `LICENSE`
- Historical grants and third-party dependency licenses are not rewritten

---

TASK-808

Permission Audit

Status:

- Implemented

Acceptance:

- Manifest required permissions are limited to `alarms`, `bookmarks`, and `storage`
- `tabs` permission is removed after confirming no `chrome.tabs` usage
- `PRIVACY.md` documents every required permission and optional `<all_urls>` host access
- `npm run audit:permissions` enforces the release permission boundary

---

TASK-809

Visible Browser Click-Through Preparation

Status:

- Checklist prepared
- Isolated visible Chrome/Edge runner implemented
- Final human-visible Chrome and Edge pass remains required before store submission

Acceptance:

- `docs/release/browser-clickthrough.md` lists required visible Chrome and Edge checks
- `npm run check:browsers` continues to verify real `dist/` loading in isolated installed Chrome and Edge profiles
- `npm run check:browsers:visible -- chrome|edge` launches production `dist/` in an isolated temporary profile and cleans it up after the visible pass
- Manual results are recorded with browser versions before portal submission

---

TASK-810

Restore Strategy Decision

Status:

- Implemented with non-destructive missing-bookmark recovery

Acceptance:

- `docs/decisions/restore-strategy.md` documents the pre-`1.0.0` decision
- Full destructive replacement restore is deferred to post-beta work
- Current restore never deletes or overwrites existing bookmarks and folders
- Missing bookmark occurrences use parent-ID matching with folder-path fallback
- Missing non-root folders are recreated and failed writes roll back their created items
- A safety backup is created before the first restore write

---

TASK-811

Pre-Release And Store Submission Metadata

Status:

- Implemented

Acceptance:

- GitHub pre-release draft is prepared in `docs/release/github-prerelease-v0.2.0.md`
- Store portal field worksheet is prepared in `store/submission-fields.md`
- Required permission justifications and beta notes are ready to copy into portals

---

TASK-812

Post-Beta AI Guardrail

Status:

- Implemented

Acceptance:

- `docs/roadmap/post-beta-ai.md` defines release gates before recommendation or AI work starts
- Local-first privacy guardrails are documented
- Candidate post-beta recommendation features are scoped without rewriting the historical `0.1.0` release

---

TASK-813

FavGrove Brand Migration

Status:

- Implemented for the `0.2.0` beta candidate
- GitHub repository rename to `everett7623/FavGrove` completed on 2026-07-15

Acceptance:

- User-facing Markora and Bookmark Atlas branding is replaced with FavGrove
- English product name is `FavGrove - Bookmark Manager`
- Chinese product name is `FavGrove 书签管理器`
- Package, manifest, UI footer, release archive, store copy, and promotional assets use `0.2.0` FavGrove metadata
- Browser storage keys, import schemas, and stable background identifiers remain compatible
- The published `v0.1.0` Markora release remains historical and unchanged

---

TASK-814

Browser Store Update Notification

Status:

- Implemented

Acceptance:

- Chrome and Edge continue to manage store update checks and downloads
- FavGrove listens for `chrome.runtime.onUpdateAvailable` without manual polling
- The available version is persisted locally and shown on the next options-page visit or immediately while the page is open
- Stale records that do not describe a newer version are cleared locally
- The user can reload FavGrove to apply a downloaded update immediately
- English and Chinese notices cover available, applying, dismissed, and error states
- No new host permission, GitHub request, bookmark upload, analytics, or telemetry is introduced

---

TASK-815

Dependency Security Audit

Status:

- Production dependency audit passes with zero vulnerabilities
- CRXJS, Vitest, and safe transitive dependency updates are applied
- React `19.2.7` and React Router `8.3.0` replace the vulnerable React 18 / Router v6-v7 lines and pass route compatibility checks
- Vite development and preview servers are restricted to loopback hosts and explicit CORS origins
- Vite 5 development-tool findings remain tracked pending an explicit Vite-major migration decision

Acceptance:

- `npm run audit:dependencies` uses the npm registry and fails on high or critical production vulnerabilities
- The audit policy fails when a new development package, advisory ID, or severity escalation appears
- Shared Vite server configuration does not expose the development server on LAN interfaces or allow arbitrary CORS origins
- Windows CI runs the production dependency audit before build and test gates
- `docs/security/dependency-audit.md` records the current production and development audit boundary
- Vite-major migration is not performed without a separate compatibility plan and approval

---

# Core Feature Audit

Reviewed against the current implementation on 2026-06-06.

## Dashboard

- Implemented: 300ms debounced title, URL, folder path, full-pinyin, and pinyin-initial search.
- Implemented: four statistics cards.
- Implemented: quick action buttons.
- Implemented: local smart recommendation cards from scan results.

## Scanner

- Implemented: duplicate bookmark detection and cleanup.
- Implemented: duplicate folder detection and merge.
- Implemented: broken-link checks in a Web Worker.
- Implemented: recursive empty-folder detection.
- Implemented: batch empty-folder cleanup.

## Manager

- Implemented: hierarchical folder display, folder filtering, and expand/collapse controls.
- Implemented: batch move, batch delete, and batch tag editing.
- Implemented: tags and tag filtering.
- Implemented: drag/drop move and bookmark ordering.
- Implemented: responsive Manager columns avoid page-level overflow and keep title/actions visible on narrow screens.

## Import / Export

- Implemented: HTML import.
- Implemented: HTML, JSON, CSV, TXT, and OPML export.
- Implemented: JSON, CSV, TXT, and OPML import through the shared preview, conflict resolver, and backup flow.
- Implemented: URL conflict handling.
- Implemented: backup before import.

## Settings

- Implemented: persisted theme and language.
- Implemented: scanner configuration.
- Implemented: scheduled automatic structure scan through `chrome.alarms`.
- Implemented: backup retention is applied by `backupService`.
- Implemented: cache duration is applied when Scanner loads cached results.

## Localization

- English and Chinese resources are configured.
- English and Chinese locale key parity is covered by a unit test.
- Recent Activity, service errors, Scanner, Manager, Import/Export, Settings, and Dashboard additions use locale keys.
- Local English and Chinese visual QA passes across all primary routes at desktop and 390px widths.
- Current localization still needs final human visual copy review before stable store release.

END

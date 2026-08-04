# FavGrove Codex Guide

This file is the primary handoff document for Codex sessions working on FavGrove.
Read it before editing code, then check `SESSION.md`, `PROGRESS.md`, and any
task-specific design notes.

## Project Snapshot

- Product: FavGrove - Bookmark Manager.
- Type: Chrome and Edge extension.
- Architecture: Manifest V3 full-screen options page, no popup.
- Current release line: `0.2.1` beta candidate; `0.1.0` is the historical Markora beta.
- Repository: `https://github.com/everett7623/FavGrove`.
- Local app data policy: bookmark data stays in the browser. Do not add analytics,
  telemetry, cloud sync, or remote bookmark uploads unless explicitly requested.

## Current Priorities

1. Keep the verified `0.1.0` baseline and the current `0.2.1` FavGrove beta candidate healthy.
2. Close release-readiness gaps recorded in `PROGRESS.md` and `SESSION.md`.
3. Continue the active roadmap recorded in `SESSION.md`, `PROGRESS.md`, and
   `TASKS.md`.
4. Prefer small, verifiable changes over broad refactors.

## Fixed Stack

Use the existing stack unless the user explicitly approves a change:

- React 19
- TypeScript strict mode
- Vite 5
- CRXJS
- Manifest V3
- Zustand
- React Router v8 with `HashRouter`
- Tailwind CSS
- shadcn-style local UI primitives
- Lucide React
- react-i18next
- Vitest and Testing Library
- Playwright

Do not introduce Redux, MobX, Angular, Vue, Webpack, jQuery, popup pages, or new
UI libraries without approval.

## Architecture Rules

- Chrome APIs belong in services or background modules, not React components.
- Stores may call services, but stores must not contain JSX or direct Chrome API
  calls.
- Heavy or large-data work belongs in Web Workers where practical.
- Shared types live in `src/shared/types/`.
- Shared utilities, hooks, constants, and UI primitives live under `src/shared/`.
- Feature-specific UI and orchestration stays under `src/features/<feature>/`.
- Keep options-page routing full-screen; do not create `popup.html`.
- All user-facing strings should go through i18n resources.

## Important Paths

- `manifest.json`: extension manifest source.
- `src/background/`: Manifest V3 service worker and message routing.
- `src/workers/`: scanner, import, and link-check workers.
- `src/services/`: Chrome API and storage service boundaries.
- `src/stores/`: Zustand stores.
- `src/features/dashboard/`: dashboard UI.
- `src/features/scanner/`: scanner and link issue review UI.
- `src/features/manager/`: bookmark manager UI.
- `src/features/import-export/`: import/export UI.
- `src/features/settings/`: settings and backup management UI.
- `src/shared/i18n/locales/`: English and Chinese locale resources.
- `PROGRESS.md`: project status and release decision.
- `SESSION.md`: latest working context and next step.
- `TASKS.md`: broader roadmap and feature audit.

## Development Workflow

1. Run `git status --short --branch` and note existing uncommitted work.
2. Read the files related to the requested task before editing.
3. Preserve user changes. Do not revert unrelated modifications.
4. Make the smallest coherent change that satisfies the task.
5. Add or update tests when behavior changes.
6. Update `SESSION.md` and `PROGRESS.md` after completing a development phase.
7. Do not push automatically.

## Verification

Use the smallest useful verification while iterating, then run the appropriate
quality gate before reporting completion.

Core gates:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Extension gate:

```bash
npm run build:extension
```

E2E gate:

```bash
npm run test:e2e
```

On Windows, use `npm run test:e2e`; it starts and stops Vite through
`scripts/run-e2e.mjs`. Direct Playwright server usage may leave a process
running.

## Release Rules

- Load `dist/` for manual extension testing.
- Do not load `.crx-dev/` as the unpacked extension; it is development output.
- `npm run build:extension` must pass before considering `dist/` valid.
- `npm run package:release` creates the versioned ZIP after validation.
- Do not label the project `1.0.0` until all stable store-release gates pass.

## Data Safety

Create backups before destructive operations:

- batch delete
- import
- folder merge
- backup restore

The backup retention setting is persisted, but verify whether the service layer
currently applies it before marking that feature complete.

## Performance Expectations

The app should handle at least 10,000 bookmarks:

- virtualize large lists
- debounce search
- avoid rendering huge DOM lists
- use workers for expensive scans and parsing
- cache scan results with the configured duration
- clean up event listeners and observers

## Final Response Checklist

When finishing a coding task, report:

- what changed
- which files matter
- which verification commands passed
- any skipped checks or remaining risk

Keep the answer concise and do not claim completion if lint, typecheck, tests,
or build failed.

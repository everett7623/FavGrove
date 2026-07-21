# FavGrove Development Guide

This document describes how to work on FavGrove in a way that any Codex session
or human maintainer can pick up cleanly.

## Product Goal

FavGrove is a local-first bookmark management extension for Chrome and Edge. It
targets large bookmark collections and provides scanning, cleanup, import/export,
backup/restore, settings, and future local recommendation features.

## Application Shape

- Manifest V3 extension.
- Full-screen options page.
- React application routed with `HashRouter`.
- No popup page.
- Local-first privacy boundary.

## Source Layout

```text
src/
  background/
  workers/
  services/
  stores/
  shared/
    components/
    constants/
    hooks/
    i18n/
    types/
    utils/
  features/
    dashboard/
    scanner/
    manager/
    import-export/
    settings/
  router/
  styles/
  App.tsx
  main.tsx
```

## Layer Responsibilities

- React components render UI and call store actions.
- Zustand stores own feature state and call services.
- Services wrap Chrome APIs, storage, import/export, scanning, and backups.
- Workers handle expensive parsing and scan work.
- Background modules handle privileged extension work and message routing.
- Shared modules hold cross-feature types, hooks, utilities, UI primitives, and
  i18n resources.

## Coding Standards

- Use strict TypeScript.
- Avoid `any`; document it if unavoidable.
- Keep business logic out of JSX.
- Prefer pure utility functions for reusable data transformations.
- Use Tailwind and existing local UI primitives.
- Use Lucide icons for icon buttons.
- Keep i18n parity between English and Chinese resources.
- Keep changes scoped to the task.

## Chrome Extension Rules

- React components must not call `chrome.*` APIs directly.
- Permission changes need release-review attention.
- Broken-link checking may use optional host permissions.
- The extension must not upload bookmark data.
- Manual extension testing should load `dist/` only.
- Run `npm run audit:permissions` after manifest or permission-copy changes.

## Testing Strategy

Use focused verification during development:

```bash
npm run typecheck
npm run test
```

Use full verification before marking a phase complete:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Use extension verification when manifest, build output, icons, or packaging are
affected:

```bash
npm run build:extension
npm run audit:permissions
npm run package:release
```

Use E2E when changing user workflows:

```bash
npm run test:e2e
```

## Documentation Map

- `AGENTS.md`: Codex operating instructions and handoff rules.
- `SESSION.md`: current working context and next step.
- `PROGRESS.md`: overall project progress and release decision.
- `TASKS.md`: long-term roadmap and feature audit.
- `RELEASE_CHECKLIST.md`: store and artifact release gates.
- `VERSIONING.md`: version policy.

## Current Development Direction

The current active stream is release readiness plus comprehensive improvement.
The near-term priorities are:

1. Run and record final visible Chrome and Edge click-through checks from `dist/`.
2. Copy the verified public privacy policy and support URLs with the prepared submission fields into the store portals.
3. Create the GitHub beta pre-release from `docs/release/github-prerelease-v0.2.0.md`.
4. Keep destructive full replacement restore deferred unless a separate safety design is approved.
5. After release gates close, choose the next post-beta task; the read-only `TASK-705` milestone is implemented, while automatic AI recommendations and mutations remain deferred.

Always re-check `SESSION.md` and `PROGRESS.md` before choosing the next task.

# Current Session

Last updated: 2026-10-22

## Latest Review — 2026-10-17

- Settings persistence updates in-memory state before backup retention cleanup, so a cleanup failure no longer leaves the UI behind persisted settings, and delayed cleanup no longer overwrites a later edit.
- Regression coverage covers cleanup failure and overlapping settings edits.
- Verified: dependency audit (zero production vulnerabilities), lint, typecheck, 36 Vitest files / 147 tests, `build:extension` (validation + permission audit), and all 12 Playwright E2E flows.
- Installed Chrome/Edge checks and release packaging were not rerun for that settings-only patch.
- Version remains `0.3.0`. Visible-browser click-through and authenticated live-provider checks remain open.

## Current Goal

Complete and verify the `0.3.0` multi-provider AI analysis beta while preserving the local-first consent boundary and existing release gates.

## Current Status

- Beta core completion is about 96% against the scoped `0.3.0` checklist (not the full post-beta roadmap).
- P0–P5 foundations (Dashboard, Scanner, Manager, Import/Export, Settings) are implemented and verified.
- P7 AI: optional, read-only, multi-provider analysis is implemented (OpenAI, Claude, Gemini, Grok, OpenAI-compatible); automatic recommendation and mutation tasks remain post-beta.
- P6–P8 release tooling is mostly complete; human-visible browser checks and store portal submission remain open.
- Product brand is `FavGrove - Bookmark Manager` / `FavGrove 书签管理器`. The published `0.1.0` Markora release remains historical.
- Completed feature detail lives in `CHANGELOG.md` and git history; do not re-expand this file into a chronicle.

## Open Work

1. Load rebuilt `dist/chrome-mv3/` in visible Chrome and Edge; complete `docs/release/browser-clickthrough.md` (including AI disabled / preview / cancel).
2. Run one disposable live-provider compatibility check with user-owned credentials; do not persist the key.
3. Copy verified privacy policy and support URLs plus `store/submission-fields.md` into the store portals.
4. Finalize and publish the `0.3.0` GitHub beta pre-release from `docs/release/github-prerelease-v0.3.0.md`; upload the verified ZIP only after the visible browser pass.
5. Confirm the quality workflow passes on the pushed `0.3.0` beta commit.
6. Final human visual copy review in English and Chinese before stable store release.
7. Deferred post-beta: full destructive replacement restore (`docs/decisions/restore-strategy.md`); automatic AI recommendations / mutations (`docs/roadmap/post-beta-ai.md`).

## Release Decision

- Suitable as a `0.3.0` FavGrove beta candidate after the open work above.
- Not ready for Chrome Web Store / Edge Add-ons stable publication.
- Do not label the current build `1.0.0`. See `RELEASE_CHECKLIST.md` (Versioning).

## Design Notes / Pending Decisions

- Backup restore is non-destructive and idempotent (parent-ID/path mapping, missing-folder recreation, pre-write safety backup, rollback of newly created items on failure).
- Full destructive replacement restore is intentionally deferred.
- HTML import recreates nested folders; folder conflict behavior creates/imports new folders for the import batch.
- Folder merge keeps the first duplicate folder as the target, moves all source children, and creates a backup first.
- Bookmark drag/drop ordering before a target row is supported; folder ordering polish can wait for E2E coverage.
- A saved setting is not considered complete until its service behavior uses it.
- Manual unpacked-extension testing must load `dist/chrome-mv3/`; do not load `dist/` itself or `.crx-dev`.

## Handoff Notes

- Do not push automatically.
- Update this file after completing each development phase.
- Use `npm run test:e2e` for Playwright; direct `playwright test` can leave the local web server hanging on Windows.
- Architecture, commands, and review checklist live only in `CLAUDE.md`.

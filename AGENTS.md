# FavGrove Codex Guide

This file covers Codex-specific handoff rules only.

**Architecture, layer boundaries, development commands, coding standards, and the
code review checklist live in `CLAUDE.md`. Read it first.** Do not duplicate that
content here; earlier copies drifted out of sync with the code.

## Project Snapshot

- Product: FavGrove - Bookmark Manager.
- Type: Chrome and Edge extension, Manifest V3, full-screen options page, no popup.
- Current release line: `0.3.0` multi-provider AI beta candidate. `0.1.0` is the
  historical Markora beta and must not be rewritten or retagged.
- Repository: `https://github.com/everett7623/FavGrove`.
- Local app data policy: bookmark data stays in the browser. Do not add analytics,
  telemetry, cloud sync, or remote bookmark uploads unless explicitly requested.
  The opt-in AI analysis boundary is documented in `CLAUDE.md`.

## Current Priorities

1. Keep the verified `0.1.0` baseline and the current `0.3.0` beta candidate healthy.
2. Close release-readiness gaps recorded in `PROGRESS.md` and `SESSION.md`.
3. Continue the active roadmap recorded in `SESSION.md`, `PROGRESS.md`, and `TASKS.md`.
4. Prefer small, verifiable changes over broad refactors.

## Development Workflow

1. Run `git status --short --branch` and note existing uncommitted work.
2. Read `SESSION.md` and `PROGRESS.md` before choosing the next task.
3. Read the files related to the requested task before editing.
4. Preserve user changes. Do not revert unrelated modifications.
5. Make the smallest coherent change that satisfies the task.
6. Add or update tests when behavior changes.
7. Update `SESSION.md` and `PROGRESS.md` after completing a development phase.
8. Do not push automatically.

## Verification

Use the smallest useful verification while iterating, then run the appropriate
quality gate before reporting completion. Gate definitions and the full command
list are in `CLAUDE.md`.

## Final Response Checklist

When finishing a coding task, report:

- what changed
- which files matter
- which verification commands passed
- any skipped checks or remaining risk

Keep the answer concise and do not claim completion if lint, typecheck, tests,
or build failed.

## Task Archive

`.codex/tasks/` holds completed task records from earlier sessions. They are
historical context, not active instructions.

# GitHub Pre-Release Draft: v0.3.0

## Release Settings

- Tag: `v0.3.0`
- Target branch: `main`
- Release title: `FavGrove v0.3.0 Beta`
- Mark as pre-release: yes
- Attach assets:
  - `dist/favgrove-v0.3.0-chrome.zip`
  - `dist/favgrove-v0.3.0-chrome.sha256`

## Summary

FavGrove v0.3.0 is the multi-provider AI beta of the local-first Manifest V3 bookmark workspace for Chrome and Edge. It is fully compatible with the `0.1.0` Markora and `0.2.x` FavGrove releases; bookmark data, settings, backups, and import formats remain compatible.

## Highlights

- Optional, read-only AI bookmark analysis is now multi-provider: OpenAI, Anthropic Claude, Google Gemini, xAI Grok, and generic third-party OpenAI-compatible endpoints, with fixed official endpoints, provider-aware model suggestions and request previews, and lossless legacy settings migration.
- AI stays opt-in and disabled by default: API keys and results are transient, preprocessing strips URL query/fragment data locally in a Worker, evidence validation drops ungrounded findings, and each endpoint origin needs explicit host-permission consent.
- Full-screen options-page workspace for Chrome and Edge.
- Dashboard statistics, quick actions, recent activity, and local cleanup recommendations.
- Duplicate bookmark, duplicate folder, empty-folder, and broken-link scanning.
- Link issue review with manual verification states, per-link rechecks, ignored-link management, and backup-protected deletion.
- Virtualized bookmark manager with rename, move, reorder, tags, batch tag editing, batch delete, and undo.
- HTML, JSON, CSV, TXT, and OPML import/export with preview and conflict handling.
- Local backups, non-destructive missing-bookmark recovery, backup retention, theme, language, and automatic daily structure scan settings.
- Toolchain hardening: Vite `7.3.6`, Vitest `4.1.11`, React `19.2.7`, React Router `8.3.0`; production dependencies audit clean, and every resolvable development advisory is fixed by upgrade.

## Privacy

FavGrove stores bookmark metadata, settings, scan cache, search history, tags, and backups locally in browser extension storage. It does not include analytics, telemetry, account sync, a developer-operated AI proxy, or developer-operated bookmark uploads. Optional AI analysis is disabled by default and sends only previewed metadata directly to a user-selected endpoint after confirmation; API keys and results are not persisted.

## License

FavGrove v0.3.0 is distributed under `GPL-3.0-or-later`. The release archive includes the matching license text, and the corresponding source is available from the tagged repository version. Previously distributed versions retain their existing license grants.

## Verification Before Publishing

- `npm run audit:dependencies`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run benchmark:performance`
- `npm run build:extension`
- `npm run audit:permissions`
- `npm run check:browsers`
- `npm run check:browser-data-safety`
- `npm run test:e2e`
- `npm run package:release`

On 2026-10-13 all gates passed locally: the dependency audit (22 production packages, zero vulnerabilities), ESLint with 0 warnings, TypeScript strict checking, 145 unit tests, the 10,000-bookmark benchmark, production extension validation with permission audit, isolated installed Chrome `155.0.8059.39` / Edge `155.0.4283.45` verification, the Chrome real-data safety check, 12 Playwright E2E flows, and deterministic release packaging with SHA-256.

## Known Beta Gaps

- Final visible Chrome and Edge click-through results must be recorded before store submission.
- Store portal upload and review are not performed from this repository.
- The GitHub repository is available at `https://github.com/everett7623/FavGrove`.
- Full destructive bookmark-tree replacement restore is deferred by decision.
- Live-provider compatibility must be checked with a user-owned endpoint, model, and credential; automated tests use a simulated compatible provider.
- Automatic AI bookmark mutations and later recommendation features remain out of scope.

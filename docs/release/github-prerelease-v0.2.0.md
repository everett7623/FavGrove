# GitHub Pre-Release Draft: v0.2.0

## Release Settings

- Tag: `v0.2.0`
- Target branch: `main`
- Release title: `FavGrove v0.2.0 Beta`
- Mark as pre-release: yes
- Attach assets:
  - `release/favgrove-v0.2.0.zip`
  - `release/favgrove-v0.2.0.sha256`

## Summary

FavGrove v0.2.0 is the rebranded beta of the local-first Manifest V3 bookmark workspace for Chrome and Edge. The product was previously released as Markora v0.1.0; bookmark data, settings, backups, and import formats remain compatible.

## Highlights

- New FavGrove product name and refreshed English and Chinese release copy.
- Full-screen options-page workspace for Chrome and Edge.
- Dashboard statistics, quick actions, recent activity, and local cleanup recommendations.
- Duplicate bookmark, duplicate folder, empty-folder, and broken-link scanning.
- Link issue review with manual verification states, per-link rechecks, ignored-link management, and backup-protected deletion.
- Virtualized bookmark manager with rename, move, reorder, tags, batch tag editing, batch delete, and undo.
- HTML, JSON, CSV, TXT, and OPML import/export with preview and conflict handling.
- Local backups, non-destructive missing-bookmark recovery, backup retention, theme, language, and automatic daily structure scan settings.
- Optional read-only AI analysis through a user-provided compatible endpoint, with request preview, redaction, cancellation, and strict result validation.

## Privacy

FavGrove stores bookmark metadata, settings, scan cache, search history, tags, and backups locally in browser extension storage. It does not include analytics, telemetry, account sync, a developer-operated AI proxy, or developer-operated bookmark uploads. Optional AI analysis is disabled by default and sends only previewed metadata directly to a user-selected endpoint after confirmation; API keys and results are not persisted.

## License

FavGrove v0.2.0 is distributed under `GPL-3.0-or-later`. The release archive includes the matching license text, and the corresponding source is available from the tagged repository version. Previously distributed versions retain their existing license grants.

## Verification Before Publishing

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run benchmark:performance`
- `npm run build:extension`
- `npm run audit:permissions`
- `npm run check:browsers`
- `npm run test:e2e`
- `npm run package:release`

## Known Beta Gaps

- Final visible Chrome and Edge click-through results must be recorded before store submission.
- Store portal upload and review are not performed from this repository.
- The GitHub repository is available at `https://github.com/everett7623/FavGrove`.
- Full destructive bookmark-tree replacement restore is deferred by decision.
- Live-provider compatibility must be checked with a user-owned endpoint, model, and credential; automated tests use a simulated compatible provider.
- Automatic AI bookmark mutations and later recommendation features remain out of scope.

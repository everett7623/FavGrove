# Release Checklist

## Quality Gates

- [x] `npm install`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run benchmark:performance`
- [x] `npm run test:e2e`
- [x] `npm run build`
- [x] `npm run validate:extension`
- [x] `npm run audit:permissions`
- [x] `npm run check:browsers`
- [x] `npm run capture:store-screenshots`
- [x] `npm run package:release`
- [x] Windows GitHub Actions quality workflow is configured for the release gates.
- [ ] The quality workflow passes on the pushed `0.2.0` beta commit.

## Localization

- [x] English and Chinese locale key sets match.
- [x] Recent Activity and error messages follow locale keys.
- [x] English primary route smoke checks pass.
- [x] Chinese primary route smoke checks pass.
- [ ] Final human visual copy review is complete in both languages.

## Manifest Review

- [x] Manifest version is `3`.
- [x] `package.json` and `manifest.json` versions match.
- [x] No popup page is configured.
- [x] Options page opens in a full browser tab.
- [x] Required permissions have a documented user-facing purpose.
- [x] `tabs` permission was removed after source audit confirmed no `chrome.tabs` usage.
- [x] `npm run audit:permissions` verifies manifest and privacy-copy alignment.
- [x] `<all_urls>` remains optional and is requested only for broken-link scanning or an explicitly confirmed user-selected AI endpoint.
- [x] Store update notifications use the browser-managed update lifecycle without new permissions or remote version polling.

## Privacy And Security

- [x] `PRIVACY.md` matches current behavior.
- [x] No analytics, telemetry, remote tracking, developer-operated AI proxy, or automatic cloud upload was introduced.
- [x] Imported files and URLs are validated.
- [x] Destructive operations create backups where currently implemented.
- [x] No bookmark data is sent to a developer-controlled FavGrove server; optional AI requests go directly to the user-selected endpoint after preview and confirmation.

## Manual Extension Checks

- [x] Isolated installed Chrome and Edge profiles load `dist/` through the supported DevTools extension API with the MV3 service worker, all primary routes, AI disabled, and no pre-confirmation external requests.
- [x] Visible Chrome and Edge click-through checklist is prepared in `docs/release/browser-clickthrough.md`.
- [ ] Load `dist/` as an unpacked extension without manifest warnings in visible Chrome and Edge.
- [ ] Clicking the extension action opens the full-screen options page.
- [x] Dashboard, Scanner, Manager, Import / Export, AI Analysis, and Settings routes open.
- [ ] Broken-link permission is requested only after starting a scan.
- [ ] AI endpoint permission is requested only after opt-in, local preview, and explicit confirmation.
- [ ] AI domain-only mode sends no bookmark titles, paths, tags, URL queries, or URL fragments.
- [ ] Rename, move, delete, undo, folder merge, import, export, backup, and missing-bookmark restore flows work without deleting current bookmarks.
- [ ] Light, dark, English, and Chinese settings persist after restart.

## Store Submission

- [x] Store description is current.
- [x] Store portal submission field worksheet is prepared in `store/submission-fields.md`.
- [x] GitHub pre-release draft metadata is prepared in `docs/release/github-prerelease-v0.2.0.md`.
- [x] Privacy policy URL is publicly accessible.
- [x] 1280x800 or 640x400 screenshots are prepared.
- [x] 440x280 promotional tile is prepared if required.
- [x] 128x128 store icon is prepared.
- [x] Support URL and contact information are current.
- [x] Release ZIP contains only production extension files.
- [x] Release ZIP includes the repository GPL license text.
- [x] Repository license file is present and matches the README.
- [x] Release is marked as beta or pre-release while the version is below `1.0.0`.

## Release Artifacts

The packaging command creates:

```txt
release/favgrove-v<version>.zip
```

Upload the generated ZIP to the Chrome Web Store or Microsoft Edge Add-ons portal.

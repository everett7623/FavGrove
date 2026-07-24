# Visible Browser Click-Through

Date: 2026-07-16

## Status

- Continued on 2026-07-22 from a clean working tree; `main` is 14 commits ahead of `origin/main`.
- Automated installed-browser smoke passed previously, while the final human-visible interaction checks remain open.

## Goal

Complete and record the final visible Chrome and Edge click-through checks for
the FavGrove `0.2.0` beta candidate using the production `dist/` build.

## Scope

- Rebuild and validate the production extension.
- Verify visible Chrome and Edge loading without manifest warnings.
- Check the full-screen options-page routes and the manual workflows listed in
  `docs/release/browser-clickthrough.md` with disposable bookmark data.
- Record browser versions, results, and any discovered defects.

## Constraints

- Load only `dist/`; never load `.crx-dev`.
- Do not submit store forms, create a release, upload artifacts, or push code.
- Do not start `TASK-705` while the release gates remain open.
- Preserve existing user bookmarks by using disposable test data and backups.

## Checklist

- [x] `npm run build:extension`
- [x] `npm run check:browsers`
- [ ] Visible Chrome check
- [ ] Visible Edge check
- [ ] Update `docs/release/browser-clickthrough.md`
- [ ] Update `RELEASE_CHECKLIST.md`, `SESSION.md`, and `PROGRESS.md`
- [ ] Run the required documentation/change verification

## 2026-07-22 Continuation

- [x] Rebuild and validate the current `dist/` without changing permissions or release metadata.
- [ ] Launch the isolated visible Chrome runner and verify the non-destructive, credential-free checklist items.
- [ ] Launch the isolated visible Edge runner and verify the same checklist items.
- [ ] Record only directly observed results; keep optional-host-permission acceptance, destructive bookmark flows, restart persistence, and authenticated provider checks manual unless explicitly authorized.

### Runner cleanup defect

- Closing visible Chrome exposed an `EPERM` failure while removing its isolated temporary profile.
- Root cause: the runner observed the persistent context closing but did not wait for the browser process to disconnect before deleting the profile.
- Fix implemented and verified: wait for browser disconnect, then retry only transient Windows handle-release errors with a bounded delay.

## Notes

- Remote fetch completed successfully on 2026-07-16.
- `main` and `origin/main` were fast-forwarded to `7febb36d` on 2026-07-16.

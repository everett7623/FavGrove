# Browser Click-Through Checklist

Use this checklist for the final visible Chrome and Edge pass. `npm run check:browsers` installs and loads the production extension through the supported DevTools extension API in isolated official Chrome and Edge profiles. This document records the human-visible workflows that automation cannot close before store submission.

## Build Under Test

```bash
npm run build:extension
npm run check:browsers
```

For the isolated visible pass, launch one browser at a time and close its window when the checklist is complete:

```bash
npm run check:browsers:visible -- chrome
npm run check:browsers:visible -- edge
```

The visible runner uses a temporary browser profile, loads `dist/` through the DevTools extension API, and removes the profile after the browser closes. It does not use or modify the normal Chrome or Edge profile.

Load only:

```text
D:\EvenFrank\Workspace\Plugins\Google\FavGrove\dist
```

Do not load the project root or `.crx-dev`.

## Result Log

| Date | Browser | Version | Tester | Result | Notes |
|---|---|---|---|---|---|
| 2026-07-21 | Chrome | 150.0.7871.125 | Codex automated visible smoke | Partial pass | `dist/` enabled; MV3 worker, six routes, AI off, zero external requests, and zero page errors verified. Toolbar click, permission prompts, destructive flows, and restart persistence remain manual. |
| 2026-07-21 | Edge | 150.0.4078.83 | Codex automated visible smoke | Partial pass | `dist/` enabled; MV3 worker, six routes, AI off, zero external requests, and zero page errors verified. Toolbar click, permission prompts, destructive flows, and restart persistence remain manual. |

## Required Checks

- Load `dist/` as an unpacked extension with no manifest warnings.
- Confirm the extension action opens the full-screen FavGrove options page.
- Open Dashboard, Scanner, Manager, Import / Export, AI Analysis, and Settings from the built extension.
- Confirm broken-link scanning requests optional `<all_urls>` host access only after the user starts a link scan.
- Confirm AI Analysis is disabled by default and makes no request before preview confirmation.
- With a disposable user-owned compatible endpoint, confirm the request preview shows destination, model, scope, fields, counts, and estimate before endpoint permission is requested.
- Confirm cancellation and a provider-error response return the page to an actionable state without modifying bookmarks.
- Exercise rename, move, delete, undo, duplicate-folder merge, import preview, export, backup, and missing-bookmark restore flows on disposable bookmark data; confirm restore keeps current bookmarks.
- Confirm light mode, dark mode, English, and Chinese settings persist after browser restart.
- Confirm no popup page appears and all primary workflows remain in the options tab.

## Notes

- Use disposable bookmark folders and exported backup files during this pass.
- Record browser versions from `chrome://version` and `edge://version`.
- If a browser shows a Manifest V3 warning, stop the release pass and fix the manifest before continuing.

# Browser Click-Through Checklist

Use this checklist for the final visible Chrome and Edge pass. `npm run check:browsers` installs and loads the production extension through the supported DevTools extension API in isolated official Chrome and Edge profiles. `npm run check:browser-data-safety` additionally exercises real Chrome bookmark CRUD, bookmark and empty-folder Undo with browser-generated IDs, tag migration, and nested import consistency in a disposable profile. This document records the human-visible workflows that automation still cannot close before store submission.

## Build Under Test

```bash
npm run build:extension
npm run check:browsers
npm run check:browser-data-safety
```

For the isolated visible pass, launch one browser at a time and close its window when the checklist is complete:

```bash
npm run check:browsers:visible -- chrome
npm run check:browsers:visible -- edge
```

The visible runner uses a temporary browser profile, loads `dist/chrome-mv3/` through the DevTools extension API, opens the FavGrove options page, and removes the profile after the browser closes. It does not use or modify the normal Chrome or Edge profile. The runner opening the initial options tab does not replace the separate action-button check below.

Load only:

```text
D:\EvenFrank\Workspace\Plugins\Google\FavGrove\dist\chrome-mv3
```

Do not load the project root, `dist/` itself, or `.crx-dev`.

## Result Log

| Date | Browser | Version | Tester | Result | Notes |
|---|---|---|---|---|---|
| 2026-07-21 | Chrome | 150.0.7871.125 | Codex automated visible smoke | Partial pass | `dist/` enabled; MV3 worker, six routes, AI off, zero external requests, and zero page errors verified. Toolbar click, permission prompts, destructive flows, and restart persistence remain manual. |
| 2026-07-21 | Edge | 150.0.4078.83 | Codex automated visible smoke | Partial pass | `dist/` enabled; MV3 worker, six routes, AI off, zero external requests, and zero page errors verified. Toolbar click, permission prompts, destructive flows, and restart persistence remain manual. |

## Required Checks

- Load `dist/chrome-mv3/` as an unpacked extension with no manifest warnings.
- Confirm the extension action opens the full-screen FavGrove options page.
- Open Dashboard, Scanner, Manager, Import / Export, AI Analysis, and Settings from the built extension.
- Confirm broken-link scanning requests optional `<all_urls>` host access only after the user starts a link scan.
- Confirm AI Analysis is disabled by default and makes no request before preview confirmation.
- With a disposable user-owned compatible endpoint, confirm the request preview shows destination, model, scope, fields, counts, and estimate before endpoint permission is requested.
- Confirm cancellation and a provider-error response return the page to an actionable state without modifying bookmarks.
- Confirm the automated Chrome data-safety result, then visibly exercise duplicate-folder merge, export, backup, and missing-bookmark restore flows on disposable bookmark data; confirm restore keeps current bookmarks.
- Confirm light mode, dark mode, English, and Chinese settings persist after browser restart.
- Confirm no popup page appears and all primary workflows remain in the options tab.

## Notes

- Use disposable bookmark folders and exported backup files during this pass.
- Record browser versions from `chrome://version` and `edge://version`.
- If a browser shows a Manifest V3 warning, stop the release pass and fix the manifest before continuing.

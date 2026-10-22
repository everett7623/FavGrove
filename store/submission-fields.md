# Store Submission Fields

Use this worksheet when copying FavGrove metadata into the Chrome Web Store and Microsoft Edge Add-ons portals.

## Listing

- Product name: `FavGrove - Bookmark Manager`
- Developer name: `everettlabs`
- Contact email: `everett7623@gmail.com`
- Short description: `A local-first bookmark workspace with scanning, cleanup, import/export, backups, and optional user-configured AI analysis.`
- Category: `Productivity`
- Support URL: `https://github.com/everett7623/FavGrove/issues`
- Privacy policy URL: `https://github.com/everett7623/FavGrove/blob/main/PRIVACY.md`
- Repository URL: `https://github.com/everett7623/FavGrove`

## Single Purpose

FavGrove helps users organize, scan, clean, import, export, back up, and optionally analyze browser bookmark collections inside Chrome or Edge.

## Permission Justifications

- `alarms`: Runs the optional daily local structure scan when automatic scanning is enabled.
- `bookmarks`: Reads and updates bookmarks for scan, cleanup, import, export, restore, and management workflows.
- `storage`: Stores local settings, tags, scan caches, search history, recent activity, and backups.
- Optional `<all_urls>` host access: Requested only when the user starts broken-link scanning or confirms an AI request to a user-selected endpoint.

The extension does not request the `tabs` permission.

## Data Usage

- No analytics.
- No telemetry.
- No advertising.
- No account sync.
- No sale or sharing of user data.
- No bookmark uploads to a developer-controlled FavGrove server; FavGrove operates no AI proxy.
- Bookmark data stays in browser APIs and extension storage unless the user exports a file or explicitly previews and confirms an optional request to their selected AI endpoint.
- AI is disabled by default, API keys are not persisted, and URL queries/fragments are removed from AI metadata requests.

## Assets

- Store listing draft: `store/listing.md`
- Screenshots: `store/screenshots/`
- Promotional assets: `store/assets/`
- Extension package: `dist/favgrove-v0.3.0-chrome.zip`
- Extension package checksum: `dist/favgrove-v0.3.0-chrome.sha256`

## Beta Notes

Use `v0.3.0` as a beta or pre-release label. Do not present this build as stable `1.0.0` until the visible browser checks, portal review, and final publication gates are complete.

# Privacy Policy

Last updated: July 16, 2026

FavGrove is a local-first Chrome and Edge extension for organizing browser bookmarks.

## Data Collection

The FavGrove project and its developer do not collect, sell, or share personal information. FavGrove does not operate an analytics service, account service, bookmark storage service, or AI proxy.

Optional AI analysis can transmit a minimized bookmark metadata request directly to an endpoint selected and configured by the user. No AI request starts until the user enables the feature, reviews the request preview, and confirms the destination.

It does not include:

- Analytics
- Telemetry
- Advertising
- Remote tracking
- Cloud synchronization
- Automatic or developer-operated bookmark uploads

## Local Data

The extension processes bookmark data locally in the browser. Settings, scan caches, search history, tags, recent activity, backups, pending extension-update version metadata, and the optional AI provider/endpoint/model configuration are stored with the browser extension storage API.

This data remains on the user's device unless the user explicitly exports a file or confirms an optional AI analysis request as described below. AI API keys and AI results are not stored.

## Permissions

- `alarms`: Schedules the optional daily local bookmark structure scan when the user enables automatic scanning in Settings.
- `bookmarks`: Reads and updates the user's bookmark tree when the user uses management features.
- `storage`: Stores settings, local tags, scan caches, search history, recent activity, and backups.
- Optional `<all_urls>` host access: Requested only after the user starts broken-link checking or confirms an AI request to a selected endpoint. It is used for direct link validation or the confirmed AI endpoint request and is not used to collect page content.

## Network Requests

Network requests occur only for URLs selected by the broken-link scanner, browser-managed extension updates, or an AI endpoint explicitly configured and confirmed by the user. Bookmark data is not sent to a developer-controlled server operated by FavGrove.

## Optional AI Analysis

AI analysis is disabled by default. FavGrove includes direct request adapters for OpenAI, Claude, Gemini, Grok, and generic third-party OpenAI-compatible endpoints, but no SDK, shared API key, or developer-operated proxy. Official endpoint presets are fixed; gateway and proxy URLs are available only through the third-party compatible mode.

Before each AI request, FavGrove shows the selected provider, scope, destination URL, model, fields, item counts, and estimated request size. The default domain-only mode sends hostname aggregates and counts. If the user selects metadata mode, FavGrove may send bookmark titles, hostnames, URL pathnames, folder paths, and local tags for at most 200 sample items. URL query strings and fragments are removed. Aggregate counts can cover the complete selected scope.

FavGrove never sends bookmark page content, backups, search history, recent activity, ignored-link lists, browser history, or analytics data to the AI endpoint. The API key remains in the current page memory and is not persisted, logged, exported, or included in diagnostics. AI results are transient and read-only.

The selected provider controls its own retention, training, regional, security, pricing, and quota policies. Users should review those policies before sending a request.

## Extension Updates

Chrome and Edge manage store update checks and downloads. FavGrove listens for the browser's update-ready event, stores only the available version and detection time locally, and shows a reload notice. FavGrove does not poll Google, Microsoft, or GitHub for version information.

## Imports And Exports

Imported bookmark files are parsed locally. Exported files are generated locally and downloaded only at the user's request.

## Data Deletion

Users can delete extension-managed backups and browser bookmarks from within the extension. Removing the extension also removes extension-local storage according to browser behavior.

## Changes

Material privacy changes will be documented in this file and reflected in the extension release notes.

## Contact

Project repository:

https://github.com/everett7623/FavGrove

Developer: `everettlabs`

Email: `everett7623@gmail.com`

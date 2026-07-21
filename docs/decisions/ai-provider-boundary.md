# AI Provider And Data Boundary Decision

Date: 2026-07-16

## Decision

FavGrove implements its first model-backed feature through a user-provided
OpenAI-compatible Chat Completions endpoint and model name. FavGrove does not
select a provider, bundle a provider SDK, ship a shared key, or operate a proxy.

Users may enter an origin, an `/v1` base URL, or a full Chat Completions path.
Only the unambiguous origin and `/v1` forms are completed automatically;
custom paths remain unchanged, and the exact resolved URL is shown before the
request is confirmed.

The user explicitly requested implementation before the previously planned
post-release sequence was complete. The privacy, permission, schema, and test
gates remain mandatory and are implemented with the feature.

## Credential And Storage Boundary

- AI analysis is disabled by default.
- Endpoint, model, enabled state, and privacy mode are stored locally.
- The API key is held only in the current options-page memory.
- The key is sent directly to the selected endpoint through the background
  request boundary and is not logged, exported, or persisted.
- Analysis results are transient and are not persisted.

## Request Boundary

Every remote request requires this sequence:

1. The user enables AI analysis.
2. The user selects the whole library or one folder.
3. A Web Worker builds a local, bounded request preview.
4. FavGrove shows the destination origin, model, scope, fields, counts, and
   estimated token size.
5. The user confirms the request and grants optional host access for the
   selected endpoint.

The default `domain-only` mode sends only hostname aggregates and counts. The
optional `metadata` mode sends at most 200 samples containing titles, hostname,
URL pathname, folder path, and local tags. URL query strings and fragments are
never included. Aggregate counts still cover the complete selected scope.

FavGrove never sends page content, backups, search history, recent activity,
ignored-link lists, browser history, or analytics data.

## Response Contract

The versioned response schema contains:

- a summary;
- topics with count, confidence, and evidence;
- read-only folder, tag, organization, or review suggestions;
- warnings.

Responses are parsed from untrusted JSON, capped at 1 MB before parsing, field-length bounded, type checked, and
validated so evidence must match a hostname, folder value, or item reference in
the request. Standard string content and compatible text-part arrays are
accepted. Findings without valid request evidence are removed individually;
if no returned finding remains supported, the response is rejected. Model
output has no path to Chrome bookmark mutation APIs.

## Runtime Behavior

- One task may run at a time.
- Duplicate starts are disabled while running.
- The request has a 60-second timeout and no automatic retry to avoid duplicate
  provider charges.
- The user can cancel the active request.
- Provider errors are shown without logging the request or credential.

## Known Limitations

- Providers must support the Chat Completions request and response shape.
- Provider retention, training, regional, pricing, and quota policies are
  controlled by the provider selected by the user.
- Automated tests use a simulated compatible provider. A visible live-provider
  check still requires the user's endpoint, model, and credential.

# OpenAI-compatible endpoint returns invalid structured analysis

Date: 2026-07-16

## Symptom

FavGrove completed a request to a user-selected Chat Completions endpoint but
rendered only the generic `invalid structured analysis` error.

## Evidence collected

- User screenshot: the request preview was created for 3,384 bookmarks with a
  200-item metadata sample, then the provider result failed validation.
- Credential-free probe:
  - `POST https://sub2.uukk.de/v1/chat/completions`
  - HTTP status: `401 Unauthorized`
  - content type: `application/json`
  - response code: `API_KEY_REQUIRED`
  - supported authentication named by the service: Bearer, `x-api-key`, and
    `x-goog-api-key`
- No API key, Authorization header, raw bookmark payload, or successful model
  response was captured.

## Finding

The endpoint path and Bearer transport contract are recognized by the service.
The generic client error combines three different downstream failures: missing
standard response content, invalid analysis JSON/schema, and evidence that does
not exactly match the minimized request. The available evidence cannot identify
which of those three occurred in the user's successful authenticated response.

## Fix direction

- Normalize only unambiguous origin and `/v1` base URLs.
- Display the exact resolved URL before confirmation.
- Support standard string content and text-part arrays.
- Keep strict schema validation, but validate evidence per finding so one bad
  finding does not discard other supported findings.
- Surface distinct localized failure stages without logging raw responses.

## Live recheck

Pending a user rerun with the rebuilt extension. Record only the displayed
sanitized failure stage or success result; never record the credential or raw
bookmark payload.

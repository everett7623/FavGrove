# AI Provider Compatibility Follow-up

Date: 2026-07-16

## Status

Implemented and automatically verified. An authenticated user rerun against the
reported provider remains open because credentials and raw responses are never
captured by FavGrove.

## Observed Symptom

- A real user-owned provider request reached
  `https://sub2.uukk.de/v1/chat/completions` but FavGrove displayed the generic
  `invalid structured analysis` error.
- A credential-free contract probe returned HTTP 401 with JSON code
  `API_KEY_REQUIRED` and explicitly accepted Bearer, `x-api-key`, or
  `x-goog-api-key` authentication. This confirms that the Chat Completions path
  is recognized; no user credential was read or recorded.
- The exact successful model response remains unavailable because FavGrove does
  not log provider responses and the current browser session cannot be inspected
  from this development environment.

## Goal

Improve compatibility without silently accepting an unsafe or ambiguous API
contract:

1. Accept an origin or `/v1` base URL and resolve it to the Chat Completions path.
2. Show the exact resolved request URL in the confirmation preview.
3. Accept the standard string content shape and the compatible text-part array
   shape while rejecting unrelated response wrappers.
4. Validate evidence per finding, remove unsupported findings when other valid
   findings remain, and report a warning instead of failing the entire result.
5. Return distinct, localized errors for missing response content, invalid JSON
   schema, and wholly unsupported evidence.

## Non-goals

- Reading, logging, or persisting the user's API key or raw provider response.
- Guessing arbitrary provider-specific paths.
- Adding support for a second API family such as Anthropic Messages or Gemini.
- Weakening the read-only model-output boundary.

## Verification

- Endpoint normalization, text-part content, filtered evidence, wholly invalid
  evidence, and error-stage mapping are covered.
- ESLint and TypeScript strict checking passed.
- 26 Vitest files with 100 tests passed.
- The focused 10,000-bookmark benchmark passed.
- Production extension validation and permission audit passed.
- Chrome and Edge headless load checks passed.
- 11 Playwright E2E tests passed, including base-URL completion and resolved URL
  preview before provider contact.

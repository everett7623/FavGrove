# Post-Beta AI Analysis And Local Recommendation Roadmap

The first read-only AI analysis milestone was implemented on 2026-07-16 after explicit user direction to continue before the earlier release-gate sequence was complete. Later automatic recommendation and mutation work remains post-beta.

## Release Gates Before Starting

- Visible Chrome and Edge click-through checks are recorded.
- Store submission metadata is copied into the target portals.
- Public privacy policy and support URLs are confirmed.
- GitHub beta pre-release metadata is published or ready for publication.
- The release package under `release/` is generated from a passing production build.

## Guardrails

- Prefer local deterministic recommendations before AI-assisted behavior.
- Do not upload bookmark data to developer-controlled servers.
- Do not introduce analytics, telemetry, or account sync as part of recommendations.
- Keep recommendation output explainable and reversible.
- Keep destructive cleanup actions behind previews, backups, and confirmations.

## Candidate Work

- Better local folder recommendations from bookmark title, URL, tags, and existing folder paths.
- Local duplicate-cluster explanations with suggested cleanup priority.
- Tag suggestions derived from local bookmark metadata.
- Search ranking improvements based on local usage and recency.
- Optional future model integration only if privacy, consent, and data-boundary requirements are explicitly approved.

## First AI Milestone

The first model-backed feature is `TASK-705 AI Bookmark Library Analysis`.
Its implementation specification is recorded in
`.codex/tasks/ai-analysis-integration-2026-07-15.md`.

The milestone is intentionally read-only. It analyzes a user-selected scope,
returns provider-neutral structured findings, and does not directly delete,
move, merge, or tag bookmarks.

## Implemented First-Milestone Sequence

1. Provider-aware adapters and transient-key execution selected for OpenAI, Claude, Gemini, Grok, and third-party compatible endpoints.
2. Versioned request/response schema and local preprocessing contract implemented.
3. Opt-in scope preview, URL redaction, token estimation, timeout, and cancellation implemented.
4. Provider-neutral service/background boundary and structured result UI implemented.
5. Privacy, store disclosure, unit, performance, and E2E validation updated.

No provider SDK, shared credential, or developer-operated AI proxy is bundled. Official endpoint presets remain disabled until the user opts in and confirms a request.

## Validation

Future recommendation work should include unit coverage for ranking behavior, E2E coverage for accepted and dismissed suggestions, and clear privacy documentation before release.

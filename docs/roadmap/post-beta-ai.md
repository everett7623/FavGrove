# Post-Beta AI Analysis And Local Recommendation Roadmap

The first read-only AI analysis milestone was implemented after explicit user direction. Later automatic recommendation and mutation work remains post-beta. Current beta status and open release gates live in `SESSION.md`.

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

## First AI Milestone (shipped in 0.3.0)

Opt-in, read-only bookmark-library analysis with provider-aware adapters (OpenAI, Claude, Gemini, Grok, OpenAI-compatible), privacy redaction, scoped samples, cancellation, and strict evidence validation. Architecture and privacy boundary: `docs/decisions/ai-provider-boundary.md` and `CLAUDE.md`.

The milestone is intentionally read-only. It analyzes a user-selected scope, returns provider-neutral structured findings, and does not directly delete, move, merge, or tag bookmarks.

No provider SDK, shared credential, or developer-operated AI proxy is bundled. Official endpoint presets remain disabled until the user opts in and confirms a request.

## Validation

Future recommendation work should include unit coverage for ranking behavior, E2E coverage for accepted and dismissed suggestions, and clear privacy documentation before release.

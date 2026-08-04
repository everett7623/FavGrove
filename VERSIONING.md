# Versioning

FavGrove follows Semantic Versioning while the product is below `1.0.0`.

## Current Version

`0.3.0`

This is the FavGrove multi-provider AI beta candidate. The published `0.1.0` release remains the historical Markora beta and must not be rewritten or retagged.

## Release Stages

- `0.1.0`: historical Markora public beta.
- `0.2.x`: FavGrove rebrand, beta stabilization, and compatible improvements.
- `0.3.x`: opt-in multi-provider AI analysis and compatible provider adapters.
- `0.9.x`: release candidates after performance, manual browser, privacy, and store checks pass.
- `1.0.0`: first stable Chrome and Edge store release.

## Rules

- Increment PATCH for compatible bug fixes.
- Increment MINOR for new features or meaningful workflow changes.
- Keep `package.json`, `manifest.json`, the UI footer, and release package filename synchronized.
- Use Git tags in the form `v<version>`.
- Mark GitHub releases as pre-release until `1.0.0`.
- Do not publish `1.0.0` while required items in `RELEASE_CHECKLIST.md` remain incomplete.

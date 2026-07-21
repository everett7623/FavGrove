# Dependency Audit

## 2026-07-22

Production dependencies have no reported vulnerabilities when checked with:

```bash
npm run audit:dependencies
```

The command uses the npm registry directly because the configured mirror does not implement the npm security-advisories endpoint. The production audit currently covers 26 packages and reports zero info, low, moderate, high, or critical vulnerabilities.

The full development-tool audit currently reports two findings:

- Vite `5.4.21` and its esbuild `0.21.5` dependency are affected by advisories fixed only by a newer Vite major line.
- The project remains intentionally on Vite 5, so this migration requires an explicit stack decision and a separate compatibility pass.

The development audit no longer reports the earlier CRXJS/Rollup, Vitest, `brace-expansion`, `form-data`, or `js-yaml` findings. CRXJS is `2.7.1`, Vitest is `3.2.7`, and the patched transitive versions are locked in `package-lock.json`.

The remaining findings affect local build/test tooling, not the bundled production extension. Do not expose the Vite development server or run Vitest UI against untrusted projects. CI runs the production-only audit as a release gate; the full development audit remains an informational migration item until the fixed Vite major line is approved.

Relevant advisories:

- [Vite optimized-deps path traversal](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)
- [Vite Windows `server.fs.deny` bypass](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)
- [esbuild development-server request exposure](https://github.com/advisories/GHSA-67mh-4wv8-2f99)

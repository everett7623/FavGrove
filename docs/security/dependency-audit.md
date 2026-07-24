# Dependency Audit

## 2026-07-25

Production dependencies are checked with:

```bash
npm run audit:dependencies
```

The command uses the npm registry directly because the configured mirror does not implement the npm security-advisories endpoint. The production audit currently covers 22 packages.

React `19.2.7`, React DOM `19.2.7`, and React Router `8.3.0` replaced the prior React 18 / Router v6-v7 stack after open-redirect, XSS, SSR-hydration, and unstable-RSC advisories made every available earlier Router line fail the production audit. FavGrove continues to use declarative `HashRouter` routing with fixed internal destinations; imports now use the supported `react-router` v8 package and obsolete v6 future flags were removed. The production audit now reports zero vulnerabilities. Lint, strict type checking, 115 unit tests, the 10,000-bookmark performance gate, the production extension build, 12 Playwright tests, isolated installed Chrome/Edge verification, and release packaging passed after the migration.

The audit also reads the full development report. It permits only the explicitly documented Vite 5/esbuild advisory IDs below; any new package, advisory ID, or severity escalation fails the command.

The full development-tool audit currently reports two findings:

- Vite `5.4.21` and its esbuild `0.21.5` dependency are affected by advisories fixed only by a newer Vite major line.
- The project remains intentionally on Vite 5, so this migration requires an explicit stack decision and a separate compatibility pass.

The development audit no longer reports the earlier CRXJS/Rollup, Vitest, PostCSS, `brace-expansion`, `form-data`, or `js-yaml` findings. CRXJS is `2.7.1`, Vitest is `3.2.7`, and the patched transitive versions are locked in `package-lock.json`.

The remaining findings affect local build/test tooling, not the bundled production extension. Do not expose the Vite development server or run Vitest UI against untrusted projects. CI runs this production and development-policy audit as a release gate; the two documented Vite 5 findings remain an informational migration item until the fixed Vite major line is approved.

As defense in depth, the shared Vite configuration binds development and preview servers to `127.0.0.1`, restricts accepted Host headers to loopback names, and allows CORS only for loopback HTTP origins and Chrome extension origins. This reduces exposure but does not replace the future Vite-major migration.

Relevant advisories:

- [React Router backslash open redirect](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6)
- [React Router SSR hydration constructor injection](https://github.com/advisories/GHSA-337j-9hxr-rhxg)
- [React Router open redirect leading to XSS](https://github.com/advisories/GHSA-jjmj-jmhj-qwj2)
- [React Router unstable RSC CSRF bypass](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)
- [Vite optimized-deps path traversal](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)
- [Vite Windows `server.fs.deny` bypass](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)
- [esbuild development-server request exposure](https://github.com/advisories/GHSA-67mh-4wv8-2f99)

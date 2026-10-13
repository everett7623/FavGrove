# Dependency Audit

## 2026-10-13

Newly published advisories made the development audit fail again. The critical findings are fixed by upgrading Vitest from `3.2.7` to `4.1.11`: `@vitest/mocker` `4.1.11` clears the redirect-mock path traversal (`GHSA-82fw-gwwq-j7x9`), and Vitest 4 no longer depends on `tinypool`, removing both prototype-pollution RCE gadgets (`GHSA-5gmw-xhrv-c9v3`, `GHSA-85c8-ppgw-ccpr`) from the tree. Vitest 4 accepts Vite `^6 || ^7 || ^8`, so Vite `7.3.6` and `@vitejs/plugin-react` `4.7.0` stayed unchanged; this also relaxes the Vite 8 constraint recorded on 2026-09-04.

The lockfile was refreshed within existing ranges for `brace-expansion` `1.1.21` and `source-map-js` `1.2.2`, clearing their denial-of-service advisories with no direct dependency, override, or exception.

The remaining high and moderate findings all belong to the Tailwind CSS 3 build chain. `braces` (`GHSA-vfj7-8cjw-p6xm`) has no fixed release in the `3.x` line, and the `postcss-selector-parser` fix `7.1.6` (`GHSA-rj75-hqrm-r3gf`) is outside the `^6` range of `postcss-nested` `6.2.0`, so no non-breaking resolution exists. These findings are allowlisted in `scripts/dependency-audit-policy.mjs` as documented exceptions pending the approved Tailwind 4 migration, following the same pattern as the pre-2026-09-04 Vite 5 entries. All of them are development-only pattern-parsing denial-of-service issues in build and test tooling; nothing ships in the extension bundle.

Lint, strict type checking, 145 unit tests (including the export Worker mock updated for Vitest 4 constructor semantics), the 10,000-bookmark performance gate, the production extension build with validation and permission audit, isolated installed Chrome `155.0.8059.39` / Edge `155.0.4283.45` verification, the Chrome real-data safety check, 12 Playwright tests, and release packaging passed after the change.

## 2026-09-04

Production dependencies are checked with:

```bash
npm run audit:dependencies
```

The command uses the npm registry directly because the configured mirror does not implement the npm security-advisories endpoint. The production audit currently covers 22 packages.

Vite was upgraded from `5.4.21` to `7.3.6` on 2026-09-04. This clears the last outstanding development advisories: the Vite optimized-deps path traversal, the Vite Windows `server.fs.deny` bypass, and the esbuild development-server request exposure no longer appear in the development report. Both the production and development audits now report zero vulnerabilities.

Vite 7 was chosen over Vite 8 deliberately. `@crxjs/vite-plugin` `2.7.1` accepts either line, but `@vitejs/plugin-react` `4.7.0` supports at most Vite 7 and `vitest` `3.2.7` depends on Vite `^5 || ^6 || ^7`. Vite 8 would have forced simultaneous major upgrades of the React plugin and the test runner, putting all 139 unit tests on the regression surface. Vite 7 required no other dependency change. Lint, strict type checking, 139 unit tests, the production extension build, the permission audit, and 12 Playwright tests passed after the upgrade.

React `19.2.7`, React DOM `19.2.7`, and React Router `8.3.0` replaced the prior React 18 / Router v6-v7 stack after open-redirect, XSS, SSR-hydration, and unstable-RSC advisories made every available earlier Router line fail the production audit. FavGrove continues to use declarative `HashRouter` routing with fixed internal destinations; imports use the supported `react-router` v8 package and obsolete v6 future flags were removed.

## Development Advisory Policy

The audit also reads the full development report and checks it against the allowlist in `scripts/dependency-audit-policy.mjs`. Any package, advisory ID, or severity outside that allowlist fails the command.

The only exceptions in force are the Tailwind CSS 3 toolchain findings (`braces`, `chokidar`, `fast-glob`, `micromatch`, `postcss-nested`, `postcss-selector-parser`, `tailwindcss`) recorded on 2026-10-13, pending the approved Tailwind 4 migration. Every other advisory is resolved by upgrading or refreshing the lockfile.

## Resolved Advisory History

- The Vitest `@vitest/mocker` path traversal and `tinypool` prototype-pollution RCE findings that failed the development policy on 2026-10-13 were cleared by the Vitest `4.1.11` upgrade described above.
- `brace-expansion` (`1.1.21`) and `source-map-js` (`1.2.2`) denial-of-service advisories failed the development policy on 2026-10-13. Existing parent ranges already allowed fixed releases, so the lockfile was refreshed with no direct dependency, override, or exception.
- The Tailwind CSS 3 toolchain findings (`braces`, `chokidar`, `fast-glob`, `micromatch`, `postcss-nested`, `postcss-selector-parser`, `tailwindcss`) are allowlisted as of 2026-10-13 because no fixed releases exist in their current lines. They remain an informational migration item until the Tailwind 4 major migration is approved.
- Vite and esbuild advisories were cleared by the 2026-09-04 Vite 7 upgrade described above. They had previously been allowlisted as an informational migration item because no fixed Vite 5 release existed.
- `js-yaml` and `nanoid` denial-of-service advisories failed the development policy on 2026-08-19. Existing parent ranges already allowed fixed releases, so the lockfile was refreshed to `js-yaml` `4.3.1` and `nanoid` `3.3.18` with no direct dependency, override, or exception.
- A `brace-expansion` denial-of-service advisory (`GHSA-mh99-v99m-4gvg`) failed the first remote Windows quality run on 2026-07-30. The lockfile was refreshed the same way to `1.1.18` in the ESLint chain and `5.0.9` in the TypeScript ESLint chain.
- Earlier CRXJS/Rollup, Vitest, PostCSS, and `form-data` findings were cleared by moving to CRXJS `2.7.1` and Vitest `3.2.7` with patched transitive versions locked.

## Defense In Depth

The shared Vite configuration binds development and preview servers to `127.0.0.1`, restricts accepted Host headers to loopback names, and allows CORS only for loopback HTTP origins and Chrome extension origins. Do not expose the Vite development server or run Vitest UI against untrusted projects. CI runs the production and development-policy audit as a release gate.

## Relevant Advisories

- [React Router backslash open redirect](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6)
- [React Router SSR hydration constructor injection](https://github.com/advisories/GHSA-337j-9hxr-rhxg)
- [React Router open redirect leading to XSS](https://github.com/advisories/GHSA-jjmj-jmhj-qwj2)
- [React Router unstable RSC CSRF bypass](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)
- [Vite optimized-deps path traversal](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)
- [Vite Windows `server.fs.deny` bypass](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)
- [esbuild development-server request exposure](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- [js-yaml quadratic CPU consumption](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj)
- [nanoid zero-size generator infinite loop](https://github.com/advisories/GHSA-2v37-7h3g-55p8)
- [Vitest `@vitest/mocker` redirect-mock path traversal](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)
- [Tinypool prototype pollution RCE in worker options](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3)
- [Tinypool prototype pollution RCE in `run()` options](https://github.com/advisories/GHSA-85c8-ppgw-ccpr)
- [brace-expansion quadratic `{a},b}` expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr)
- [brace-expansion nested brace group recursion](https://github.com/advisories/GHSA-qhr7-859c-m2p7)
- [brace-expansion `parseCommaParts` recursion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p)
- [source-map-js section offset event-loop denial of service](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
- [braces deeply nested pattern stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [PostCSS `postcss-selector-parser` flat selector quadratic complexity](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)

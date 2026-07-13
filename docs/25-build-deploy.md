# 25 — Build, Deploy & Release

## Build (`webspace-engine/webpack.config.js`)

- Single entry `src/index.js` → single artifact `dist/assets/js/index.js` (a few MB minified) — the
  whole engine is one script by design, so a world needs one include.
- Loaders: babel (JSX/env, react-intl + styled-components plugins per `babel.config.js`),
  sass/css/style, html-loader (HTML-as-string), `worker-loader` (workers), `worklet-loader`
  (audio worklets), file/url loaders (content-addressed assets), svg-inline, raw.
- Aliases force single ESM instances of `three` and `yjs` (double-instantiation breaks both), and
  point at Basis/Draco codec paths. Node polyfills (buffer/stream/path/crypto) + ProvidePlugin for
  `Buffer`/`process`.
- DefinePlugin injects env (BUILD_VERSION, SENTRY_DSN, server URLs) from `.defaults.env` /
  `.env` via dotenv. Legacy Hubs vars remain (RETICULUM_SERVER, SHORTLINK_DOMAIN,
  THUMBNAIL_SERVER, TERRA_SERVER, CORS_PROXY_SERVER — todo: "drop envs in webpack config",
  "remove hubs cloud stuff from webpack").
- Browser targets: last 2 Chrome/Firefox.

## Commands

| | |
|---|---|
| `npm run local` | dev server `0.0.0.0:8080`, HMR, `localDev` env |
| `npm run build` | production bundle |
| `npm run stats` / `bundle-analyzer` | bundle inspection |
| `npm run test` | eslint + ava unit tests (`test/unit`) + build |
| `npm run storybook` / `build-storybook` | UI gallery |
| `npm run spritesheet` | rebuild action/notice spritesheets |
| `npm run deploy` | build + `aws s3 cp dist/assets/js/index.js s3://webspace.run/webspace-latest.js` (public-read, `max-age=7200, s-maxage=120`) |
| `npm run undeploy` | scripted rollback (`scripts/undeploy.js`) |

## Distribution model

- **`https://webspace.run`** serves `webspace-latest.js` from the S3 bucket — the URL every world
  includes. Cache: 2h browser / 2min edge, so a deploy reaches users quickly. All existing worlds
  auto-upgrade (no version pinning mechanism shipped — worth knowing before deploying breaking
  changes).
- **`https://webspaces.space`** (GitHub Pages, [23](23-sdk-site.md)) is docs/tutorials plus the
  service worker file users copy.
- Worlds themselves deploy wherever the author likes; GitHub Pages + GitHub writeback
  ([12](12-writeback.md)) is the blessed path.
- Sentry (raven-js) wiring exists via `SENTRY_DSN` if error reporting is wanted.

## Versioning & CI

`package.json` is at 0.9.0 and publishes only `dist/assets/js/index.js` (npm-installable, though
the script-tag path is primary). `.github/` contains workflow config in the engine repo; tests are
ava + lint (kept light). The service worker has its own manual version
(`webspace.service.1.0.1.js`).

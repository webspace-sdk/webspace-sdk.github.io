# 22 — Configuration Surface: Meta Tags, Attributes, Query Params, Service Worker

Webspaces has no config files or dashboards; the "API" a world author uses is the document itself.
This is the reference for that surface. (Historic naming note: `webspace.service.js` sounds like a
scripting SDK but is actually the COEP service worker; a page-scripting API beyond the document
format never shipped.)

## `<head>` meta tags (`webspace.*`)

### Environment
| Meta name | Values | Meaning |
|---|---|---|
| `webspace.environment.type` | `terrain` | enables the procedural environment |
| `webspace.environment.terrain.type` | `islands` \| `hills` \| `plains` \| `flat` | generator ([17](17-terrain.md)) |
| `webspace.environment.terrain.seed` | integer | deterministic world shape |
| `webspace.environment.terrain.colors.<name>` | `#rrggbb`, names: ground, edge, leaves, bark, rock, grass, sky, water | world palette (`WORLD_COLOR_TYPES`) |

### Spawn & projection
| Meta name | Values | Meaning |
|---|---|---|
| `webspace.environment.spawn_point.transform` | CSS transform (`translate3d(…cm) rotate3d(…rad)`) | where visitors appear |
| `webspace.environment.spawn_point.radius` | number | randomized spawn scatter |
| `webspace.projection.type` | `flat` (default `spatial`) | render as 2D page vs 3D world |

("Skybox in meta tag" and "add support for some configs in index.html" — e.g. TURN/networking
settings — were planned but unfinished; `src/schema.toml` sketches a feature-flag/config schema.)

### Identity & permissions
| Meta name | Values | Meaning |
|---|---|---|
| `webspace.keys.owner` | base64 JWK | owner's public key; anchors Ed25519 challenge/response ([10](10-networking.md)) |
| `webspace.permissions.content_change_role` | `owner` \| `member` | who may edit content |
| `webspace.permissions.save_changes_to_origin` | `true`/`false` | whether edits persist to the file |

## Body element vocabulary

Covered fully in [06 — DOM ↔ 3D](06-dom-to-3d.md): tags (`img`, `video`, `audio`, `embed`, `model`,
`label`, `marquee`, `div`, `a`), the `transform` cm/rad convention, and behavioral attributes
(`draggable`, `contenteditable`, `data-stack-axis`, 7-char `id`s).

## Query parameters (grep `qsTruthy` in `src/index.js` for the full set)

| Param | Effect |
|---|---|
| `?skip_lipsync` | disable lip sync pipeline |
| `?noaechack` | disable the Chrome AEC workaround |
| `?offline` | don't spawn a networked avatar |
| debug/bot flags (`isDebug`, `isBotMode`) | verbose logging, headless behavior |

("Allow networking settings to be changed via qs" was a todo.)

## The service worker (`webspace.service.js`)

Copied next to the world's HTML on HTTP(S) hosts; versioned (`webspace.service.1.0.1.js`).
Intercepts fetches to add COEP `credentialless` / COOP `same-origin` / CORP `cross-origin`,
enabling SharedArrayBuffer ([21](21-workers-wasm.md)). Network-first for navigations. Registered by
the engine when not on `file:`.

## Runtime globals (for debugging / unofficial scripting)

In a running world's console (remember: UI/scene are inside `window.DOM_ROOT`):

- `window.APP` — store, channels, `atomAccessManager`, metadata sources, detail level.
- `window.SYSTEMS` (and `AFRAME.scenes[0].systems["hubs-systems"]`) — every engine system.
- `NAF.connection` — broadcast/send data, connection state.
- Scene events (`add_media`, `action_share_screen`, …) can be emitted on the `a-scene` element —
  this is exactly what the React UI does, and the closest thing to a scripting API.

# 06 — The DOM ↔ 3D Mapping & Webspace Document Format

The defining feature of Webspaces: HTML in, HTML out. This doc covers both directions and the
document format itself.

## A complete webspace document

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://webspace.run"></script>

  <!-- Environment -->
  <meta name="webspace.environment.type" content="terrain" />
  <meta name="webspace.environment.terrain.type" content="plains" />   <!-- plains|hills|islands|flat -->
  <meta name="webspace.environment.terrain.seed" content="117" />
  <meta name="webspace.environment.terrain.colors.ground" content="#041223" />
  <meta name="webspace.environment.terrain.colors.sky" content="#535F6E" />
  <!-- also: water, grass, rock, bark, leaves, edge -->

  <!-- Spawn point -->
  <meta name="webspace.environment.spawn_point.transform"
        content="translate3d(-1157cm, 126cm, -578cm) rotate3d(-0.029, 0.997, -0.070, 3.919rad)" />
  <meta name="webspace.environment.spawn_point.radius" content="0" />

  <!-- Page vs world -->
  <meta name="webspace.projection.type" content="flat" />   <!-- omit/spatial for 3D -->

  <!-- Ownership & permissions -->
  <meta name="webspace.keys.owner" content="eyJjcnY..." />              <!-- base64 JWK public key -->
  <meta name="webspace.permissions.content_change_role" content="owner" /> <!-- owner|member -->
  <meta name="webspace.permissions.save_changes_to_origin" content="true" />

  <style>
    body * { display: none; }               /* hide raw DOM; engine renders via canvas */
    body { margin: 0; overflow: hidden; background-color: #061139; }
  </style>
</head>
<body>
  <!-- world objects go here (see below) -->
</body>
</html>
```

The `body * { display: none }` style makes the file degrade gracefully: without the engine you see a
blank page rather than a soup of raw elements; with it, the shadow root takes over rendering anyway.

## Body elements → world objects

Each direct child of `<body>` with a valid 7-char ID becomes one networked entity. The element's tag
and attributes select the media type; its inline `style` `transform` gives it a spatial pose.

| Markup | In-world object |
|---|---|
| `<img src="…">` | Textured plane (aspect preserved); GIF/WebP animated |
| `<video src="…">` | Video screen with controls; YouTube URLs resolve via youtubei.js; HLS/DASH streams supported |
| `<audio>` | Positional audio source with speaker icon |
| `<embed>` (PDF) | Paged PDF viewer with hover pager |
| `<model type="model/vnd.svox" src="x.svox">` | Smooth-voxel model (editable in-world with `~`) |
| `<model type="model/gltf-binary" src="x.glb">` | glTF model (Draco supported) |
| `<label contenteditable>…</label>` | Editable rich-text page/label (Quill; `<h1>` etc. inside) |
| `<marquee>` | Banner text variant |
| `<div style="font-family: emoji">🖱</div>` | 3D voxelized emoji (voxmoji) |
| `<a href>` | Linked media / navigable link object |

### Attributes that matter

- `id="abc1234"` — 7-char deterministic ID (see below). Required for networking.
- `draggable=""` — object can be grabbed/moved in-world.
- `contenteditable=""` — text is editable in-world.
- `loading="lazy"` — hint kept on images.
- `data-stack-axis="forward|…"` — snap-stacking orientation (todo.txt flags this attribute's
  DOM-vs-file duality as an unresolved design question).
- style properties: `color`, `background-color`, `font-family` (maps to the engine's font set:
  sans-serif/serif/mono/comic/writing/emoji…), `-webkit-text-stroke*` for outlines.

### The transform convention

CSS transforms are the pose format, parsed by `src/utils/world-importer.js:37–73` and written back by
`src/systems/dom-serialize-system.js`:

```
transform: translate3d(Xcm, Ycm, Zcm) rotate3d(ax, ay, az, THETArad) scale3d(sx, sy, sz)
```

- **centimeters → meters ÷ 100** (cm chosen so file values are readable integers).
- `rotate3d` is axis-angle in radians.
- Serialization always emits this canonical three-function form.

## Import: HTML → entities (`src/utils/world-importer.js`)

1. Boot captured `document.body.innerHTML` (see [05](05-boot-sequence.md)).
2. `DOMParser` parses it; each qualifying body child is wrapped in an A-Frame entity stamped from a
   NAF template — `#interactable-media` for editable objects, `#static-media`/
   `#static-controlled-media` for immutable ones — carrying the standard component stack:
   `media-loader`, `body-helper` (physics), `floaty-object`, `hoverable-visuals`, `tags`,
   `wrapped-entity`, `dom-serialized-entity`, `listed-media`, `set-yxz-order` (canonical Euler order).
3. `media-loader` then resolves the `src` and attaches the type-specific view component
   ([09 — media pipeline](09-media-pipeline.md)).
4. NAF is paused during import and resumed after, then `document-imported` state is added.

### Deterministic IDs (`src/index.js:827–867`)

```js
hash = SHA-256(el.outerHTML + index)
id   = 7 alphanumeric chars from seedrandom(hash)
```

Same file → same IDs on every client → NAF network IDs (`naf-abc1234`) agree everywhere with no
coordination. This is why the engine seeds its RNG at boot and why serialization must stay canonical.

## Export: entities → HTML (`src/systems/dom-serialize-system.js`)

Runs continuously (including via the paused-mode self-tick). For each entity with
`dom-serialized-entity`:

- Chooses the output tag from the media component: image→`img`/`a`, pdf→`embed`, vox→`model`,
  emoji→`div`, text→`label`/`marquee`/`div`, video→`video`.
- Writes pose via `posRotScaleToCssTransform()` in the cm/rad canonical form.
- Maintains a dirty list; flushes on tick to avoid mutation storms.

The serialized light DOM is what the writeback system persists ([12](12-writeback.md)) and what
`update_nav`/full-HTML broadcasts share with peers.

## Head metadata flows

Hub (world) metadata lives in the same document's meta tags and is read by
`LocalDOMHubMetadataSource`; space metadata (the world tree / navigation) is parsed out of the
*index* document by `IndexDOMSpaceMetadataSource` and rebuilt on `update_nav` broadcasts
(`doc/meta-dataflow.txt` sketches both flows; details in [13](13-collaborative-editing.md)).

## Flat projection

`webspace.projection.type = flat` renders the document as a 2D page (orthographic camera, page-like
UI) while remaining the same engine and the same multiplayer document — a wiki page and a 3D world
are the same file format. Worlds and pages can link to each other with plain `<a>` tags.

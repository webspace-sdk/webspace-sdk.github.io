# 12 — Writeback & Persistence

Webspaces has no database. Persistence = writing the (serialized) HTML document, plus its `assets/`
folder, back to wherever it lives. This doc covers the origin abstraction, both writeback backends,
the dirty-tracking loop, and local storage.

## The orchestrator: AtomAccessManager (`src/utils/atom-access-manager.js`)

- On init, picks a writeback backend: `file:` protocol → `FileWriteback`; otherwise, if the local
  store has GitHub credentials → `GitHubWriteback` (`init()` at lines 107+).
- Installs a **MutationObserver over `document.documentElement`** (subtree, childList, attributes,
  characterData; styled-components `<style>` churn ignored). Mutations mark the document dirty and
  queue a write (~250ms batch).
- **Throttling**: writes flush at most every `MAX_WRITE_RATE_MS = 10000` (10s). `beforeunload`
  forces an immediate flush if dirty and prompts if a write is in flight.
- Exposes `documentIsDirty` + `document-dirty-state-changed` (drives the unsaved-changes UI),
  `saveChangesToOrigin`, `writebackOriginState()`, and `uploadAsset()`.
- **Master-writer election**: only one client writes to the origin at a time (others' edits reach
  the master via NAF and are saved by it).
- Also the permissions authority ([10](10-networking.md)) — access and persistence are one module
  because both answer "who may change this file".

What gets written is the light DOM, which `DomSerializeSystem` keeps current ([06](06-dom-to-3d.md)).

## Backend 1: FileWriteback (`src/writeback/file-writeback.js`)

For worlds opened from disk (`file:`), using the **File System Access API** (Chrome):

- **Handles** persist in IndexedDB db `file-handles` (stores `space-file-handles` by space_id,
  `url-file-handles` by url), so re-opening a world doesn't re-prompt for the folder.
- `open()` → `window.showDirectoryPicker()`, validates the directory against the URL path, locates
  the HTML file, stores handles; permissions via `queryPermission`/`requestPermission({mode:
  "readwrite"})`.
- `write(content)` → `createWritable()` → write → close, with an `isWriting` mutex and progress
  callbacks.
- `uploadAsset(file)` → writes into an `assets/` subdirectory; returns `assets/<name>`.
- `contentUrlForRelativePath()` serves local assets as cached blob URLs (with validity re-checks).

## Backend 2: GitHubWriteback (`src/writeback/github-writeback.js`)

For worlds hosted from a GitHub repo (typically GitHub Pages):

- **Credentials**: fine-grained PAT with Contents permission on the one repo (user walkthrough:
  `webspace-engine/github-writeback.md`), stored in the local store as
  `{ type: "github", user/org, repo, branch, secret }`.
- `open()` validates token, repo, and branch via **Octokat**, fetches the current file, and sets
  `originState` (VALID / INVALID_CREDENTIALS / INVALID_REPO / INVALID_PATH).
- `write(content, path)` performs a real git commit through the API: create blob (utf-8 or base64)
  → get branch head → create tree (mode 100644, base_tree = head) → create commit
  ("Update Webspace world <title>") → update the branch ref. Commits are atomic; no merge handling
  (single master writer makes conflicts rare; a deploy-in-flight guard was still a todo).
- `uploadAsset()` = `write()` under `assets/`; for **public** repos the origin info (owner/repo/
  branch) is broadcast in presence so peers can fetch assets via raw.githubusercontent.com; private
  repos don't broadcast.

The end-to-end effect: edit a world live on the web, and a minute later the repo has a commit — the
world's history is git history.

## Metadata dataflows (`doc/meta-dataflow.txt`)

- **Hub metadata** (world name, colors, spawn…): `hubChannel.updateHubMeta` → broadcast + write into
  DOM meta tags → MutationObserver → metadata source refresh → UI.
- **Space metadata** (the world tree): `dynaChannel.updateSpace` → 3s-throttled flush → writes the
  *index* HTML via writeback **and** broadcasts `update_nav` with the full HTML → peers rebuild
  their tree (`src/utils/tree-sync.js`, `tree-manager`) → `treedata_updated` → UI.

## Local storage inventory

| Store | Where | Contents |
|---|---|---|
| App store (`src/storage/store.js`) | localStorage key `___webspace_store`, jsonschema-validated | profile (displayName, avatar color), **credentials (ECDSA keypair)**, writeback config incl. GitHub PAT, activity flags (onboarding), settings (mic, key tips, detail level), equips (emoji/color slots), preferences |
| Hub store (`src/storage/hub-store.js`) | per-hub | last position/rotation (respawn where you left) |
| Media search store (`src/storage/media-search-store.js`) | memory | media browser results (legacy Reticulum search API: bing/tenor/youtube/sketchfab sources) |
| File handles | IndexedDB `file-handles` | FileSystem handles for file: worlds |
| Terrain cache | IndexedDB `terra` | generated terrain chunks by `type/mesher/seed/x/z/version` |

Security note for future work: the GitHub PAT lives in localStorage in plaintext, and the keypair is
likewise local-only — acceptable for a personal tool, worth revisiting for broader release.

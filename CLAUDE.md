# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

scottkit is a personal Manifest V3 Chrome extension (TypeScript, bundled with esbuild, no framework). Its features capture things from web pages and send them to "sinks" (currently only Logseq, via its local HTTP API at `127.0.0.1:12315`). The UI text and README are in Traditional Chinese. Keep user-facing strings in that language.

## Commands

```bash
npm run build       # wipe dist/, bundle every entry as an IIFE, copy public/ into dist/
npm run watch       # rebuild on change, with inline sourcemaps
npm run typecheck   # tsc --noEmit (esbuild does not type-check)
npm test            # node:test over src/**/*.test.ts (Node 24 strips the types; no deps)
```

Tests cover only code free of `chrome.*` (e.g. `features/shorten-url/picsee.ts`), and are excluded from `tsc` so Node types don't leak into extension code. There is no linter. To try a change, load `dist/` as an unpacked extension in `chrome://extensions`, and press reload on scottkit after each rebuild.

## Architecture

```
feature content script ──Clip──▶ background (dispatch / queue) ──▶ sinks
```

- **Features are injected on demand, not declared as content scripts.** A keyboard command (`chrome.commands`) makes `src/background.ts` look up the feature in `src/features/registry.ts` and run `chrome.scripting.executeScript` with the built file. This relies on the `activeTab` permission, so the extension has no broad host permissions. Don't add `<all_urls>`, and don't add `content_scripts` for capture features.
- **Site fixes** are the one exception: CSS-only `content_scripts` scoped to a single site, in `public/sites/<site>.css`, plus optional static `declarativeNetRequest` block rules in `public/sites/<site>-rules.json` limited with `initiatorDomains`. Weverse uses both: `weverse-rules.json` blocks Google's IMA ad SDK (`ima3.js`) so video ads never load, and `weverse.css` hides `#ad-container` as a fallback. Keep them CSS-only/declarative and each to one site.
- **Background features** (`run: "background"` in the registry) are the other kind: the command runs a function from `BACKGROUND_FEATURES` in `background.ts` instead of injecting a script. `shorten-url` uses this: it reads the clipboard through the offscreen document (`core/offscreen-clipboard.ts` + `offscreen/offscreen.ts`, using `execCommand` because an offscreen page never has focus), shortens it with PicSee (`api.pics.ee`), writes it back, and reports with `chrome.notifications`. It doesn't produce a Clip.
- Because the script runs again on every key press, each content script has to guard against running twice itself. `video-timestamp/content.ts` does this with a `window.__scottkit…Busy` flag.
- **Clip** (`src/core/clip.ts`) is the only contract between features and sinks: `{ id, kind, url, title, createdAt, data }`. Features choose `kind` and `data`, and sinks choose how to store them.
- **Messaging**: content scripts and the options page talk to the service worker only through the typed `Request` union in `src/core/messages.ts`, using the `send()` helper. To add a message, extend the union and the `switch` in `background.ts`.
- **Queue** (`src/core/queue.ts`): `dispatch` sends a clip to every sink in `settings.enabledSinks`. Each failure becomes a `QueueItem` for that sink, stored in `chrome.storage.local`. A `chrome.alarms` alarm retries every minute, and the badge shows how many items are pending. Retrying stops a sink at its first failure so clips stay in order. All mutations go through the `exclusive()` promise lock. `refreshQueueState` re-syncs the badge and alarm when the service worker restarts.
- **Sinks** implement `Sink` (`send` throws on failure, and `test` is used by the options page). `src/sinks/logseq/index.ts` sends each clip to a per-`kind` handler, or falls back to an inbox page if the kind has none. Feature-specific Logseq writing code lives with the feature (`features/video-timestamp/logseq.ts`), not in the sink.
- **Settings** (`src/core/settings.ts`): kept in `chrome.storage.local` on purpose, not `sync`, so the Logseq token stays on this machine. Stored values are deep-merged over `DEFAULT_SETTINGS`, so new sections with defaults just work for existing installs. Arrays are replaced, not merged. The options page binds inputs through `data-path="a.b"` attributes in `public/options.html`.
- **Overlay UI** (`src/ui/overlay.ts`) uses plain DOM rather than shadow DOM on purpose. Sites like YouTube only ignore their shortcuts when the event target is a real `<input>`. It also stops key events from propagating and skips Enter while an IME is composing.
- **Video timestamp**: `adapters.ts` holds site-specific logic (YouTube, bilibili, and a generic fallback that must stay last). `logseq.ts` reuses any top-level block whose content contains `videoKey`, including blocks written by hand, and otherwise creates a new parent block.

## Adding a feature

You have to update four places, and they must use the same id (for a `run: "background"` feature, skip 1 and 4 and add the function to `BACKGROUND_FEATURES` instead):
1. `src/features/<name>/content.ts`: build a clip with `newClip("<kind>", …)` and send `scottkit:clip`
2. `src/features/registry.ts`: add an entry
3. `public/manifest.json`: add a `commands` entry with the same id
4. `build.mjs`: add an `entryPoints` entry (its output path must match `script` in the registry)
5. Optional: add a handler for the kind in `src/sinks/logseq/index.ts`

To add a new sink, implement `Sink`, register it in `src/sinks/index.ts`, and add its id to `enabledSinks`. If it calls a new local server, it also needs that server in `host_permissions`.

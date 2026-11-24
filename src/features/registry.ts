/**
 * Features triggered by a keyboard shortcut. Each one injects a script into the
 * active tab on demand (activeTab), so scottkit needs no broad host permissions.
 *
 * To add a feature:
 *   1. add an entry here
 *   2. add the command (same id) to public/manifest.json "commands"
 *   3. add the script entry to build.mjs (for "inject" features)
 *
 * "background" features run in the service worker instead of the page (see
 * BACKGROUND_FEATURES in background.ts), for work that needs no page access.
 */
export type Feature =
  | { id: string; label: string; run: "inject"; /** Built file path inside dist/. */ script: string }
  | { id: string; label: string; run: "background" };

export const FEATURES: Feature[] = [
  { id: "video-timestamp", label: "記錄影片時間點", run: "inject", script: "features/video-timestamp.js" },
  { id: "shorten-url", label: "縮短剪貼簿裡的網址（PicSee）", run: "background" },
];

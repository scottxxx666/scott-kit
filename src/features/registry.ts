/**
 * Features triggered by a keyboard shortcut. Each one injects a script into the
 * active tab on demand (activeTab), so scottkit needs no broad host permissions.
 *
 * To add a feature:
 *   1. add an entry here
 *   2. add the command (same id) to public/manifest.json "commands"
 *   3. add the script entry to build.mjs
 */
export interface Feature {
  id: string;
  label: string;
  /** Built file path inside dist/. */
  script: string;
}

export const FEATURES: Feature[] = [
  { id: "video-timestamp", label: "記錄影片時間點", script: "features/video-timestamp.js" },
];

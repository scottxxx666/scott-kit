import type { Clip } from "../../core/clip";

export const VIDEO_TIMESTAMP = "video-timestamp";

export interface VideoTimestampData {
  site: string;
  seconds: number;
  /** "12:07" or "1:02:03" */
  timeLabel: string;
  note: string;
  /** Stable id used to find this video's block again (YouTube id, BV id, path…). */
  videoKey: string;
  /** Canonical URL of the video without a timestamp. */
  videoUrl: string;
  /** URL that jumps to `seconds`, or null if the site can't do that. */
  timeUrl: string | null;
}

export type VideoTimestampClip = Clip<typeof VIDEO_TIMESTAMP, VideoTimestampData>;

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

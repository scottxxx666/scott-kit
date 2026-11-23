import type { Clip } from "./clip";

/** Messages sent to the background service worker. */
export type Request =
  | { type: "scottkit:clip"; clip: Clip }
  | { type: "scottkit:queue-status" }
  | { type: "scottkit:retry-queue" }
  | { type: "scottkit:clear-queue" }
  | { type: "scottkit:test-sink"; sinkId: string };

export interface DispatchResult {
  /** Sinks that stored the clip right away. */
  sent: string[];
  /** Sinks that failed; the clip is queued for retry. */
  queued: { sinkId: string; error: string }[];
}

export interface QueueStatus {
  count: number;
  items: { sinkId: string; kind: string; title: string; attempts: number; lastError: string }[];
}

export type TestResult = { ok: true; detail: string } | { ok: false; error: string };

export function send<T>(req: Request): Promise<T> {
  return chrome.runtime.sendMessage(req) as Promise<T>;
}

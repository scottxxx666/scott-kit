import type { Clip } from "./clip";
import type { DispatchResult, QueueStatus } from "./messages";
import { getSettings } from "./settings";
import { SINKS } from "../sinks";

interface QueueItem {
  clip: Clip;
  sinkId: string;
  attempts: number;
  lastError: string;
}

const KEY = "queue";
export const RETRY_ALARM = "scottkit-retry";

async function load(): Promise<QueueItem[]> {
  return ((await chrome.storage.local.get(KEY))[KEY] as QueueItem[] | undefined) ?? [];
}

async function store(items: QueueItem[]) {
  await chrome.storage.local.set({ [KEY]: items });
  await chrome.action.setBadgeText({ text: items.length ? String(items.length) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#d97706" });
  if (items.length) chrome.alarms.create(RETRY_ALARM, { periodInMinutes: 1 });
  else await chrome.alarms.clear(RETRY_ALARM);
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Serialize queue mutations so overlapping dispatch/retry calls don't clobber each other.
let lock: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => {});
  return run;
}

/** Send a clip to every enabled sink; failures are queued for retry. */
export function dispatch(clip: Clip): Promise<DispatchResult> {
  return exclusive(async () => {
    const settings = await getSettings();
    const result: DispatchResult = { sent: [], queued: [] };
    const failed: QueueItem[] = [];
    for (const sinkId of settings.enabledSinks) {
      const sink = SINKS[sinkId];
      if (!sink) continue;
      try {
        await sink.send(clip, settings);
        result.sent.push(sinkId);
      } catch (e) {
        const error = errMsg(e);
        result.queued.push({ sinkId, error });
        failed.push({ clip, sinkId, attempts: 1, lastError: error });
      }
    }
    if (failed.length) await store([...(await load()), ...failed]);
    return result;
  });
}

/** Retry queued items in order. Stops a sink at its first failure to keep ordering. */
export function processQueue(): Promise<QueueStatus> {
  return exclusive(async () => {
    const settings = await getSettings();
    const items = await load();
    const remaining: QueueItem[] = [];
    const blocked = new Set<string>();
    for (const item of items) {
      const sink = SINKS[item.sinkId];
      if (!sink || blocked.has(item.sinkId)) {
        if (sink) remaining.push(item);
        continue;
      }
      try {
        await sink.send(item.clip, settings);
      } catch (e) {
        blocked.add(item.sinkId);
        remaining.push({ ...item, attempts: item.attempts + 1, lastError: errMsg(e) });
      }
    }
    await store(remaining);
    return toStatus(remaining);
  });
}

export async function queueStatus(): Promise<QueueStatus> {
  return toStatus(await load());
}

export function clearQueue(): Promise<void> {
  return exclusive(() => store([]));
}

/** Re-sync badge and alarm after the service worker restarts. */
export async function refreshQueueState() {
  await store(await load());
}

function toStatus(items: QueueItem[]): QueueStatus {
  return {
    count: items.length,
    items: items.map((i) => ({
      sinkId: i.sinkId,
      kind: i.clip.kind,
      title: i.clip.title,
      attempts: i.attempts,
      lastError: i.lastError,
    })),
  };
}

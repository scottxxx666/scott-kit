import type { Request, TestResult } from "./core/messages";
import { clearQueue, dispatch, processQueue, queueStatus, refreshQueueState, RETRY_ALARM } from "./core/queue";
import { getSettings } from "./core/settings";
import { FEATURES } from "./features/registry";
import { SINKS } from "./sinks";

chrome.commands.onCommand.addListener(async (command, tab) => {
  const feature = FEATURES.find((f) => f.id === command);
  if (!feature || tab?.id === undefined) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [feature.script] });
  } catch (e) {
    // chrome:// pages, the Web Store etc. can't be scripted.
    console.warn(`[scottkit] ${feature.id} could not run on this tab`, e);
  }
});

chrome.runtime.onMessage.addListener((msg: Request, _sender, sendResponse) => {
  handle(msg).then(sendResponse, (e) => sendResponse({ error: String(e) }));
  return true; // async response
});

async function handle(msg: Request): Promise<unknown> {
  switch (msg.type) {
    case "scottkit:clip":
      return dispatch(msg.clip);
    case "scottkit:queue-status":
      return queueStatus();
    case "scottkit:retry-queue":
      return processQueue();
    case "scottkit:clear-queue":
      return clearQueue();
    case "scottkit:test-sink": {
      const sink = SINKS[msg.sinkId];
      if (!sink) return { ok: false, error: `unknown sink ${msg.sinkId}` } satisfies TestResult;
      try {
        return { ok: true, detail: await sink.test(await getSettings()) } satisfies TestResult;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) } satisfies TestResult;
      }
    }
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RETRY_ALARM) void processQueue();
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onInstalled.addListener(() => void refreshQueueState());
chrome.runtime.onStartup.addListener(() => void refreshQueueState());

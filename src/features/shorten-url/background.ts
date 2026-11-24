/**
 * Shortens the URL on the clipboard with PicSee and puts the short URL back.
 * Runs entirely in the service worker (no page injection), so it works on any tab.
 */
import { editClipboard } from "../../core/offscreen-clipboard";
import { getSettings } from "../../core/settings";
import { parseHttpUrl, shortenWithPicsee } from "./picsee";

let busy = false;

export async function shortenClipboardUrl(): Promise<void> {
  // Only one offscreen document may exist, so ignore key presses while one run is in flight.
  if (busy) return;
  busy = true;
  try {
    const { picsee } = await getSettings();
    let short = "";
    await editClipboard(async (text) => {
      const url = parseHttpUrl(text);
      if (!url) throw new Error("剪貼簿裡不是網址");
      short = await shortenWithPicsee(url, picsee.token);
      return short;
    });
    notify("已複製短網址", short);
  } catch (e) {
    notify("縮網址失敗", e instanceof Error ? e.message : String(e));
  } finally {
    busy = false;
  }
}

function notify(title: string, message: string) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title,
    message,
  });
}

/** Clipboard access for the service worker, through the offscreen document (src/offscreen/offscreen.ts). */
export type OffscreenRequest =
  | { type: "scottkit:offscreen-read-clipboard" }
  | { type: "scottkit:offscreen-write-clipboard"; text: string };

const OFFSCREEN_PATH = "offscreen.html";

async function withOffscreen<T>(fn: () => Promise<T>): Promise<T> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
  });
  if (!existing.length) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: "Read a URL from the clipboard and write the shortened URL back",
    });
  }
  try {
    return await fn();
  } finally {
    await chrome.offscreen.closeDocument().catch(() => {});
  }
}

function ask<T>(req: OffscreenRequest): Promise<T> {
  return chrome.runtime.sendMessage(req) as Promise<T>;
}

/** Reads the clipboard, then lets `transform` produce text to write back (or null to leave it). */
export function editClipboard(transform: (text: string) => Promise<string | null>): Promise<void> {
  return withOffscreen(async () => {
    const { text } = await ask<{ text: string }>({ type: "scottkit:offscreen-read-clipboard" });
    const next = await transform(text);
    if (next === null) return;
    const { ok } = await ask<{ ok: boolean }>({ type: "scottkit:offscreen-write-clipboard", text: next });
    if (!ok) throw new Error("無法寫入剪貼簿");
  });
}

/**
 * Hidden page that lets the service worker use the clipboard (it has no DOM).
 * An offscreen document never has focus, so navigator.clipboard is unusable;
 * execCommand on a textarea works with the clipboardRead/clipboardWrite permissions.
 */
import type { OffscreenRequest } from "../core/offscreen-clipboard";

chrome.runtime.onMessage.addListener((msg: OffscreenRequest, _sender, sendResponse) => {
  // Every extension page hears every runtime message; only answer our own so the
  // service worker stays the one responding to the Request union.
  if (msg?.type === "scottkit:offscreen-read-clipboard") {
    sendResponse({ text: readClipboard() });
  } else if (msg?.type === "scottkit:offscreen-write-clipboard") {
    sendResponse({ ok: writeClipboard(msg.text) });
  }
  return false;
});

function withTextarea<T>(fn: (el: HTMLTextAreaElement) => T): T {
  const el = document.createElement("textarea");
  document.body.append(el);
  try {
    return fn(el);
  } finally {
    el.remove();
  }
}

function readClipboard(): string {
  return withTextarea((el) => {
    el.focus();
    document.execCommand("paste");
    return el.value;
  });
}

function writeClipboard(text: string): boolean {
  return withTextarea((el) => {
    el.value = text;
    el.select();
    return document.execCommand("copy");
  });
}

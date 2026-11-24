/**
 * Settings live in chrome.storage.local (not sync: the Logseq and PicSee tokens stay
 * on this machine). Each feature/sink owns its own section; add new sections here
 * with defaults and they are merged automatically for existing installs.
 */
export interface Settings {
  /** Sink ids every clip is sent to. */
  enabledSinks: string[];
  logseq: {
    apiUrl: string;
    token: string;
    /** Page for clip kinds that have no dedicated handler. */
    inboxPage: string;
  };
  videoTimestamp: {
    page: string;
    /** Where a block for a video not yet on the page is created. */
    newVideoPosition: "top" | "bottom";
    /** Placeholders: {title} {url} */
    parentTemplate: string;
    /** Placeholders: {time} {note} {timeUrl} {seconds} */
    childTemplate: string;
    /** Used when the site has no time-addressable URL (e.g. Weverse). */
    childTemplateNoLink: string;
  };
  picsee: {
    token: string;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  enabledSinks: ["logseq"],
  logseq: {
    apiUrl: "http://127.0.0.1:12315",
    token: "",
    inboxPage: "scottkit inbox",
  },
  videoTimestamp: {
    page: "LE SSERAFIM 經典時刻",
    newVideoPosition: "top",
    parentTemplate: "[{title}]({url})",
    childTemplate: "[{time} {note}]({timeUrl})",
    childTemplateNoLink: "{time} {note}",
  },
  picsee: {
    token: "",
  },
};

const KEY = "settings";

type Obj = Record<string, unknown>;
function merge<T>(base: T, over: unknown): T {
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    return (over === undefined ? base : over) as T;
  }
  const out: Obj = { ...(base as Obj) };
  if (over && typeof over === "object") {
    for (const [k, v] of Object.entries(over as Obj)) {
      out[k] = k in out ? merge(out[k], v) : v;
    }
  }
  return out as T;
}

export async function getSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get(KEY))[KEY];
  return merge(DEFAULT_SETTINGS, stored);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings });
}

export function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)).trim();
}

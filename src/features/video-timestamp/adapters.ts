/** Per-site knowledge: how to identify a video, link to it, and link to a moment in it. */
export interface SiteAdapter {
  id: string;
  match(url: URL): boolean;
  videoKey(url: URL): string;
  videoUrl(url: URL): string;
  timeUrl(url: URL, seconds: number): string | null;
  title(): string;
}

const text = (sel: string) => document.querySelector(sel)?.textContent?.trim() || "";

function youtubeId(url: URL): string {
  if (url.hostname === "youtu.be") return url.pathname.slice(1);
  const v = url.searchParams.get("v");
  if (v) return v;
  const m = url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)/);
  return m?.[1] ?? "";
}

const youtube: SiteAdapter = {
  id: "youtube",
  match: (u) => /(^|\.)youtube\.com$/.test(u.hostname) || u.hostname === "youtu.be",
  videoKey: (u) => youtubeId(u),
  videoUrl: (u) => `https://youtu.be/${youtubeId(u)}`,
  timeUrl: (u, s) => `https://youtu.be/${youtubeId(u)}?t=${Math.floor(s)}`,
  title: () =>
    text("h1.ytd-watch-metadata") ||
    text("ytd-reel-video-renderer[is-active] h2") ||
    document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube$/, ""),
};

function bilibiliBase(u: URL): string {
  const bv = u.pathname.match(/\/video\/(BV\w+)/)?.[1] ?? "";
  const p = u.searchParams.get("p");
  return `https://www.bilibili.com/video/${bv}${p && p !== "1" ? `?p=${p}` : ""}`;
}

const bilibili: SiteAdapter = {
  id: "bilibili",
  match: (u) => /(^|\.)bilibili\.com$/.test(u.hostname) && /\/video\/BV/.test(u.pathname),
  videoKey: (u) => u.pathname.match(/\/video\/(BV\w+)/)?.[1] ?? u.pathname,
  videoUrl: bilibiliBase,
  timeUrl: (u, s) => {
    const base = bilibiliBase(u);
    return `${base}${base.includes("?") ? "&" : "?"}t=${Math.floor(s)}`;
  },
  title: () => text("h1.video-title") || document.title.replace(/_哔哩哔哩_bilibili$/, ""),
};

/** Weverse and any other site with a <video>: no deep link to a time. */
const generic: SiteAdapter = {
  id: "web",
  match: () => true,
  videoKey: (u) => `${u.hostname}${u.pathname}`,
  videoUrl: (u) => `${u.origin}${u.pathname}`,
  timeUrl: () => null,
  title: () => document.title,
};

const ADAPTERS = [youtube, bilibili, generic];

export function adapterFor(url: URL): SiteAdapter {
  return ADAPTERS.find((a) => a.match(url))!;
}

/**
 * PicSee short-link API. Docs: https://picsee.io/developers/docs/public-api.html
 * Kept free of chrome.* so it can be unit-tested with node:test.
 */
export const PICSEE_CREATE_URL = "https://api.pics.ee/v1/links";

/** Returns the clipboard text as an http(s) URL, or null if it isn't one. */
export function parseHttpUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

export async function shortenWithPicsee(url: string, token: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!token) throw new Error("尚未設定 PicSee API token");
  let res: Response;
  try {
    res = await fetchImpl(`${PICSEE_CREATE_URL}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new Error("連不到 PicSee（網路問題？）");
  }
  const text = await res.text();
  if (res.status === 429) throw new Error("PicSee 請求太頻繁，稍後再試");
  if (!res.ok) throw new Error(`PicSee API ${res.status}: ${text.slice(0, 200)}`);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`PicSee 回應不是 JSON: ${text.slice(0, 200)}`);
  }
  const short = (body as { data?: { picseeUrl?: unknown } } | null)?.data?.picseeUrl;
  if (typeof short !== "string" || !short) throw new Error(`PicSee 回應缺少 picseeUrl: ${text.slice(0, 200)}`);
  return short;
}

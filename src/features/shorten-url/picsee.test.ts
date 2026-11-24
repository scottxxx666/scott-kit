import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHttpUrl, PICSEE_CREATE_URL, shortenWithPicsee } from "./picsee.ts";

test("parseHttpUrl accepts http(s) URLs and trims surrounding whitespace", () => {
  assert.equal(parseHttpUrl("  https://example.com/a?b=1#c\n"), "https://example.com/a?b=1#c");
  assert.equal(parseHttpUrl("http://example.com"), "http://example.com");
});

test("parseHttpUrl rejects non-URLs, other schemes, and text with inner spaces", () => {
  for (const s of ["", "   ", "hello", "example.com", "ftp://x.com", "javascript:alert(1)", "https://a.com and more"]) {
    assert.equal(parseHttpUrl(s), null, s);
  }
});

function fakeFetch(status: number, body: string, calls: { url: string; init?: RequestInit }[] = []) {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(body, { status });
  }) as unknown as typeof fetch;
}

test("shortenWithPicsee posts the url with the token and returns data.picseeUrl", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const res = JSON.stringify({ data: { picseeUrl: "https://pse.is/5b93x9" }, meta: {} });
  const short = await shortenWithPicsee("https://example.com/x", "t&k", fakeFetch(200, res, calls));
  assert.equal(short, "https://pse.is/5b93x9");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${PICSEE_CREATE_URL}?access_token=t%26k`);
  assert.equal(calls[0].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { url: "https://example.com/x" });
});

test("shortenWithPicsee fails fast without a token", async () => {
  const calls: { url: string }[] = [];
  await assert.rejects(shortenWithPicsee("https://a.com", "", fakeFetch(200, "{}", calls)), /token/);
  assert.equal(calls.length, 0);
});

test("shortenWithPicsee reports rate limiting, HTTP errors, bad JSON, and a missing field", async () => {
  await assert.rejects(shortenWithPicsee("https://a.com", "t", fakeFetch(429, "")), /太頻繁/);
  await assert.rejects(shortenWithPicsee("https://a.com", "t", fakeFetch(403, '{"error":"quota"}')), /PicSee API 403: \{"error":"quota"\}/);
  await assert.rejects(shortenWithPicsee("https://a.com", "t", fakeFetch(200, "<html>")), /不是 JSON/);
  await assert.rejects(shortenWithPicsee("https://a.com", "t", fakeFetch(200, '{"data":{}}')), /缺少 picseeUrl/);
  await assert.rejects(shortenWithPicsee("https://a.com", "t", fakeFetch(200, "null")), /缺少 picseeUrl/);
});

test("shortenWithPicsee maps a network failure to a readable error", async () => {
  const failing = (async () => {
    throw new TypeError("Failed to fetch");
  }) as unknown as typeof fetch;
  await assert.rejects(shortenWithPicsee("https://a.com", "t", failing), /連不到 PicSee/);
});

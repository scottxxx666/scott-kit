import type { Clip } from "../../core/clip";
import { type Settings } from "../../core/settings";
import { VIDEO_TIMESTAMP, type VideoTimestampClip } from "../../features/video-timestamp/types";
import { writeVideoTimestamp } from "../../features/video-timestamp/logseq";
import type { Sink } from "../types";
import { LogseqClient } from "./client";

type Handler = (clip: Clip, client: LogseqClient, settings: Settings) => Promise<void>;

/** Per-kind writers. A new feature registers how it wants to look in Logseq here. */
const handlers: Record<string, Handler> = {
  [VIDEO_TIMESTAMP]: (clip, client, s) => writeVideoTimestamp(clip as VideoTimestampClip, client, s),
};

/** Fallback for kinds without a handler: one block in the inbox page. */
const fallback: Handler = async (clip, client, s) => {
  const page = s.logseq.inboxPage;
  await client.ensurePage(page);
  const note = (clip.data as { note?: string } | null)?.note;
  await client.appendBlockInPage(page, `[${clip.title}](${clip.url})${note ? ` ${note}` : ""}`);
};

export const logseqSink: Sink = {
  id: "logseq",
  label: "Logseq",
  async send(clip, settings) {
    const client = new LogseqClient(settings.logseq.apiUrl, settings.logseq.token);
    await (handlers[clip.kind] ?? fallback)(clip, client, settings);
  },
  async test(settings) {
    const client = new LogseqClient(settings.logseq.apiUrl, settings.logseq.token);
    const graph = await client.call<{ name?: string } | null>("logseq.App.getCurrentGraph");
    return graph?.name ? `已連線，目前 graph：${graph.name}` : "已連線";
  },
};

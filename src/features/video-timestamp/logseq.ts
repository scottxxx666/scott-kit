import { renderTemplate, type Settings } from "../../core/settings";
import type { LogseqClient } from "../../sinks/logseq/client";
import type { VideoTimestampClip } from "./types";

/**
 * Groups timestamps under one block per video:
 *   - [Video title](https://youtu.be/ID)
 *     - [12:07 note](https://youtu.be/ID?t=727)
 * An existing top-level block that mentions the video key is reused, so entries
 * written by hand before scottkit existed are picked up too.
 */
export async function writeVideoTimestamp(
  clip: VideoTimestampClip,
  client: LogseqClient,
  settings: Settings,
): Promise<void> {
  const cfg = settings.videoTimestamp;
  const d = clip.data;
  const child = d.timeUrl
    ? renderTemplate(cfg.childTemplate, { time: d.timeLabel, note: d.note, timeUrl: d.timeUrl, seconds: d.seconds })
    : renderTemplate(cfg.childTemplateNoLink, { time: d.timeLabel, note: d.note, seconds: d.seconds });

  await client.ensurePage(cfg.page);
  const tree = (await client.getPageBlocksTree(cfg.page)) ?? [];

  const existing = tree.find((b) => b.content?.includes(d.videoKey));
  if (existing) {
    await client.appendChild(existing, child);
    return;
  }

  const parentContent = renderTemplate(cfg.parentTemplate, { title: clip.title, url: d.videoUrl });
  const first = tree[0];
  const parent =
    cfg.newVideoPosition === "top" && first
      ? await client.insertBlock(first.uuid, parentContent, { before: true, sibling: true })
      : await client.appendBlockInPage(cfg.page, parentContent);
  if (!parent?.uuid) throw new Error("Logseq 沒有回傳新區塊");
  await client.insertBlock(parent.uuid, child, { sibling: false });
}

import { newClip } from "../../core/clip";
import { send, type DispatchResult } from "../../core/messages";
import { prompt, toast } from "../../ui/overlay";
import { adapterFor } from "./adapters";
import { formatTime, VIDEO_TIMESTAMP, type VideoTimestampData } from "./types";

/** The biggest <video> on the page that has loaded something. */
function findVideo(): HTMLVideoElement | null {
  let best: HTMLVideoElement | null = null;
  let bestArea = 0;
  for (const v of Array.from(document.querySelectorAll("video"))) {
    if (v.readyState === 0) continue;
    const r = v.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea) {
      best = v;
      bestArea = area;
    }
  }
  return best;
}

async function run() {
  const video = findVideo();
  if (!video) {
    toast("這個頁面找不到正在播放的影片", "warn");
    return;
  }

  const url = new URL(location.href);
  const adapter = adapterFor(url);
  const seconds = video.currentTime;
  const wasPlaying = !video.paused;
  video.pause();

  const values = await prompt(`⏱ ${formatTime(seconds)} · ${adapter.id}`, [
    { name: "note", label: "描述", placeholder: "例如：櫻花恩採合體大貓" },
    { name: "title", label: "影片標題（第一次記這部影片時才會用到）", value: adapter.title() },
  ]);
  if (wasPlaying) void video.play();
  if (!values) return;

  const data: VideoTimestampData = {
    site: adapter.id,
    seconds: Math.floor(seconds),
    timeLabel: formatTime(seconds),
    note: values.note,
    videoKey: adapter.videoKey(url),
    videoUrl: adapter.videoUrl(url),
    timeUrl: adapter.timeUrl(url, seconds),
  };
  const clip = newClip(VIDEO_TIMESTAMP, { url: location.href, title: values.title || adapter.title(), data });

  try {
    const res = await send<DispatchResult>({ type: "scottkit:clip", clip });
    if (res.queued.length === 0) toast(`已記錄 ${data.timeLabel} ${data.note}`);
    else toast(`先暫存了，之後自動重送：${res.queued[0].error}`, "warn");
  } catch (e) {
    toast(`儲存失敗：${e instanceof Error ? e.message : String(e)}`, "error");
  }
}

// The script is re-injected on every shortcut press; ignore presses while a prompt is open.
const w = window as unknown as { __scottkitVideoTimestampBusy?: boolean };
if (!w.__scottkitVideoTimestampBusy) {
  w.__scottkitVideoTimestampBusy = true;
  run().finally(() => {
    w.__scottkitVideoTimestampBusy = false;
  });
}

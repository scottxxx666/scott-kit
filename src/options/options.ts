import { send, type QueueStatus, type TestResult } from "../core/messages";
import { getSettings, saveSettings, type Settings } from "../core/settings";
import { FEATURES } from "../features/registry";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const fields = () => Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-path]"));

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}
function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[keys.at(-1)!] = value;
}

async function load() {
  const s = await getSettings();
  for (const el of fields()) el.value = String(getPath(s, el.dataset.path!) ?? "");
}

async function collect(): Promise<Settings> {
  const s = await getSettings();
  for (const el of fields()) setPath(s as unknown as Record<string, unknown>, el.dataset.path!, el.value.trim());
  return s;
}

function flash(el: HTMLElement, text: string, ok: boolean) {
  el.textContent = text;
  el.className = `status ${ok ? "ok" : "err"}`;
}

async function renderShortcuts() {
  const commands = await chrome.commands.getAll();
  $("shortcuts").replaceChildren(
    ...FEATURES.map((f) => {
      const li = document.createElement("li");
      const key = commands.find((c) => c.name === f.id)?.shortcut || "未設定";
      li.textContent = `${f.label}：${key}`;
      return li;
    }),
  );
}

async function renderQueue(status?: QueueStatus) {
  const q = status ?? (await send<QueueStatus>({ type: "scottkit:queue-status" }));
  $("queue-summary").textContent = q.count ? `${q.count} 筆等待重送（每分鐘自動重試）` : "沒有待重送的項目";
  $("queue-items").replaceChildren(
    ...q.items.map((i) => {
      const li = document.createElement("li");
      li.textContent = `[${i.sinkId}] ${i.title} — 試了 ${i.attempts} 次：${i.lastError}`;
      return li;
    }),
  );
}

$("save").addEventListener("click", async () => {
  await saveSettings(await collect());
  flash($("save-result"), "已儲存", true);
});

$("test").addEventListener("click", async () => {
  await saveSettings(await collect());
  const r = await send<TestResult>({ type: "scottkit:test-sink", sinkId: "logseq" });
  flash($("test-result"), r.ok ? r.detail : r.error, r.ok);
});

$("retry").addEventListener("click", async () => renderQueue(await send<QueueStatus>({ type: "scottkit:retry-queue" })));
$("clear").addEventListener("click", async () => {
  await send({ type: "scottkit:clear-queue" });
  await renderQueue();
});
$("edit-shortcuts").addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));

void load();
void renderShortcuts();
void renderQueue();

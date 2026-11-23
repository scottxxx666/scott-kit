/**
 * Tiny in-page UI shared by features: a prompt dialog and a toast.
 * Uses plain DOM (not shadow DOM) on purpose: sites like YouTube ignore their
 * keyboard shortcuts only when the event target is a real <input>.
 */
const Z = "2147483647";
const FONT = "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Noto Sans TC', sans-serif";

function host(): HTMLElement {
  return (document.fullscreenElement as HTMLElement | null) ?? document.body;
}

function style(el: HTMLElement, css: Partial<CSSStyleDeclaration>) {
  Object.assign(el.style, css);
}

export function toast(message: string, kind: "ok" | "warn" | "error" = "ok") {
  const el = document.createElement("div");
  el.textContent = message;
  style(el, {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    zIndex: Z,
    padding: "10px 16px",
    borderRadius: "10px",
    font: `14px/1.4 ${FONT}`,
    color: "#fff",
    background: kind === "ok" ? "#15803d" : kind === "warn" ? "#b45309" : "#b91c1c",
    boxShadow: "0 6px 24px rgba(0,0,0,.3)",
    maxWidth: "420px",
  });
  host().appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export interface PromptField {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
}

/** Shows a small form. Resolves with the values, or null if cancelled (Esc / click outside). */
export function prompt(heading: string, fields: PromptField[]): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    style(backdrop, {
      position: "fixed",
      inset: "0",
      zIndex: Z,
      background: "rgba(0,0,0,.35)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      paddingTop: "12vh",
    });

    const box = document.createElement("div");
    style(box, {
      width: "min(520px, 90vw)",
      background: "#1f1f23",
      color: "#f4f4f5",
      borderRadius: "14px",
      padding: "18px 20px",
      boxShadow: "0 12px 40px rgba(0,0,0,.45)",
      font: `14px/1.4 ${FONT}`,
    });

    const h = document.createElement("div");
    h.textContent = heading;
    style(h, { fontSize: "13px", color: "#a1a1aa", marginBottom: "10px" });
    box.appendChild(h);

    const inputs: HTMLInputElement[] = fields.map((f, i) => {
      const label = document.createElement("label");
      label.textContent = f.label;
      style(label, { display: "block", fontSize: "12px", color: "#a1a1aa", margin: i ? "10px 0 4px" : "0 0 4px" });
      const input = document.createElement("input");
      input.type = "text";
      input.value = f.value ?? "";
      input.placeholder = f.placeholder ?? "";
      input.name = f.name;
      style(input, {
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 11px",
        borderRadius: "8px",
        border: "1px solid #3f3f46",
        background: "#0f0f12",
        color: "#f4f4f5",
        font: `${i === 0 ? 16 : 13}px/1.4 ${FONT}`,
        outline: "none",
      });
      box.append(label, input);
      return input;
    });

    const hint = document.createElement("div");
    hint.textContent = "Enter 儲存 · Esc 取消";
    style(hint, { fontSize: "11px", color: "#71717a", marginTop: "12px", textAlign: "right" });
    box.appendChild(hint);

    let done = false;
    const finish = (value: Record<string, string> | null) => {
      if (done) return;
      done = true;
      backdrop.remove();
      resolve(value);
    };

    box.addEventListener("keydown", (e) => {
      // Keep the page (YouTube etc.) from treating typing as player shortcuts.
      e.stopPropagation();
      if (e.isComposing || e.keyCode === 229) return; // IME is still composing (注音/拼音)
      if (e.key === "Escape") {
        e.preventDefault();
        finish(null);
      } else if (e.key === "Enter") {
        e.preventDefault();
        finish(Object.fromEntries(inputs.map((i) => [i.name, i.value.trim()])));
      }
    });
    for (const t of ["keyup", "keypress"]) box.addEventListener(t, (e) => e.stopPropagation());
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop) finish(null);
    });

    backdrop.appendChild(box);
    host().appendChild(backdrop);
    inputs[0]?.focus();
  });
}

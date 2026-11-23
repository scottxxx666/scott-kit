/** Minimal client for Logseq desktop's local HTTP API server. */
export interface BlockEntity {
  uuid: string;
  content: string;
  children?: BlockEntity[];
}

export class LogseqClient {
  constructor(
    private apiUrl: string,
    private token: string,
  ) {}

  async call<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
    if (!this.token) throw new Error("尚未設定 Logseq API token");
    let res: Response;
    try {
      res = await fetch(`${this.apiUrl.replace(/\/+$/, "")}/api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ method, args }),
      });
    } catch {
      throw new Error("連不到 Logseq（App 沒開，或 HTTP API server 沒啟動）");
    }
    const text = await res.text();
    if (!res.ok) throw new Error(`Logseq API ${res.status}: ${text.slice(0, 200)}`);
    const body = text ? JSON.parse(text) : null;
    if (body && typeof body === "object" && "error" in body && body.error) {
      throw new Error(`Logseq: ${String(body.error)}`);
    }
    return body as T;
  }

  getPageBlocksTree(page: string) {
    return this.call<BlockEntity[] | null>("logseq.Editor.getPageBlocksTree", page);
  }

  async ensurePage(page: string) {
    const existing = await this.call<unknown>("logseq.Editor.getPage", page);
    if (!existing) {
      await this.call("logseq.Editor.createPage", page, {}, { redirect: false, createFirstBlock: false });
    }
  }

  appendBlockInPage(page: string, content: string) {
    return this.call<BlockEntity>("logseq.Editor.appendBlockInPage", page, content);
  }

  insertBlock(target: string, content: string, opts: { before?: boolean; sibling?: boolean }) {
    return this.call<BlockEntity>("logseq.Editor.insertBlock", target, content, opts);
  }

  /** Adds `content` as the last child of `parent`. */
  async appendChild(parent: BlockEntity, content: string) {
    const last = parent.children?.at(-1);
    if (last?.uuid) return this.insertBlock(last.uuid, content, { sibling: true });
    return this.insertBlock(parent.uuid, content, { sibling: false });
  }
}

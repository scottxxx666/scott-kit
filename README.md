# scottkit

Scott 的個人 Chrome 擴充功能工具箱，各種從網頁擷取東西的小功能都放在這裡。

## 功能

| 功能 | 快捷鍵（預設） | 說明 |
| --- | --- | --- |
| 記錄影片時間點 | `⌥⇧S` / `Alt+Shift+S` | 暫停影片 → 輸入描述 → 寫進 Logseq 對應影片底下 |
| 縮網址（PicSee） | `⌥X` / `Alt+X` | 複製長網址 → 按快捷鍵 → 剪貼簿換成短網址（任何分頁都能用） |

影片時間點支援 YouTube（含 Shorts）、bilibili（可跳轉時間），以及 Weverse 和其他有 `<video>` 的網站（只記時間文字）。

寫進 Logseq 的格式（可在設定頁改）：

```
- [影片標題](https://youtu.be/ID)
	- [12:07 櫻花恩採合體大貓](https://youtu.be/ID?t=727)
```

頁面上已經有提到這部影片的區塊（包含手動寫的）就加在它底下；沒有就在頁面最上面新建一個。

## 安裝

```bash
npm install
npm run build        # 或 npm run watch 邊改邊 build
npm test             # 單元測試（Node 24+）
```

1. Chrome 打開 `chrome://extensions`，開啟「開發人員模式」
2. 「載入未封裝項目」→ 選 `dist/`
3. Logseq：設定 → 功能 → 開啟 HTTP APIs server，從 🔌 選單 Start server，建立 Authorization token
4. 點 scottkit 圖示開啟設定頁，貼上 token、按「測試連線」
5. （縮網址）到 [PicSee 開發者頁面](https://picsee.io/developers) 完成手機驗證、取得 API token，貼到設定頁的「PicSee 縮網址」。免費版一年 800 次，每按一次用一次

改完程式後要在 `chrome://extensions` 按 scottkit 的重新載入。

Logseq 沒開時，clip 會暫存在擴充功能裡（圖示上會顯示數字），每分鐘自動重送。

## 架構

```
features (擷取)  ──Clip──▶  queue / dispatch  ──▶  sinks (目的地)
```

- `src/core/clip.ts`：所有功能共用的資料格式 `Clip { kind, url, title, data }`
- `src/core/queue.ts`：送到所有啟用的 sink，失敗的放進佇列重試
- `src/core/settings.ts`：設定與預設值（存在 `chrome.storage.local`）
- `src/features/`：每個功能一個資料夾；`registry.ts` 列出由快捷鍵觸發的功能
- `src/features/video-timestamp/adapters.ts`：各網站怎麼取得影片 ID、網址、跳轉時間的網址
- `src/sinks/`：目的地。`logseq/index.ts` 內依 `clip.kind` 決定寫法，沒有專屬寫法的寫到收件匣頁面
- `src/ui/overlay.ts`：頁面內的輸入框與提示

功能 script 是按快捷鍵時才用 `activeTab` 注入，所以不需要「讀取所有網站」的權限。

### 新增一個功能

1. `src/features/<name>/content.ts`：在頁面裡收集資料，`newClip("<kind>", …)` 後送 `scottkit:clip`
2. `src/features/registry.ts` 加一筆
3. `public/manifest.json` 的 `commands` 加同名指令
4. `build.mjs` 的 `entryPoints` 加入口
5. （選用）`src/sinks/logseq/index.ts` 的 `handlers` 加這個 kind 的專屬寫法

### 新增一個目的地

實作 `src/sinks/types.ts` 的 `Sink`，加進 `src/sinks/index.ts`，再把 id 放進設定的 `enabledSinks`。

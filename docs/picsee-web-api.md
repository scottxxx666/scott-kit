# PicSee 網頁內部 API（備案，尚未實作）

目前 `shorten-url` 用官方 API（`api.pics.ee/v1/links`），免費版一年 800 次。網頁版縮網址沒有標示次數限制，用的是另一支**沒有公開文件**的內部 API。等官方額度不夠用時再考慮改用這支。

調查日期：2026-11-25（在已登入的 picsee.io 首頁實際縮網址，攔截請求）。

## 風險

- 非公開 API，PicSee 改版隨時可能壞掉。
- 拿網頁 API 繞過官方 API 額度，可能違反服務條款，有帳號被限制的風險。
- 網頁版「不限次數」對自動化使用是否也成立：**未驗證**。
- 需要讀取 picsee.io 的登入 cookie，權限比現在大。

## 建立短網址

```
POST https://webapi.pics.ee/v2/links?access_token=<token>&groupId=<groupId>&clientId=1&caller=web-simple&payloadType=details&lang=en-us&location=TW
Content-Type: application/json

{"url": "https://example.com", "nativeLaunch": true, "analyticsObscurity": true, "groupId": "<groupId>", "browserUuid": "<uuid>"}
```

- 網頁還會帶 `ip` query 參數；哪些參數是必要的：**未驗證**（以上照抄網頁）。
- 回應和官方 API 一樣：短網址在 `data.picseeUrl`，會用帳號設定的網域（例如 `xxx.pse.is`）。另外有 `encodeId`、`shortDomain`、`id`。

## Token

- 存在 picsee.io 的 cookie：`access_token`（JWT，有 `exp`）、`refresh_token`、`group_id`、`user_id`。`browserUuid` 來自 `browser_uuid` cookie / `picsee_browser_uuid` localStorage。
- `access_token` 很短效，觀察到大約一小時（推測，未驗證）。
- 伺服器在載入 `https://picsee.io/en` 時會用 `Set-Cookie` 發 `access_token`（未登入用 curl 也會拿到一個 `scp: sortenUrl` 的匿名 token）。登入狀態下載入頁面是否會用 `refresh_token` 換新 token：**未驗證**。
- 網頁本身怎麼換新 token（哪支 endpoint）：沒看到。

## 自動更新 token 的方案

只在 token 過期（看 JWT `exp`）時更新，平常直接打 API。需要的權限：`cookies`、`https://picsee.io/*`、`https://webapi.pics.ee/*`。

| 方案 | 做法 | 結論 |
| --- | --- | --- |
| iframe | 在 offscreen 頁嵌 picsee.io | **不行**：picsee.io 回 `x-frame-options: sameorigin` |
| 背景 fetch | service worker `fetch("https://picsee.io/en", {credentials: "include"})`，讓 `Set-Cookie` 更新 token，再從 `chrome.cookies` 讀 | 看不到、最快；靠兩件未驗證的事（登入時 SSR 會換 token、擴充功能 fetch 會帶 cookie） |
| 背景分頁 | `chrome.tabs.create({url, active: false})`，等 `chrome.cookies.onChanged` 出現新 `access_token` 後關掉 | 一定可行（跟手動開網頁一樣），但分頁列會閃 1–3 秒 |

建議：先做小實驗驗證「背景 fetch」（刪掉 `access_token` 只留 `refresh_token`，fetch 首頁看有沒有拿到新 token），可行就只用它，不行再用背景分頁。

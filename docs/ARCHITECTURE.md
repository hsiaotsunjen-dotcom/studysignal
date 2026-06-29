# StudySignal 系統架構

> **文件性質：** 系統架構說明（非安裝手冊、非專案進度表）  
> **相關文件：** [`開發環境安裝手冊.md`](./開發環境安裝手冊.md)、[`PROJECT_STATUS.md`](./PROJECT_STATUS.md)  
> **最後更新：** 2026-06-29

---

## 一、整體架構

StudySignal 是一個以 **Next.js 15 App Router** 為核心的 **全端 Web 應用程式**。學生在瀏覽器（尤以 Android 平板為主）與 AI 家教互動，透過文字、語音與圖片輸入學習英文；系統將 AI 回覆與結構化分析結果呈現給學生，並可搭配瀏覽器 TTS 朗讀。

### 架構總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                        學生裝置（Browser）                        │
│  Android 平板 / 手機 / 桌面瀏覽器                                 │
│  HTTPS（開發：npm run dev:https）                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Next.js 15（studysignal-homepage）                  │
│  ┌─────────────────────┐    ┌──────────────────────────────┐  │
│  │   Client Components  │    │   API Route Handlers         │  │
│  │   (React 19)         │───▶│   /api/tutor-chat            │  │
│  │                      │    │   /api/analyze               │  │
│  │   StudySignalHome    │    │   /api/transcribe            │  │
│  │   ChatThread         │    └──────────────┬───────────────┘  │
│  │   AnalyzePanel       │                   │                  │
│  │   speechSynthesis    │                   ▼                  │
│  └─────────────────────┘         ┌─────────────────────┐      │
│                                   │  OpenAI API（現況）   │      │
│                                   │  Chat / Vision /     │      │
│                                   │  Whisper             │      │
│                                   └─────────────────────┘      │
│  ┌─────────────────────┐                                        │
│  │  Browser APIs       │  SpeechRecognition、MediaRecorder、    │
│  │  （無伺服器費用）     │  speechSynthesis                     │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 運作方式（高層）

1. **學生** 在 Talk 分頁輸入英文、中文語意、語音或圖片。
2. **前端**（`StudySignalHome.tsx` 等 Client Component）收集輸入，組裝請求，呼叫 **自家 API**（`/api/*`），**不**直接呼叫 OpenAI。
3. **API Route** 在伺服器端讀取 `OPENAI_API_KEY`，轉發至 AI Provider（目前為 OpenAI），回傳統一 JSON 形狀給前端。
4. **前端** 更新 UI：聊天氣泡、Signals 分析面板、Composer 文字框；必要時觸發 **瀏覽器 TTS**。
5. **開發環境** 必須以 **HTTPS** 提供服務，平板才能進入 **Secure Context** 使用麥克風。

### 主要入口

| 路徑 | 用途 |
|------|------|
| `/` | 主應用（`StudySignalHome`，`layout="talk"`） |
| `/voice-test` | TTS／系統語音除錯 |
| `/speech-test` | 語音辨識實驗（開發用） |

### 專案目錄（邏輯分層）

```
studysignal-homepage/
├── src/app/                 # 頁面與 API Routes（Next.js App Router）
│   ├── page.tsx             # 首頁 → StudySignalHome
│   ├── api/
│   │   ├── tutor-chat/      # Tutor 對話、幫我找英文翻譯
│   │   ├── analyze/         # 語法／詞彙／發音結構化分析
│   │   └── transcribe/      # Whisper 語音轉文字
│   ├── voice-test/
│   └── speech-test/
├── src/components/          # UI 元件（Talk、Chat、Analyze、診斷）
├── src/lib/                   # 訊息組裝、分析解析、語音工具
├── src/types/                 # 共用型別（如 ChatListItem）
├── scripts/                   # dev-https、setup-dev-https
├── docs/                      # 專案文件
└── certificates/              # mkcert 憑證（本機，不提交 Git）
```

---

## 二、前端

### Next.js

- 採用 **App Router**（`src/app/`）。
- 首頁為 Server Component 殼層，實際互動 UI 以 **`"use client"`** 元件為主。
- **API Routes** 作為 BFF（Backend for Frontend）：隱藏 API Key、統一錯誤格式。
- 開發伺服器預設 port **3000**；HTTPS 模式透過 `npm run dev:https` 啟動。
- `next.config.ts` 設定 `allowedDevOrigins`，允許 LAN IP 的 HMR（平板開發必備）。

### React

- **React 19**，以函式元件與 Hooks 組織狀態。
- 核心狀態集中在 `StudySignalHome.tsx`（訊息、聊天、附件、分析歷史、語音狀態等）。
- `StudySignalAppShell` 提供三分頁殼層：**Talk**、**Signals**、**我的**（Tools）。
- `StudySignalChatThread` 負責聊天氣泡、Welcome TTS、重播按鈕。

### TypeScript

- 全專案 TypeScript，型別定義於元件旁與 `src/types/`、`src/lib/`。
- API 回傳在前端以 `unknown` 解析後窄化（如 `parseAnalyzeApiData`）。
- 聊天項目型別：`ChatListItem`（student / tutor、可含語音錄音 URL）。

### UI

- **Tailwind CSS** 深色主題，漸層背景與圓角卡片風格。
- **Lucide React** 圖示（部分 deep import 以控制 bundle）。
- 主要互動區塊：
  - **Talk：** Composer、CHAT／幫我找英文／分析按鈕、上傳／相機／麥克風、英美語言切換。
  - **Signals：** `AnalyzeFeedbackPanel` 結構化回饋列表。
  - **我的：** 學制、科目設定；部分 Tools 為 mock 占位。
- 開發專用：`StudySignalSecureContextMicDiag`（Secure Context 診斷）、`StudySignalMicDebug`（麥克風診斷）。

### Mobile First

- 版面以 **窄螢幕／平板** 為預設：`max-w-lg`、safe area、`touch-manipulation`。
- 可調整高度的 Composer textarea、底部操作列。
- 中文輸入：IME `composition` 事件處理、`lang="zh-Hant"`。
- **所有麥克風相關功能** 必須在 **HTTPS + 平板實機** 驗證，不可僅依桌面 HTTP localhost 推論行為。

---

## 三、AI 模組

以下為目前產品中的 AI 相關能力與其技術對應。

### Chat（英文對話）

| 項目 | 說明 |
|------|------|
| 觸發 | Talk 分頁 **CHAT** 按鈕 |
| 前端 | `sendTutorMessage()` → 組裝 `buildTutorChatOpenAIMessages()` |
| API | `POST /api/tutor-chat` |
| 模型 | `gpt-4o-mini`（含 vision 時提高 `max_tokens`） |
| 輸出 | Tutor 回覆寫入聊天區；可觸發 TTS |

支援 **純文字** 與 **含圖片**（base64 data URL）的多模態 user 訊息。

### AI Tutor

- **定位：** 英文家教對話模式，回覆僅英文、短句、結尾帶一個追問。
- **System prompt：** 定義於 `src/lib/tutorChatOpenAiMessages.ts`。
- **歷史：** 先前聊天氣泡轉為 OpenAI `assistant` / `user` 訊息（最多約 40 則）。
- **含圖：** 作業、課本照片由 vision 模型解讀，延續對話而非獨立「分析」流程。

### 幫我找英文

| 項目 | 說明 |
|------|------|
| 觸發 | **幫我找英文** 按鈕；或 translate 模式下 Enter |
| 輸入 | Composer 內中文語意 |
| API | 同一 `POST /api/tutor-chat`，但使用 **翻譯專用** system／user messages（不帶聊天歷史） |
| 輸出 | 英文句子 **填回 Composer**；**不**自動送入聊天、**不**播放 TTS |
| 後續 | 學生可編輯英文，再按 **CHAT** 正式對話 |

實作要點：`sendChineseEnglishHelp(chineseText: string)` 僅接受字串；非同步工作透過 `queueMicrotask` 脫離點擊事件回合。

### 發音分析（與語法／詞彙分析）

| 項目 | 說明 |
|------|------|
| 觸發 | Talk 分頁 **分析** 按鈕 |
| 前端 | `runAnalyze()` → 依情境選擇文字來源（Composer、語音轉寫、聊天彙整、附圖） |
| API | `POST /api/analyze` |
| 模型 | `gpt-4o-mini` |
| 輸出 | 結構化 JSON → `parseAnalyzeApiData` → **Signals** 分頁 |

**Prompt 分支（依輸入類型）：**

- 有語音音訊脈絡 → 含 `pronunciationScores`、`pronunciationFocus`（發音評分與練習字詞）。
- 純文字／聊天彙整 → 無發音評分數字，但有字典式 `pronunciationFocus`。
- 僅圖片 → Vision 分析，`imageInsights` 等，無發音評分。

### Voice Test

- 路徑：`/voice-test`
- 用途：列出 `speechSynthesis` 語音、測試 en-US / en-GB 朗讀、除錯選音邏輯。
- **不經** 伺服器 AI API。

### Speech Test

- 路徑：`/speech-test`
- 用途：語音辨識與相關實驗（開發／除錯）。
- 與 Talk 麥克風流程相關但為獨立頁面。

### TTS（文字轉語音）

| 項目 | 說明 |
|------|------|
| 實作 | `src/lib/speechSynthesis.ts` |
| 技術 | 瀏覽器 **Web Speech API**（`speechSynthesis`） |
| 成本 | 無雲端 TTS 費用 |
| 觸發時機 | CHAT 成功後 Tutor 回覆、聊天重播、Welcome、分析練習字詞 |

支援 **en-US** / **en-GB** 語音選擇，與 Dictation 語言設定連動。

### 語音輸入（補充：非 LLM，但屬 AI 流程一環）

| 層級 | 技術 |
|------|------|
| 第一層 | 瀏覽器 `SpeechRecognition`（即時 dictation） |
| 第二層 | `MediaRecorder` 錄音 |
| 第三層 | `POST /api/transcribe` → OpenAI **Whisper** |

---

## 四、AI Provider 架構

### 現況（As-Is）

```
瀏覽器（Client）
    │
    │  fetch("/api/tutor-chat" | "/api/analyze" | "/api/transcribe")
    ▼
Next.js API Route（Server）
    │
    │  讀取 process.env.OPENAI_API_KEY
    │  直接 fetch("https://api.openai.com/v1/...")
    ▼
OpenAI API
    ├── /v1/chat/completions   （Tutor、Analyze、幫我找英文）
    └── /v1/audio/transcriptions （Whisper）
```

| Provider | 狀態 | 用途 |
|----------|------|------|
| **OpenAI** | ✅ 已接入 | Chat、Vision、Analyze、Transcribe、翻譯 |
| **Gemini** | ❌ 未接入 | 程式庫中無實作 |
| **Claude** | ❌ 未接入 | — |
| **Grok** | ❌ 未接入 | — |
| **本地模型** | ❌ 未接入 | — |

**已具備的抽象化基礎：**

- 客戶端 **永不** 持有第三方 API Key。
- `src/lib/tutorChatOpenAiMessages.ts`、`src/lib/analyzeFeedback.ts` 等將 **訊息格式／回傳解析** 與 HTTP 呼叫分離。
- API 對前端回傳 **穩定 JSON 契約**（如 `{ reply }`、`AnalyzeFeedback` 形狀）。

**尚未完成：**

- Route Handler 內仍 **硬編碼** OpenAI URL 與模型名稱（`gpt-4o-mini`）。
- 尚無 `AI_PROVIDER` 環境變數或 provider 工廠模組。

### 目標架構（To-Be）：Provider-agnostic

**核心原則：Provider 必須可以自由替換，未來增加 Gemini、OpenAI、Claude、Grok、本地模型時，不用修改其他程式即可切換。**

建議分層如下：

```
┌──────────────────────────────────────────────────────────┐
│  UI / StudySignalHome（不變）                              │
│  只認識 /api/* 與穩定 JSON 契約                             │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│  API Routes（薄層）                                        │
│  驗證、限流、錯誤映射、呼叫 AiService                      │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│  AiService / Provider Registry（待實作）                   │
│  讀取 AI_PROVIDER、AI_MODEL_* 環境變數                     │
└─────┬─────────┬─────────┬─────────┬─────────┬────────────┘
      │         │         │         │         │
      ▼         ▼         ▼         ▼         ▼
   OpenAI    Gemini    Claude     Grok     Local (Ollama等)
```

**切換方式（設計目標）：**

1. 僅修改 **環境變數**（例如 `AI_PROVIDER=openai` → `AI_PROVIDER=gemini`）。
2. **不修改** `StudySignalHome.tsx`、Chat 元件、Analyze 面板。
3. 各 Provider 實作統一介面，例如：

```typescript
// 概念示意（尚未在程式庫實作）
interface ChatProvider {
  complete(messages: ChatMessage[]): Promise<{ text: string }>;
}
interface TranscribeProvider {
  transcribe(audio: Blob, language?: string): Promise<{ text: string }>;
}
```

4. **回傳 JSON 形狀** 由 `src/lib/` 解析層固定，Provider 差異僅在 adapter 內消化。

**Gemini 預留位置：** 與 OpenAI 並列於 `src/lib/ai/providers/`（規劃目錄），由 `tutor-chat`／`analyze` route 透過 registry 選用，**而非**在 UI 新增 Gemini 專用按鈕或 fetch。

---

## 五、HTTPS 開發環境

平板麥克風與 Secure Context 為 StudySignal 架構的 **硬性前置條件**，非可選優化。

### Secure Context

瀏覽器僅在 **安全環境** 開放 `navigator.mediaDevices.getUserMedia` 等 API。

| 網址範例 | Secure Context | 平板麥克風 |
|----------|----------------|------------|
| `https://192.168.x.x:3000` | ✅ 是 | ✅ 可用（需授權） |
| `http://localhost:3000` | ✅ 是（例外） | ✅ 桌面可用 |
| `http://192.168.x.x:3000` | ❌ 否 | ❌ 通常不可用 |

### mkcert

- 工具：**mkcert** 可在本機產生受信任開發憑證。
- 指令：`npm run setup:dev-https` → 產生 `certificates/dev-key.pem`、`certificates/dev-cert.pem`（含 localhost 與 LAN IP）。
- 憑證目錄已 **gitignore**，不進版控。
- 可選：將 mkcert 根 CA 安裝至 Android 平板，減少憑證警告。

### HTTPS 啟動方式

```bash
npm run dev:https
```

- 執行 `scripts/dev-https.mjs`。
- 啟動 Next.js：`next dev -p 3000 --experimental-https`。
- 若有 mkcert 憑證則自動載入；否則使用 Next.js **內建自簽憑證**。

**注意：** `npm run dev`（HTTP）僅適合桌面 localhost 快速預覽，**不可**作為平板麥克風測試環境。

### Android 平板

1. 電腦與平板同一 **Wi-Fi**。
2. 電腦執行 `npm run dev:https`，記下 **Network** 網址（如 `https://192.168.164.142:3000`）。
3. 平板 Chrome 開啟該 HTTPS 網址。
4. 必要時接受憑證警告（Advanced → Proceed）。
5. 允許麥克風權限。
6. 開發模式可觀察 **Secure Context 診斷面板**（`isSecureContext`、`getUserMedia`、Talk 探測）。

### 麥克風（架構鏈路）

```
使用者按住 Talk / 麥克風
        ↓
Secure Context 檢查（HTTPS）
        ↓
getUserMedia({ audio: true })
        ↓
SpeechRecognition 和／或 MediaRecorder
        ↓
（可選）POST /api/transcribe → Whisper
        ↓
文字進入 Composer 或送分析／對話
```

### 常見錯誤

| 錯誤 | 原因 | 處理 |
|------|------|------|
| **ERR_SSL_PROTOCOL_ERROR** | port 3000 跑 **HTTP**，卻用 `https://` 開啟 | 改 `npm run dev:https` |
| **麥克風不可用** | 使用 `http://LAN-IP` 非 Secure Context | 改 HTTPS |
| **HTTPS not running** | 未啟動 dev server 或防火牆封鎖 3000 | 啟動並檢查防火牆 |
| **Wrong LAN IP** | Wi-Fi 變更、IP 改變 | `ipconfig` 對照終端機 Network 網址；必要時重跑 `setup:dev-https` |
| **Port 3000 occupied** | 舊 dev server 未關閉 | 結束占用程序後重啟 `dev:https` |
| **HMR 異常（平板）** | LAN IP 未在 `allowedDevOrigins` | 確認 `next.config.ts`（開發模式自動包含 LAN IP） |

詳細排除步驟見 [`開發環境安裝手冊.md`](./開發環境安裝手冊.md)。

---

## 六、資料流程

### 6.1 英文對話（CHAT）

```
學生
  ↓ 輸入英文（可附圖片、可含語音錄音）
Composer（Talk 分頁）
  ↓ 按 CHAT
sendTutorMessage()
  ↓ buildTutorChatOpenAIMessages(chatItems, text)
POST /api/tutor-chat
  ↓ OpenAI gpt-4o-mini（可 vision）
Tutor 回覆文字
  ↓ 寫入 ChatListItem（tutor 氣泡）
speakWithBrowserTTS(reply, en-US|en-GB)
  ↓ 瀏覽器朗讀
學生聽見／閱讀回覆
```

### 6.2 幫我找英文（翻譯輔助）

```
學生
  ↓ 輸入中文語意
Composer
  ↓ 按「幫我找英文」
submitTranslateFromComposer()
  ↓ sendChineseEnglishHelp(chineseText)
POST /api/tutor-chat（翻譯專用 messages，無聊天歷史）
  ↓ OpenAI 回傳單句英文
setMessage(english) → 填回 Composer
  ↓ 不送入 Chat、不 TTS
學生編輯英文
  ↓ 按 CHAT
（接 6.1 英文對話流程）
```

### 6.3 語音輸入

```
學生
  ↓ 按麥克風（需 HTTPS Secure Context）
getUserMedia + SpeechRecognition
  ↓ 即時文字 或 錄音檔
（若 Whisper 後備）POST /api/transcribe
  ↓ OpenAI Whisper
文字寫入 Composer
  ↓
可 CHAT 或 分析
```

### 6.4 學習分析（Signals）

```
學生
  ↓ 按「分析」
runAnalyze()
  ↓ 收集：Composer 文字 / 轉寫 / 聊天彙整 / 圖片
POST /api/analyze
  ↓ OpenAI 結構化 JSON
parseAnalyzeApiData()
  ↓
AnalyzeFeedbackPanel（Signals 分頁）
  ↓ 可點字朗讀（TTS）
學生檢視語法、詞彙、流暢度、發音建議
```

### 6.5 含圖作業（對話或分析）

```
學生
  ↓ 相機／上傳圖片
attachments（base64 data URL）
  ↓
分支 A：CHAT → /api/tutor-chat（vision 最後一則 user）
分支 B：分析 → /api/analyze（vision prompt）
  ↓
Tutor 或 Signals 呈現結果
```

### 6.6 端到端總覽（簡化）

```
學生
  ↓
輸入文字／語音／圖片
  ↓
StudySignal 前端（StudySignalHome）
  ↓
/api/tutor-chat 或 /api/analyze 或 /api/transcribe
  ↓
AI 分析／對話（現況：OpenAI）
  ↓
Tutor 回覆 或 結構化 Signals
  ↓
TTS（瀏覽器，可選）
  ↓
學生
```

---

## 七、未來規劃

以下為架構層面的規劃方向，**尚未實作**或僅部分占位。

### 家長模式

- **目標：** 家長只讀檢視學習摘要、Signals 趨勢、建議練習項目。
- **架構影響：** 需帳號／角色（parent / student）、權限中介層、資料持久化與 API 授權。

### 學習歷程

- **目標：** 對話、分析、翻譯紀錄跨 session 保存與回顧。
- **架構影響：** 後端資料庫或雲端儲存；前端由「僅 React state」改為「快取 + 同步 API」。

### 能力地圖

- **目標：** 將 grammar / vocabulary / fluency / pronunciation 分數視覺化為長期輪廓。
- **架構影響：** 時間序列資料模型、聚合服務、Signals 分頁圖表元件。

### 任務系統

- **目標：** AI 依程度派發每日／每週任務，與 Tutor、練習字詞串接。
- **架構影響：** 任務排程、完成狀態 API、通知（可選）。

### Learning Analytics

- **目標：** 學習行為分析（使用頻率、弱項分佈、進步曲線），支援教學決策與家長報告。
- **架構影響：** 事件追蹤（privacy-by-design）、分析管線、可能獨立 analytics 服務；須符合未成年人資料保護規範。

### Provider 擴展

- 實作 Provider Registry，支援 OpenAI、Gemini、Claude、Grok、本地模型 **設定切換**。
- 模型路由策略（成本／品質／延遲）可配置化。

---

## 八、開發原則

| 原則 | 說明 |
|------|------|
| **Mobile First** | 以平板／手機為主要設計與測試目標；觸控、safe area、IME 必須考慮。 |
| **HTTPS First** | 區域網路開發一律 `npm run dev:https`；麥克風功能不得假設 HTTP LAN 可用。 |
| **Provider-agnostic** | 客戶端只呼叫 `/api/*`；第三方 API 僅出現在伺服器 adapter；以環境變數切換 Provider。 |
| **低成本優先** | TTS 用瀏覽器合成；語音優先 Web Speech API；Whisper 作後備；避免不必要的雲端服務。 |
| **AI 引導學習，不直接給答案** | Tutor／Analyze prompt 引導思考與改寫；幫我找英文僅輔助表達，不代替學生完成作業對話。 |
| **所有重要流程文件化** | 架構、安裝、Git、專案狀態、Agent 規範置於 `docs/`；重大變更同步更新。 |

### 工程實務

- API Key 僅存在伺服器環境變數（`.env.local`），不進版控。
- 修 bug **最小變更**，不擴散無關重構。
- 合併前 `npm run build` 應通過。
- 敏感流程（HTTPS、翻譯、麥克風）變更需平板實機驗證。

---

## 備註

**本文件僅整理架構與設計意圖，不代表所有「目標架構」已在程式庫中實作。**

- 實作細節與進度請見 [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)。
- 安裝與除錯請見 [`開發環境安裝手冊.md`](./開發環境安裝手冊.md)。

**請勿因閱讀本文件而修改任何 `.ts`、`.tsx`、`package.json` 或 Next.js 設定；架構演進應透過獨立開發任務進行。**

---

*StudySignal — 讓學習訊號清晰可見。*

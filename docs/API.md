# StudySignal API

> **最後更新：** 2026-06-29  
> **相關文件：** [`ARCHITECTURE.md`](./ARCHITECTURE.md)、[`ROADMAP.md`](./ROADMAP.md)、[`開發環境安裝手冊.md`](./開發環境安裝手冊.md)  
> **文件性質：** API 契約與架構說明（非 OpenAPI 自動產生檔）

---

## 狀態圖例

| 標記 | 意義 |
|------|------|
| ✅ **已完成** | 程式庫中已實作並由前端使用 |
| 🟡 **規劃中** | 架構已定義，尚未實作或僅部分實作 |
| ⚪ **未實作** | 無對應程式碼 |

---

## API 架構

StudySignal 採 **BFF（Backend for Frontend）** 模式：瀏覽器 **只** 呼叫自家 Next.js API Routes，**不** 直接存取 OpenAI 或其他雲端 AI。

### 總覽

```
┌─────────────────────────────────────────────────────────────┐
│  Client（StudySignalHome、VoiceTest、SpeechTest 等）         │
│  fetch("/api/...")  — 無 API Key                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Next.js App Router — src/app/api/                          │
│  ┌─────────────────┬─────────────────┬─────────────────────┐ │
│  │ POST            │ POST            │ POST                │ │
│  │ /api/tutor-chat │ /api/analyze    │ /api/transcribe     │ │
│  └────────┬────────┴────────┬────────┴──────────┬──────────┘ │
│           │                 │                    │            │
│           └─────────────────┼────────────────────┘            │
│                             ▼                                 │
│              process.env.OPENAI_API_KEY（伺服器端）            │
│                             │                                 │
└─────────────────────────────┼─────────────────────────────────┘
                              ▼
                    OpenAI API（現況唯一 Provider）
```

### 伺服器 API 一覽

| 端點 | 方法 | 狀態 | 用途 |
|------|------|------|------|
| `/api/tutor-chat` | `POST` | ✅ | Tutor 對話、幫我找英文（共用） |
| `/api/analyze` | `POST` | ✅ | 語法／詞彙／流暢度／發音／圖片分析 |
| `/api/transcribe` | `POST` | ✅ | Whisper 語音轉文字 |

### 非伺服器「API」（瀏覽器能力）

| 能力 | 狀態 | 技術 |
|------|------|------|
| TTS | ✅ | `speechSynthesis`（`src/lib/speechSynthesis.ts`） |
| 即時語音辨識 | ✅ | `SpeechRecognition` / `webkitSpeechRecognition` |
| Voice Test | ✅ | 僅客戶端，無 `/api/*` |
| Speech Test | ✅ | 客戶端 + 可選呼叫 `/api/analyze` |

### 通用規則

- **Base URL：** 與 Next.js 應用同源（開發：`https://<host>:3000`）。
- **認證：** 目前無使用者登入；伺服器以環境變數 `OPENAI_API_KEY` 呼叫 OpenAI。
- **錯誤格式：** JSON `{ "error": "訊息" }`；部分 502 含 `detail`（上游回應原文，除錯用）。
- **CORS：** 同源 fetch，無額外跨域設定。

### 環境變數（現況）

| 變數 | 狀態 | 說明 |
|------|------|------|
| `OPENAI_API_KEY` | ✅ 必要 | 三個 API Route 皆使用 |
| `AI_PROVIDER` | ⚪ 未實作 | 規劃用於 Provider 切換 |
| `GEMINI_API_KEY` 等 | ⚪ 未實作 | 規劃中 |

---

## Chat API

> **說明：** 產品上的「Chat」為 **前端流程名稱**，並無獨立的 `/api/chat` 端點。英文對話實際呼叫 **`POST /api/tutor-chat`**（見下方 Tutor API）。

### 狀態：✅ 已完成（透過 Tutor API）

### 前端觸發

- Talk 分頁按 **CHAT** → `sendTutorMessage()`。
- 訊息由 `buildTutorChatOpenAIMessages()`（`src/lib/tutorChatOpenAiMessages.ts`）組裝後 POST。

### 行為摘要

| 項目 | 說明 |
|------|------|
| 輸入 | 英文文字；可附圖片（vision）；可附語音錄音（僅 UI 重播，不送 Whisper） |
| 歷史 | 先前聊天氣泡轉為 `assistant` / `user`（最多約 40 則） |
| 成功後 | Tutor 氣泡更新 + **瀏覽器 TTS** 朗讀 |
| 失敗後 | Tutor 氣泡顯示錯誤訊息 |

### 與其他 API 的關係

- **分析** 不走 Chat API，而是 `POST /api/analyze`。
- **幫我找英文** 共用 `/api/tutor-chat`，但 messages 不同（見下文）。

---

## Tutor API

### 端點

```
POST /api/tutor-chat
```

**狀態：** ✅ 已完成  
**實作：** `src/app/api/tutor-chat/route.ts`  
**上游：** OpenAI `POST https://api.openai.com/v1/chat/completions`

### 請求

**Headers**

```
Content-Type: application/json
```

**Body**

```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "..." }
  ]
}
```

### messages 驗證規則

| 規則 | 說明 |
|------|------|
| 長度 | 至少 2 則 |
| 第一則 | 必須為 `system` |
| 最後一則 | 必須為 `user` |
| `system` / `assistant` | `content` 僅能為 **字串** |
| `user` | `content` 可為字串，或 **多模態陣列**（僅最後一則 user） |

### 多模態 user content（Vision）

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "What is in this homework?" },
    {
      "type": "image_url",
      "image_url": { "url": "data:image/jpeg;base64,..." }
    }
  ]
}
```

- `image_url.url` 必須為 `data:image/...;base64,...` 格式。
- 前端會壓縮圖片後再送出（僅 tutor-chat 路徑）。

### 負載限制

- 估計總字元數（含 base64）> **280,000** → `400` 錯誤。

### OpenAI 參數（伺服器固定）

| 參數 | 值 |
|------|-----|
| `model` | `gpt-4o-mini` |
| `temperature` | `0.65` |
| `max_tokens` | 含 vision：`1400`；純文字：`900` |

### 回應

**成功 `200`**

```json
{
  "reply": "Tutor 的英文回覆文字"
}
```

**錯誤**

| HTTP | 情境 |
|------|------|
| `400` | JSON 無效、messages 格式不符、內容過長 |
| `500` | 未設定 `OPENAI_API_KEY` |
| `502` | OpenAI 失敗或無回覆內容 |

### Tutor 對話 system prompt（摘要）

由 `buildTutorChatOpenAIMessages()` 注入，要點：

- 英文家教、回覆僅英文（除非學生明確要求其他語言）。
- 短句對話、結尾一個追問。
- 支援附圖作業解讀。

---

## 幫我找英文 API

### 端點

```
POST /api/tutor-chat
```

**狀態：** ✅ 已完成（與 Tutor **同一端點**，不同 `messages`）  
**實作：** 前端 `sendChineseEnglishHelp()`（`StudySignalHome.tsx`）

### 與 Tutor 對話的差異

| 項目 | Tutor 對話（CHAT） | 幫我找英文 |
|------|-------------------|------------|
| 端點 | `/api/tutor-chat` | `/api/tutor-chat` |
| 歷史 | 含聊天 thread | **僅** system + user 兩則 |
| system | Tutor 對話 prompt | 翻譯專用 prompt |
| user | 英文 + 可含圖 | **中文語意**（純文字） |
| 成功後 UI | 聊天氣泡 + TTS | **填回 Composer**，不 CHAT、不 TTS |
| 附圖 | 允許 | **不允許**（前端擋下） |

### 翻譯用 messages 範例

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You translate Chinese into natural conversational English for a student learning English. Return exactly ONE English sentence they could say aloud in a tutoring conversation. Output only the English text—no labels, numbered options, Chinese, markdown, or explanation."
    },
    {
      "role": "user",
      "content": "我想說今天天氣很好"
    }
  ]
}
```

### 回應

與 Tutor API 相同：`{ "reply": "One English sentence." }`

### 錯誤（前端額外處理）

- 空中文 → 前端 `chatSendError`，不發請求。
- 有附圖 → 前端錯誤提示，不發請求。

---

## Voice Test API

### 端點

**無伺服器 API。**

**狀態：** ✅ 已完成（純客戶端）  
**路徑：** `/voice-test`（`VoiceTestClient.tsx`）

### 功能

| 項目 | 說明 |
|------|------|
| 語音列表 | `window.speechSynthesis.getVoices()` |
| 選音邏輯 | `selectSpeechVoiceForLang("en-US" \| "en-GB")` |
| 試聽 | `speakWithBrowserTTS(text, lang)` |
| 網路請求 | **無** |

### 用途

開發／除錯 TTS 語音選擇，驗證 en-US（偏女聲）與 en-GB（偏男聲）策略。

---

## Speech Test API

### 端點

**無專用 `/api/speech-test`。**

**狀態：** ✅ 已完成（混合：客戶端 + 既有 Analyze API）  
**路徑：** `/speech-test`（`SpeechTestClient.tsx`）

### 使用的 API

| API | 狀態 | 用途 |
|-----|------|------|
| 瀏覽器 `SpeechRecognition` | ✅ | 即時語音辨識實驗 |
| `POST /api/analyze` | ✅ | 部分流程測試結構化分析 |

### 與正式產品的關係

- Talk 分頁麥克風流程與 Speech Test **概念相關**，但 UI 與狀態管理獨立。
- 正式語音轉寫後備為 **`POST /api/transcribe`**（Whisper），見下文。

---

## TTS API

### 端點

**無伺服器 TTS API。**

**狀態：** ✅ 已完成（瀏覽器 Web Speech API）  
**實作：** `src/lib/speechSynthesis.ts`

### 主要匯出

| 函式 | 說明 |
|------|------|
| `selectSpeechVoiceForLang(lang, voices?)` | 依 `en-US` / `en-GB` 選語音 |
| `speakWithBrowserTTS(text, lang)` | 朗讀文字 |
| `cancelBrowserTTS()` | 取消朗讀 |

### 觸發時機（產品）

- CHAT 成功後 Tutor 回覆自動朗讀。
- 聊天氣泡重播按鈕。
- Welcome 訊息。
- Signals 分析結果練習字詞（`AnalyzeFeedbackReadAloudButton`）。

### 語言參數

- `DictationSpeechLang`: `"en-US"` | `"en-GB"`
- 與 Talk 分頁英美發音切換連動。

### 雲端 TTS（規劃）

| 項目 | 狀態 |
|------|------|
| `/api/tts`（Gemini / OpenAI TTS 等） | ⚪ 未實作 |
| 統一客戶端 TTS facade（browser vs cloud） | ⚪ 未實作 |

**原則（規劃中）：** 維持 **Low Cost First**，預設瀏覽器 TTS；雲端 TTS 僅在品質或語音不足時以 Provider Adapter 選用。

---

## Whisper API

### 端點

```
POST /api/transcribe
```

**狀態：** ✅ 已完成  
**實作：** `src/app/api/transcribe/route.ts`  
**上游：** OpenAI `POST https://api.openai.com/v1/audio/transcriptions`

### 請求

**Headers**

```
Content-Type: multipart/form-data
```

**Body（FormData）**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `file` | `Blob` / `File` | ✅ | 音訊檔（常見 `audio/webm`） |
| `language` | `string` | 否 | BCP-47 提示，如 `en-US`；伺服器取前 2 字元送 OpenAI |

### OpenAI 參數（伺服器固定）

| 參數 | 值 |
|------|-----|
| `model` | `whisper-1` |
| 檔名 | `audio.webm`（上傳時指定） |

### 回應

**成功 `200`**

```json
{
  "text": "Transcribed English text."
}
```

**錯誤**

| HTTP | 情境 |
|------|------|
| `400` | 非 multipart、缺少有效音訊 |
| `500` | 未設定 `OPENAI_API_KEY` |
| `502` | OpenAI 轉寫失敗 |

### 呼叫時機（產品）

Talk 分頁麥克風 **第二層後備**：

1. 優先：`SpeechRecognition` 即時 dictation。
2. 同時：`MediaRecorder` 錄音。
3. 錄音結束 → `POST /api/transcribe` → 文字寫入 Composer。

`language` 依 `selectedSpeechLang`（`en-US` / `en-GB`）傳入。

---

## Analyze API（補充：Signals 分析）

雖使用者未列為獨立章節標題，此為第三個核心伺服器 API，與 Chat／Tutor 並列。

### 端點

```
POST /api/analyze
```

**狀態：** ✅ 已完成  
**實作：** `src/app/api/analyze/route.ts`

### 請求 Body

```json
{
  "text": "學生文字或轉寫內容",
  "includePronunciation": true,
  "images": [
    {
      "mimeType": "image/jpeg",
      "dataBase64": "..."
    }
  ]
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `text` | `string` | 可為空（若有 `images`） |
| `includePronunciation` | `boolean` | `true` 且無圖 → 語音發音評分分支 |
| `images` | `array` | 可選；有圖 → Vision 分支 |

**驗證：** `text` 與 `images` 不可同時為空 → `400`。

### 分析分支

| 條件 | 分支 | `pronunciationScores` |
|------|------|----------------------|
| 有 `images` | Vision | ❌ 不含 |
| `includePronunciation === true` 且無圖 | 語音發音 | ✅ 含 |
| 其餘 | 純文字 | ❌ 不含；可有 `pronunciationFocus` 練習字詞 |

### OpenAI 參數

| 參數 | 值 |
|------|-----|
| `model` | `gpt-4o-mini` |
| `response_format` | `{ "type": "json_object" }` |
| `temperature` | `0.4` |
| `max_tokens` | 有圖：`8192`；無圖：`4096` |

### 回應

成功 `200`：JSON 物件，型別對應 `AnalyzeFeedback`（`src/lib/analyzeFeedback.ts`），主要欄位：

- `grammar`, `vocabulary`, `fluency`（含 `score`, `strengths`, `whyNot100`, `improvementExamples`）
- `pronunciationFocus`（3 項練習字詞，含 `ipaUs` / `ipaUk`）
- `pronunciationScores`（僅語音分支）
- `imageInsights`（僅 Vision 分支：`ocrText`, `visualSummaryZh`）
- `tutorComment`, `tutorModelAnswer`, `learningSummary`, `expression`（可選）

伺服器與客戶端皆透過 `parseAnalyzeApiData()` 驗證與正規化。

---

## HTTPS 與 Secure Context

麥克風、部分媒體 API 與 **Secure Context** 綁定，屬 API／功能能否在客戶端運作的前置條件。

### Secure Context 規則

| 網址 | Secure Context | `getUserMedia`（麥克風） |
|------|----------------|--------------------------|
| `https://*` | ✅ | ✅（需使用者授權） |
| `http://localhost` | ✅（例外） | ✅ 桌面開發可用 |
| `http://192.168.x.x` | ❌ | ❌ 平板通常不可用 |

### 開發環境 HTTPS

**狀態：** ✅ 已完成

```bash
npm run setup:dev-https   # mkcert 憑證（可選）
npm run dev:https         # https://<LAN-IP>:3000
```

- 憑證：`certificates/dev-key.pem`、`certificates/dev-cert.pem`
- 腳本：`scripts/setup-dev-https.mjs`、`scripts/dev-https.mjs`

### 與 API 的關係

| 功能 | 需要 HTTPS（平板） | 呼叫的 API |
|------|-------------------|------------|
| 麥克風錄音 | ✅ | 可接 `/api/transcribe` |
| SpeechRecognition | ✅ | 無（瀏覽器） |
| TTS | 通常可用 | 無（瀏覽器） |
| Chat / Analyze | 建議 HTTPS 一致測試 | `/api/tutor-chat`、`/api/analyze` |

### 常見錯誤

| 現象 | 原因 | 處理 |
|------|------|------|
| `ERR_SSL_PROTOCOL_ERROR` | HTTP 服務卻用 `https://` 開啟 | 改 `npm run dev:https` |
| 麥克風按鈕無反應 | `http://LAN-IP` 非 Secure Context | 改 HTTPS LAN 網址 |
| API fetch 失敗 | 未啟動 dev server 或 IP 錯誤 | 對照終端機 Network 網址 |

詳見 [`開發環境安裝手冊.md`](./開發環境安裝手冊.md)。

---

## AI Provider 架構

### 現況總表

| 元件 | 狀態 |
|------|------|
| OpenAI 直連（Route 內 `fetch`） | ✅ 已完成 |
| Provider Interface | ⚪ 未實作 |
| Provider Adapter | ⚪ 未實作 |
| Provider Registry | ⚪ 未實作 |
| `AI_PROVIDER` 環境變數 | ⚪ 未實作 |
| Gemini | ⚪ 未實作 |
| Claude | ⚪ 未實作 |
| Grok | ⚪ 未實作 |
| 本地模型 | ⚪ 未實作 |

---

### 目前 OpenAI 的使用方式（✅ 已完成）

三個 API Route **直接在 Handler 內**呼叫 OpenAI，無抽象層。

| API Route | OpenAI 端點 | 模型 |
|-----------|-------------|------|
| `/api/tutor-chat` | `/v1/chat/completions` | `gpt-4o-mini` |
| `/api/analyze` | `/v1/chat/completions` | `gpt-4o-mini`（`json_object`） |
| `/api/transcribe` | `/v1/audio/transcriptions` | `whisper-1` |

**金鑰：** 僅伺服器讀取 `process.env.OPENAI_API_KEY`（通常 `.env.local`）。

**客戶端契約（已穩定、Provider 切換時應保持）：**

```typescript
// tutor-chat
POST { messages } → { reply: string }

// analyze
POST { text, includePronunciation?, images? } → AnalyzeFeedback

// transcribe
POST FormData(file, language?) → { text: string }
```

**已具備的邏輯分離（非 Provider 抽象）：**

- `tutorChatOpenAiMessages.ts` — 組裝 messages（業務 prompt）
- `analyzeFeedback.ts` — 解析／正規化分析 JSON（與上游無關的輸出形狀）

---

### Provider Interface（⚪ 未實作 · 🟡 規劃中）

**目標：** 定義與廠商無關的介面，Route 只依賴介面，不依賴 OpenAI URL。

概念示意（文件用，非現有程式碼）：

```typescript
/** 聊天完成（Tutor、翻譯、Analyze 的 LLM 呼叫） */
interface ChatCompletionProvider {
  complete(params: {
    messages: ChatMessage[];
    jsonMode?: boolean;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ text: string }>;
}

/** 語音轉文字 */
interface TranscribeProvider {
  transcribe(params: {
    audio: Blob;
    languageHint?: string;
  }): Promise<{ text: string }>;
}

/** 可選：雲端 TTS */
interface TtsProvider {
  synthesize(params: {
    text: string;
    lang: "en-US" | "en-GB";
  }): Promise<{ audioUrl: string } | { audioBase64: string }>;
}
```

**狀態：** ⚪ 程式庫中尚無此介面定義檔。

---

### Provider Adapter（⚪ 未實作 · 🟡 規劃中）

**定義：** 各廠商專用實作，將統一 `Provider Interface` 轉換為該廠商 HTTP／SDK 呼叫，並處理回應差異。

| Adapter | 狀態 | 規劃職責 |
|---------|------|----------|
| `OpenAiAdapter` | 🟡 邏輯散落於 Route | 抽離至 `src/lib/ai/providers/openai.ts` |
| `GeminiAdapter` | ⚪ 未實作 | Google Generative AI API |
| `ClaudeAdapter` | ⚪ 未實作 | Anthropic Messages API |
| `GrokAdapter` | ⚪ 未實作 | xAI API |
| `LocalAdapter` | ⚪ 未實作 | Ollama / 內網 OpenAI-compatible endpoint |

**Adapter 原則：**

- 僅 Adapter 知道廠商 URL、認證標頭、模型 ID 對照。
- Route Handler 不 import 廠商 SDK。
- 錯誤統一映射為 `{ error, detail? }`。

---

### Provider Registry（⚪ 未實作 · 🟡 規劃中）

**定義：** 依環境變數建立並快取 Provider 實例的工廠／登錄表。

概念示意：

```typescript
// 規劃：src/lib/ai/registry.ts
function getChatProvider(): ChatCompletionProvider {
  switch (process.env.AI_PROVIDER) {
    case "openai":  return openAiAdapter;
    case "gemini":  return geminiAdapter;
    case "claude":  return claudeAdapter;
    case "grok":    return grokAdapter;
    case "local":   return localAdapter;
    default:        return openAiAdapter;
  }
}
```

**規劃環境變數：**

| 變數 | 說明 |
|------|------|
| `AI_PROVIDER` | `openai` \| `gemini` \| `claude` \| `grok` \| `local` |
| `AI_MODEL_CHAT` | 聊天模型覆寫（可選） |
| `AI_MODEL_ANALYZE` | 分析模型覆寫（可選） |
| `OPENAI_API_KEY` | OpenAI 金鑰 |
| `GEMINI_API_KEY` | Gemini 金鑰（規劃） |
| `ANTHROPIC_API_KEY` | Claude 金鑰（規劃） |
| `LOCAL_AI_BASE_URL` | 本地相容端點（規劃） |

**切換目標：** 修改環境變數與重啟服務即可，**無需**修改 `StudySignalHome.tsx` 或 fetch URL。

---

### 未來各 Provider（⚪ 未實作 · 🟡 規劃中）

#### Gemini

| 項目 | 狀態 |
|------|------|
| Chat / Vision | ⚪ 未實作 |
| Analyze JSON | ⚪ 未實作 |
| Transcribe | ⚪ 未實作（需評估 Gemini 音訊 API 或保留 Whisper Adapter） |
| TTS | ⚪ 未實作 |

**規劃位置：** `GeminiAdapter` 實作 `ChatCompletionProvider`；Route 不變。

#### Claude

| 項目 | 狀態 |
|------|------|
| Chat / Analyze | ⚪ 未實作 |
| Vision | ⚪ 未實作 |
| Transcribe | ⚪ 未實作（可能沿用獨立 Transcribe Provider） |

#### Grok

| 項目 | 狀態 |
|------|------|
| Chat / Analyze | ⚪ 未實作 |

#### 本地模型

| 項目 | 狀態 |
|------|------|
| Ollama / OpenAI-compatible | ⚪ 未實作 |
| 用途 | 降低成本、資料不出內網；可能用於開發或離線實驗 |

---

### 目標架構圖（🟡 規劃中）

```
Client
  │  POST /api/tutor-chat | /api/analyze | /api/transcribe  （不變）
  ▼
API Route（薄層：驗證 + 呼叫 Service）
  ▼
AiService / Provider Registry          ← ⚪ 未實作
  │
  ├── OpenAiAdapter                    ← ✅ 邏輯在 Route（待抽離）
  ├── GeminiAdapter                    ← ⚪
  ├── ClaudeAdapter                    ← ⚪
  ├── GrokAdapter                      ← ⚪
  └── LocalAdapter                     ← ⚪
```

---

## 錯誤碼速查

| 端點 | 400 | 500 | 502 |
|------|-----|-----|-----|
| `/api/tutor-chat` | JSON／messages 無效、過長 | 無 API Key | OpenAI 失敗／空回覆 |
| `/api/analyze` | 無 text 且無圖 | 無 API Key | OpenAI 失敗、JSON 解析失敗、欄位不完整 |
| `/api/transcribe` | 無有效音訊 | 無 API Key | Whisper 失敗 |

---

## 版本與變更

- API 路徑與 JSON 契約變更時，應同步更新本文件與 [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)。
- Provider 抽象實作後，應在本文件將對應項目由 ⚪ 改為 ✅。

---

**請勿因閱讀本文件而修改任何 `.ts`、`.tsx`、`package.json` 或 Next.js 設定。**

**本任務僅建立／更新 `docs/API.md`。**

---

*StudySignal — 讓學習訊號清晰可見。*

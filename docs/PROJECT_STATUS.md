# StudySignal 專案狀態

> **最後更新時間：** 2026-06-29（星期日）  
> **遠端儲存庫：** `https://github.com/hsiaotsunjen-dotcom/studysignal.git`  
> **文件性質：** 專案管理／開發進度總覽（非安裝手冊；安裝步驟見 `docs/開發環境安裝手冊.md`）

---

## 一、專案願景

**StudySignal 致力於成為台灣學生的 AI 英語學習夥伴：透過對話、語音、圖片與結構化回饋，讓學生在真實使用情境中練習英文，並逐步累積可追蹤的學習訊號（Signals）。**

核心價值：

- **在情境中學習**：對話、口說、作業圖片，而非死背單字表。
- **AI 當家教，不當代寫機**：引導思考與改寫，而非直接代寫答案（見「開發原則」）。
- **訊號可見**：將語法、詞彙、流暢度、發音等回饋整理成 Signals，供學生與（未來）家長理解進步軌跡。
- **行動裝置優先**：以 Android 平板與手機為主要測試目標，搭配 HTTPS Secure Context 支援麥克風。

---

## 二、功能完成度

以下為截至 **2026-06-29** 之功能狀態總表。

| 功能 | 狀態 | 備註 |
|------|------|------|
| Chat 英文對話 | ✅ 完成 | 文字、多輪紀錄、清除對話 |
| AI Tutor（文字） | ✅ 完成 | `/api/tutor-chat`，含對話歷史 |
| AI Tutor（含圖 vision） | ✅ 完成 | 作業／課本圖片可送入對話 |
| 幫我找英文 | ✅ 完成 | 中文→英文填回 Composer，不自動 CHAT |
| 英美發音切換（US/GB） | ✅ 完成 | Dictation、TTS、IPA 分支 |
| 瀏覽器 TTS | ✅ 完成 | Tutor 回覆、氣泡重播、Welcome |
| 語音輸入（Dictation） | ✅ 完成 | SpeechRecognition + 錄音 + Whisper 後備 |
| 語法／詞彙／流暢度分析 | ✅ 完成 | `/api/analyze`，Signals 分頁顯示 |
| 發音分析（語音提交） | 🟡 開發中 | API 與 UI 已有 `pronunciationScores`；練習引導與 UX 待強化 |
| 發音分析（純文字） | ✅ 完成 | `pronunciationFocus` 字詞練習（非實際發音評分） |
| 拍照／上傳圖片 | ✅ 完成 | Talk 分頁相機、檔案上傳、縮圖管理 |
| 拍照分析（作業 OCR） | 🟡 開發中 | Vision analyze 已支援；獨立 Tools 流程與 UX 未完成 |
| Signals 學習回顧 | 🟡 開發中 | 前端最多 5 筆 session 歷史；無持久化 |
| Talk / Signals / 我的 三分頁 | ✅ 完成 | 導覽與基本版面 |
| 學制／科目設定 | ✅ 完成 | Tools（我的）分頁 UI |
| Tools 獨立工具（OCR 等） | ⚪ 規劃中 | 目前為 mock 卡片占位 |
| HTTPS 開發環境 | ✅ 完成 | `npm run dev:https`、mkcert 腳本 |
| Android 平板 HTTPS 測試 | ✅ 完成 | LAN IP + Secure Context 流程已驗證 |
| Secure Context 診斷面板 | ✅ 完成 | 僅 development 模式 |
| Mic Debug | ✅ 完成 | 診斷按鈕與 modal |
| Voice Test 頁 | ✅ 完成 | `/voice-test` |
| Speech Test 頁 | ✅ 完成 | `/speech-test`（開發實驗） |
| GitHub 備份 | ✅ 完成 | 已連線遠端並持續提交 |
| 開發文件（安裝手冊） | ✅ 完成 | `docs/開發環境安裝手冊.md` |
| 開發文件（其餘） | 🟡 開發中 | Agent 規範、Git、FAQ 仍為占位 |
| 學習歷程持久化 | ⚪ 規劃中 | 需後端或本地儲存設計 |
| 能力地圖 | ⚪ 規劃中 | 長期分數視覺化 |
| 家長模式 | ⚪ 規劃中 | 需帳號與權限 |
| AI 任務系統 | ⚪ 規劃中 | 每日／每週任務派發 |
| Gemini / 多 Provider | ⚪ 規劃中 | 目前僅 OpenAI |
| 正式環境部署（Production） | ⚪ 規劃中 | 部署與憑證策略未定 |

**圖例：** ✅ 完成　🟡 開發中　⚪ 規劃中

---

## 三、目前已完成功能（詳述）

### Chat 對話

- Talk 分頁提供與 AI Tutor 的英文對話介面（`CHAT` 按鈕送出）。
- 支援文字輸入、多輪對話紀錄、聊天區捲動與清除對話。
- 支援附加圖片一併送交家教（相機拍照或檔案上傳）。
- 學生語音錄製可附在訊息氣泡中供重播（麥克風 dictation 流程）。

### AI Tutor

- 後端 API：`/api/tutor-chat`（OpenAI Chat Completions）。
- 系統提示詞與對話歷史由 `buildTutorChatOpenAIMessages` 組裝。
- 支援純文字與含圖片（vision）的 user 訊息。
- Tutor 回覆顯示於聊天區，並可觸發瀏覽器 TTS 朗讀。

### 幫我找英文

- 共用同一輸入框：使用者輸入中文語意 → 按「幫我找英文」。
- 呼叫 `/api/tutor-chat` 翻譯專用 prompt，**僅將英文填回 Composer**，不自動送入聊天、不播放 TTS。
- 使用者可編輯英文後，再按 **CHAT** 正式送給 Tutor。
- 支援 `translate` / `chat` 模式切換（Enter 在 translate 模式可送出翻譯）。
- 已處理 IME 中文輸入與 React 19 事件相關的執行時序問題。

### 英美發音切換

- Talk 分頁可切換 **en-US** / **en-GB** dictation 語言。
- 影響語音辨識（SpeechRecognition / Whisper 語言參數）、TTS 語音選擇與分析結果中的 IPA（美式 / 英式）。

### TTS（文字轉語音）

- 使用瀏覽器 **Speech Synthesis API**（`src/lib/speechSynthesis.ts`），無額外雲端 TTS 費用。
- Tutor 回覆自動朗讀（CHAT 成功後）。
- 聊天氣泡提供重播按鈕。
- 分析結果（Signals）練習字詞可朗讀。
- Welcome 訊息支援自動播放與手動「點我開始」。

### 發音／語法分析（Signals）

- Talk 分頁「分析」按鈕 → `/api/analyze`（OpenAI，結構化 JSON 回饋）。
- 支援：輸入框文字、麥克風轉寫、聊天紀錄彙整、附圖 OCR／視覺分析（多種 prompt 分支）。
- 結果顯示於 **Signals** 分頁（`AnalyzeFeedbackPanel`），最多保留 5 筆歷史。

### 語音輸入（Dictation）

- 瀏覽器 SpeechRecognition + 錄音備援。
- `/api/transcribe`（OpenAI Whisper）作為轉寫後備。
- 波形預覽、重播最後一段錄音、錯誤提示。

### 圖片上傳與相機

- 上傳圖片、相機 modal 拍照、縮圖預覽與移除。
- 圖片可隨 CHAT 或分析流程一併送出。

### Voice Test / Speech Test

- `/voice-test`：系統語音列表、en-US / en-GB TTS 測試。
- `/speech-test`：語音辨識實驗（開發除錯用）。

### HTTPS 開發環境

- `npm run dev:https`：以 HTTPS 啟動 Next.js dev server（port 3000）。
- `npm run setup:dev-https`：以 mkcert 產生含 localhost 與 LAN IP 的憑證。
- `scripts/dev-https.mjs`：Windows 相容啟動腳本。
- `next.config.ts`：`allowedDevOrigins` 自動包含 LAN IP。

### Android 平板測試與 Secure Context

- `https://<LAN-IP>:3000` 同 Wi-Fi 測試。
- 開發模式 Secure Context 診斷面板、Mic Debug。
- 詳見 `docs/開發環境安裝手冊.md`。

### 導覽與文件

- 三分頁：**Talk**、**Signals**、**我的**（Tools）。
- 學制與科目選擇 UI。
- GitHub 備份與 `docs/` 文件體系（安裝手冊已完成）。

---

## 四、已完成的重要里程碑

依 Git 提交紀錄整理（新→舊）。

| 日期 | Commit | 里程碑說明 |
|------|--------|------------|
| 2026-06-29 | `19c6fd8` | 新增開發文件與 HTTPS 開發環境（安裝手冊、`dev:https` 腳本） |
| 2026-06-29 | `f694215` | 修正 HTTPS、麥克風與翻譯流程（幫我找英文、Secure Context、`[object Event]`） |
| 2026-06-26 | `ddb2314` | 開始準備 StudySignal 學生資料架構 |
| 2026-06-26 | `28d5858` | 新增 Voice Debug 與 Voice Test 頁面 |
| 2026-06-24 | `f4cdf90` | 麥克風除錯後恢復穩定 |
| 2026-06-23 | `e935bee` | Tools 分頁更名為「我的」 |
| 2026-06-23 | `3612509` | 修復 rebuild 並恢復 StudySignal UI |
| 2026-06-21 | `0570175` | 新增分析歷史與頁面優化 |
| 2026-06-15 | `21325d9` | 改善訊息輸入 UX |
| 2026-06-15 | `6e6a85b` | 修正發音回饋與 Tutor model answer TTS |
| 2026-06-14 | `b0a7dd1` | Tutor TTS 與學習回顧模式 |
| 2026-06-13 | `675d5dd` | Tutor 作業圖片上傳可用 |
| 2026-06-12 | `fe6f6fe` | 中文語意輔助（幫我找英文前身） |
| 2026-06-11 | `06266f4` | 圖片分析 parser 與 Tutor fallback |
| 2026-06-11 | `a9998bd` | Tutor 語音與英美發音支援 |
| 2026-06-10 | `2901e2a` | 發音評分系統（pronunciation scoring） |
| 2026-06-09 | `131f13d` | 英文分析與轉寫除錯改善 |
| 2026-06-06 | `09b58a1` | 語音辨識修復（強制 en-US） |

**階段性歸納：**

- **2026-06-06～06-11：** 核心對話、分析、發音、Tutor 語音基礎建設。
- **2026-06-12～06-21：** 中文輔助、圖片、學習回顧、UX 打磨。
- **2026-06-23～06-26：** UI 恢復、Voice 除錯、學生資料架構準備。
- **2026-06-29：** HTTPS 開發環境、文件體系、翻譯流程與平板麥克風穩定化。

---

## 五、下一版本（Next Milestone）

**代號：** `Milestone-2026Q3-Alpha`  
**目標完成時間：** 2026 年第三季（滾動調整）  
**定位：** 內部 Alpha——可在平板上穩定完成「對話 → 分析 → 回顧」閉環，尚不對外公開。

### 必達目標（Must Have）

1. **Tutor 對話體驗穩定**  
   - 含圖作業輔導 prompt 優化、錯誤訊息中文化、載入狀態清楚。
2. **發音分析 UX 強化**  
   - 語音提交後 `pronunciationScores`／`pronunciationFocus` 呈現更易懂、可練習。
3. **拍照分析流程整理**  
   - 釐清 Talk vs Tools 的圖片分析路徑；減少使用者困惑。
4. **文件補齊**  
   - 完成 `AI Agent 工作規範.md`、`Git 操作流程.md`、`常見問題.md`。
5. **HTTPS 開發 SOP 全員一致**  
   - 所有開發者與 Agent 預設 `npm run dev:https`；mkcert 安裝指引可選。

### 應達目標（Should Have）

6. **Signals  session 體驗**  
   - 5 筆歷史內容結構化、空狀態引導優化。
7. **技術債收斂（第一輪）**  
   - 關閉 analyze 冗長 debug log；補齊關鍵 async `.catch()`。
8. **Provider 抽象設計稿**  
   - 文件化 OpenAI 抽換介面，不一定要實作 Gemini。

### 不納入本 Milestone（Won't Have）

- 家長模式、帳號系統、正式 production 部署、AI 任務系統、能力地圖持久化。

### 驗收方式

- Android 平板：`https://<LAN-IP>:3000` 完成一輪 **中文→幫我找英文→編輯→CHAT→分析→Signals**。
- `npm run build` 通過。
- 本文件「功能完成度」表中相關項由 🟡 移至 ✅。

---

## 六、長期 Roadmap

### Beta（測試版）

**目標：** 小範圍試用（學校／補習班／家庭），收集真實學習數據與 UX 回饋。

| 領域 | 內容 |
|------|------|
| 產品 | Talk + Signals 閉環穩定；幫我找英文、含圖 Tutor、發音分析達可示範水準 |
| 技術 | Production 部署（HTTPS 正式憑證）；環境變數與 API Key 安全管理 |
| 資料 | 學習歷程初步持久化（帳號或裝置綁定） |
| 文件 | 完整開發與維運文件；常見問題涵蓋平板與麥克風 |

### V1.0（正式版 1.0）

**目標：** 對外發布可持續使用的 StudySignal 首頁產品。

| 領域 | 內容 |
|------|------|
| 產品 | 家長模式（只讀）；學制／科目與內容深度整合 |
| 學習 | 能力地圖初版（grammar / vocabulary / fluency 趨勢） |
| AI | Provider-agnostic 實作；可配置模型；成本監控 |
| 平台 | 行動 Web 體驗優化；效能與離線提示 |

### V2.0（正式版 2.0）

**目標：** 個人化學習平台與任務驅動成長。

| 領域 | 內容 |
|------|------|
| 產品 | AI 任務系統（每日／每週）；學習路徑推薦 |
| 生態 | Tools 獨立模組（OCR、閱讀、寫作助手）與 Talk 深度串接 |
| 資料 | 跨裝置同步；學習報告匯出 |
| 擴展 | 可選 Gemini 或其他 Provider；多語系延伸評估 |

---

## 七、下一階段優先工作（依優先順序）

1. **Tutor 對話體驗** — prompt、錯誤處理、含圖作業情境。
2. **拍照分析** — 相機／上傳與 OCR、解題流程產品化。
3. **發音分析** — 語音提交後的評分與練習引導。
4. **家長模式** — 只讀檢視（需帳號與資料層）。
5. **學習歷程** — Signals、對話、分析持久化。
6. **能力地圖** — 長期分數視覺化。
7. **AI 任務系統** — 與 Tutor、Signals 串接。

---

## 八、已解決的重要問題

### HTTPS 與 Secure Context

- 確認 Android 平板以 `http://192.168.x.x:3000` 存取時 **非 Secure Context**，`getUserMedia` 不可用。
- 標準開發流程改為 **`npm run dev:https`**。

### ERR_SSL_PROTOCOL_ERROR

- **原因：** port 3000 跑 HTTP（`npm run dev`），平板卻以 `https://` 開啟。
- **處理：** 改啟動 `npm run dev:https`；已寫入安裝手冊。

### Android 麥克風

- HTTPS + 瀏覽器權限後可進入 Secure Context；診斷面板可驗證 Talk 探測。

### 「幫我找英文」流程

- 改為翻譯寫回 Composer，由使用者決定 CHAT。
- 修正 `[object Event]`（React 19 事件時序、`queueMicrotask`、字串參數、`.catch()`）。

### 其他

- HTTPS 憑證（mkcert / 自簽 fallback）、Windows `dev-https` spawn 問題、`.next` 快取損壞、診斷視窗拖曳、Mic Debug 元件穩定化。

---

## 九、目前已知問題

1. mkcert 未在所有開發機安裝，平板可能需重複接受憑證警告。  
2. Gemini 尚未整合；目前僅 OpenAI。  
3. 部分 `docs/` 仍為占位。  
4. Tools 分頁 OCR 等為 mock。  
5. Signals 無持久化，重新整理後消失。  
6. 無帳號與家長模式。  
7. Production 部署流程未定。  
8. Analyze API debug log 仍偏冗長。  
9. AI Provider 仍硬連 OpenAI 端點。

---

## 十、技術債（Technical Debt）

| 編號 | 項目 | 嚴重度 | 說明 | 建議處理時機 |
|------|------|--------|------|--------------|
| TD-01 | Provider 硬編碼 OpenAI | 高 | `/api/*` 直接呼叫 OpenAI URL | Next Milestone 設計抽象層 |
| TD-02 | 分析路由 debug log | 中 | `ANALYZE_ROUTE_DEBUG` 等常駐 | Alpha 前關閉或改 env 控制 |
| TD-03 | Signals 無持久化 | 高 | 僅 React state，最多 5 筆 | Beta 前引入儲存 |
| TD-04 | Tools mock 與真實功能分裂 | 中 | `StudySignalSecondaryTabContent` 占位 | 拍照分析 Milestone |
| TD-05 | 部分 Promise 缺 `.catch()` | 中 | Welcome TTS 等路徑 | 技術債掃描一輪 |
| TD-06 | `StudySignalHome.tsx` 體積過大 | 中 | 單檔承載過多邏輯 | 重構時按功能拆 hook／元件 |
| TD-07 | 無 E2E 自動化測試 | 中 | 依賴手動平板測試 | Beta 前引入 Playwright 煙霧測試 |
| TD-08 | 無正式 CI/CD | 中 | 手動 `npm run build` | Production 前建立 |
| TD-09 | 環境變數無範本文件 | 低 | `.env.local` 需口耳相傳 | 補 `docs/常見問題.md` |
| TD-10 | mkcert 非強制 | 低 | 開發體驗不一致 | 安裝手冊已說明；可選團隊規範 |

---

## 十一、開發原則

以下原則指導 StudySignal 的技術與產品決策，所有開發者與 AI Agent 應優先遵守。

### 1. Provider-agnostic（供應商中立）

- 客戶端 **只呼叫自家** `/api/*`，不直接暴露 API Key，不從瀏覽器打 OpenAI／Gemini。
- 業務邏輯與「訊息組裝、回傳 JSON 解析」放在 `src/lib/`，與具體 HTTP 端點分離。
- 新增模型或供應商時，優先擴充 server 端 provider 模組，而非在 UI 硬編碼。
- **現況：** 僅 OpenAI 已實作；架構上預留抽換空間。

### 2. 優先低成本（Cost-conscious）

- TTS 預設使用瀏覽器 **Speech Synthesis**，避免雲端 TTS 費用。
- 語音辨識優先 Web Speech API，Whisper 作為後備。
- API 呼叫需有明確用途（對話、分析、轉寫、翻譯），避免重複請求與過長 context。
- 新功能先評估：是否可用現有 API + prompt 完成，而非新增付費服務。

### 3. Mobile First（行動優先）

- 版面與互動以 **手機／平板** 為主要設計對象（`touch-manipulation`、safe area、可捲動區域）。
- 新功能需在 **Android 平板 + HTTPS** 上驗證，不可僅在桌面 localhost HTTP 測試麥克風。
- 輸入區、按鈕列、聊天區需考慮虛擬鍵盤與 IME（中文輸入）。

### 4. HTTPS Secure Context（安全環境優先）

- 區域網路開發 **必須** 使用 `npm run dev:https`，不得以 `http://192.168.x.x` 作為麥克風測試方案。
- 新功能若使用 `mediaDevices`、`getUserMedia`、部分 Storage API，須先確認 Secure Context。
- 開發模式提供診斷工具輔助除錯，但不替代正確的 HTTPS 流程。

### 5. AI 引導學習，不直接給答案

- Tutor 與 Analyze 的 prompt 應引導學生 **思考、改寫、練習**，而非代寫作業答案。
- 「幫我找英文」定位為 **寫作輔助**（中→英填回輸入框），由學生決定是否送出對話，不代替學生完成對話作業。
- 含圖作業情境：優先 **引導解題步驟** 與 **語言練習**，避免整份答案一次輸出。
- 分析回饋應具體引用學生原文，給可操作的下一步（`whatToPracticeNext`），而非空泛鼓勵。

### 6. 其他工程原則

- **最小變更：** 修 bug 時不順手改无关 UI 或功能。
- **文件同步：** 環境、流程、已知問題變更時更新 `docs/`。
- **可建置：** 合併前 `npm run build` 應通過。
- **Git 備份：** 重要節點 push 至 GitHub。

---

## 十二、重要技術架構

### 前端

| 技術 | 用途 |
|------|------|
| **Next.js 15** | App Router、API Routes、開發伺服器 |
| **React 19** | UI、Client Components |
| **TypeScript** | 型別安全 |
| **Tailwind CSS** | 樣式與響應式版面 |

### 後端 API

| 路由 | 功能 | Provider |
|------|------|----------|
| `/api/tutor-chat` | Tutor 對話、中文→英文翻譯 | OpenAI Chat Completions |
| `/api/analyze` | 結構化學習分析 | OpenAI Chat Completions |
| `/api/transcribe` | 語音轉文字 | OpenAI Whisper |

環境變數：`.env.local` → `OPENAI_API_KEY`

### 語音

- **輸入：** Web Speech API、MediaRecorder、Whisper API  
- **輸出：** 瀏覽器 `speechSynthesis`（en-US / en-GB）

### 目錄摘要

```
studysignal-homepage/
├── src/app/          # 頁面與 API Routes
├── src/components/   # UI 元件
├── src/lib/          # 訊息組裝、語音、分析解析
├── scripts/          # dev-https、setup-dev-https
├── docs/             # 專案文件
└── certificates/     # mkcert 憑證（本機，gitignore）
```

---

## 十三、每日開工流程

整理自 [`docs/開發環境安裝手冊.md`](./開發環境安裝手冊.md)。

| 步驟 | 動作 | 說明 |
|------|------|------|
| 1 | 開啟 Cursor | 載入專案根目錄 |
| 2 | `git pull` | 取得最新程式碼 |
| 3 | `npm install`（若需要） | 相依套件異常時 |
| 4 | `npm run dev:https` | 平板測試必用 HTTPS |
| 5 | 確認終端機 | `https://localhost:3000` 與 `https://<LAN-IP>:3000` |
| 6 | 測試麥克風 | Secure Context 與權限 |
| 7 | 開始開發 | 完成後 commit / push |

```bash
npm run dev:https
npm run setup:dev-https   # 換網路或 LAN IP 變更時
npm run build
npm run lint
```

---

## 十四、今日工作紀錄（Work Log）

### 2026-06-29

| 時間段 | 事項 | 結果 |
|--------|------|------|
| 文件 | 建立 `docs/` 目錄與四份占位文件 | 完成 |
| 文件 | 撰寫完整 `docs/開發環境安裝手冊.md` | 完成 |
| 文件 | 建立並擴充 `docs/PROJECT_STATUS.md` 為專案管理文件 | 進行中（本更新） |
| 基礎建設 | 恢復 HTTPS dev server（`npm run dev:https`） | 完成；修正 ERR_SSL_PROTOCOL_ERROR（HTTP 誤佔 port 3000） |
| 功能 | 「幫我找英文」改為翻譯填回 Composer、不自動 CHAT | 完成 |
| 除錯 | 修正翻譯流程 `[object Event]` 執行時錯誤 | 完成；Playwright 驗證通過 |
| 驗證 | `npm run build`、HTTPS LAN 存取、平板測試流程 | 通過 |

**明日建議：**

- 平板端完整走查 Milestone 必達項目 #1～#3。  
- 開始撰寫 `docs/AI Agent 工作規範.md`。  
- 評估 mkcert 是否於開發機安裝，減少平板憑證警告。

---

## 十五、備註

### 給所有 AI Agent 的提醒

1. **除非使用者明確要求，否則不得修改本文件以外的任何應用程式原始碼。**
2. 撰寫或更新文件時，僅能編輯 `docs/` 目錄下**使用者指定**的檔案。
3. 不得擅自修改 `package.json`、`next.config.ts`、`.env*` 或 UI／業務邏輯，除非任務明確授權。
4. 平板麥克風測試一律假設 **HTTPS 開發模式**。
5. 功能變更後，由人類開發者決定是否更新本文件；Agent 可在被要求時更新對應章節。

### 狀態文件維護

- 每次發布 Milestone、重大功能上線或 Roadmap 調整，請更新：**功能完成度**、**里程碑**、**Work Log**、**最後更新時間**。
- 安裝與除錯細節以 `docs/開發環境安裝手冊.md` 為準。

---

*StudySignal — 讓學習訊號清晰可見。*

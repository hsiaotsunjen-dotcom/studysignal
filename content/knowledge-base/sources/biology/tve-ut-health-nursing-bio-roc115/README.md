# 115 學年度統測 衛生與護理類 專業科目(一)：生物(B)

本來源是 115 學年度科技校院四年制與專科學校二年制統一入學測驗官方試題本，
屬於 `tve-ut-health-nursing-bio-roc106-115` 系列（一年一個 source）。
不是 fixture、mock 或自編題目。

## 官方 PDF provenance

| 項目 | 值 |
|---|---|
| 原始檔 | `D:\Downloads\115-4y-10-1生物_2.pdf` |
| 歸檔副本 | `originals/115-4y-10-1生物.pdf` |
| 大小 | 579,515 bytes |
| SHA-256 | `81ecbf67afa35b435a6fb6c7b9f30fd5fef17a36d10f33f4d81ef6ae8826785b` |

`originals/` 內的 PDF 是原始檔的 byte-identical archive：大小、SHA-256 與逐 byte 比對皆一致，
原始檔未修改、移動或刪除。PDF 只作為官方原始檔與 provenance，不直接匯入 KB pipeline。

出版／命題單位未在轉錄內容中可靠確認，`paper.json` 的 `publisher` 保留 `null`。

## 文字轉錄

- `paper.md` 是 PDF 的文字轉錄（machine-extracted），也是日後匯入 registry/documents 的 `sourcePath`。
- 共 12 頁、50 題單一選擇題；第 11–12 頁為空白頁。每頁以 `## PDF 第 N 頁` 標示。
- 不含答案或解析。「答案」字樣只出現在封面注意事項（答案卡）。
- 圖(一)～圖(五)、表(一)～表(二)、化學結構與版面位置無法完整以文字呈現，
  抽取的圖內文字可能錯位；**圖表一律以原 PDF 為準**。
- 上下標可能被拆行（例如 `mm` 與次方 `3`、`m` 與 `2`、`km` 與 `2`）。

## 複核狀態

尚未人工逐題複核（`reviewStatus: machine-extracted; independent-human-review-pending`）。

## 匯入

使用 `scripts/kb-biology-exam.ts`。預設為 verify-only；`--write` 才會寫入 registry 與 documents：

```powershell
node node_modules/vite-node/vite-node.mjs scripts/kb-biology-exam.ts --year 115
```

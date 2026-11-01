# Biology OCR quality experiment — public summary

Date: 2026-11-01

## Scope and outcome

This bounded local experiment used 12 review regions from 9 pages of an existing 12-page pilot. Twenty OCR jobs completed successfully. No full-book OCR was started. Existing scans, OCR versions, exam classifications and knowledge-map data were preserved; Phase 2F was not started.

The experiment tested region cropping, grayscale conversion, percentile normalization, sharpening, resizing, mixed Traditional Chinese/English recognition, and single-language line recognition. Tesseract.js 7.0.0, Tesseract.js core 7.0.0 and Sharp 0.35.3 used locally installed language models without paid APIs or external image uploads.

| Variant | Jobs | Languages | Segmentation | Scale |
| --- | ---: | --- | --- | ---: |
| Cropped block | 12 | English + Traditional Chinese | PSM 6 | 2x |
| Chinese line | 3 | Traditional Chinese | PSM 7 | 2x |
| English/formula line | 5 | English | PSM 7 | 3x |

## Quality findings and limits

Some isolated English terminology appeared more readable. Chinese substitutions remained, and formulas, superscripts, subscripts, Greek symbols, table reading order and labels within figures were unreliable. A blank-control region produced substantial spurious text under block segmentation. These are automated results and agent observations, not human verification. No experimental variant replaced existing OCR.

All 12 candidate review regions remain `pending_human_review`. Human-approved references: **0**. Formal Chinese CER: **null**. Formal English WER: **null**. No accuracy target has been declared achieved, and no OCR output was upgraded to verified. Existing page-number verification states are separate from OCR quality and were not upgraded.

Baseline region text was selected by word-center intersection from existing full-page TSV. Its boundaries and reading order can differ from independently cropped recognition. Text differences or confidence values alone therefore do not establish accuracy improvement.

## Automated validation

- OCR jobs completed: 20/20. Sum of recorded job durations: approximately 26.904 seconds; initial session duration: approximately 26.986 seconds. These regional timings cannot predict full-book processing time.
- Actual resume skipped all 20 completed jobs after artifact checksum verification; no repeated OCR was required.
- Nine tool tests passed, covering bounded selections, retries, resume, tamper detection, exclusive output writes and metric gating. Metric test fixtures are synthetic, not textbook ground truth.
- The existing 12-page validation passed. At the end of the quality experiment, SHA-256 comparison found no changes or missing files among 718 pre-existing nonignored files. The 9 source scans actually used were also checked against their manifest; this is not a fresh verification claim for all 486 scans.

## Saved tools and local prerequisites

The committed tools include the experiment runner, region/variant configuration, retry/checkpoint helpers, metric functions, tests and read-only validator. The accompanying run metadata records the engine, parameter and model fingerprints.

Source images, candidate transcriptions, raw and normalized OCR, TSV, blocks, detailed comparisons and local review packets remain local and are intentionally excluded from this backup. This commit is a tool and metadata backup, not a portable textbook dataset. Running the experiment validator requires those local files and installed language models. Existing source paths and page indexes must be available locally; their presence is not implied by this commit.

## Next steps — not executed

Retain the local review packet for future human transcription review. Evaluate narrower table-cell and figure-label segmentation, and quarantine suspicious blank-page output without silently deleting or correcting it. Only matching human-approved references may support formal CER/WER evaluation. Formula and layout quality require separate review. Full-book OCR remains unapproved.

This public summary contains no textbook quotations, source images, personal paths or credentials. Detailed textbook evidence remains local.

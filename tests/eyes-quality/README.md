# AI Quality Platform (Eyes)

Permanent evaluation system for every future Eyes model / prompt / provider change.

**Rules**
- Never optimize using only one homework.
- Never optimize from intuition — benchmark results are the source of truth.
- Do not redesign SAO, Tutor, Signals, or the provider abstraction from this folder.
- Prompt / provider-priority tuning is a later milestone.

## Layout

```
tests/eyes-quality/
  sample.schema.json
  baselines.json
  samples/
    001_three_photo_fill_blank/   # Medium · Multi-page · full worksheet
    002_photo1_q1_end/            # Easy · single page · Q1
    003_photo2_q9_picture/        # Hard · mid-page crop · Q9
    004_photo3_blank_page/        # Medium · hallucination stress
```

Reports / history / failure gallery (writable):

```
debug/ai-quality/
  reports/
  failure-gallery/
  history/
```

## Sample metadata

Every `expected.json` includes:

| Field | Purpose |
|-------|---------|
| sampleId | Stable id (= folder) |
| subject / grade / language | Curriculum metadata |
| difficulty | Easy · Medium · Hard · Extreme |
| imageQuality | Multi-tag scenario labels |
| questionCount | Ground-truth inventory size |
| expectedAnswers / expectedBlanks | Answer ground truth |
| expectedOverview | Canonical overview string |
| providerNotes | Human notes for investigators |
| enabled | Live runner skips when false |

## Platform phases

1. **Dataset** — tagged permanent samples  
2. **Failure Gallery** — every miss persisted with provider / prompt / SAO / cost  
3. **Provider Score Dashboard** — overall score + full metric set  
4. **Difficulty Report** — slice by difficulty / tags / subject  
5. **Regression Protection** — `baselines.json` floors (accuracy, hallucination, latency, cost, overall score)  
6. **Historical Trend** — `debug/ai-quality/history/`

## Commands

```bash
# Offline integrity + unit metrics (always; part of CI-friendly suite)
npm run test:eyes-quality

# Full live platform run (all enabled samples × providers)
set EYES_QUALITY_LIVE=1
npm run test:eyes-quality:live
```

Live runs write dashboard, difficulty report, failure gallery, and history under `debug/ai-quality/`.

## Regression rule

Every future Eyes change must pass this platform.

Reject when:
- Accuracy decreases below floors
- Hallucination exceeds ceiling
- Latency exceeds threshold
- Cost exceeds threshold
- Offline integrity / metric unit tests fail

## Adding samples

1. Create `samples/NNN_name/` with real photos (`photo1.jpg`, …).
2. Fill `expected.json` (validate against `sample.schema.json`).
3. Tag honest difficulty + imageQuality labels.
4. Run `npm run test:eyes-quality` then live suite.
5. Re-calibrate `baselines.json` only after measuring the **complete** enabled dataset.

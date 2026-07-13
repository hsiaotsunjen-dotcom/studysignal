# Homework Analysis — Golden Regression Dataset

Capture Engine is frozen. This dataset regresses the **Homework Analysis Engine**.

## Layout

```
tests/golden/
  expected.schema.json
  001_complete/
  002_partial/
  ...
  010_mixed_language/
```

Each case folder contains:

| File | Required | Purpose |
|------|----------|---------|
| `photo1.jpg` | yes | Primary worksheet image |
| `photo2.jpg` | if multi-page | Second page / crop |
| `expected.json` | yes | Capture + analysis expectations |

## Rules

1. Every change to Homework Analysis Pipeline must run the full golden set.
2. `expected.json` must validate against `expected.schema.json`.
3. Placeholder JPEGs may be replaced with real fixtures; keep filenames stable.
4. Do not invent verdicts for `missingQuestions` — use `verdict: "unevidenced"`.

## Commands

```bash
npm test                 # unit + golden integrity
npm run test:golden      # golden dataset integrity only
```

Pipeline comparison (Evidence → … → Report vs `expected.json`) lands when the Analysis Engine is implemented; integrity checks already gate schema/files.

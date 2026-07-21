/**
 * LIVE AI Quality Platform — full permanent dataset × every provider.
 * Skipped unless EYES_QUALITY_LIVE=1.
 *
 * Enforces baselines, writes failure gallery + history + dashboard.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  loadEyesQualityBaselines,
  resolveAiQualityReportsRoot,
  resolveEyesQualityRoot,
  runEyesQualityBenchmark,
} from "@/lib/vision/quality";

const LIVE = process.env.EYES_QUALITY_LIVE === "1";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

describe.skipIf(!LIVE)("AI Quality Platform LIVE", () => {
  it(
    "runs the complete enabled dataset and passes regression gates",
    async () => {
      loadEnvLocal();

      const datasetRoot = resolveEyesQualityRoot();
      const reportsRoot = resolveAiQualityReportsRoot();
      const outDir = path.join(reportsRoot, "reports");

      const report = await runEyesQualityBenchmark({
        datasetRoot,
        reportsRoot,
        outDir,
        providerIds: ["gemini", "openai"],
        enforceBaselines: true,
        recordHistory: true,
      });

      console.log(report.textReport);
      if (report.dashboardText) console.log(report.dashboardText);
      if (report.difficultyReportText) console.log(report.difficultyReportText);

      expect(report.sampleIds.length).toBeGreaterThanOrEqual(4);
      expect(report.providers).toHaveLength(2);
      expect(report.historyEntryId).toBeTruthy();

      const baselines = loadEyesQualityBaselines(datasetRoot);
      expect(baselines.enforce).toBe(true);

      for (const p of report.providers) {
        expect(p.sampleCount).toBe(report.sampleIds.length);
        expect(p.overallScore).toBeGreaterThan(0);
      }

      expect(fs.existsSync(path.join(outDir, "dashboard-latest.txt"))).toBe(
        true,
      );
      expect(
        fs.existsSync(path.join(outDir, "difficulty-report-latest.txt")),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(reportsRoot, "failure-gallery", "failures-latest.json"),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(reportsRoot, "history", "latest.json")),
      ).toBe(true);
    },
    600_000,
  );
});

/** Official biology past-paper import CLI (四技二專衛生與護理類 · 生物).
 * Default: read-only verify. --write persists document + registry (paper.md only).
 * PDF under originals/ is provenance only — never ingested as binary.
 *
 * Run:
 *   node node_modules/vite-node/vite-node.mjs scripts/kb-biology-exam.ts
 *   node node_modules/vite-node/vite-node.mjs scripts/kb-biology-exam.ts --year 115
 *   node node_modules/vite-node/vite-node.mjs scripts/kb-biology-exam.ts --year 115 --write
 *   node node_modules/vite-node/vite-node.mjs scripts/kb-biology-exam.ts --source <folder> [--write]
 */
import path from "node:path";

import {
  BIOLOGY_EXAM_FOLDER_PREFIX,
  DEFAULT_BIOLOGY_EXAM_SOURCES_ROOT,
  DEFAULT_KB_DOCUMENTS_DIR,
  DEFAULT_KB_REGISTRY_PATH,
  biologyExamFolderName,
  isBiologyExamAcademicYear,
  listBiologyExamSourceDirs,
  parseBiologyExamFolderYear,
  processBiologyExamPaperSource,
} from "../src/lib/knowledge-base/import/biologyExamPaper";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

const write = process.argv.includes("--write");
const yearArg = argValue("--year");
const sourceArg = argValue("--source");
const originalsArg = argValue("--originals");
const sourcesRoot =
  argValue("--sources-root") ?? DEFAULT_BIOLOGY_EXAM_SOURCES_ROOT;
const registryPath = argValue("--registry") ?? DEFAULT_KB_REGISTRY_PATH;
const documentsDir = argValue("--documents") ?? DEFAULT_KB_DOCUMENTS_DIR;
const importedAt = argValue("--imported-at");
const enforceOfficial =
  !process.argv.includes("--allow-nonofficial-year");

function repoRelativeFromCwd(absOrRel: string): string {
  const abs = path.resolve(absOrRel);
  const rel = path.relative(process.cwd(), abs);
  return rel.split(path.sep).join("/");
}

async function resolveTargets(): Promise<string[]> {
  if (sourceArg) {
    return [path.resolve(sourceArg)];
  }
  if (yearArg !== undefined) {
    const year = Number(yearArg);
    if (!Number.isInteger(year)) {
      throw new Error(`--year must be an integer, got: ${yearArg}`);
    }
    if (enforceOfficial && !isBiologyExamAcademicYear(year)) {
      throw new Error(`--year must be 106–115 for official imports, got: ${year}`);
    }
    return [path.resolve(sourcesRoot, biologyExamFolderName(year))];
  }
  return listBiologyExamSourceDirs(path.resolve(sourcesRoot));
}

const targets = await resolveTargets();
if (targets.length === 0) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: write ? "import" : "verify-only",
        message: `No ${BIOLOGY_EXAM_FOLDER_PREFIX}* sources under ${sourcesRoot}`,
        registryPath,
        documentsDir,
        processed: [],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const results = [];
let allOk = true;
for (const sourceDir of targets) {
  const folderYear = parseBiologyExamFolderYear(path.basename(sourceDir));
  const result = await processBiologyExamPaperSource({
    sourceDir,
    repoSourceDir: repoRelativeFromCwd(sourceDir),
    registryPath,
    documentsDir,
    write,
    importedAt,
    enforceOfficialYearRange: enforceOfficial,
    originalsSourceDir: originalsArg ? path.resolve(originalsArg) : undefined,
  });
  if (!result.ok) allOk = false;
  results.push({
    sourceDir: repoRelativeFromCwd(sourceDir),
    academicYear: folderYear,
    ok: result.ok,
    mode: result.mode,
    sourceId: result.source?.id ?? null,
    documentId: result.document?.documentId ?? null,
    duplicateRegistry: result.duplicateRegistry,
    issues: result.issues,
    manifestIssues: result.manifestIssues,
  });
}

console.log(
  JSON.stringify(
    {
      ok: allOk,
      mode: write ? "import" : "verify-only",
      registryPath,
      documentsDir,
      processed: results,
    },
    null,
    2,
  ),
);
process.exit(allOk ? 0 : 1);

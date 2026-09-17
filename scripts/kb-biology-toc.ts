/** First real biology TOC source. Uses existing Stage 11 / registry / document / retrieval APIs.
 * Default: read-only verification. --write --sources <absolute ShineDoc sources path>: import.
 * Run with: node node_modules/vite-node/vite-node.mjs scripts/kb-biology-toc.ts
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { importKbCandidate } from "../src/lib/knowledge-base/import/kbCandidateImport";
import { validateKbCandidateRecord } from "../src/lib/knowledge-base/import/kbIngestionBoundary";
import { appendSourceRecord, buildSourceRecord } from "../src/lib/knowledge-base/import/sourceRegistry";
import type { KbSourceRegistryFile } from "../src/lib/knowledge-base/import/types";
import { importedDocumentPath, serializeImportedDocument } from "../src/lib/knowledge-base/import/kbDocumentStore";
import { loadKbDocumentServiceFromDir } from "../src/lib/knowledge-base/query/kbFileDocumentRepository";
import { buildKbEvidencePack } from "../src/lib/knowledge-base/query/kbEvidence";
import { buildKbRetrievalResult } from "../src/lib/knowledge-base/query/kbRetrieval";
import { buildKbManifest } from "../src/lib/knowledge-base/query/kbManifest";
import { normalizeOcrText } from "../src/lib/knowledge-base/import/normalizeText";

const base = "content/knowledge-base/sources/biology/shinedoc-toc-20260902";
const registryPath = "content/knowledge-base/metadata/source-registry.json";
const names = ["IMG_2026_09_02_23_43_41L.jpg", "IMG_2026_09_02_23_43_41R.jpg", "IMG_2026_09_02_23_44_46L.jpg"];
const boundaryName = "IMG_2026_09_02_23_44_46R.jpg";
const write = process.argv.includes("--write");
const sourceArg = process.argv.indexOf("--sources");
const sourceDirectory = sourceArg >= 0 ? process.argv[sourceArg + 1] : undefined;
if (write) assert(sourceDirectory && path.isAbsolute(sourceDirectory), "--write requires --sources with an absolute path");
const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
async function optionalRead(file: string): Promise<string | null> {
  try { return await readFile(file, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
async function createOrCheck(file: string, value: string) {
  const current = await optionalRead(file);
  if (current !== null) { assert.equal(current, value, `Refusing to replace differing file: ${file}`); return; }
  assert(write, `Missing artifact: ${file}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, value, { encoding: "utf8", flag: "wx" });
}

const priorMetadataText = await optionalRead(`${base}/toc.json`);
const priorMetadata = priorMetadataText ? JSON.parse(priorMetadataText) : null;
const importedAt: string = priorMetadata?.importedAt ?? new Date().toISOString();
const originalDirectory: string = sourceDirectory ?? priorMetadata?.originalDirectory;
assert(originalDirectory, "Import first, or supply --sources");
// Inventory all originals before import; never write to this directory.
const originals = sourceDirectory ? await readdir(sourceDirectory, { withFileTypes: true }) : [];
const originalHashes = new Map<string, string>();
for (const entry of originals) if (entry.isFile()) originalHashes.set(entry.name, sha(await readFile(path.join(originalDirectory, entry.name))));

const content = await readFile(`${base}/toc.md`, "utf8");
type Location = { scanFile: string; tocPrintedPage: number };
type Entry = Location & { kind: "section" | "exercise_index"; number: string | null; title: string; page: number; pageStatus: "printed" };
type Chapter = Location & { number: string; title: string; page: null; pageStatus: "not-listed"; entries: Entry[] };
const chapters: Chapter[] = [];
const appendices: (Location & { title: string; page: null; pageStatus: "not-listed" })[] = [];
let location: Location | undefined;
const seenScans: string[] = [];
for (const line of content.split(/\r?\n/)) {
  const scan = /^<!-- scan: (\S+) \| printed-page: (\d+) -->$/.exec(line);
  if (scan) { location = { scanFile: scan[1]!, tocPrintedPage: Number(scan[2]) }; seenScans.push(scan[1]!); continue; }
  const chapter = /^## 第(\d{2})章 (.+)$/.exec(line);
  if (chapter) { assert(location); chapters.push({ ...location, number: chapter[1]!, title: chapter[2]!, page: null, pageStatus: "not-listed", entries: [] }); continue; }
  const appendix = /^## 附錄 (.+)$/.exec(line);
  if (appendix) { assert(location); appendices.push({ ...location, title: appendix[1]!, page: null, pageStatus: "not-listed" }); continue; }
  if (line.startsWith("- ")) {
    const item = /^- (?:(\d+-\d+) )?(.+) \| (\d+)$/.exec(line);
    assert(item && location && chapters.length, `Unparsed TOC entry: ${line}`);
    const parent = chapters[chapters.length - 1]!;
    if (item[1]) assert.equal(Number(item[1].split("-")[0]), Number(parent.number));
    parent.entries.push({ ...location, kind: item[1] ? "section" : "exercise_index", number: item[1] ?? null, title: item[2]!, page: Number(item[3]), pageStatus: "printed" });
  } else assert(!line.trim() || line.startsWith("<!--") || line.startsWith("# "), `Unexpected transcription line: ${line}`);
}
assert.deepEqual(seenScans, names);
assert.deepEqual(chapters.map(c => c.number), ["01", "02", "03", "04", "05", "06", "07", "08"]);
assert.deepEqual(chapters.map(c => c.entries.filter(e => e.kind === "section").length), [4, 4, 3, 7, 2, 4, 3, 4]);
assert.equal(chapters.flatMap(c => c.entries).length, 47);
assert.equal(appendices.length, 1);
assert.equal(chapters[3]!.entries.find(e => e.number === "4-5")!.tocPrintedPage, 5);
const scans = await Promise.all(names.map(async (name, index) => {
  const archivePath = `${base}/scans/${name}`;
  const bytes = await readFile(sourceDirectory ? path.join(originalDirectory, name) : archivePath);
  return { originalFileName: name, originalPath: path.join(originalDirectory, name), archivePath, sha256: sha(bytes), bytes: bytes.length, tocPrintedPage: index + 4 };
}));
const boundaryHash = sourceDirectory ? sha(await readFile(path.join(originalDirectory, boundaryName))) : priorMetadata.boundaryEvidence.sha256;
const candidate = {
  subject: "biology", sourceType: "toc", title: "生物教材目錄（書名未提供；ShineDoc 掃描第4–6頁）",
  originalFileName: "toc.md", sourcePath: `${base}/toc.md`, content,
  year: null, publisher: null, edition: null, language: "zh-Hant", operator: "Codex", reviewer: null,
  notes: `正式生物教材目錄，僅目錄，不含教材正文或歷屆試題內容。視讀原圖轉錄；書名、出版社、版次、出版年未提供。原始掃描檔名、位置、SHA-256、章節及頁碼見 ${base}/toc.json。未經獨立人工覆核。`,
};
const boundary = validateKbCandidateRecord(candidate, { importedAt });
assert(boundary.ok, JSON.stringify(boundary.issues));
const result = await importKbCandidate(candidate, { importedAt });
assert(result.ok, JSON.stringify(result.issues));
const source = buildSourceRecord({ ...boundary.candidate, ocrEngine: "Codex visual transcription (no external OCR service)" }, { importedAt, status: "normalized" });
assert.equal(source.id, result.document.sourceId);
assert.equal(source.checksum, result.document.rawChecksum);
const metadata = {
  version: 1, sourceId: source.id, documentId: result.document.documentId, importedAt,
  subject: "biology", sourceType: "toc", materialStatus: "real-source", scope: "table-of-contents-only",
  book: { title: null, publisher: null, edition: null, publicationYear: null, metadataStatus: "not-provided-in-scans" },
  originalDirectory, transcriptionPath: candidate.sourcePath, transcriptionSha256: sha(content),
  transcriptionMethod: "Codex visual transcription from the three scanned images; dot leaders and layout whitespace omitted; wording, numbering and printed page references preserved.",
  reviewStatus: "agent-visual-check; independent-human-review-pending", scans,
  boundaryEvidence: { originalFileName: boundaryName, originalPath: path.join(originalDirectory, boundaryName), sha256: boundaryHash, observed: "Printed page 7: CHAPTER 01 生物體的構造與功能", includedInSourceContent: false },
  completeness: { expectedTocPages: 3, structuredTocPages: 3, printedPages: [4, 5, 6], confirmedBy: "User confirmed complete TOC; agent inspected next chapter-opening image." },
  unreadable: [],
  missingPrintedValues: "Chapter headings and appendix have no printed destination page; page=null and pageStatus=not-listed. No page ranges inferred.",
  chapters, appendices,
};
const registryBefore = await readFile(registryPath, "utf8");
const registry = JSON.parse(registryBefore) as KbSourceRegistryFile;
const next = appendSourceRecord(registry, source);
if (next.duplicate) assert.deepEqual(registry.sources.find(s => s.id === source.id), source);

if (write) for (const scan of scans) {
  await mkdir(path.dirname(scan.archivePath), { recursive: true });
  try { await copyFile(scan.originalPath, scan.archivePath, constants.COPYFILE_EXCL); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  assert.equal(sha(await readFile(scan.archivePath)), scan.sha256);
}
await createOrCheck(`${base}/toc.json`, json(metadata));
await createOrCheck(importedDocumentPath(result.document.documentId), serializeImportedDocument(result.document));
if (write && !next.duplicate) {
  assert.equal(await readFile(registryPath, "utf8"), registryBefore, "Registry changed during import");
  await writeFile(registryPath, json(next.registry), "utf8");
}
const persistedRegistry = JSON.parse(await readFile(registryPath, "utf8")) as KbSourceRegistryFile;
assert.deepEqual(persistedRegistry.sources.find(s => s.id === source.id), source);
for (const scan of scans) assert.equal(sha(await readFile(scan.archivePath)), scan.sha256);
const loaded = await loadKbDocumentServiceFromDir("content/knowledge-base/documents");
assert.equal(loaded.skipped.length, 0);
assert.deepEqual(loaded.service.getDocumentById(result.document.documentId), result.document);
// Exercise the real persisted document through Stage 6 -> 7 -> 8 for every heading/entry.
const queries = [...chapters.map(c => c.title), ...chapters.flatMap(c => c.entries.map(e => e.title)), ...appendices.map(a => a.title)];
for (const queryText of queries) {
  // Stage 2 folds fullwidth ASCII in stored content; Stage 4/7 do not fold query punctuation.
  const normalizedQuery = normalizeOcrText(queryText).normalizedText.trim();
  const retrieval = buildKbRetrievalResult(buildKbEvidencePack(loaded.service, { queryText: normalizedQuery, sourceFilter: { sourceId: source.id } }));
  assert.equal(retrieval.citations[0]?.documentId, result.document.documentId, queryText);
}
const audit = await buildKbManifest("content/knowledge-base/documents", persistedRegistry);
assert.deepEqual(audit.issues, []);
for (const [name, hash] of originalHashes) assert.equal(sha(await readFile(path.join(originalDirectory, name))), hash, `Original changed: ${name}`);
console.log(json({ sourceId: source.id, documentId: result.document.documentId, registrySources: persistedRegistry.sources.length, structuredPages: 3, chapters: chapters.length, sections: 31, exerciseIndexEntries: 16, appendices: appendices.length, unreadable: metadata.unreadable, retrievalChecks: queries.length, manifestIssues: audit.issues, originalFilesVerifiedUnchanged: originalHashes.size, mode: write ? "import" : "verify-only" }));

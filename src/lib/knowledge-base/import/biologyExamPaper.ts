import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { importKbCandidate } from "./kbCandidateImport";
import { validateKbCandidateRecord } from "./kbIngestionBoundary";
import {
  importedDocumentPath,
  serializeImportedDocument,
} from "./kbDocumentStore";
import {
  appendSourceRecord,
  buildSourceRecord,
} from "./sourceRegistry";
import type { KbImportedDocument } from "./kbDocument";
import type { KbSourceRecord, KbSourceRegistryFile } from "./types";
import { buildKbManifest } from "../query/kbManifest";

/**
 * Biology official past-paper (四技二專統測) source helpers.
 * PDF binaries are archived for provenance only; Stage 10/11 ingest paper.md text.
 */

export const BIOLOGY_EXAM_FOLDER_PREFIX = "tve-ut-health-nursing-bio-roc";
export const BIOLOGY_EXAM_SERIES_ID = "tve-ut-health-nursing-bio-roc106-115";
export const BIOLOGY_EXAM_ACADEMIC_YEARS = [
  106, 107, 108, 109, 110, 111, 112, 113, 114, 115,
] as const;
export type BiologyExamAcademicYear = (typeof BIOLOGY_EXAM_ACADEMIC_YEARS)[number];

export const DEFAULT_BIOLOGY_EXAM_SOURCES_ROOT =
  "content/knowledge-base/sources/biology";
export const DEFAULT_KB_REGISTRY_PATH =
  "content/knowledge-base/metadata/source-registry.json";
export const DEFAULT_KB_DOCUMENTS_DIR = "content/knowledge-base/documents";

export type BiologyExamPaperOriginal = {
  filename: string;
  /** Repo-relative path to the archived PDF under originals/. */
  path: string;
  sha256: string;
  bytes?: number;
  /** Absolute or external original path when known; null if unknown. */
  originalPath?: string | null;
};

export type BiologyExamPaperMetadata = {
  version: 1;
  academicYear: number;
  subject: "biology";
  sourceType: "exam_paper";
  title: string;
  publisher: string | null;
  language: string;
  seriesId: string;
  materialStatus: string;
  scope: string;
  originals: BiologyExamPaperOriginal[];
  transcriptionMethod: string;
  reviewStatus: string;
  notes: string | null;
  sourceId?: string;
  documentId?: string;
  importedAt?: string;
  transcriptionPath?: string;
};

export type BiologyExamIssue = { field: string; message: string };

export type BiologyExamProcessOptions = {
  /** Absolute or cwd-relative path to one year source folder. */
  sourceDir: string;
  /** Repo-relative path used in registry/document sourcePath. */
  repoSourceDir: string;
  registryPath: string;
  documentsDir: string;
  /** When true, persist document + registry (and optional PDF copies). */
  write?: boolean;
  /** Optional ISO timestamp for deterministic imports. */
  importedAt?: string;
  /**
   * When true (default for production folders), academicYear must be 106–115
   * and folder name must match tve-ut-health-nursing-bio-roc{year}.
   * Fixture tests may set false to allow other years under a matching folder name.
   */
  enforceOfficialYearRange?: boolean;
  /** Copy PDFs from this absolute directory into originals/ when writing. */
  originalsSourceDir?: string;
};

export type BiologyExamProcessResult = {
  ok: boolean;
  issues: BiologyExamIssue[];
  mode: "verify-only" | "import";
  metadata: BiologyExamPaperMetadata | null;
  source: KbSourceRecord | null;
  document: KbImportedDocument | null;
  duplicateRegistry: boolean;
  manifestIssues: BiologyExamIssue[];
};

function sha256Hex(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonLine(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function optionalRead(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function biologyExamFolderName(academicYear: number): string {
  return `${BIOLOGY_EXAM_FOLDER_PREFIX}${academicYear}`;
}

export function isBiologyExamAcademicYear(
  value: number,
): value is BiologyExamAcademicYear {
  return (BIOLOGY_EXAM_ACADEMIC_YEARS as readonly number[]).includes(value);
}

export function parseBiologyExamFolderYear(
  folderName: string,
): number | null {
  const match = new RegExp(`^${BIOLOGY_EXAM_FOLDER_PREFIX}(\\d{3})$`).exec(
    folderName,
  );
  if (!match) return null;
  return Number(match[1]);
}

function failCollect(
  issues: BiologyExamIssue[],
  field: string,
  message: string,
): void {
  issues.push({ field, message });
}

/**
 * Validate paper.json shape (pure). Does not touch the filesystem.
 */
export function validateBiologyExamPaperMetadata(
  value: unknown,
  options?: { enforceOfficialYearRange?: boolean; expectedFolderYear?: number },
): { ok: true; metadata: BiologyExamPaperMetadata; issues: [] } | {
  ok: false;
  metadata: null;
  issues: BiologyExamIssue[];
} {
  const issues: BiologyExamIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      metadata: null,
      issues: [{ field: "", message: "expected a paper.json object" }],
    };
  }
  const record = value as Record<string, unknown>;
  if (record["version"] !== 1) {
    failCollect(issues, "version", "must be 1");
  }
  if (
    typeof record["academicYear"] !== "number" ||
    !Number.isInteger(record["academicYear"])
  ) {
    failCollect(issues, "academicYear", "must be a single integer year");
  } else {
    const year = record["academicYear"];
    if (options?.enforceOfficialYearRange !== false && !isBiologyExamAcademicYear(year)) {
      failCollect(
        issues,
        "academicYear",
        "must be a single year in 106–115 for official imports",
      );
    }
    if (
      options?.expectedFolderYear !== undefined &&
      year !== options.expectedFolderYear
    ) {
      failCollect(
        issues,
        "academicYear",
        `must match folder year ${options.expectedFolderYear}`,
      );
    }
  }
  if (record["subject"] !== "biology") {
    failCollect(issues, "subject", 'must be "biology"');
  }
  if (record["sourceType"] !== "exam_paper") {
    failCollect(issues, "sourceType", 'must be "exam_paper"');
  }
  if (typeof record["title"] !== "string" || record["title"].trim().length === 0) {
    failCollect(issues, "title", "must be a non-empty string");
  }
  if (record["publisher"] !== null && typeof record["publisher"] !== "string") {
    failCollect(issues, "publisher", "must be a string or null");
  }
  if (typeof record["language"] !== "string" || record["language"].trim().length === 0) {
    failCollect(issues, "language", "must be a non-empty string");
  }
  if (typeof record["seriesId"] !== "string" || record["seriesId"].trim().length === 0) {
    failCollect(issues, "seriesId", "must be a non-empty string");
  }
  if (
    typeof record["materialStatus"] !== "string" ||
    record["materialStatus"].trim().length === 0
  ) {
    failCollect(issues, "materialStatus", "must be a non-empty string");
  }
  if (typeof record["scope"] !== "string" || record["scope"].trim().length === 0) {
    failCollect(issues, "scope", "must be a non-empty string");
  }
  if (
    typeof record["transcriptionMethod"] !== "string" ||
    record["transcriptionMethod"].trim().length === 0
  ) {
    failCollect(issues, "transcriptionMethod", "must be a non-empty string");
  }
  if (
    typeof record["reviewStatus"] !== "string" ||
    record["reviewStatus"].trim().length === 0
  ) {
    failCollect(issues, "reviewStatus", "must be a non-empty string");
  }
  if (record["notes"] !== null && typeof record["notes"] !== "string") {
    failCollect(issues, "notes", "must be a string or null");
  }
  if (!Array.isArray(record["originals"]) || record["originals"].length === 0) {
    failCollect(issues, "originals", "must be a non-empty array");
  } else {
    for (let i = 0; i < record["originals"].length; i++) {
      const item = record["originals"][i];
      const prefix = `originals[${i}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        failCollect(issues, prefix, "must be an object");
        continue;
      }
      const original = item as Record<string, unknown>;
      if (typeof original["filename"] !== "string" || !original["filename"].toLowerCase().endsWith(".pdf")) {
        failCollect(issues, `${prefix}.filename`, "must be a .pdf filename");
      } else if (
        original["filename"].includes("/") ||
        original["filename"].includes("\\")
      ) {
        failCollect(issues, `${prefix}.filename`, "must not contain path separators");
      }
      if (typeof original["path"] !== "string" || original["path"].trim().length === 0) {
        failCollect(issues, `${prefix}.path`, "must be a non-empty repo-relative path");
      }
      if (
        typeof original["sha256"] !== "string" ||
        !/^[0-9a-f]{64}$/.test(original["sha256"])
      ) {
        failCollect(issues, `${prefix}.sha256`, "must be a 64-char lowercase hex SHA-256");
      }
    }
  }

  if (issues.length > 0) {
    issues.sort((a, b) =>
      a.field < b.field ? -1 : a.field > b.field ? 1 : a.message < b.message ? -1 : 1,
    );
    return { ok: false, metadata: null, issues };
  }

  return {
    ok: true,
    metadata: structuredClone(value) as BiologyExamPaperMetadata,
    issues: [],
  };
}

async function createOrCheck(file: string, value: string, write: boolean): Promise<BiologyExamIssue[]> {
  const current = await optionalRead(file);
  if (current !== null) {
    if (current !== value) {
      return [{ field: file, message: "refusing to replace differing existing file" }];
    }
    return [];
  }
  if (!write) {
    return [{ field: file, message: "missing artifact (verify-only)" }];
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, value, { encoding: "utf8", flag: "wx" });
  return [];
}

/** Drop post-import linkage so authored metadata can be compared stably. */
export function stripBiologyExamLinkage(
  metadata: BiologyExamPaperMetadata,
): BiologyExamPaperMetadata {
  return {
    version: metadata.version,
    academicYear: metadata.academicYear,
    subject: metadata.subject,
    sourceType: metadata.sourceType,
    title: metadata.title,
    publisher: metadata.publisher,
    language: metadata.language,
    seriesId: metadata.seriesId,
    materialStatus: metadata.materialStatus,
    scope: metadata.scope,
    originals: metadata.originals.map((o) => ({
      filename: o.filename,
      path: o.path,
      sha256: o.sha256,
      ...(o.bytes !== undefined ? { bytes: o.bytes } : {}),
      ...(o.originalPath !== undefined ? { originalPath: o.originalPath } : {}),
    })),
    transcriptionMethod: metadata.transcriptionMethod,
    reviewStatus: metadata.reviewStatus,
    notes: metadata.notes,
  };
}

/**
 * Persist enriched paper.json after import.
 * Allows a one-time linkage upgrade when the authored body is unchanged.
 */
async function writeOrCheckPaperMetadata(
  file: string,
  enriched: BiologyExamPaperMetadata,
  write: boolean,
): Promise<BiologyExamIssue[]> {
  const serialized = jsonLine(enriched);
  const current = await optionalRead(file);
  if (current === null) {
    if (!write) {
      return [{ field: "paper.json", message: "missing artifact (verify-only)" }];
    }
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, serialized, { encoding: "utf8", flag: "wx" });
    return [];
  }
  if (current === serialized) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(current) as unknown;
  } catch {
    return [{ field: "paper.json", message: "invalid JSON; refusing overwrite" }];
  }
  const existing = validateBiologyExamPaperMetadata(parsed, {
    enforceOfficialYearRange: false,
  });
  if (!existing.ok) {
    return existing.issues.map((i) => ({
      field: i.field ? `paper.json.${i.field}` : "paper.json",
      message: i.message,
    }));
  }
  const sameBody =
    JSON.stringify(stripBiologyExamLinkage(existing.metadata)) ===
    JSON.stringify(stripBiologyExamLinkage(enriched));
  if (!sameBody) {
    return [
      {
        field: "paper.json",
        message: "refusing to replace differing authored metadata",
      },
    ];
  }
  const hasLinkage =
    typeof existing.metadata.sourceId === "string" &&
    typeof existing.metadata.documentId === "string";
  if (hasLinkage) {
    return [
      {
        field: "paper.json",
        message: "linkage fields differ from rebuilt import; refusing overwrite",
      },
    ];
  }
  if (!write) {
    return [
      {
        field: "paper.json",
        message: "missing post-import linkage fields (verify-only)",
      },
    ];
  }
  await writeFile(file, serialized, "utf8");
  return [];
}

/**
 * Validate one exam-paper source folder and optionally import into KB documents/registry.
 * Never ingest PDF bytes into the Stage 10/11 pipeline — only paper.md text.
 */
export async function processBiologyExamPaperSource(
  options: BiologyExamProcessOptions,
): Promise<BiologyExamProcessResult> {
  const write = options.write === true;
  const issues: BiologyExamIssue[] = [];
  const enforceOfficialYearRange = options.enforceOfficialYearRange !== false;
  const sourceDir = path.resolve(options.sourceDir);
  const folderName = path.basename(sourceDir);
  const folderYear = parseBiologyExamFolderYear(folderName);

  if (folderYear === null) {
    return {
      ok: false,
      issues: [
        {
          field: "sourceDir",
          message: `folder name must match ${BIOLOGY_EXAM_FOLDER_PREFIX}{YYY}`,
        },
      ],
      mode: write ? "import" : "verify-only",
      metadata: null,
      source: null,
      document: null,
      duplicateRegistry: false,
      manifestIssues: [],
    };
  }

  try {
    await access(sourceDir);
  } catch {
    return {
      ok: false,
      issues: [
        {
          field: "sourceDir",
          message: `source folder does not exist: ${sourceDir}`,
        },
      ],
      mode: write ? "import" : "verify-only",
      metadata: null,
      source: null,
      document: null,
      duplicateRegistry: false,
      manifestIssues: [],
    };
  }

  const paperJsonPath = path.join(sourceDir, "paper.json");
  const paperMdPath = path.join(sourceDir, "paper.md");
  const originalsDir = path.join(sourceDir, "originals");

  const paperJsonText = await optionalRead(paperJsonPath);
  if (paperJsonText === null) {
    issues.push({ field: "paper.json", message: "file is missing" });
  }
  const paperMdText = await optionalRead(paperMdPath);
  if (paperMdText === null) {
    issues.push({ field: "paper.md", message: "file is missing" });
  } else if (paperMdText.trim().length === 0) {
    issues.push({ field: "paper.md", message: "must be non-empty prepared text" });
  }

  let metadata: BiologyExamPaperMetadata | null = null;
  if (paperJsonText !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(paperJsonText) as unknown;
    } catch {
      issues.push({ field: "paper.json", message: "invalid JSON" });
      parsed = null;
    }
    if (parsed !== null) {
      const metaResult = validateBiologyExamPaperMetadata(parsed, {
        enforceOfficialYearRange,
        expectedFolderYear: folderYear,
      });
      if (!metaResult.ok) {
        issues.push(...metaResult.issues);
      } else {
        metadata = metaResult.metadata;
      }
    }
  }

  if (metadata) {
    for (const original of metadata.originals) {
      const expectedRepoPath = path.posix.join(
        options.repoSourceDir.replace(/\\/g, "/"),
        "originals",
        original.filename,
      );
      if (original.path.replace(/\\/g, "/") !== expectedRepoPath) {
        issues.push({
          field: `originals:${original.filename}.path`,
          message: `must be ${expectedRepoPath}`,
        });
      }
      const archiveAbs = path.join(originalsDir, original.filename);
      let bytes: Buffer | null = null;
      try {
        bytes = await readFile(archiveAbs);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          if (write && options.originalsSourceDir) {
            const from = path.join(options.originalsSourceDir, original.filename);
            try {
              await mkdir(originalsDir, { recursive: true });
              await copyFile(from, archiveAbs, constants.COPYFILE_EXCL);
              bytes = await readFile(archiveAbs);
            } catch (copyError) {
              if ((copyError as NodeJS.ErrnoException).code === "EEXIST") {
                bytes = await readFile(archiveAbs);
              } else {
                issues.push({
                  field: `originals:${original.filename}`,
                  message: `PDF missing and copy failed: ${(copyError as Error).message}`,
                });
              }
            }
          } else {
            issues.push({
              field: `originals:${original.filename}`,
              message: "PDF must exist under originals/",
            });
          }
        } else {
          throw error;
        }
      }
      if (bytes) {
        const digest = sha256Hex(bytes);
        if (digest !== original.sha256) {
          issues.push({
            field: `originals:${original.filename}.sha256`,
            message: `expected ${original.sha256}, got ${digest}`,
          });
        }
        if (original.bytes !== undefined && original.bytes !== bytes.length) {
          issues.push({
            field: `originals:${original.filename}.bytes`,
            message: `expected ${original.bytes}, got ${bytes.length}`,
          });
        }
      }
    }
  }

  if (issues.length > 0 || !metadata || paperMdText === null || paperMdText.trim().length === 0) {
    return {
      ok: false,
      issues,
      mode: write ? "import" : "verify-only",
      metadata,
      source: null,
      document: null,
      duplicateRegistry: false,
      manifestIssues: [],
    };
  }

  const transcriptionPath = path.posix.join(
    options.repoSourceDir.replace(/\\/g, "/"),
    "paper.md",
  );
  const candidate = {
    subject: "biology" as const,
    sourceType: "exam_paper" as const,
    title: metadata.title,
    originalFileName: "paper.md",
    sourcePath: transcriptionPath,
    content: paperMdText,
    year: metadata.academicYear,
    publisher: metadata.publisher,
    edition: null,
    language: metadata.language,
    operator: null,
    reviewer: null,
    notes: metadata.notes,
  };

  const importedAt = options.importedAt ?? metadata.importedAt ?? new Date().toISOString();
  const boundary = validateKbCandidateRecord(candidate, { importedAt });
  if (!boundary.ok) {
    return {
      ok: false,
      issues: boundary.issues.map((i) => ({ field: i.field || "candidate", message: i.message })),
      mode: write ? "import" : "verify-only",
      metadata,
      source: null,
      document: null,
      duplicateRegistry: false,
      manifestIssues: [],
    };
  }

  const imported = await importKbCandidate(candidate, { importedAt });
  if (!imported.ok) {
    return {
      ok: false,
      issues: imported.issues.map((i) => ({ field: i.field || "candidate", message: i.message })),
      mode: write ? "import" : "verify-only",
      metadata,
      source: null,
      document: null,
      duplicateRegistry: false,
      manifestIssues: [],
    };
  }

  const source = buildSourceRecord(
    {
      ...boundary.candidate,
      ocrEngine: metadata.transcriptionMethod,
    },
    { importedAt, status: "normalized" },
  );
  if (source.id !== imported.document.sourceId) {
    issues.push({
      field: "sourceId",
      message: "source record id does not match imported document sourceId",
    });
  }
  if (source.checksum !== imported.document.rawChecksum) {
    issues.push({
      field: "checksum",
      message: "source checksum does not match document rawChecksum",
    });
  }

  const nextMetadata: BiologyExamPaperMetadata = {
    ...metadata,
    sourceId: source.id,
    documentId: imported.document.documentId,
    importedAt,
    transcriptionPath,
  };

  const registryBeforeText = await optionalRead(options.registryPath);
  if (registryBeforeText === null && !write) {
    issues.push({ field: "registry", message: "source-registry.json is missing" });
  }
  let registry: KbSourceRegistryFile =
    registryBeforeText !== null
      ? (JSON.parse(registryBeforeText) as KbSourceRegistryFile)
      : { version: 1, sources: [] };
  const next = appendSourceRecord(registry, source);
  if (next.duplicate) {
    const existing = registry.sources.find((s) => s.id === source.id);
    if (!existing || JSON.stringify(existing) !== JSON.stringify(source)) {
      const byPath = registry.sources.find(
        (s) => s.checksum === source.checksum && s.sourcePath === source.sourcePath,
      );
      if (!byPath || JSON.stringify(byPath) !== JSON.stringify(source)) {
        issues.push({
          field: "registry",
          message: "duplicate checksum/path but stored record differs; refusing overwrite",
        });
      }
    }
  }
  const pathCollision = registry.sources.find(
    (s) => s.sourcePath === source.sourcePath && s.checksum !== source.checksum,
  );
  if (pathCollision) {
    issues.push({
      field: "registry",
      message: `sourcePath already registered with different checksum (${pathCollision.id}); refusing overwrite`,
    });
  }

  const docPath = importedDocumentPath(
    imported.document.documentId,
    options.documentsDir,
  );
  const serializedDoc = serializeImportedDocument(imported.document);

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
      mode: write ? "import" : "verify-only",
      metadata: nextMetadata,
      source,
      document: imported.document,
      duplicateRegistry: next.duplicate,
      manifestIssues: [],
    };
  }

  issues.push(...(await writeOrCheckPaperMetadata(paperJsonPath, nextMetadata, write)));
  issues.push(...(await createOrCheck(docPath, serializedDoc, write)));

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
      mode: write ? "import" : "verify-only",
      metadata: nextMetadata,
      source,
      document: imported.document,
      duplicateRegistry: next.duplicate,
      manifestIssues: [],
    };
  }

  if (write && !next.duplicate) {
    const stillSame = await readFile(options.registryPath, "utf8").catch(() => registryBeforeText);
    if (registryBeforeText !== null && stillSame !== registryBeforeText) {
      issues.push({
        field: "registry",
        message: "registry changed during import; refusing write",
      });
    } else {
      await mkdir(path.dirname(options.registryPath), { recursive: true });
      await writeFile(options.registryPath, jsonLine(next.registry), "utf8");
      registry = next.registry;
    }
  } else if (!write) {
    const persisted = registry.sources.find((s) => s.id === source.id);
    if (!persisted) {
      issues.push({
        field: "registry",
        message: `missing source ${source.id} (verify-only)`,
      });
    } else if (JSON.stringify(persisted) !== JSON.stringify(source)) {
      issues.push({
        field: "registry",
        message: "existing registry entry differs from rebuilt source record",
      });
    }
  } else {
    const persistedRegistry = JSON.parse(
      await readFile(options.registryPath, "utf8"),
    ) as KbSourceRegistryFile;
    const persisted = persistedRegistry.sources.find((s) => s.id === source.id);
    if (!persisted || JSON.stringify(persisted) !== JSON.stringify(source)) {
      issues.push({
        field: "registry",
        message: "duplicate import but registry entry differs",
      });
    }
    registry = persistedRegistry;
  }

  const persistedRegistry = JSON.parse(
    (await optionalRead(options.registryPath)) ?? jsonLine(registry),
  ) as KbSourceRegistryFile;
  const manifest = await buildKbManifest(options.documentsDir, persistedRegistry);
  const manifestIssues: BiologyExamIssue[] = manifest.issues.map((i) => ({
    field: i.kind,
    message: i.detail,
  }));

  if (write && issues.length === 0) {
    const writtenMeta = await optionalRead(paperJsonPath);
    if (writtenMeta !== jsonLine(nextMetadata)) {
      issues.push({ field: "paper.json", message: "written metadata mismatch" });
    }
  }

  return {
    ok: issues.length === 0 && manifestIssues.length === 0,
    issues,
    mode: write ? "import" : "verify-only",
    metadata: nextMetadata,
    source,
    document: imported.document,
    duplicateRegistry: next.duplicate,
    manifestIssues,
  };
}

/** List official-named exam source folders under a biology sources root. */
export async function listBiologyExamSourceDirs(
  sourcesRoot: string,
): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(sourcesRoot, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((e) => e.isDirectory() && parseBiologyExamFolderYear(e.name) !== null)
    .map((e) => path.join(sourcesRoot, e.name))
    .sort();
}

export function sha256FileBuffer(bytes: Buffer): string {
  return sha256Hex(bytes);
}

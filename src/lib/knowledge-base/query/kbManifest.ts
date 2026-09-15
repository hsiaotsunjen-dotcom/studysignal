import type { KbSourceType, KbSubject } from "./kbQuery";
import type { KbSkippedDocumentFile } from "./kbFileDocumentRepository";
import { loadKbDocumentsFromDir } from "./kbFileDocumentRepository";
import type { KbSourceRegistryFile } from "../import/types";

/**
 * KB Stage 9 — read-only deterministic manifest + integrity audit.
 * Inventories validated documents in a directory and cross-checks them
 * against an optional source registry. Reports only; never modifies data.
 * No search, ranking, filesystem writes, UI, Tutor, Course, OCR, DB,
 * embeddings, LLM, network, or provider-specific code.
 * Traditional Chinese / UTF-8 content is preserved byte-for-byte
 * (manifest carries metadata + checksums, never rewritten text).
 */

export const KB_MANIFEST_VERSION = 1 as const;

export type KbManifestEntry = {
  documentId: string;
  sourceId: string;
  subject: KbSubject;
  sourceType: KbSourceType;
  title: string;
  originalFileName: string;
  sourcePath: string;
  rawChecksum: string;
  normalizedChecksum: string;
  importedAt: string;
};

export type KbManifestIssueKind =
  | "invalid-file"
  | "duplicate-document"
  | "duplicate-checksum"
  | "registry-orphan"
  | "missing-registry";

export type KbManifestIssue = {
  kind: KbManifestIssueKind;
  file?: string;
  documentId?: string;
  detail: string;
};

export type KbManifest = {
  version: typeof KB_MANIFEST_VERSION;
  baseDir: string;
  totalFiles: number;
  validDocuments: number;
  skipped: KbSkippedDocumentFile[];
  documents: KbManifestEntry[];
  issues: KbManifestIssue[];
  registryChecked: boolean;
};

function compareStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Build a deterministic manifest + integrity report for a documents dir.
 * Read-only: loads via the Stage 6 loader (Stage 3 validation included).
 * Pass a registry to also detect orphans / missing relationships.
 */
export async function buildKbManifest(
  dir: string,
  registry?: KbSourceRegistryFile,
): Promise<KbManifest> {
  const { documents, skipped } = await loadKbDocumentsFromDir(dir);

  const entries: KbManifestEntry[] = documents.map((d) => ({
    documentId: d.documentId,
    sourceId: d.sourceId,
    subject: d.subject,
    sourceType: d.sourceType,
    title: d.title,
    originalFileName: d.originalFileName,
    sourcePath: d.sourcePath,
    rawChecksum: d.rawChecksum,
    normalizedChecksum: d.normalizedChecksum,
    importedAt: d.importedAt,
  }));
  entries.sort((a, b) => compareStr(a.documentId, b.documentId));

  const issues: KbManifestIssue[] = [];
  for (const s of skipped) {
    issues.push({
      kind: "invalid-file",
      file: s.file,
      detail: s.reason,
    });
  }

  const byId = new Map<string, number>();
  for (const e of entries) byId.set(e.documentId, (byId.get(e.documentId) ?? 0) + 1);
  for (const [documentId, count] of byId) {
    if (count > 1) {
      issues.push({
        kind: "duplicate-document",
        documentId,
        detail: `documentId appears ${count} times`,
      });
    }
  }

  const byChecksum = new Map<string, string[]>();
  for (const e of entries) {
    const list = byChecksum.get(e.rawChecksum) ?? [];
    list.push(e.documentId);
    byChecksum.set(e.rawChecksum, list);
  }
  for (const [checksum, ids] of byChecksum) {
    if (ids.length > 1) {
      const sorted = [...ids].sort(compareStr);
      issues.push({
        kind: "duplicate-checksum",
        documentId: sorted[0],
        detail: `rawChecksum ${checksum.slice(0, 12)}… shared by ${sorted.join(", ")}`,
      });
    }
  }

  let registryChecked = false;
  if (registry !== undefined) {
    registryChecked = true;
    const docSourceIds = new Set(entries.map((e) => e.sourceId));
    const docChecksums = new Set(entries.map((e) => e.rawChecksum));
    const registryIds = new Set<string>();
    for (const source of registry.sources) {
      registryIds.add(source.id);
      if (!docSourceIds.has(source.id) && !docChecksums.has(source.checksum)) {
        issues.push({
          kind: "registry-orphan",
          detail: `registry source ${source.id} (${source.sourcePath}) has no loaded document`,
        });
      }
    }
    for (const e of entries) {
      if (!registryIds.has(e.sourceId)) {
        issues.push({
          kind: "missing-registry",
          documentId: e.documentId,
          detail: `document ${e.documentId} source ${e.sourceId} has no registry entry`,
        });
      }
    }
  }

  issues.sort((a, b) =>
    compareStr(a.kind, b.kind) ||
    compareStr(a.documentId ?? "", b.documentId ?? "") ||
    compareStr(a.file ?? "", b.file ?? "") ||
    compareStr(a.detail, b.detail),
  );

  return {
    version: KB_MANIFEST_VERSION,
    baseDir: dir,
    totalFiles: entries.length + skipped.length,
    validDocuments: entries.length,
    skipped: structuredClone([...skipped]),
    documents: entries,
    issues,
    registryChecked,
  };
}

/** Deterministic JSON serialization (metadata only, no content bodies). */
export function serializeKbManifest(manifest: KbManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

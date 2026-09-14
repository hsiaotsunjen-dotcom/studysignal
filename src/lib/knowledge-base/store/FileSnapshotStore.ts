import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { KnowledgeBaseSnapshot } from "../schema/snapshot";
import type { KnowledgeBaseValidationResult } from "../types";
import { validateKnowledgeBaseSnapshot } from "../utils/validateSnapshot";

/**
 * KB-Persist-01 — minimal file snapshot persistence.
 * Provider-agnostic; no AI / RAG / embeddings / SQL here.
 * Uses the existing snapshot type + validator only.
 */

function toValidationErrorText(result: KnowledgeBaseValidationResult): string {
  const first = result.issues.slice(0, 5).map((i) => {
    const where = [i.entity, i.id, i.field].filter(Boolean).join("/");
    return `${where}: ${i.message}`;
  });
  return first.length > 0 ? first.join("; ") : "unknown validation issues";
}

function assertValidSnapshot(snapshot: KnowledgeBaseSnapshot): void {
  const result = validateKnowledgeBaseSnapshot(snapshot);
  if (!result.ok) {
    throw new Error(
      `Invalid KnowledgeBaseSnapshot: ${toValidationErrorText(result)}`,
    );
  }
}

function assertSnapshotShape(value: unknown): asserts value is KnowledgeBaseSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid KnowledgeBaseSnapshot: expected a JSON object");
  }
}

/**
 * Read and validate a snapshot file.
 * Rejects invalid JSON and snapshots that fail existing validation.
 */
export async function readSnapshot(filePath: string): Promise<KnowledgeBaseSnapshot> {
  const raw = await readFile(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Invalid KnowledgeBaseSnapshot JSON: ${filePath}`);
  }
  assertSnapshotShape(parsed);
  assertValidSnapshot(parsed);
  return structuredClone(parsed);
}

/**
 * Validate then atomically write a snapshot file.
 * Never writes invalid snapshots to disk.
 */
export async function writeSnapshot(
  filePath: string,
  snapshot: KnowledgeBaseSnapshot,
): Promise<void> {
  assertValidSnapshot(snapshot);
  await mkdir(path.dirname(filePath), { recursive: true });
  const payload = `${JSON.stringify(snapshot, null, 2)}\n`;
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, payload, "utf8");
  try {
    await rename(tmp, filePath);
  } catch {
    // Windows may reject rename over an existing file — replace in place.
    await writeFile(filePath, payload, "utf8");
    try {
      await unlink(tmp);
    } catch {
      // ignore temp cleanup
    }
  }
}

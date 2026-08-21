import { validateKnowledgeBaseSnapshot } from "../utils/validateSnapshot";
import { buildBiologyMinimalSeed } from "./biology.minimal";
import type { KnowledgeBaseSnapshot } from "../schema/snapshot";
import type { KnowledgeBaseValidationResult } from "../types";

/** Load the structural biology seed and optionally validate. */
export function loadBiologyMinimalSeed(options?: {
  validate?: boolean;
}): {
  snapshot: KnowledgeBaseSnapshot;
  validation: KnowledgeBaseValidationResult | null;
} {
  const snapshot = buildBiologyMinimalSeed();
  const validation = options?.validate
    ? validateKnowledgeBaseSnapshot(snapshot)
    : null;
  return { snapshot, validation };
}

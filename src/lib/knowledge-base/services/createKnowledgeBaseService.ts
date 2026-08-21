import { buildBiologyMinimalSeed } from "../seed/biology.minimal";
import type { KnowledgeBaseSnapshot } from "../schema/snapshot";
import type { KnowledgeBaseService } from "./KnowledgeBaseService";
import { MemoryKnowledgeBaseService } from "./MemoryKnowledgeBaseService";

export type CreateKnowledgeBaseOptions = {
  /** Defaults to the minimal biology structural seed. */
  snapshot?: KnowledgeBaseSnapshot;
};

/**
 * Factory — today returns an in-memory service.
 * Later: branch on env to SQL / remote store without changing Tutor callers.
 */
export function createKnowledgeBaseService(
  options: CreateKnowledgeBaseOptions = {},
): KnowledgeBaseService {
  const snapshot = options.snapshot ?? buildBiologyMinimalSeed();
  return new MemoryKnowledgeBaseService(snapshot);
}

import { describe, expect, it } from "vitest";

import {
  createKnowledgeBaseService,
  loadBiologyMinimalSeed,
  validateKnowledgeBaseSnapshot,
} from "@/lib/knowledge-base";

describe("Knowledge Base skeleton", () => {
  it("biology minimal seed passes referential validation", () => {
    const { snapshot, validation } = loadBiologyMinimalSeed({
      validate: true,
    });
    expect(validation?.ok).toBe(true);
    expect(validation?.issues ?? []).toEqual([]);
    expect(snapshot.subjects).toHaveLength(1);
    expect(snapshot.subjects[0]?.code).toBe("biology");
  });

  it("service can answer curriculum + exam + prerequisite queries", async () => {
    const kb = createKnowledgeBaseService();
    const validation = await kb.validate();
    expect(validation.ok).toBe(true);

    const subject = await kb.getSubjectByCode("biology");
    expect(subject?.name).toBe("生物");

    const node = await kb.getNodeByCode("BIO.CELL.MEMBRANE");
    expect(node).not.toBeNull();

    const ctx = await kb.getNodeCurriculumContext(node!.id);
    expect(ctx?.curriculum.name).toContain("生物");
    expect(ctx?.unit.title).toBe("細胞");
    expect(ctx?.educationLevel.code).toBe("senior_high");

    const prereqs = await kb.listPrerequisites(node!.id);
    expect(prereqs.map((n) => n.code)).toContain("BIO.CELL.STRUCTURE");

    const next = await kb.listSuggestedNextNodes(
      (await kb.getNodeByCode("BIO.CELL.STRUCTURE"))!.id,
    );
    expect(next.map((n) => n.code)).toContain("BIO.CELL.MEMBRANE");

    const structure = await kb.getNodeByCode("BIO.CELL.STRUCTURE");
    const count = await kb.countExamQuestionsForNode(structure!.id);
    expect(count).toBe(1);

    const evidence = await kb.listExamEvidenceForNode(structure!.id);
    expect(evidence[0]?.link.role).toBe("primary");
  });

  it("rejects broken foreign keys", () => {
    const { snapshot } = loadBiologyMinimalSeed();
    snapshot.knowledgeNodes[0]!.curriculumUnitId = "missing-unit";
    const result = validateKnowledgeBaseSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.entity === "KnowledgeNode" && i.field === "curriculumUnitId",
      ),
    ).toBe(true);
  });
});

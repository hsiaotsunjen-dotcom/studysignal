# Definition of Ready

> **Canonical Definition of Ready for StudySignal.**  
> A task may only begin if **all** conditions below are satisfied.  
> If any item is missing, the AI must **stop coding** and ask for clarification.  
> **Last updated:** 2026-07-31

Related:

| Document | Role |
|----------|------|
| [`PRODUCT.md`](./PRODUCT.md) | Product source of truth |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Design source of truth |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Architecture source of truth |
| [`PROJECT_RULES.md`](./PROJECT_RULES.md) | Project constitution |
| [`AI_TEAM.md`](./AI_TEAM.md) | Role assignment & workflow |
| [`prd/`](./prd/) | Product Requirement Documents |
| [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md) | When a task may be marked Complete |

When readiness is unclear — **do not start implementation**.

---

## Definition of Ready

A task must have:

1. **A PRD exists.**  
   Written under `docs/prd/` (or explicitly named as the task PRD) and treated as the task’s scope source of truth.

2. **The problem is clearly defined.**  
   Why this task exists is unambiguous.

3. **The expected user outcome is defined.**  
   What the user should accomplish or feel after the task is clear.

4. **Scope is clearly limited.**  
   Include / exclude boundaries are explicit enough to prevent feature creep.

5. **Acceptance Criteria exists.**  
   Testable rules that determine pass/fail.

6. **Dependencies are identified.**  
   Blockers, prior tasks, services, or docs the work depends on are listed (even if “none”).

7. **Related modules are identified.**  
   Per [`ARCHITECTURE.md`](./ARCHITECTURE.md) — which modules this task touches or must not touch.

8. **PRODUCT.md has been reviewed.**  
   The task does not contradict product vision or principles.

9. **DESIGN_SYSTEM.md has been reviewed.**  
   Any UI work will follow the design system (or the task is explicitly non-UI).

10. **ARCHITECTURE.md has been reviewed.**  
    Module boundaries and navigation remain respected.

11. **PROJECT_RULES.md has been reviewed.**  
    The ten non-negotiable rules are acknowledged for this task.

12. **AI_TEAM roles are assigned.**  
    The role sequence for the task is declared (who acts, in what order), per [`AI_TEAM.md`](./AI_TEAM.md).

---

## Gate behavior

| Result | Action |
|--------|--------|
| All 12 items satisfied | Task may start. Declare the first active AI_TEAM role and begin. |
| Any item missing | **Stop coding.** Ask for clarification. Do not “partially implement” around the gap. |

### Required start declaration

Before the first implementation change:

```text
Definition of Ready: PASS
PRD: <path>
Modules: <list>
Dependencies: <list or none>
Role sequence: <ordered AI_TEAM roles>
First active role: <role>
```

If not PASS:

```text
Definition of Ready: FAIL
Missing: <item numbers>
Question: <what must be clarified before coding>
```

---

## Notes

- Demo or spike work still needs a minimal PRD (or an explicit Product Manager waiver recorded in [`ENGINEERING_LOG.md`](./ENGINEERING_LOG.md) with ID + date). Waivers are exceptional, not the default.
- Reviewing a document means reading the current version and confirming no conflict — not rubber-stamping.
- Ready ≠ Done. Completion is governed by [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md) and QA Reviewer checks in [`AI_TEAM.md`](./AI_TEAM.md).

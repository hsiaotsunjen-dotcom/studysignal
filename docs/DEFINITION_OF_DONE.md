# Definition of Done

> **Canonical Definition of Done for StudySignal.**  
> A task is **Complete** only if every item below is satisfied.  
> Start gate: [`DEFINITION_OF_READY.md`](./DEFINITION_OF_READY.md)  
> QA role: [`AI_TEAM.md`](./AI_TEAM.md)  
> **Last updated:** 2026-07-31

If any item fails — the task is **not done**. Do not mark Complete.

---

## Definition of Done

A task is done only if:

| # | Criterion | Meaning |
|---|-----------|---------|
| 1 | **Acceptance Criteria passes** | Every acceptance rule in the task PRD is met (or explicitly waived by Product Manager in [`ENGINEERING_LOG.md`](./ENGINEERING_LOG.md)). |
| 2 | **Mobile UI works** | Primary flow is usable on a phone-sized viewport; no broken critical actions. |
| 3 | **Responsive layout works** | Layout holds on small and larger widths without horizontal overflow of primary content. |
| 4 | **No console errors** | No unexpected errors in the browser console on the task’s happy path. |
| 5 | **No TypeScript errors** | Project typecheck passes for the changed surface (`tsc` / project check). |
| 6 | **QA completed** | QA Reviewer has checked against PRODUCT, DESIGN_SYSTEM, PROJECT_RULES, and ARCHITECTURE ([`AI_TEAM.md`](./AI_TEAM.md)). |
| 7 | **Accessibility reviewed** | Basic a11y check done: labels, contrast intent, tap targets, focus for interactive controls on changed screens. |
| 8 | **Documentation updated** | PRD status / related docs reflect what shipped; no contradictory instructions left behind. |
| 9 | **Engineering Log updated (if needed)** | New decisions, known problems, or lessons appended to [`ENGINEERING_LOG.md`](./ENGINEERING_LOG.md) when the task created lasting knowledge. |
| 10 | **Commit message prepared** | A clear commit message is ready (or committed if the user requested a commit). |

**Only then may the task be marked Complete.**

---

## Gate behavior

| Result | Action |
|--------|--------|
| All items pass | Mark task **Complete**. |
| Any item fails | Keep task open. Fix or get an explicit Product Manager waiver logged. |

### Required completion declaration

```text
Definition of Done: PASS
PRD: <path>
Acceptance Criteria: PASS
Mobile UI: PASS
Responsive: PASS
Console errors: none
TypeScript: PASS
QA Reviewer: PASS
Accessibility: reviewed
Docs updated: <list>
Engineering Log: <updated IDs or n/a>
Commit message: <prepared text or commit sha>
Status: Complete
```

If not PASS:

```text
Definition of Done: FAIL
Failed: <criteria>
Remaining work: <list>
Status: Incomplete
```

---

## Notes

- Ready ([`DEFINITION_OF_READY.md`](./DEFINITION_OF_READY.md)) is required before starting; Done is required before closing.
- “Works” means the task’s scoped user outcome succeeds — not that the entire product is finished.
- Waivers are rare, must be written in the Engineering Log, and never silently skip PROJECT_RULES.
- Frontend-only tasks still need QA against PRODUCT and DESIGN_SYSTEM; Backend-only tasks still need Acceptance Criteria and docs/log updates when contracts change.

---

## Related documents

| Document | Role |
|----------|------|
| [`DEFINITION_OF_READY.md`](./DEFINITION_OF_READY.md) | When a task may start |
| [`AI_TEAM.md`](./AI_TEAM.md) | QA Reviewer workflow |
| [`PROJECT_RULES.md`](./PROJECT_RULES.md) | Non-negotiable rules |
| [`ENGINEERING_LOG.md`](./ENGINEERING_LOG.md) | Decisions / problems / lessons |
| [`prd/`](./prd/) | Acceptance Criteria source |

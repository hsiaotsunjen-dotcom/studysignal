# StudySignal AI Team

> **Canonical AI collaboration workflow.**  
> Before any task, the AI must declare which role it is acting as.  
> If multiple roles are required, complete them **in order** — never mix responsibilities in one step.  
> Constitution: [`PROJECT_RULES.md`](./PROJECT_RULES.md)  
> Sources of truth: [`PRODUCT.md`](./PRODUCT.md) · [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> **Last updated:** 2026-07-31

When collaboration process conflicts with habit or convenience — **this document wins**.

---

## How every task starts

1. **Read** [`PROJECT_RULES.md`](./PROJECT_RULES.md) and the relevant source-of-truth docs for the task.  
2. **Declare the active role** (one role at a time).  
3. **Do only that role’s work.**  
4. If more roles are needed, switch explicitly and continue **in sequence**.  
5. End with a **QA Reviewer** pass when implementation or product/design changes shipped.

### Required declaration format

```text
Active role: <Role Name>
Protecting: <document or boundary>
Out of scope this step: <what this role must not change>
```

---

## Roles

### 1. Product Manager

**Protects:** [`PRODUCT.md`](./PRODUCT.md)

**Owns:**
- Product vision, problem, principles, and decision rule
- Whether a request improves learning or only adds features
- Scope cuts and “do not build” calls

**Must never:**
- Add features without clear learning value
- Redesign UI for aesthetics alone
- Redesign system modules for engineering convenience

**Output:** Product decisions, acceptance criteria, explicit non-goals.

---

### 2. Product Designer

**Protects:** [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)

**Owns:**
- Visual language, emotion, spacing, components, mobile-first experience
- Ensuring every UI follows the design system
- Simplicity over decoration; remove elements that do not help learning

**Must never:**
- Invent a new visual language outside the design system
- Override product principles (e.g. turn Tutor into an answer machine)
- Change architecture module boundaries

**Output:** UI structure, interaction tone, design constraints for implementation.

---

### 3. System Architect

**Protects:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

**Owns:**
- Module boundaries and responsibilities
- User types and navigation between modules
- Keeping modules independent, scalable, and model-agnostic
- Future expansion points that do not rewrite the core loop

**Must never:**
- Tie architecture to a specific AI vendor or framework fad
- Collapse Tutor into a generic chatbot product
- Change product values or visual system under the guise of “architecture”

**Output:** Module placement, interfaces between modules (conceptual), expansion constraints.

---

### 4. Frontend Engineer

**Builds:** UI only

**Owns:**
- Screens, components, client state, and front-end wiring to agreed APIs
- Faithful implementation of Designer + Architect decisions

**Must never:**
- Change product decisions
- Invent new product features while “just building UI”
- Bypass the design system
- Redefine module responsibilities

**Output:** Working UI that matches PRODUCT / DESIGN / ARCHITECTURE constraints.

---

### 5. Backend Engineer

**Builds:** APIs and services

**Owns:**
- Server APIs, persistence, auth plumbing, jobs, integrations
- Reliability and contracts that support Architect-defined modules

**Must never:**
- Change UI decisions
- Encode product pedagogy changes without Product Manager
- Leak vendor-specific AI details into product architecture meaning

**Output:** Services and contracts that serve the architecture without owning the UX.

---

### 6. AI Engineer

**Designs:** prompts, tutoring logic, and AI orchestration

**Owns:**
- Guide-don’t-answer behavior, adaptation, Signal discovery logic (conceptual + prompts)
- Orchestration across Tutor / Homework / Learning Engine capabilities

**Must never:**
- Change architecture directly (module map, ownership)
- Change brand UI or design system
- Optimize for “impressive answers” over independent thinking

**Output:** Prompting, evaluation criteria, orchestration flows that obey PRODUCT.md and PROJECT_RULES.md.

---

### 7. QA Reviewer

**Reviews every implementation against:**
- [`PRODUCT.md`](./PRODUCT.md)
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
- [`PROJECT_RULES.md`](./PROJECT_RULES.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)

**Owns:**
- Final gate before a change is considered done
- Finding violations: answer-giving, tech theater, mixed module duties, feature bloat, cold UX

**Must never:**
- Implement new features while reviewing
- Approve “temporary” violations without an explicit Product Manager exception

**Output:** Pass / fail with concrete violations and required fixes.

---

## Recommended role order

When a change spans the system, use this sequence (skip unused roles):

```text
1. Product Manager
2. System Architect
3. Product Designer
4. AI Engineer          ← if tutoring / Signals / orchestration involved
5. Backend Engineer     ← if APIs / persistence involved
6. Frontend Engineer    ← if UI involved
7. QA Reviewer          ← always last when anything shipped
```

Never blend Product Manager + Frontend Engineer in the same step.  
Never blend System Architect + AI Engineer “quick prompt tweaks that rewrite modules.”

---

## Collaboration examples

| Request | Role sequence |
|---------|----------------|
| “Add a new parent chart” | Product Manager → (likely reject or reframe) → Designer → Frontend → QA |
| “Change tutoring to give answers faster” | Product Manager (reject / reframe) → QA note against rules |
| “Wire daily email sending” | Architect → Backend → (Designer if UI) → Frontend → QA |
| “Improve Tutor prompts” | AI Engineer → QA (Product Manager if behavior changes) |
| “New Student Home layout” | Product Manager → Designer → Frontend → QA |

---

## Definition of done

A task is done only when:

1. The active roles were declared and not mixed.  
2. Changes respect PRODUCT, DESIGN_SYSTEM, ARCHITECTURE, and PROJECT_RULES.  
3. QA Reviewer has explicitly reviewed against those four documents.  
4. Anything that does not improve learning was not added — or was removed.

---

## Related documents

| Document | Role |
|----------|------|
| [`PRODUCT.md`](./PRODUCT.md) | Product source of truth |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Design source of truth |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Architecture source of truth |
| [`PROJECT_RULES.md`](./PROJECT_RULES.md) | Project constitution |

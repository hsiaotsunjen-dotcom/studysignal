# StudySignal Product

> **Canonical product summary.**  
> **最高層級產品憲法：** [`prd/PRD-000-StudySignal-Constitution.md`](./prd/PRD-000-StudySignal-Constitution.md) — 若衝突，以 PRD-000 為準。  
> Visual system: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)  
> Brand voice: [`BRAND_VOICE.md`](./BRAND_VOICE.md)  
> Project constitution: [`PROJECT_RULES.md`](./PROJECT_RULES.md)  
> AI collaboration workflow: [`AI_TEAM.md`](./AI_TEAM.md)  
> Engineering memory: [`ENGINEERING_LOG.md`](./ENGINEERING_LOG.md)  
> Definition of Ready: [`DEFINITION_OF_READY.md`](./DEFINITION_OF_READY.md)  
> Definition of Done: [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md)  
> System architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
> Implementation status / roadmap: [`PROJECT_STATUS.md`](./PROJECT_STATUS.md), [`ROADMAP.md`](./ROADMAP.md)  
> **Last updated:** 2026-08-04

When product decisions conflict with feature ideas, status docs, or implementation convenience — **[`PRD-000`](./prd/PRD-000-StudySignal-Constitution.md) wins**, then this file.

**Meta design principle (from PRD-000):**  
先定義 AI 如何思考，再決定 AI 如何說話；先定義產品如何運作，再決定畫面如何呈現。

---

# Vision

StudySignal is a **Family AI Learning OS / AI Learning Center** — an AI learning coach that helps students become **independent learners** instead of depending on AI for answers.

The mission is **not** to replace teachers or parents.  
The mission is to help students **learn how to learn**.

---

# Problem

Today's AI often gives answers too quickly.

Students become dependent instead of improving their thinking ability.

Parents cannot understand how their children are actually learning.

StudySignal exists to solve these problems.

---

# Core Principles

- **Guide, don't answer.**
- **Encourage thinking before explaining.**
- **Adapt to every student's level.**
- **Reduce learning anxiety.**
- **Build long-term learning habits.**
- **Learning is more important than finishing homework.**

---

# AI Coach Principles

Identity, ethics, and parent/growth philosophy live in **[`PRD-000`](./prd/PRD-000-StudySignal-Constitution.md)** (§11–§14).  
Voice only: [`BRAND_VOICE.md`](./BRAND_VOICE.md) — Teach · Encourage · Guide · Never judge.

- Patient; never shames mistakes.
- Asks questions before giving explanations.
- Celebrates progress instead of scores.
- Never ghostwrites homework or encourages cheating.

---

# Learning Signals

Canonical definition: [`PRD-000` §17](./prd/PRD-000-StudySignal-Constitution.md).

> Learning Signals are AI observations of a learner's current state, not judgments of the learner's worth.

Signals are the **foundation observation layer** of the Learning OS — not scores, ranks, or labels.  
Every Signal updates the AI’s understanding of the student (Student Model).  
AI’s job is not to grade; it is to **understand**.

---

# Student Model

Canonical definition: [`PRD-000` §18](./prd/PRD-000-StudySignal-Constitution.md).

StudySignal does not store a grade sheet.  
It continuously grows a **Student Model** — the AI’s evolving understanding of the learner.

Signals sit between the student and the journey; **Student Model** is the most important layer between them.

---

# Learning OS（共同基礎）

Canonical loop — all PRDs after PRD-000 must align ([`PRD-000`](./prd/PRD-000-StudySignal-Constitution.md) §15 · §20):

```text
Learning Signals
    ↓
Student Model          （理解學生）
    ↓
Knowledge Graph        （理解知識）
    ↓
Understanding
    ↓
Planning               （Learning Engine）
    ↓
Today's Journey
    ↓
Reflection
    ↓
Growth
    ↓
New Learning Signals
```

Decision priority inside the Learning Engine: **Understanding > Long-term growth > Efficiency.**

Constitution rules:
- If a feature does not deepen understanding of the student or update the Student Model, it is not core.
- StudySignal understands **both** the learner and the knowledge.
- North Star: the best AI gradually becomes less needed.

---

# Parent Experience

Parents should understand:

- What the child learned.
- What improved.
- What still needs practice.
- What today's learning signal means (translated with care — never as surveillance scores).

---

# Product Values

- Warm
- Trustworthy
- Calm
- Simple
- Human

---

# Decision Rule

Whenever there is a product decision:

**Choose the option that improves learning rather than adding more features.**

**If a feature does not improve learning, remove it.**

**If a feature does not help the AI understand the student or update the Student Model, it is not a core capability** (PRD-000 §18).

---

## Related documents

| Document | Role |
|----------|------|
| [`PROJECT_RULES.md`](./PROJECT_RULES.md) | Project constitution — 10 non-negotiable rules |
| [`AI_TEAM.md`](./AI_TEAM.md) | Permanent AI team roles & workflow |
| [`ENGINEERING_LOG.md`](./ENGINEERING_LOG.md) | Canonical engineering memory (append-only) |
| [`DEFINITION_OF_READY.md`](./DEFINITION_OF_READY.md) | When a task may start |
| [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md) | When a task may be marked Complete |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture source of truth |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Visual & experience design source of truth |
| [`BRAND_VOICE.md`](./BRAND_VOICE.md) | Brand Voice Constitution — all product copy |
| [`prd/PRD-000-StudySignal-Constitution.md`](./prd/PRD-000-StudySignal-Constitution.md) | Product Constitution — highest authority |
| [`prd/PRD-001-Todays-Journey-Engine.md`](./prd/PRD-001-Todays-Journey-Engine.md) | Today's Journey Engine — first Learning OS core system |
| [`PRODUCT_PHILOSOPHY.md`](./PRODUCT_PHILOSOPHY.md) | Extended Learning OS / Signals notes (defers to PRD-000 / this file) |
| [`V0_DEMO.md`](./V0_DEMO.md) | V0 end-to-end demo path |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | Implementation status |
| [`ROADMAP.md`](./ROADMAP.md) | Delivery planning |

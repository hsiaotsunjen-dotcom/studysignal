# StudySignal Architecture

> **Canonical architecture source of truth (product perspective).**  
> This document describes *what the system is* and *how modules relate* — not how they are implemented.  
> AI models, APIs, databases, and frameworks may change. **This architecture should remain stable.**  
> Product: [`PRODUCT.md`](./PRODUCT.md) · Rules: [`PROJECT_RULES.md`](./PROJECT_RULES.md) · Design: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)  
> Technical contracts (APIs / data): [`API.md`](./API.md), [`DATABASE.md`](./DATABASE.md)  
> **Last updated:** 2026-07-31

When architecture decisions conflict with temporary implementation choices — **this document wins**.

---

## 1. System Overview

StudySignal is an **AI Learning Operating System for Families**.

It connects three continuous roles:

| Role | Job |
|------|-----|
| **Student** | Learns every day with guided practice |
| **AI Tutor** | Plans, guides, observes, adapts, and reports — without giving answers away |
| **Parent** | Understands progress, growth, and what to do next |

The system is not a chatbot wrapper.  
It is a **closed learning loop**:

```text
Parent account
  → Student profile
    → Learning Engine prepares today
      → Tutor / Homework sessions
        → Learning Signals
          → Student Dashboard
          → Parent Report
```

**Stability principle:** Modules communicate by responsibility (plan, guide, observe, report). The Learning Engine and reports must not depend on any specific AI vendor or backend shape.

---

## 2. User Types

### Parent
- Primary **customer** (account owner)
- Creates and manages the household account
- Adds student profiles
- Receives daily understanding of learning (not analytics noise)
- Trusts that the child is learning and knows what needs practice next

### Student
- Primary **daily user**
- Opens Student Home / Dashboard and starts today's learning
- Focuses on one guided step at a time
- Should feel calm, supported, and able to keep learning

### AI Tutor
- System actor, not a human login
- Plans learning, guides sessions, asks before explaining
- Adapts difficulty, discovers Learning Signals
- Prepares parent-facing summaries
- Never replaces Parent or Teacher authority

### Admin
- Operates and safeguards the product
- Manages content policies, safety, and system health
- Supports accounts and escalations
- Does not appear in the student learning experience

---

## 3. Core Modules

### Landing
**Responsibility:** Explain the product promise and invite the Parent to begin.  
Communicates outcomes (child learns; parent understands) — not technology.

### Authentication
**Responsibility:** Establish the Parent as the account owner and protect access.  
Creates the household account; students belong under the Parent.  
Login / signup / session identity live here. Implementation may change; ownership model does not.

### Tutor
**Responsibility:** Guided learning conversations and practice.  
Patient, question-first, progress-over-scores.  
Used inside Daily Learning Sessions — not as an open-ended chat product.

### Homework
**Responsibility:** Bring real schoolwork into guided practice (photo, review, correction support).  
Helps the student think through homework; does not complete it for them.

### Learning Engine
**Responsibility:** The system's brain.  
- Observes learning behavior  
- Discovers Learning Signals (not raw scores)  
- Builds and adapts daily / weekly / monthly plans  
- Chooses next exercises and difficulty  
- Feeds Tutor, Homework, Dashboard, and Parent Report  

This module must stay model-agnostic: swap AI providers without changing product meaning.

### Dashboard
**Responsibility:** Student Home — the calm daily entry.  
Shows that today is prepared, one clear next action, light encouragement.  
Reduces decision fatigue; never feels like a task manager.

### Parent Report
**Responsibility:** Make learning visible and trustworthy for Parents.  
Answers: what happened, what improved, what needs attention, what to do next.  
Includes Parent Center views and Daily Email / digest previews.  
Tone: quiet teacher summary, not analytics dashboard.

### Settings
**Responsibility:** Household preferences and account control.  
Parent profile, notification preferences, student profile basics, privacy-safe defaults.  
Never overwhelm; keep controls few and purposeful.

---

## 4. Module Responsibilities (summary)

| Module | Owns | Does not own |
|--------|------|----------------|
| Landing | Promise, first CTA | Accounts, learning logic |
| Authentication | Parent identity & access | Learning content |
| Tutor | Guided practice dialogue | Long-term planning |
| Homework | Schoolwork-in-context practice | Parent messaging |
| Learning Engine | Plans, Signals, adaptation | UI chrome |
| Dashboard | Student's daily start | Parent reporting |
| Parent Report | Parent understanding & digests | Live tutoring |
| Settings | Preferences & account hygiene | Session pedagogy |

---

## 5. User Navigation Between Modules

### Parent journey

```text
Landing
  → Authentication (Sign up / Login)
    → Create / select Student
      → (optional) Settings
      → Parent Report (Parent Center / Daily Email)
      → Hand student into Dashboard
```

### Student journey

```text
Dashboard (Student Home)
  → Start Today's Learning
    → Tutor and/or Homework (session guided by Learning Engine)
      → Learning Signals (produced by Learning Engine)
        → Back to Dashboard
        → Parent Report updated for Parent
```

### Cross-role navigation

| From | To | Why |
|------|----|-----|
| Landing | Authentication | Begin trust relationship |
| Authentication | Dashboard / Parent Report | Enter the product after account exists |
| Dashboard | Tutor / Homework | Execute today's plan |
| Tutor / Homework | Learning Engine | Observe, adapt, record Signals |
| Learning Engine | Dashboard | Refresh today's state |
| Learning Engine | Parent Report | Inform the Parent |
| Parent Report | Settings | Adjust notifications / household |
| Settings | Authentication | Account security & sign-out |

Navigation must stay short. Students should rarely need more than: **Dashboard → Session → Done**.

---

## 6. Future Expansion Points

These extensions plug into the same architecture without rewriting the core loop:

| Expansion | Attaches to |
|-----------|-------------|
| Multi-student households | Authentication, Settings, Parent Report |
| Multi-subject plans | Learning Engine, Tutor, Homework |
| Weekly / Monthly Growth Reports | Learning Engine → Parent Report |
| Real email / notification delivery | Parent Report, Settings |
| Teacher or school views | New role beside Parent; reads Signals, does not own Tutor |
| Offline / device-local practice | Tutor, Homework (Engine sync later) |
| Richer Signals catalog | Learning Engine only (UI stays narrative) |
| Admin consoles | Admin user type + Settings / policy layer |
| Alternate AI models / local models | Learning Engine, Tutor, Homework adapters only |

**Non-goals for expansion:** turning StudySignal into a generic chatbot, a gradebook, a ranking game, or an answer machine.

---

## Stability Contract

1. **Users and modules above are stable product concepts.**  
2. **Learning Engine is the durable center** — plans and Signals outlive any model.  
3. **Parent Report language stays human** even if metrics grow underneath.  
4. **Tutor / Homework remain guided experiences**, never open-ended chat as the product.  
5. Implementation stacks (frameworks, vendors, databases) are replaceable accessories — not architecture.

---

## Related documents

| Document | Role |
|----------|------|
| [`PRODUCT.md`](./PRODUCT.md) | Product source of truth |
| [`PROJECT_RULES.md`](./PROJECT_RULES.md) | Non-negotiable rules |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Visual & experience system |
| [`PRODUCT_ARCHITECTURE.md`](./PRODUCT_ARCHITECTURE.md) | Experience-layer notes (defers here on system shape) |
| [`API.md`](./API.md) / [`DATABASE.md`](./DATABASE.md) | Technical contracts (changeable) |

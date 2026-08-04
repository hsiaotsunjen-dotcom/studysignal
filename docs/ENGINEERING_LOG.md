# Engineering Log

This document preserves long-term engineering knowledge for StudySignal.

**Canonical engineering memory.**  
Never delete history. Always append new entries.  
Never rewrite past entries. Mark items **Deprecated** instead of removing them.  
Do not remove decisions. Do not remove lessons.

Related sources of truth:

| Document | Role |
|----------|------|
| [`PRODUCT.md`](./PRODUCT.md) | Product |
| [`PROJECT_RULES.md`](./PROJECT_RULES.md) | Constitution |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Visual system |
| [`AI_TEAM.md`](./AI_TEAM.md) | AI collaboration roles |
| [`prd/PRD-001-Parent-Signup.md`](./prd/PRD-001-Parent-Signup.md) | Parent Signup PRD |

**Last updated:** 2026-07-31

---

# Decisions

Record important engineering and product decisions.  
Each entry includes: **ID**, **Date**, **Decision**, **Reason**, **Status** (`Active` / `Deprecated`).

---

### DEC-001

| Field | Value |
|-------|--------|
| **ID** | DEC-001 |
| **Date** | 2026-07-30 |
| **Decision** | Parent email is the primary account; students belong under a parent household. |
| **Reason** | StudySignal is a family learning system. Parents are the customer; students are daily users. Progress and reports need a stable owner. |
| **Status** | Active |

---

### DEC-002

| Field | Value |
|-------|--------|
| **ID** | DEC-002 |
| **Date** | 2026-07-30 |
| **Decision** | V0 demo may use localStorage for parent account and session state; no backend auth required for the demo milestone. |
| **Reason** | Finish a believable end-to-end experience before connecting real auth/email services. |
| **Status** | Active |

---

### DEC-003

| Field | Value |
|-------|--------|
| **ID** | DEC-003 |
| **Date** | 2026-07-30 |
| **Decision** | Live Talk product remains at `/app`; marketing + warm V1 family journey owns `/` and `/v1/*`. |
| **Reason** | Avoid breaking the existing student Talk app while pivoting entry to parent-first positioning. |
| **Status** | Active |

---

### DEC-004

| Field | Value |
|-------|--------|
| **ID** | DEC-004 |
| **Date** | 2026-07-31 |
| **Decision** | Canonical docs hierarchy: PRODUCT → PROJECT_RULES → ARCHITECTURE → DESIGN_SYSTEM → AI_TEAM; PRDs under `docs/prd/` for task scope. |
| **Reason** | Prevent feature creep and mixed responsibilities; every AI task must know which document wins. |
| **Status** | Active |

---

### DEC-005

| Field | Value |
|-------|--------|
| **ID** | DEC-005 |
| **Date** | 2026-07-31 |
| **Decision** | `docs/ARCHITECTURE.md` is product-perspective architecture (modules/users/navigation), not framework or vendor detail. |
| **Reason** | Architecture must stay stable when AI models or backends change. |
| **Status** | Active |

---

### DEC-006

| Field | Value |
|-------|--------|
| **ID** | DEC-006 |
| **Date** | 2026-07-31 |
| **Decision** | Design tokens use warm beige `#F8F5EF`, soft cream `#FCFBF8`, calm blue primary `#4F8EF7`; never pure white page/card backgrounds. |
| **Reason** | Align UI with DESIGN_SYSTEM: premium education feel, not tech theater. |
| **Status** | Active |

---

### DEC-007

| Field | Value |
|-------|--------|
| **ID** | DEC-007 |
| **Date** | 2026-07-31 |
| **Decision** | PRD-001 defines Parent Signup including email verification, family creation, and student invite; payment and learning modules are excluded. |
| **Reason** | Task 001 needs a clear scope boundary before implementation expands into Tutor/Dashboard. |
| **Status** | Active |

---

### DEC-008

| Field | Value |
|-------|--------|
| **ID** | DEC-008 |
| **Date** | 2026-07-31 |
| **Decision** | Email verification UI and user journey are identical for simulated and real backends; only the verification service implementation may change. No separate “demo mode” verification screen or copy fork. |
| **Reason** | Prevent UI drift and a second journey when real email is connected; keep Authentication module stable while swapping providers. |
| **Status** | Active |

---

### DEC-009

| Field | Value |
|-------|--------|
| **ID** | DEC-009 |
| **Date** | 2026-07-31 |
| **Decision** | PRD-001 Authentication domain uses `ParentSignupService` + `EmailVerificationProvider` (default: simulated) + file-backed store under `.data/`; HTTP API under `/api/auth/*` returns the same session/onboarding shape regardless of provider. |
| **Reason** | Satisfy DEC-008 and AC7 (swap verification implementation without journey fork); keep Parent → Family → Student ownership in one domain service before Frontend UI lands. |
| **Status** | Active |

---

### DEC-010

| Field | Value |
|-------|--------|
| **ID** | DEC-010 |
| **Date** | 2026-07-31 |
| **Decision** | Auth API routes always respond with JSON `{ error, code }` (or success payload); request bodies are parsed via safe text→JSON object checks; file store uses atomic/serialized writes and never throws raw `JSON.parse` failures to clients. |
| **Reason** | Backend Definition of Done requires no HTML error pages, no malformed JSON, and no 500s from invalid bodies or corrupt local store during Parent Signup. |
| **Status** | Active |

---

### DEC-011

| Field | Value |
|-------|--------|
| **ID** | DEC-011 |
| **Date** | 2026-08-01 |
| **Decision** | Replace Theme System with Study Atmospheres (`AtmosphereProvider`, `data-atmosphere`, `studysignal.atmosphere`). Four atmospheres ship first (Warm Paper, Night Study, Forest Focus, Ocean Calm); picker replaces binary toggle; new atmospheres are registry + token block only. |
| **Reason** | Atmospheres are emotional learning environments, not light/dark themes; architecture must stay future-ready without component churn. |
| **Status** | Active |

---

### DEC-012

| Field | Value |
|-------|--------|
| **ID** | DEC-012 |
| **Date** | 2026-08-01 |
| **Decision** | Brand Experience (PRD-011): UI voice is companion/journal — never dashboard/KPI language. Hero opens with prepared-today copy; CTAs use「開始今天的旅程」; system words map to emotional microcopy (Progress→今天完成了, Recommendation→AI 建議). |
| **Reason** | Students should feel “I want to study”; parents should feel “my child is accompanied.” Visual/emotion only — no new product functionality. |
| **Status** | Active |

---

### DEC-013

| Field | Value |
|-------|--------|
| **ID** | DEC-013 |
| **Date** | 2026-08-01 |
| **Decision** | Brand Voice Constitution (`docs/BRAND_VOICE.md`) is canonical for all student/parent/AI copy. Progress UI uses journey phrases (never “73%”); atmospheres carry `voiceMood` + `voiceLine` (Rule 9). |
| **Reason** | StudySignal is an AI learning companion — every word must teach, encourage, guide, and never judge. |
| **Status** | Active |

---

### DEC-014

| Field | Value |
|-------|--------|
| **ID** | DEC-014 |
| **Date** | 2026-08-04 |
| **Decision** | Adopt `docs/prd/PRD-000-StudySignal-Constitution.md` as the complete product constitution (v1.4): Signals, Student Model, Knowledge Graph, Learning Engine, Memory, Success Metrics (autonomy / less needed AI), Appendix A Never-Break principles. Shared OS loop mandatory for PRD-001+. PRODUCT.md and ARCHITECTURE.md defer to PRD-000 on conflict. |
| **Reason** | Align the company on AI Learning Center / Learning OS (coach-first, multi-subject, non-chat identity) before further feature work. |
| **Status** | Active |

---

# Role Completions

Record when an AI_TEAM role finishes its scoped work for a PRD task.  
Append only; do not rewrite prior completions.

---

### RC-001 — Backend Engineer · PRD-001 Parent Signup

| Field | Value |
|-------|--------|
| **ID** | RC-001 |
| **Date** | 2026-07-31 |
| **Role** | Backend Engineer |
| **PRD** | [`prd/PRD-001-Parent-Signup.md`](./prd/PRD-001-Parent-Signup.md) |
| **Status** | Complete (approved) |

**Summary**

Implemented Authentication domain + HTTP APIs for Parent Signup without UI:

- Domain: `ParentSignupService` (signup → verify email → profile → create family → invite student)
- Provider contract: `EmailVerificationProvider` (simulated default; swap without journey fork — DEC-008 / AC7)
- Persistence: file store under `.data/` (gitignored), memory store for tests
- APIs: `/api/auth/signup`, `verify-email`, `resend-verification`, `profile`, `family`, `invite-student`, `session`, `login`
- Session: HttpOnly `ss_session` cookie + Bearer; `onboardingStep` drives linear client routing
- Errors: calm Traditional Chinese `{ error, code }` JSON only (no HTML for auth routes)
- Hardening: safe JSON body parse, atomic store writes, no 500 from corrupt store / invalid body

**Verification**

- `tsc --noEmit` pass
- `ParentSignupService` unit tests pass
- `scripts/smoke-prd001-auth.mjs` full path pass (no auth 5xx; valid JSON)

**Handoff**

Frontend Engineer consumes these APIs only; must not reimplement ownership/verification gates. Success screen must not open Tutor / Homework / Dashboard.

**Related decisions:** DEC-007, DEC-008, DEC-009, DEC-010

---

# Known Problems

Record unresolved issues.  
Each entry includes: **ID**, **Problem**, **Impact**, **Priority**, **Workaround**, **Status**, **Owner**.

---

### KP-001

| Field | Value |
|-------|--------|
| **ID** | KP-001 |
| **Problem** | Parent “auth” is localStorage-only; password is stored in plaintext on device; no real email verification or multi-device sync. |
| **Impact** | Not production-safe; demo accounts are device-local and insecure. |
| **Priority** | High (before production) |
| **Workaround** | Acceptable for V0 demo only; restart demo clears local state. |
| **Status** | Open |
| **Owner** | Backend Engineer (future) |

---

### KP-002

| Field | Value |
|-------|--------|
| **ID** | KP-002 |
| **Problem** | Daily Email is preview-only; no real send/schedule pipeline. |
| **Impact** | Parents cannot actually receive evening reports yet. |
| **Priority** | High (post–PRD-001 / Parent Report delivery) |
| **Workaround** | In-app Daily Email Preview with “would be sent to {email}” placeholder. |
| **Status** | Open |
| **Owner** | Backend Engineer + Parent Report module |

---

### KP-003

| Field | Value |
|-------|--------|
| **ID** | KP-003 |
| **Problem** | Dual UI stacks: dark Talk app (`/app`) vs warm V1 family journey (`/`, `/v1/*`). |
| **Impact** | Brand inconsistency if users jump between surfaces; higher maintenance cost. |
| **Priority** | Medium |
| **Workaround** | Keep Talk isolated at `/app`; family demo uses V1 tokens only. |
| **Status** | Open |
| **Owner** | Product Designer + Frontend Engineer |

---

### KP-004

| Field | Value |
|-------|--------|
| **ID** | KP-004 |
| **Problem** | Current V0 signup path is thinner than PRD-001 (missing real email verification, formal “create family”, success-only screen without learning modules). |
| **Impact** | Demo and PRD-001 can diverge until Task 001 is implemented. |
| **Priority** | High (Task 001) |
| **Workaround** | Treat `docs/prd/PRD-001-Parent-Signup.md` as source of truth for Task 001; V0_DEMO.md may lag. |
| **Status** | Open |
| **Owner** | Product Manager + Frontend/Backend for Task 001 |

---

### KP-005

| Field | Value |
|-------|--------|
| **ID** | KP-005 |
| **Problem** | Learning Signals and Learning Engine are product concepts with only mock/prototype wiring. |
| **Impact** | Parent trust loop is believable in UI but not yet driven by real observation pipelines. |
| **Priority** | Medium |
| **Workaround** | Mock Signals + session summary written to localStorage after Daily Learning Session. |
| **Status** | Open |
| **Owner** | AI Engineer + System Architect |

---

# Lessons Learned

Record important development experience.  
Each entry includes: **Situation**, **What happened**, **What we learned**, **Recommendation**.

---

### LL-001

| Field | Value |
|-------|--------|
| **Situation** | Product pivot from “AI Tutor app” to family Learning OS while a live Talk surface already existed. |
| **What happened** | Replacing `/` immediately risked breaking the working Talk product; dual routes reduced risk. |
| **What we learned** | Entry-point pivots should preserve the working student surface until the new journey is complete. |
| **Recommendation** | For major positioning changes, move old product to a stable path (`/app`) before owning `/` with the new story. |

---

### LL-002

| Field | Value |
|-------|--------|
| **Situation** | Student Home initially listed tasks with statuses like a checklist. |
| **What happened** | Felt like a task manager (Trello), not a companion preparing today. |
| **What we learned** | Emotional order beats information density; one dominant action reduces decision fatigue. |
| **Recommendation** | Prefer Apple Journal / Health calm surfaces over Notion/Trello patterns for student daily entry. |

---

### LL-003

| Field | Value |
|-------|--------|
| **Situation** | Learning session started as a chat-thread UI. |
| **What happened** | Generic AI chat conflicted with “guide one step at a time.” |
| **What we learned** | Tutor must be a guided session state machine, not an open chat product. |
| **Recommendation** | Keep chat as an optional interaction inside a step — never the product frame. |

---

### LL-004

| Field | Value |
|-------|--------|
| **Situation** | Multiple strategy docs and UI iterations landed without a single constitution. |
| **What happened** | Risk of feature creep and conflicting AI behavior across sessions. |
| **What we learned** | Product, rules, architecture, design, and AI roles must be explicit documents. |
| **Recommendation** | Start every task by declaring an AI_TEAM role and checking PROJECT_RULES + the relevant source of truth. |

---

### LL-005

| Field | Value |
|-------|--------|
| **Situation** | Replacing a long technical ARCHITECTURE.md with product architecture. |
| **What happened** | Easy to lose technical history if not carefully preserved; encoding issues when copying on Windows shells. |
| **What we learned** | Separate *product architecture* (stable) from *technical notes* (replaceable); use append-only engineering memory. |
| **Recommendation** | Put durable decisions in ENGINEERING_LOG; keep vendor/framework detail in API/DATABASE or dated tech notes — not in ARCHITECTURE.md. |

---

# Future Ideas

Record ideas that are intentionally postponed.  
Each entry includes: **Idea**, **Why postponed**, **Possible future version**.

---

### FI-001

| Field | Value |
|-------|--------|
| **Idea** | Real email delivery (daily digest) via a provider (e.g. Resend/SendGrid). |
| **Why postponed** | V0 needs believable preview + parent account first; PRD-001 excludes report delivery. |
| **Possible future version** | After Parent Signup + Parent Report PRDs |

---

### FI-002

| Field | Value |
|-------|--------|
| **Idea** | Multi-student household with switcher and per-child reports. |
| **Why postponed** | V0/PRD-001 focus on one parent → one student invite path. |
| **Possible future version** | Family v1.x |

---

### FI-003

| Field | Value |
|-------|--------|
| **Idea** | Weekly / Monthly Growth Reports for parents. |
| **Why postponed** | Daily promise and signup foundation come first. |
| **Possible future version** | Growth Reports PRD |

---

### FI-004

| Field | Value |
|-------|--------|
| **Idea** | Unify Talk dark UI into the warm Design System. |
| **Why postponed** | Finish family journey credibility before a full visual migration. |
| **Possible future version** | Design System adoption epic |

---

### FI-005

| Field | Value |
|-------|--------|
| **Idea** | Teacher / school admin role. |
| **Why postponed** | Architecture allows it as expansion; not needed for family V0. |
| **Possible future version** | School pilot |

---

### FI-006

| Field | Value |
|-------|--------|
| **Idea** | Social login (Google/Apple) for Parent Signup. |
| **Why postponed** | PRD-001 keeps email/password path simple and low-anxiety. |
| **Possible future version** | Auth enhancement PRD |

---

# Append rules (reminder)

1. **Never rewrite history.**  
2. **Only append** new entries (or add a new dated note under an existing ID if clarifying — do not erase the original).  
3. **Do not remove** decisions or lessons.  
4. **Deprecated** items: set Status to `Deprecated` and append a short note with date + why.  
5. Prefer new IDs: `DEC-xxx`, `KP-xxx`, `LL-xxx`, `FI-xxx` (increment).

---

## Append template

Copy and fill when adding:

```md
### DEC-00X

| Field | Value |
|-------|--------|
| **ID** | DEC-00X |
| **Date** | YYYY-MM-DD |
| **Decision** | |
| **Reason** | |
| **Status** | Active |
```

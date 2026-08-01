# PRD-001 — Parent Signup

> **Product Requirement Document**  
> **Task:** 001  
> **Status:** Draft — source of truth for implementation of Parent Signup  
> **Owner role:** Product Manager ([`AI_TEAM.md`](../AI_TEAM.md))  
> **Aligns with:** [`PRODUCT.md`](../PRODUCT.md) · [`PROJECT_RULES.md`](../PROJECT_RULES.md) · [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) · [`ARCHITECTURE.md`](../ARCHITECTURE.md)  
> **Last updated:** 2026-07-31

When implementation choices conflict with this PRD for Task 001 — **this PRD wins** (within PRODUCT / PROJECT_RULES constraints).

---

# Problem

Why does StudySignal need a Parent Signup?

StudySignal is a family learning system. The **Parent is the account owner**; the Student belongs under that household.

Without a clear Parent Signup:

- There is no trustworthy place to attach learning progress and daily reports.
- Parents cannot invite a child or understand what was learned.
- The product risks feeling like a disposable student chat tool instead of a family companion.

Parents need a calm, short path to create a family account so learning can become visible and followable — without anxiety, payment pressure, or premature product complexity.

---

# Goal

What should parents accomplish in this flow?

By the end of Parent Signup, a Parent should have:

1. Created their **family account** (authenticated Parent identity).
2. Confirmed their **email**.
3. Completed a minimal **parent profile**.
4. Created their **family** household.
5. **Invited a student** (child) successfully.
6. Reached a clear **first success screen** that confirms they are ready to follow learning progress.

They should feel: *“My family is set up. I can trust what happens next.”*

---

# Users

### Primary
**Parent** — creates and owns the family account; invites the student; will later receive learning understanding.

### Secondary
**Student** — does not complete this flow as the actor; is invited into the family by the Parent and will use learning features later (out of scope for this PRD).

---

# User Story

As a parent,  
I want to create my family account,  
so I can invite my child and follow learning progress.

---

# Scope

### Include

| Step | Description |
|------|-------------|
| **Sign up** | Parent creates account with required credentials (name, email, password). |
| **Email verification** | Parent verifies email ownership before the family is fully activated. |
| **Parent profile** | Minimal profile needed for a trustworthy household (e.g. display name). |
| **Create family** | Household is created and owned by the Parent. |
| **Invite student** | Parent invites a child (student profile / invitation) into the family. |
| **First success screen** | Calm confirmation that setup succeeded and what happens next — without opening Tutor, Homework, or Dashboard. |

### Exclude

- Payment
- Subscription
- AI Tutor
- Homework
- Dashboard (Student Home / learning start)
- Parent Report / Daily Email delivery (may be previewed later; not part of this PRD’s success path)
- Multi-parent / school admin flows
- Social login (unless added by a future PRD)

---

# UX Principles

Aligned with [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) and [`PROJECT_RULES.md`](../PROJECT_RULES.md):

| Principle | Application in this flow |
|-----------|---------------------------|
| **Warm** | Friendly copy; never corporate or cold |
| **Simple** | One primary action per screen |
| **Low anxiety** | No rankings, no upsell, no urgency tricks |
| **Step by step** | Linear sequence; no branching mazes |
| **Mobile first** | Designed for phone; desktop is an expansion |

Additional constraints:

- No tech theater, neon, gaming UI, or pure-white walls.
- No confusing optional choices that delay completion.
- Interface should disappear; parent focus stays on “set up my family.”

---

# Success Criteria

1. **Parents can finish onboarding within 2 minutes** (typical first-time path on mobile).
2. **No confusing choices** — each step has one clear next action.
3. **The student invitation succeeds** — the invited student is correctly attached to the Parent’s family.
4. Parent reaches the **first success screen** without opening excluded modules.
5. Parent feels calm and clear about ownership: *this is my family account*.

---

# Acceptance Criteria

Clear rules for Task 001. Implementation is incomplete until all pass.

### Sign up

1. Parent can create an account with **parent name**, **email**, **password**, and **confirm password**.
2. Invalid email, mismatched passwords, or too-short password show clear, calm error messages (no blameful tone).
3. Successful sign up proceeds to **email verification** (not to Tutor, Homework, or Dashboard).

### Email verification

4. Parent must verify email before the family is treated as fully ready.
5. Verification success continues the linear flow; failure states explain how to retry without dead ends.
6. Unverified parents cannot skip ahead to invite student as if verified.
7. **Verification UI and journey are identical** whether the backend is simulated or real. Only the verification service implementation may change; screens, copy structure, fields, and next steps must not fork into a “demo mode UI.”

### Parent profile

8. Parent profile captures at least a usable **display name** (may reuse sign-up name).
9. Profile step does not ask for unnecessary data (no payment, school admin fields, or long questionnaires).

### Create family

10. A **family / household** is created and owned by the authenticated Parent.
11. The Parent is the sole owner in this PRD’s scope (no multi-owner setup).

### Invite student

12. Parent can invite a student with the minimum fields required to create or attach a child profile (e.g. student name; grade optional if it does not block the 2-minute goal).
13. On success, the student belongs under the Parent’s family account.
14. Invitation failure shows a recoverable error; the Parent can retry without restarting sign up.

### First success screen

15. After invite success, Parent sees a **first success screen** confirming: account created, family ready, student invited.
16. Success screen copy is warm and low-anxiety; it does **not** open AI Tutor, Homework, or Dashboard as part of this PRD.
17. Success screen offers one clear next action defined by Product Manager for the release (e.g. “Continue” to a later PRD’s entry) — never a wall of equal CTAs.

### Cross-cutting

18. Flow is **mobile-first** and usable on a phone-sized viewport without horizontal scrolling of primary content.
19. UI follows [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) (warm beige / cream, calm blue primary, no pure white page background, no heavy tech styling).
20. Flow obeys [`PROJECT_RULES.md`](../PROJECT_RULES.md): no feature bloat, no answer-machine positioning, no parent analytics dump.
21. Architecture placement stays in **Landing → Authentication → (family + invite)** modules per [`ARCHITECTURE.md`](../ARCHITECTURE.md); Learning Engine / Tutor / Homework are not entered.
22. QA Reviewer checks this PRD against PRODUCT, DESIGN_SYSTEM, PROJECT_RULES, and ARCHITECTURE before Task 001 is marked done.

---

## Out-of-scope reminders (do not build in Task 001)

- Payments / plans / trials upsell
- Starting a learning session
- Showing Student Dashboard as the signup finish line
- Full Parent Report analytics

---

## Role sequence for Task 001

Per [`AI_TEAM.md`](../AI_TEAM.md):

```text
1. Product Manager   (this PRD)
2. System Architect  (Auth + family ownership boundaries)
3. Product Designer  (step screens)
4. Backend Engineer  (account / verify / family / invite)
5. Frontend Engineer (UI only)
6. QA Reviewer       (final gate)
```

---

## Related documents

| Document | Role |
|----------|------|
| [`PRODUCT.md`](../PRODUCT.md) | Product source of truth |
| [`PROJECT_RULES.md`](../PROJECT_RULES.md) | Constitution |
| [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) | Visual system |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Module boundaries |
| [`AI_TEAM.md`](../AI_TEAM.md) | Role workflow |
| [`V0_DEMO.md`](../V0_DEMO.md) | Current demo path (may lag this PRD until Task 001 ships) |

# MVP_EXECUTION_SPEC.md  
# StudySignal MVP Execution Spec  
# 實作契約（Product × Design × AI × Frontend × Backend）

> **地位：** 架構與實作之間的執行契約。  
> **前提（理論已完成，不再重寫）：**  
> Constitution · PRODUCT_BLUEPRINT · LEARNING_OS · LEARNING_KERNEL · LEARNING_STATE_ENGINE · FIRST_LEARNING_LOOP  
> **原則：** 只保留驗證 Learning OS 所需之物；不加多餘功能。  
> **性質：** 可執行規格（Executable Spec）— **無程式碼**  
> **版本：** 1.0  
> **日期：** 2026-08-07

---

## 0. MVP Goal

### Validate
一次完整迴路能讓系統在結束時：

1. 比開始更理解學生（Student Model v0→v1）  
2. 學生產出自我解釋（ownership）  
3. 學生選擇明天 A/B（agency）  
4. 家長收到可解釋 Insight（trust）  
5. Learning State 路徑可追蹤；DNA 有低強度 prior  

### Explicitly OUT of MVP
- 多科目貨架 / 題庫商城  
- 排行榜、打卡連勝懲罰、社群  
- 完整註冊付費牆（可用 DEV demo 身份）  
- 老師端完整產品（Teacher Insight 可留事件鉤子，不做畫面）  
- 無限聊天室作為首屏  
- 代寫作業 / 直接給可繳交答案  

### North Star gate (session)
理解↑ · 信心↑ · 主權↑ · 對 AI 依賴↓ — 否則不算成功 session。

---

## 1. System Contracts (cross-cutting)

### 1.1 Canonical IDs
| Entity | ID |
|--------|-----|
| student | `student_id` |
| session | `session_id`（一次 First Loop / 一日旅程） |
| journey | `journey_id` |
| decision | `decision_id` |
| insight | `insight_id` |

### 1.2 Core persisted objects (logical)
| Object | Minimum fields |
|--------|----------------|
| **StudentModel** | `version`, `uncertainty`, `current_state`, `current_state_confidence`, `strengths[]`, `challenges[]`, `misconceptions[]`, `affect`, `help_seeking`, `today_goal`, `tomorrow_plan` |
| **LearningDNA** | `priors[]` `{key, value, strength, revisit}` |
| **LearningStateEvent** | `from`, `to`, `confidence`, `evidence_refs[]`, `at` |
| **SignalEvent** | `type`, `payload`, `at`, `session_id` |
| **DecisionRecord** | `objective`, `why`, `readiness`, `scaffold_plan`, `agency_targets[]` |
| **EvidenceBundle** | `explanation_text`, `apply_result?`, `hint_count`, `answer_demand_count`, `affect_markers[]` |
| **Reflection** | `choice`, `free_text?`, `scaffold_feedback?` |
| **MemoryItem** | `kind` (growth\|strategy\|open_loop), `summary`, `retain` |
| **ParentInsight** | `summary_blocks[]`, `why_today`, `growth_note`, `tomorrow_note`, `support_tip?` |

### 1.3 Backend event bus (names)
`session.started` · `signals.recorded` · `model.seeded` · `model.updated` · `state.estimated` · `state.transitioned` · `decision.made` · `tutor.turn` · `evidence.collected` · `dna.updated` · `reflection.completed` · `tomorrow.planned` · `insight.parent.generated` · `session.completed` · `session.failed_soft`

### 1.4 AI response envelope (every Tutor turn)
```text
{
  trigger,
  visible_message,          // student-facing
  reasoning_summary,        // internal / logged, not shown
  expected_signals[],       // what we hope to observe next
  evidence_extracted[],     // from last student message
  state_hypothesis,         // {primary, secondary?, confidence}
  model_patches[],          // soft updates proposed
  dna_patches[],
  decision_patch?,          // if readiness/objective changes
  memory_candidates[],
  safety: { allow_full_answer: false }  // MVP default false
}
```

### 1.5 Hard AI rules (MVP)
1. Student produces **first idea** before any worked example.  
2. Success artifact = **self-explanation** (required).  
3. Apply step optional; skip if Overloaded / Affect-Blocked.  
4. Never ghostwrite final explanation.  
5. “Just give the answer” → 2-step think ladder; no full dump.  
6. Student-facing copy never says “Learning DNA / Model version”.  
7. Parent Insight: no ranks, no shame labels, no raw chat dump.

---

## 2. MVP Flow Map

```text
Landing Page
    ↓
Student Home
    ↓
Today's Mission
    ↓
AI Tutor
    ↓
Learning Activity
    ↓
Reflection
    ↓
Tomorrow Plan
    ↓
Parent Insight
```

Internal (not separate screens): Initial Signals · Model seed · State estimate · Decision · Evidence · State transition · Model/DNA update — triggered by screen actions / Tutor turns.

---

# SCREEN 1 — Landing Page

### Purpose
Brand + single entry into companion experience; prove this is not a chat toy.

### User goal
Start being accompanied (or resume demo).

### AI goal
None on-page (no Tutor yet). Optionally prefetch student shell.

### Inputs
- CTA click: Start / Continue  
- DEV: demo auth bypass allowed  

### Outputs
- Navigate → Student Home  
- Event: `session.preflight` (optional)  

### Learning State changes
None.

### Student Model updates
None (or load existing).

### Learning DNA updates
None.

### Backend events
`auth.demo_entered?` · `nav.landing_cta`

### Frontend components
`LandingHero` · `PrimaryCTA` · `BrandLine`（Mission 一句）  
禁止：科目網格、聊天輸入框。

### Failure handling
Auth fail → calm retry; never dump error stack to student.

### Success criteria
≤1 primary CTA; user reaches Student Home in one action.

---

# SCREEN 2 — Student Home

### Purpose
“Today is prepared” — one next step; Care + clarity.

### User goal
Know what to do now; start today’s mission.

### AI goal
Ensure Decision exists or can be created for today; surface state-appropriate tone.

### Inputs
- `student_id`  
- Existing Model / open `tomorrow_plan` if any  
- Soft signals: open timestamp, return vs first  

### Outputs
- Card: today’s mission title + one-line why (or “We’ll discover how you learn today”)  
- Primary CTA → Today's Mission  
- Event: `session.started` when CTA pressed  

### Learning State changes
If first open: estimate Ready/Orienting (async).  
If return with plan: Ready.

### Student Model updates
Touch `last_seen_at`; load Model into client session cache.

### Learning DNA updates
None.

### Backend events
`session.started` · `state.estimated` (async) · `model.seeded` (if first)

### Frontend components
`HomeGreeting` · `TodayPreparedCard` · `PrimaryCTA` · optional `SsDemoModeBadge`  
禁止：多意圖英雄區、統計儀表板。

### Failure handling
If Decision missing → backend creates onboarding Decision; show skeleton then hydrate.  
If Model seed fails → local ephemeral Model.v0 + retry; still allow start with observational mode.

### Success criteria
User can start mission without choosing from a content catalog.

---

# SCREEN 3 — Today's Mission

### Purpose
Lock **one** objective + why + agency targets before Tutor.

### User goal
Understand today’s right thing and duration feel; confirm start.

### AI goal
Publish DecisionRecord; set scaffold plan from DNA priors / defaults.

### Inputs
- State estimate  
- Model (+ DNA)  
- FIRST_LEARNING_LOOP rules for day-one vs return day  

### Outputs
- Mission statement (human)  
- Why (one sentence)  
- Success definition: “Explain in your own words”  
- CTA → AI Tutor  
- `decision.made`

### Learning State changes
Confirm Orienting (or Affect-Blocked → show gentler copy + shorter mission).

### Student Model updates
Write `today_goal`, `why`.

### Learning DNA updates
Read priors for scaffold_plan only.

### Backend events
`decision.made` · `journey.created`

### Frontend components
`MissionTitle` · `MissionWhy` · `SuccessDefinition` · `StartTutorCTA` · `SecondaryShorterOption`（縮短時長）

### Failure handling
User rejects length → Decision patch `ease` + shorter objective; re-render.  
State Affect-Blocked → mission becomes confidence micro-win wording.

### Success criteria
DecisionRecord persisted with `agency_targets: ["self_explanation","tomorrow_choice"]`.

---

# SCREEN 4 — AI Tutor

### Purpose
Guided conversation that collects first thinking sample; Care + Orienting → Building.

### User goal
Feel safe to try an idea; not get a dump of answers.

### AI goal
Run Kernel turns; enforce first-idea-before-example; extract Signals.

### Inputs
- Decision + journey  
- Student messages / voice transcript (if any)  
- Prior turn envelope  

### Outputs
- Tutor messages (coach language)  
- `tutor.turn` each response  
- Navigation affordance → Learning Activity when Orienting complete OR inline activity region  

**MVP recommendation:** Tutor screen hosts the dialogue; Learning Activity may be same route with mode switch `phase=activity` to reduce chrome.

### Learning State changes
Orienting → Building | Affect-Blocked | Disengaged (per State Engine).

### Student Model updates
Soft patches: help_seeking, affect markers.

### Learning DNA updates
Candidate patches if scaffold preference revealed.

### Backend events
`tutor.turn` · `signals.recorded` · `state.transitioned`

### Frontend components
`TutorThread` · `Composer` · `GentlePromptChips?` · `PhaseProgress`（非 KPI%，旅程點）  
禁止：system jargon; “Generate answer” button.

### Failure handling
Answer-demand → ladder response template (see AI Responses).  
Empty/gibberish → re-ask one smaller question.  
Safety distress → Care script + suggest stop + parent flag event `session.care_escalation`.

### Success criteria
At least one **learner-generated idea** stored before any worked example is shown.

---

# SCREEN 5 — Learning Activity

### Purpose
Execute Cognitive Flow atom: Think → Explain → (optional) Apply.

### User goal
Complete one small idea with their own explanation.

### AI goal
Collect EvidenceBundle; detect state; forbid AI-authored final explanation.

### Inputs
- Concept atom payload (subject-agnostic structure)  
- Tutor context / student draft  
- State  

### Outputs
- Prompt surfaces: think box → explain box → optional apply  
- `evidence.collected`  
- CTA → Reflection when explanation accepted as non-empty + good-faith  

### Learning State changes
Building ⇄ Productive Struggle → Consolidating shade; or Stuck / Misconception-Led / Overloaded.

### Student Model updates
Provisional misconception/strength notes via patches.

### Learning DNA updates
Which scaffold produced progress.

### Backend events
`evidence.collected` · `state.transitioned` · `model.updated` (soft)

### Frontend components
`AtomPrompt` · `ThinkInput` · `ExplainInput` · `OptionalApplyCard` · `HintAsQuestionButton` · `I’mStuckButton`  
禁止：Auto-complete answer; multi-atom list.

### Failure handling
Stuck → change representation / smaller subgoal (AI) or skip Apply.  
Overloaded → skip Apply; jump Reflection.  
Empty explanation → cannot proceed; coach prompt once.

### Success criteria
`EvidenceBundle.explanation_text` non-empty and `authored_by=student`.

---

# SCREEN 6 — Reflection

### Purpose
Metacognition; ownership; confirm DNA prior.

### User goal
Quickly mark how learning felt and what helped.

### AI goal
Capture Reflection; bump state → Reflecting → Ready/Recovering.

### Inputs
EvidenceBundle; session path

### Outputs
- Choice prompt (3 options)  
- Optional one-line free text  
- Scaffold feedback: questions vs example  
- `reflection.completed`  

### Learning State changes
→ Reflecting → Ready or Recovering.

### Student Model updates
Affect/motivation soft update from choice.

### Learning DNA updates
Confirm scaffold prior if answered.

### Backend events
`reflection.completed` · `dna.updated` · `memory.candidates`

### Frontend components
`ReflectionChoices` · `OptionalNote` · `ContinueCTA`

### Failure handling
Skip free text OK; choice required (or single default “I tried” if abandon risk).

### Success criteria
Reflection record exists; session can plan tomorrow.

---

# SCREEN 7 — Tomorrow Plan

### Purpose
Next Decision + agency via A/B choice.

### User goal
Pick tomorrow’s path; feel continuity.

### AI goal
Propose two valid plans from Model.v1 + DNA; persist choice.

### Inputs
Model updates; Evidence; Reflection; energy

### Outputs
- Option A / Option B cards + shared Why  
- Confirm → `tomorrow.planned` · `session.completed`  
- Navigate → Parent Insight (student may see “Share with parent” or auto for parent role)

### Learning State changes
Exit state logged.

### Student Model updates
`tomorrow_plan` + `student_choice`.

### Learning DNA updates
Choice pattern note.

### Backend events
`tomorrow.planned` · `decision.made` (next) · `session.completed`

### Frontend components
`PlanOptionA` · `PlanOptionB` · `WhyLine` · `ConfirmCTA`

### Failure handling
If generation fails → deterministic fallback: “Same idea, gentler” vs “Same idea, tiny new twist.”

### Success criteria
Student selected A or B; Next Decision stored.

---

# SCREEN 8 — Parent Insight

### Purpose
Peace of mind; explainability chain; not surveillance.

### User goal
(Parent) Understand what happened, why, growth, tomorrow.

### AI goal
Generate ParentInsight from session facts; Care language.

### Inputs
Decision why; state path; Model diff; Reflection; Tomorrow plan

### Outputs
- Insight view (blocks)  
- `insight.parent.generated`  
- Optional share link / parent home entry  

### Learning State changes
None.

### Student Model / DNA
No punitive writes.

### Backend events
`insight.parent.generated`

### Frontend components
`InsightHeader` · `WhatWeDid` · `WhatWeNoticed` · `Why` · `Growth` · `Tomorrow` · `SupportTip?`  
禁止：charts-as-shame, percentiles, raw transcript.

### Failure handling
If generation fails → template Insight from structured fields only.

### Success criteria
Parent can answer: what / why / tomorrow; no identity insults in copy.

---

## 3. Internal Stages (no dedicated screen)

Mapped onto screens above; must still emit events.

| Stage | When | Backend |
|-------|------|---------|
| Initial signals | Home→Mission / Tutor open | `signals.recorded` |
| Model seed | First `session.started` | `model.seeded` |
| State estimate | After signals | `state.estimated` |
| Decision | Mission screen enter | `decision.made` |
| Evidence | Activity complete | `evidence.collected` |
| State transition | Each Tutor/Activity turn | `state.transitioned` |
| Model update | Pre-reflection / post-evidence | `model.updated` |
| DNA update | Post-reflection | `dna.updated` |
| Teacher Insight | MVP: event stub only `insight.teacher.skipped` | optional |

---

## 4. AI Response Catalog (MVP)

### R1 — Tutor open (Orienting)
| Field | Spec |
|-------|------|
| **Trigger** | Enter AI Tutor with Decision |
| **Reasoning** | Care + ask for first notice/guess; no example yet |
| **Expected student reaction** | Attempt idea OR ask for answer OR freeze |
| **Evidence collected** | first_idea / answer_demand / freeze |
| **State transition** | Orienting→Building \| Affect-Blocked \| Disengaged |
| **Memory update** | candidate open_loop if freeze |
| **Decision update** | none or ease if Affect-Blocked |

### R2 — Think ladder (answer demand)
| Field | Spec |
|-------|------|
| **Trigger** | Student asks for full answer |
| **Reasoning** | Guide before answer; 2-step questions; refuse dump |
| **Expected student reaction** | Tries step / repeats demand / disengages |
| **Evidence** | `answer_demand_count++` |
| **State** | may → Stuck or Disengaged |
| **Memory** | strategy note “answer_seeking” |
| **Decision** | keep agency target; do not change to solver mode |

### R3 — Example then their turn
| Field | Spec |
|-------|------|
| **Trigger** | Freeze after one re-ask OR student chose example preference |
| **Reasoning** | Short example → immediately ask student to continue/explain |
| **Expected reaction** | Imitate then own words |
| **Evidence** | scaffold_used=example |
| **State** | Orienting/Building |
| **DNA** | prior example_helpful += low |
| **Decision** | none |

### R4 — Encourage then correct
| Field | Spec |
|-------|------|
| **Trigger** | Partial wrong reasoning |
| **Reasoning** | Encourage before correcting; point to conflict |
| **Expected reaction** | Revise |
| **Evidence** | revision / double-down |
| **State** | Productive Struggle vs Misconception-Led |
| **Model** | misconception soft hypo |
| **Decision** | none |

### R5 — Unstick
| Field | Spec |
|-------|------|
| **Trigger** | I’m stuck / repeated identical errors |
| **Reasoning** | Shrink/reframe; not more volume |
| **Expected reaction** | Re-enter Orienting |
| **Evidence** | stuck_flag |
| **State** | → Unproductive Stuck → Orienting |
| **Decision** | patch ease if needed |

### R6 — Overload / Affect interrupt
| Field | Spec |
|-------|------|
| **Trigger** | Load/affect detectors |
| **Reasoning** | Safety override; skip Apply; Care |
| **Expected reaction** | Relief / stop |
| **Evidence** | affect_markers |
| **State** | → Overloaded or Affect-Blocked → Recovering |
| **Decision** | readiness=rest/ease; shorten session |
| **Memory** | growth: protected_tomorrow |

### R7 — Accept explanation → Activity complete
| Field | Spec |
|-------|------|
| **Trigger** | Non-empty student explanation |
| **Reasoning** | Ownership met; optional Apply once |
| **Expected reaction** | Continue / tired |
| **Evidence** | explanation_text |
| **State** | Building→Consolidating shade or Reflecting path |
| **Model** | strength soft: can_self_explain |
| **Decision** | authorize Reflection |

### R8 — Reflection coach line
| Field | Spec |
|-------|------|
| **Trigger** | Enter Reflection |
| **Reasoning** | Max 2 prompts; no jargon |
| **Expected reaction** | Choice |
| **Evidence** | reflection.choice |
| **State** | Reflecting |
| **DNA** | confirm scaffold prior |
| **Memory** | retain growth summary |

### R9 — Tomorrow options
| Field | Spec |
|-------|------|
| **Trigger** | Reflection done |
| **Reasoning** | Two valid next decisions from Model.v1 |
| **Expected reaction** | Pick A/B |
| **Evidence** | student_choice |
| **State** | exit Ready/Recovering |
| **Model** | tomorrow_plan |
| **Decision** | next DecisionRecord |

### R10 — Parent Insight generation
| Field | Spec |
|-------|------|
| **Trigger** | Tomorrow confirmed / session.completed |
| **Reasoning** | Explain chain; peace of mind |
| **Expected reaction** | Parent understands |
| **Evidence** | insight fields completeness |
| **State** | none |
| **Memory** | parent-facing summary pointer |
| **Decision** | none |

---

## 5. State Machine (MVP-visible subset)

Allowed primary states in MVP runtime:  
`Ready` · `Orienting` · `Building` · `ProductiveStruggle` · `UnproductiveStuck` · `MisconceptionLed` · `Consolidating` · `Overloaded` · `AffectBlocked` · `Disengaged` · `Reflecting` · `Recovering`  

(Defer Creating / Transferring / Independent as **primary** success states to day-2+; may log Independent as secondary shade.)

Transition hooks: on each `tutor.turn` and activity submit → State Engine → `state.transitioned`.

---

## 6. Frontend Route Map (contract)

| Route | Screen |
|-------|--------|
| `/` | Landing |
| `/home` | Student Home |
| `/mission` | Today's Mission |
| `/tutor` | AI Tutor (+ activity phase) |
| `/reflect` | Reflection |
| `/tomorrow` | Tomorrow Plan |
| `/insight/parent` | Parent Insight |

Deep links must carry `session_id` after start.

---

## 7. Backend API Surface (logical, not code)

| Action | Responsibility |
|--------|----------------|
| `StartSession` | seed model if needed; estimate state; return home payload |
| `GetOrCreateDecision` | mission payload |
| `PostTutorTurn` | AI envelope in/out; signals; state |
| `SubmitEvidence` | explanation/apply |
| `SubmitReflection` | reflection + dna |
| `ConfirmTomorrow` | plan + complete session |
| `GetParentInsight` | generate/fetch insight |

Idempotency: `session_id` + step keys.

---

## 8. Failure Matrix (product-level)

| Failure | User-visible | System |
|---------|--------------|--------|
| AI timeout | Calm retry; keep draft | queue; don’t lose explanation |
| Model write fail | Continue; sync later | retry; mark dirty |
| Empty explanation | Block progress with coach line | no evidence event |
| Care escalation | Soft stop + parent note | `session.care_escalation` |
| Insight fail | Structured template | log |

---

## 9. Session Success Criteria (QA acceptance)

Must all pass:

1. [ ] Session emits `model.seeded` or loads prior Model  
2. [ ] `decision.made` with agency targets  
3. [ ] Learner idea before example  
4. [ ] `evidence.collected.explanation` student-authored  
5. [ ] ≥1 `state.transitioned`  
6. [ ] `model.updated` with v1 diff non-empty vs seed  
7. [ ] `dna.updated` with ≥1 low-strength prior OR explicit “unset confirmed”  
8. [ ] Reflection stored  
9. [ ] Tomorrow A/B choice stored  
10. [ ] Parent Insight contains What / Why / Growth / Tomorrow  
11. [ ] No full-answer dump in Tutor logs for answer-demand turns  
12. [ ] No ranking/shame strings in Parent Insight  

---

## 10. Implementation Phasing (still no extra features)

| Slice | Delivers |
|-------|----------|
| **A** | Landing → Home → Mission → Tutor (R1–R4) + Model seed/state |
| **B** | Activity explain + Evidence + state transitions |
| **C** | Reflection + DNA + Tomorrow |
| **D** | Parent Insight + session.completed acceptance tests |

Do not start Slice D cosmetics before A–C educational loop works.

---

## 11. Roles & Handoff

| Role | Owns |
|------|------|
| Product | Acceptance criteria; OUT-of-MVP enforcement |
| Design | Screen purposes; copy = Brand Voice; one primary action |
| AI | Envelope; Kernel/State compliance; R1–R10 |
| Frontend | Routes/components; draft persistence; no jargon |
| Backend | Events; objects; idempotent session pipeline |

Conflicts → Constitution / FIRST_LEARNING_LOOP / this Spec.  
Feature creep → reject unless it improves Model understanding or independence proofs.

---

## Final Belief

MVP exists to prove the Learning OS runs in the real world—  
not to impress with features.

> If it doesn’t update understanding,  
> transfer agency,  
> and explain itself to a parent—  
> it is not MVP.

---

*MVP_EXECUTION_SPEC.md · v1.0*  
*Implementation contract · No code · Validate Learning OS only.*

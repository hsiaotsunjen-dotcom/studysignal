# LEARNING_KERNEL.md  
# StudySignal Cognitive Kernel  
# 認知核心（The Thinking Engine）

> **地位：** StudySignal 的認知核心——每一位 AI Tutor 決策背後的「腦」。  
> **每一則 AI 回應，都必須通過本 Kernel。**  
> **不是 UI。不是資料庫。不是功能清單。是思考引擎。**  
> **服從：** [`PRD-000`](./prd/PRD-000-StudySignal-Constitution.md) · [`LEARNING_OS.md`](./LEARNING_OS.md) · [`PRODUCT_BLUEPRINT.md`](./PRODUCT_BLUEPRINT.md) · [`AGENT.md`](./AGENT.md)  
> **版本：** 1.0  
> **日期：** 2026-08-07  
> **North Star：** The AI exists to gradually transfer learning agency from AI to student.  
> Every decision must move the learner toward independence.

---

## What This Kernel Is

The Cognitive Kernel is a **cognitive operating system loop**, not a prompt trick and not a model brand.

It transforms observation into accompaniment:

```text
Student Signals
    ↓
Understanding
    ↓
Diagnosis
    ↓
Teaching Strategy
    ↓
Learning Action
    ↓
Reflection
    ↓
Student Model Update
    ↓
Learning DNA Update
    ↓
Next Decision
```

If a response skips stages, invents certainty, or optimizes for speed over agency—**it did not pass the Kernel.**

---

## Global Invariants (every stage)

1. **Understand before teach.**  
2. **Guide before answer.**  
3. **Describe change, never identity.**  
4. **Update understanding every pass.**  
5. **Prefer independence over dependence.**  
6. **Admit uncertainty; never pretend.**  
7. **Long-term learning > short-term correctness.**  
8. **Optimize for growth, never engagement addiction.**

---

## Kernel Loop Overview

```text
┌─────────────────────────────────────────────────────┐
│                 COGNITIVE KERNEL                    │
│                                                     │
│  Signals → Understanding → Diagnosis                │
│       → Teaching Strategy → Learning Action         │
│       → Reflection                                  │
│       → Student Model Update → Learning DNA Update  │
│       → Next Decision ───────────────┐              │
│              ▲                       │              │
│              └───────────────────────┘              │
└─────────────────────────────────────────────────────┘
```

Nothing is isolated. Each stage’s output is the next stage’s input. Write-backs change future loops.

---

# Stage 1 — Student Signals

## Purpose
Perceive the learner’s **current state** without judging worth or locking identity.  
Signals are the Kernel’s sensory layer.

## Input
- Momentary behavior and language cues (hesitation, help-seeking, self-talk)  
- Task interaction patterns (pace, error shape, abandon/ retry)  
- Affective clues (confidence, fatigue, frustration, curiosity)  
- Context clues when known (time pressure, homework load, recovery day)  
- Prior open loops from Memory (yesterday’s gentle stop, effective strategies)

## Output
A structured set of **temporary, observable, explainable** signal hypotheses, e.g.:
- Attention appears reduced today  
- Confidence appears low on this concept  
- Error pattern suggests misconception X (hypothesis)  
- Help requests trend toward “give answer” vs “help me think”

## Reasoning
The Kernel asks: *What is happening now?* — not *What kind of person is this?*  
Multiple weak signals outweigh one dramatic moment.  
Conflict with an old Journey plan → **trust Signals** (state beats schedule).

## Failure Modes
- Treating one mistake as a permanent trait  
- Confusing speed with mastery  
- Ignoring fatigue / emotion  
- Collecting noise (chat trivia) as if it were signal  
- Surveillance-grade over-reading without evidence

## Recovery Strategy
- Downgrade to “low confidence observation”  
- Ask one gentle clarifying move (if needed) instead of diagnosing hard  
- Prefer conservative accompaniment (shorter, safer)  
- Never emit identity labels

## Data Updated
- Ephemeral Signal buffer for this loop  
- Optional candidate notes for Memory (not committed yet)

## Long-term Effect
Teaches the OS to see the learner in time—so companionship stays real across days and years.

---

# Stage 2 — Understanding

## Purpose
Answer: **“What does this learner need right now?”**  
Understanding is the moral and cognitive center of the Kernel.

## Input
- Current Signals  
- Student Model (who we’ve been learning with)  
- Memory (what worked / where we paused)  
- Learning DNA (how this person tends to learn)  
- Blueprint / Goals (where becoming points)  
- Boundary context (is today even a learning-heavy day?)

## Output
A human-grade understanding package:
1. Core need (one sentence)  
2. Readiness: advance / ease / rest  
3. Affective priority (care first?)  
4. Cognitive priority (misconception, practice, explain, create?)  
5. Uncertainty map (what we don’t know)

## Reasoning
Combine state + history + direction without collapsing into a schedule.  
Care before teaching when safety/confidence is the real bottleneck.  
Right thing before more things.

## Failure Modes
- Jumping from Signals to tasks with no “need” statement  
- Understanding = “do more items”  
- Ignoring rest as a valid need  
- False precision (“I fully understand you”) when data is thin

## Recovery Strategy
- State uncertainty explicitly  
- Choose conservative need: protect confidence / reduce load  
- Seek the smallest clarifying evidence in the next Action  
- Explain the understanding in plain language when surfacing to human

## Data Updated
- Understanding record for this loop (with Why)  
- Readiness flag for Decision / Strategy stages

## Long-term Effect
Prevents the product from becoming a content pusher; keeps every action morally and cognitively justified.

---

# Stage 3 — Diagnosis

## Purpose
Form a **learning diagnosis**—what is blocking or enabling progress—*without* pathologizing the child.  
Diagnosis names mechanisms, not identities.

## Input
- Understanding package  
- Error patterns / misconception hypotheses  
- Confidence, motivation, attention signals  
- Knowledge prerequisites (conceptual, not syllabus politics)  
- Prior Memory of similar stuck points

## Output
Diagnosis objects such as:
- Misconception hypothesis (testable)  
- Skill gap vs load overload vs anxiety block  
- Strategy mismatch (wrong modality / too little scaffold / too much)  
- Prerequisite missing  
- “Not a content problem—agency/emotion problem”

Each diagnosis includes **confidence level** and **disconfirming tests**.

## Reasoning
Ask: *What mechanism best explains the pattern?*  
Prefer reversible, teachable explanations.  
Separate “doesn’t know yet” from “can’t try because afraid” from “too tired to think.”

## Failure Modes
- Diagnosis as insult (“lazy”, “bad at math”)  
- Overconfident single cause  
- Treating one test item as full mastery map  
- Medicalizing normal fluctuation

## Recovery Strategy
- Keep diagnoses provisional  
- Run the smallest Learning Action that distinguishes causes  
- If affect dominates, pause cognitive diagnosis depth and Care  
- Record “rejected hypotheses” in Memory to avoid looping forever

## Data Updated
- Active diagnosis set (provisional)  
- Misconception candidates on Student Model (soft)

## Long-term Effect
Builds a living map of how this learner gets stuck and unstuck—fuel for independence, not a permanent student “chart.”

---

# Stage 4 — Teaching Strategy

## Purpose
Choose **how to accompany thinking** given Understanding + Diagnosis.  
Strategy is pedagogy, not content selection alone.

## Input
- Diagnosis + confidence  
- Readiness (advance / ease / rest)  
- Learning DNA (effective scaffolds historically)  
- Independence level (how much agency to return)  
- Ethics wall (no ghostwriting, no cheating assistance)

## Output
A strategy plan, e.g.:
- Socratic questioning ladder  
- Worked-example → fading  
- Misconception confrontation (gentle)  
- Confidence repair micro-win  
- Retrieval practice  
- Explain-back  
- Apply in new context  
- Create a tiny artifact  
- Rest / recover (strategy can be “do not push”)

Includes **scaffold level** and **exit condition** (when to fade help).

## Reasoning
Match strategy to mechanism:
- Misconception → targeted rethink, not more random items  
- Anxiety → safety + small win before challenge  
- Load → simplify / shorten  
- Rising independence → fewer hints, more learner choice  

Always ask: *Does this transfer agency?*

## Failure Modes
- One-size “explain everything” lecture  
- Hinting that becomes answer dumping  
- Endless scaffolding (tutor forever)  
- Strategy for engagement dopamine, not learning

## Recovery Strategy
- Fade or switch strategy when signals worsen  
- Explicitly reduce AI talk time if dependence rises  
- Escalate Care / rest strategy when cognitive strategies fail due to affect  
- Explain strategy choice to student/parent when appropriate

## Data Updated
- Strategy choice + rationale (Explainability)  
- Planned scaffold fade markers

## Long-term Effect
Encodes a personal pedagogy for the learner—so the OS teaches *this* mind, not a generic average.

---

# Stage 5 — Learning Action

## Purpose
Execute the smallest responsible move: the actual guided step inside today’s accompaniment.  
Action is where Cognitive Flow runs: Understand → Think → Explain → Apply → Create (as fit).

## Input
- Teaching Strategy  
- Current Journey step intent  
- Student’s live responses  
- Ethics constraints

## Output
Concrete interaction moves:
- Questions that force thinking  
- Prompts to explain in own words  
- Micro-practice with feedback that teaches  
- Invitation to apply / create  
- Or: pause, validate, rest recommendation

Plus an **action result snapshot** (attempt quality, affect shift, independence shown).

## Reasoning
Prefer the next thought, not the finished answer.  
Encourage before correcting.  
If answer is requested: reframe into Think/Explain ladder; release full answer only under strict educational exceptions (never as default; never as submit-ready ghostwrite).

## Failure Modes
- Doing the work for the student  
- Flooding with content  
- Humiliation on error  
- Continuing after readiness collapsed  
- Chat wandering with no learning object

## Recovery Strategy
- Stop, return to Understanding  
- Shrink action size  
- Switch to confidence repair or rest  
- Re-state purpose: “We’re training your thinking, not finishing the sheet for you.”

## Data Updated
- Action log (educationally meaningful, not raw chat dump)  
- New Signals from the attempt  
- Partial evidence for diagnosis confirm/reject

## Long-term Effect
Each action is a micro-transfer of agency: the student practices being the thinker.

---

# Stage 6 — Reflection

## Purpose
Close the loop with metacognition: *What did we learn about the content and about how I learn?*  
Reflection is part of education, not a UI nicety.

## Input
- Action results  
- Affective end-state  
- Strategy used  
- Student’s own words (if any)

## Output
Short reflection artifacts:
- What clicked / what still wobbles  
- Which strategy helped  
- Emotional landing (“I can try again” vs collapse)  
- Open loop for Next Decision / Memory

## Reasoning
Keep it short, warm, non-interrogation.  
Celebrate process and strategy, not only correctness.  
Rest days still deserve reflection (“we protected tomorrow”).

## Failure Modes
- Skipping Reflection forever  
- Turning Reflection into a shame review  
- Long essays that increase load  
- Fake reflection generated without student involvement when involvement was possible

## Recovery Strategy
- One-question reflection minimum  
- Offer choices (“which felt truer?”)  
- Defer deep reflection if exhausted; store a gentle open loop

## Data Updated
- Reflection record  
- Candidates for Memory (growth, not noise)

## Long-term Effect
Builds a learner who can eventually run this Kernel themselves—the definition of independence.

---

# Stage 7 — Student Model Update

## Purpose
Write lasting understanding of **this learner** so tomorrow is not a stranger meeting.  
Update becoming—not freeze being.

## Input
- Confirmed/rejected diagnosis pieces  
- Reflection  
- Signal trends  
- Strategy effectiveness  
- Independence markers shown in Action

## Output
Revised Student Model facets, e.g.:
- Soft updates to strengths / challenges  
- Misconception status (active / fading / cleared)  
- Confidence / motivation patterns (trend, not brand)  
- Current state → decays with time  
- Growth narrative increments

## Reasoning
Prefer Bayesian humility: update beliefs with evidence strength.  
Never convert a single day into “this child is…”.  
Preserve space for becoming.

## Failure Modes
- Hardening labels after one session  
- Ignoring contrary evidence  
- Model stagnation (no write-back)  
- Model as gradebook

## Recovery Strategy
- Time-decay harsh inferences  
- Require repeated evidence for strong claims  
- Human-explainable model diffs for Parent Insight when relevant  
- Allow explicit “we were wrong yesterday”

## Data Updated
- Student Model (kernel state)  
- Explainability trail: what changed and why

## Long-term Effect
Creates the compound asset of the Learning OS: a mind understood across years—with dignity.

---

# Stage 8 — Learning DNA Update

## Purpose
Update the learner’s **how-I-learn patterns**: durable, revisable tendencies that improve future strategy selection.  
DNA is pattern, not destiny.

## Input
- Which scaffolds worked / failed  
- Modality / pacing preferences observed  
- Recovery patterns after struggle  
- Help-seeking style (answers vs thinking help)  
- Independence trajectory

## Output
DNA deltas such as:
- “Guided questions before examples work better this month”  
- “Short cycles beat long blocks when attention dips”  
- “Needs confidence micro-win before challenge on new units”  
- “Rising ability to choose next step”

## Reasoning
Extract strategies that transfer across topics.  
Keep DNA editable; seasons of life change learners.  
Align with Signals Describe Change, Not Identity.

## Failure Modes
- DNA as astrology (“visual learner forever”)  
- Using DNA to limit opportunity (“not suited for X”)  
- No DNA updates (tutor reinvents the wheel daily)  
- DNA pollution from noise/chat

## Recovery Strategy
- Store DNA as soft priors with expiry / revisit  
- Challenge DNA with periodic contrary trials  
- Ban opportunity-limiting language in all surfaces

## Data Updated
- Learning DNA  
- Links from DNA → future Teaching Strategy priors

## Long-term Effect
Personal pedagogy at OS scale—decades of better fit without trapping the child in a type.

---

# Stage 9 — Next Decision

## Purpose
Choose the **next responsible move** for the learner’s path: continue, adjust, switch intent, fade AI, or stop.  
This is where agency transfer is explicitly scored.

## Input
- Updated Student Model + DNA  
- Remaining Journey intent / Blueprint north  
- Readiness now  
- Independence objective  
- Parent/Teacher trust constraints (explainability, no shame)

## Output
Next Decision, one of:
- Continue current strategy (fade scaffold one notch)  
- New micro-goal today  
- Intent change (homework / review / preview / recover)  
- End for today with graceful stop  
- Increase student choice (agency up)  
- Request human help (parent/teacher) when safety/uncertainty high  

Always include **Why** (Explainability).

## Reasoning
Ask the North Star:

> Will this help the student become a more independent learner?

Prefer decisions that:
- Protect tomorrow’s willingness  
- Reduce unnecessary AI power  
- Keep Blueprint north while adapting path  
- Remain explainable to student and parent

## Failure Modes
- Maximizing steps remaining (“finish the list”)  
- Re-escalating AI control after student showed agency  
- Ignoring rest signals to chase correctness  
- Unexplained pivots that break trust

## Recovery Strategy
- Re-enter Understanding if Signals shift hard  
- Default to shorter, kinder loop  
- Publish reason for change  
- If stuck in AI-heavy mode, force a student-led micro-choice

## Data Updated
- DecisionRecord (+ why)  
- Journey pointer / open loop for tomorrow  
- Growth Analytics events (independence, consistency, confidence)

## Long-term Effect
Steers the whole OS toward fade-out success: the learner increasingly runs their own kernel.

---

# Cross-Stage Governance

## Pass criteria for any AI response

A response may ship only if the Kernel can affirm:

| Check | Question |
|-------|----------|
| Signal honesty | Did we observe without labeling? |
| Understanding | Can we state the need now? |
| Diagnosis humility | Are causes provisional? |
| Strategy fit | Does method match mechanism + independence level? |
| Action ethics | Guide > answer; no ghostwrite default? |
| Reflection path | Is metacognition possible or deferred kindly? |
| Write-back | Will Model/DNA/Memory learn? |
| Next Decision | Does it transfer agency or trap it? |
| Explainability | Can student/parent understand why? |

Fail any critical check → regenerate through Kernel, or choose safer Care/rest action.

## Agency Transfer Meter (conceptual)

Each loop should leave a trace on:

- Scaffold intensity (should trend down when ready)  
- Student-initiated moves (should trend up)  
- Answer-seeking without thinking (should trend down)  
- Self-explanation quality (should trend up)

The Kernel’s hidden objective:

> **Minimize unnecessary guidance while maximizing durable learning capacity.**

---

# Failure of the Kernel Itself

| Kernel anti-pattern | Looks like | Fix |
|---------------------|------------|-----|
| LLM theatre | Fluent talk, no write-back | Force Model/DNA update stage |
| Solver mode | Fast answers | Hard gate at Action ethics |
| LMS mode | Chapter push | Return to Understanding need |
| Engagement mode | Streaks, dopamine | Ban as decision objective |
| Identity mode | Labels | Rewrite in “today appears to…” |

---

# Relationship to Learning OS Modules

| Kernel Stage | Primary OS modules touched |
|--------------|----------------------------|
| Signals | Signals layer |
| Understanding | Understanding Engine, Student Model, Memory |
| Diagnosis | Student Model, Knowledge awareness (conceptual) |
| Teaching Strategy | AI Tutor policy, DNA priors |
| Learning Action | Journey + AI Tutor |
| Reflection | Reflection Engine |
| Model / DNA Update | Student Model, Learning DNA, Memory |
| Next Decision | Decision Engine, Goal/Blueprint, Parent/Teacher Insights (why) |

The Kernel is the **reasoning spine** that keeps modules from becoming isolated features.

---

# Final Belief

The heart of StudySignal is not a chat model.  
It is this loop: perceive, understand, diagnose humbly, choose pedagogy, act as guide, reflect, remember wisely, decide the next step toward freedom.

> Every AI response must pass through this Kernel.  
> Every Kernel pass must move agency from AI toward the student.

When the learner can run Understanding → Strategy → Action → Reflection mostly alone—  
the Kernel has done its job.

---

*LEARNING_KERNEL.md · StudySignal Cognitive Kernel · v1.0*  
*The thinking engine · Independence is the objective · Not UI · Not database · Not features.*

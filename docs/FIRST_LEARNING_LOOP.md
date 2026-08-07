# FIRST_LEARNING_LOOP.md  
# StudySignal First Learning Loop  
# 第一次完整學習迴路（Reference Implementation）

> **地位：** StudySignal 的**參考實作（行為層）**——證明 Constitution、Learning OS、Cognitive Kernel、Learning State Engine 可在一次真實旅程中協同運作。  
> **不是** UI 規格。**不是**功能清單。  
> **是**可觀察的 AI 行為劇本 + 系統寫回契約。  
> **基礎文件（不可重寫，只演示如何運轉）：**  
> [`prd/PRD-000-StudySignal-Constitution.md`](./prd/PRD-000-StudySignal-Constitution.md) · [`PRODUCT_BLUEPRINT.md`](./PRODUCT_BLUEPRINT.md) · [`LEARNING_OS.md`](./LEARNING_OS.md) · [`LEARNING_KERNEL.md`](./LEARNING_KERNEL.md) · [`LEARNING_STATE_ENGINE.md`](./LEARNING_STATE_ENGINE.md)  
> **版本：** 1.0  
> **日期：** 2026-08-07

---

## North Star (session success)

本次成功 **當且僅當** 結束時學習者擁有：

1. **Greater understanding**（真的更懂一點，可解釋／可展示）  
2. **Greater confidence**（更敢試，而非更怕）  
3. **Greater ownership**（對「下一步／如何學」有一點主權）  
4. **Less dependence on AI**（比開頭更少「直接要答案」）

若只有「聊得很開心」或「AI 很聰明」——**失敗。**

---

## Scenario Frame (first-time student)

**Who:** 一位全新學生（例：國中生，首次開啟；學科可替換——本迴路學科無關）。  
**What they bring:** 幾乎沒有歷史；可能緊張、好奇、或想「快点得到答案」。  
**What OS must prove:** 無歷史也能啟動；結束時 Model／DNA／Tomorrow／Parent Insight 都比開始更懂這個人。

**Subject-agnostic rule:** English / Math / Science / Programming 未來皆走**同一迴路**；只替換學習對象，不替換引擎順序。

---

## End-to-end spine

```text
Open
 → Initial Signals
 → Seed Student Model
 → Estimate Learning State
 → Decide today's objective
 → Tutor begins (guide, not dump)
 → Learning activity (Cognitive Flow)
 → Evidence collection
 → State transition
 → Model update
 → DNA update
 → Reflection
 → Tomorrow plan
 → Parent Insight
 → (Optional) Teacher Insight
```

Kernel path inside: Signals → Understanding → Diagnosis → Strategy → Action → Reflection → Model → DNA → Next Decision  
State Engine path: estimate → observe transitions → interrupt if Overload/Affect-Blocked.

---

# Step 1 — Student opens StudySignal

### Purpose
降低決策成本；立即傳達「你已被準備被陪伴」，不是空白聊天或問卷牆。

### Inputs
- First launch / no prior Student Model  
- Device time, locale (soft)  
- Optional parent-created shell (name, grade) if exists—else minimal

### AI reasoning
Constitution: reduce cognitive load on entry; Care before teaching.  
Do **not** open with “What do you want to learn?” as a void.  
Promise: one small successful first loop today.

### Student experience
Warm clarity: welcome by name if known; one sentence of safety; one primary action: **Start today’s short journey** (or equivalent companion language).  
No subject mall. No chat void.

### Observable evidence
Tap/start latency; skip vs engage; reading hesitation.

### Learning State changes
Prior: unknown → estimate **Ready** (low confidence) or **Affect-Blocked** if distress language appears immediately.

### Student Model changes
Create shell Model: identity basics only; `Current State = Ready?`; empty misconception map; high uncertainty flag = true.

### Learning DNA changes
None yet (insufficient pattern). Initialize empty DNA with “priors unset.”

### Decision Engine output
Decision: **Begin onboarding micro-journey** (duration short; goal = first win + first understanding sample).  
Why: first loop must collect evidence without overwhelm.

### Failure cases
Questionnaire wall; “Pick from 40 topics”; instant chatbot “Ask me anything.”

### Recovery strategy
Collapse to single CTA + one calm sentence; defer profiling.

### Validation
- Understand better? Slightly (willingness to start).  
- More independent? Not yet—by design we still lead entry.  
- Evidence: start action taken without topic paralysis.

---

# Step 2 — AI gathers initial signals

### Purpose
Perceive first-state cues before teaching. Kernel Stage: Signals.

### Inputs
- Entry behavior  
- Optional 60–90s light probe (not a test): one preference + one comfort check  
- Language: curiosity vs answer-seeking vs fear

### AI reasoning
Ask state questions, not answer questions.  
Probe design: **one** micro-prompt that reveals thinking style, e.g. “When something is hard, do you prefer a tiny hint-question or a short example first?” + “How’s your energy today: OK / a bit tired?”  
Avoid fake diagnostics from one click.

### Student experience
Feels like a coach checking in—not an exam. Max two light questions OR observational-only if they dive in.

### Observable evidence
Choice of scaffold preference; energy self-report; tone; whether they ask “just give me answers.”

### Learning State changes
Update toward **Ready / Orienting / Affect-Blocked / Recovering** with medium-low confidence.

### Student Model changes
Write soft: energy band; initial help-seeking hint; affective safety guess (provisional).

### Learning DNA changes
Seed candidate prior: “prefers question-hint vs example” (confidence very low).

### Decision Engine output
If tired/fear → bias **ease** objective. Else → short **Building** objective.

### Failure cases
Long intake quiz; psychological labeling; pretending certainty.

### Recovery strategy
Skip probes; observational Signals only; conservative short journey.

### Validation
- Understand better? Yes—energy + help style hypotheses.  
- Independence? Neutral.  
- Evidence: stored soft preferences + state estimate.

---

# Step 3 — Initial Student Model generation

### Purpose
Create a living Model that admits ignorance—not a fake full profile.

### Inputs
- Shell identity  
- Initial Signals  
- Optional parent notes (goals) if any

### AI reasoning
Model = evolving understanding. First version must scream **uncertainty**.  
Populate only: basics, current state guess, empty strengths/challenges, open goals (“discover what helps you learn”), Learning DNA unset.

### Student experience
Invisible machinery—or one transparent line: “I’ll learn how you learn as we go—I won’t pretend I already know you.”

### Observable evidence
N/A (system write). Student reaction to transparency line (trust cue).

### Learning State changes
None required.

### Student Model changes
`Model.v0` created; `uncertainty=high`; `becoming_frame=true`.

### Learning DNA changes
Structure initialized; no hard priors.

### Decision Engine output
Constraint: today objective must be **diagnostic+success**, not mastery theater.

### Failure cases
Inventing strengths/weaknesses; zodiac “learning styles.”

### Recovery strategy
Wipe unverified claims; keep only observed.

### Validation
- Understand better? Structure ready to learn—honest empty > fake full.  
- Independence? Framing “I’ll learn you” invites partnership.  
- Evidence: Model.v0 with explicit uncertainty.

---

# Step 4 — Initial Learning State estimation

### Purpose
State Engine answers: what state are we in before the first activity?

### Inputs
Signals + Model.v0

### AI reasoning
Default first-time: **Orienting** (or Ready→Orienting).  
If fear/self-insult: **Affect-Blocked**. If exhausted: **Recovering** (tiny or stop).  
State confidence low–medium; hysteresis off for first estimate.

### Student experience
No jargon shown. Experience shaped by state (gentler if blocked).

### Observable evidence
Pre-activity cues only.

### Learning State changes
Primary = Orienting (example path below assumes this). Secondary = mild novelty anxiety possible.

### Student Model changes
`Current State = Orienting (conf=0.4)`.

### Learning DNA changes
None.

### Decision Engine output
Gate: cannot choose Creating/Transferring as first objective.

### Failure cases
Assuming Independent; starting with hard challenge “to impress.”

### Recovery strategy
Force Orienting + micro-win design.

### Validation
- Understand better? Yes—state hypothesis.  
- Independence? Not yet.  
- Evidence: state record + confidence band.

---

# Step 5 — Decision Engine chooses today's objective

### Purpose
Pick **one right thing** for day one—not a curriculum dump.

### Inputs
State (Orienting); Model uncertainty high; North Star (confidence + ownership + less dependence)

### AI reasoning (example objective)
**Today’s objective:** “Together, make sense of one small idea and prove it with your own explanation—not by copying an answer.”  
Duration intent: short (e.g. 8–15 min feeling).  
Success definition: learner produces a **self-explanation** (ownership) + ends willing to continue tomorrow.  
Strategy prior: question-first if they chose hints; example-then-fade if they chose examples—then fade fast.

### Student experience
One clear goal in human language + why: “So I can learn how *you* think—and you leave knowing you can explain it.”

### Observable evidence
Acceptance / negotiation (“too long”) → Decision may shrink.

### Learning State changes
Still Orienting; preparing Building.

### Student Model changes
`Today Goal` + `Why` stored (Explainability).

### Learning DNA changes
None yet.

### Decision Engine output
`advance_gentle` + objective contract + scaffold plan + agency target: **student explains at end**.

### Failure cases
Five subjects; boss-fight difficulty; “finish 20 questions.”

### Recovery strategy
Cut to one concept atom; allow graceful shorter path.

### Validation
- Understand better? Intentional sampling plan.  
- Independence? Objective requires their explanation → ownership baked in.  
- Evidence: DecisionRecord with agency criterion.

---

# Step 6 — AI Tutor begins conversation

### Purpose
Enter Cognitive Flow without answer-dumping. Kernel: Strategy → first Action moves.

### Inputs
Objective; state Orienting; DNA candidate preference

### AI reasoning
Open with Care + Orienting prompts:
1. Name the tiny idea in plain words  
2. Ask what they already notice / guess  
3. Encourage attempt before correction  
Ban: full solution in message one.

### Student experience
Feels like a calm coach sitting beside—not a search engine. They are invited to think aloud (text/voice subject-agnostic).

### Observable evidence
Guess quality; “just tell me”; curiosity questions; freeze.

### Learning State changes
Orienting → **Building** if traction; → **Affect-Blocked** if freeze/self-insult; → **Disengaged** if one-word stalls.

### Student Model changes
Help-seeking style evidence ++; affective safety update.

### Learning DNA changes
If they respond better to questions than examples, bump that prior slightly.

### Decision Engine output
Continue / switch to Care micro-win / shorten.

### Failure cases
Tutor monologue; instant worksheet; persona entertainment with no learning object.

### Recovery strategy
Stop talk; one micro-question; or offer example-then-their-turn.

### Validation
- Understand better? Yes—thinking sample.  
- Independence? Seeded by requiring their first idea.  
- Evidence: first learner-generated thought artifact.

---

# Step 7 — Learning activity

### Purpose
Run a minimal Cognitive Flow once: Understand → Think → Explain → (light) Apply.  
Create optional; don’t force on day one if load high.

### Inputs
Tutor moves; student responses; state

### AI reasoning
Keep **one atom**. Sequence:
1. Make sense of prompt (Understand)  
2. Attempt reasoning (Think)  
3. Say it in their words (Explain)  
4. One tiny variant (Apply) — only if not Overloaded  
Guide before answer; if they demand answers, reflect need then re-ladder.

### Student experience
Short, completable, dignity-preserving. Mistakes treated as data. They feel “I said something that counts.”

### Observable evidence
Explanation completeness; variant success/fail; hint count; emotional tone.

### Learning State changes
Target path: Building → Productive Struggle → Building/Consolidating.  
Watchdogs: Overloaded / Stuck / Misconception-Led / Affect-Blocked.

### Student Model changes
First misconception hypothesis OR first strength note (soft).

### Learning DNA changes
Which scaffold produced progress.

### Decision Engine output
Allow Apply step only if state healthy; else skip to Reflection early (success still possible).

### Failure cases
Multi-step homework completion; passive video+quiz; AI writes their explanation.

### Recovery strategy
Drop Apply; keep Explain as the victory condition.

### Validation
- Understand better? Rich.  
- Independence? Explain step is the ownership proof.  
- Evidence: learner explanation artifact + optional apply result.

---

# Step 8 — Evidence collection

### Purpose
Pack evidence for State/Model/DNA—learning-happening detectors on.

### Inputs
All artifacts from Steps 6–7

### AI reasoning
Score conceptually (not gamification):
- Explanation quality delta  
- Strategy change when stuck  
- Answer-seeking frequency trend  
- Transfer/apply attempt  
- Affect landing  

Decide: learning likely happening? (State Engine positive detectors)

### Student experience
Mostly invisible; may hear “I’m noticing how you explain—this helps me teach you better.”

### Observable evidence
The packed Evidence Bundle.

### Learning State changes
Confidence in state classification ↑ if cues agree.

### Student Model changes
Evidence attached to provisional claims.

### Learning DNA changes
Evidence attached to scaffold effectiveness.

### Decision Engine output
If weak ownership evidence → one more explain prompt before close (if energy OK).

### Failure cases
Only counting correctness; ignoring affect; storing full chat as “memory.”

### Recovery strategy
Selective Memory candidates: explanation + what helped; discard noise.

### Validation
- Understand better? Yes—structured evidence.  
- Independence? Measured via explain/agency metrics.  
- Evidence: Evidence Bundle exists.

---

# Step 9 — Learning State transition

### Purpose
Commit primary state trajectory for the session endgame.

### Inputs
Evidence Bundle; hysteresis window

### AI reasoning
Example healthy close: **Reflecting** (after Building).  
If collapse: **Recovering**.  
If rising agency: shade of **Independent** (early, low confidence—OK).

### Student experience
Tone shifts to closure/metacognition—not another boss level.

### Observable evidence
Acceptance of reflection moment.

### Learning State changes
Primary → Reflecting (example). Session path logged.

### Student Model changes
`Current State` updated; session path summary.

### Learning DNA changes
Transition pattern note: e.g. Orienting→Building worked with question-first.

### Decision Engine output
Authorize Reflection + Tomorrow planning; block new heavy content.

### Failure cases
Forcing more practice after Reflecting cues; ignoring Affect-Blocked.

### Recovery strategy
Immediate Recovering path; shorten Reflection to one choice question.

### Validation
- Understand better? Yes—trajectory known.  
- Independence? Reflecting builds self-kernel.  
- Evidence: state path log.

---

# Step 10 — Student Model update

### Purpose
End with a Model clearly richer than Model.v0—humble but real.

### Inputs
Evidence; state path; diagnosis soft results

### AI reasoning
Write only supported deltas:
- Strength: “Can produce partial self-explanation when prompted”  
- Challenge: “Tends to request final answers when uncertain” (behavior, not character)  
- Misconception: provisional if any  
- Confidence: slight ↑ if micro-win landed  
- Uncertainty ↓ from “total stranger” to “first sketch”

### Student experience
Optional transparency: “Here’s what I learned about how you learn today…” (3 bullets max, becoming language).

### Observable evidence
Student agrees/corrects the sketch → Model improves further.

### Learning State changes
None required.

### Student Model changes
`Model.v1` committed; version diff stored for Explainability.

### Learning DNA changes
Deferred to Step 11 (can be same write transaction conceptually).

### Decision Engine output
Tomorrow must respect Model.v1 (not reset to stranger).

### Failure cases
Over-claim mastery; identity insults; freezing DNA types.

### Recovery strategy
Student correction overwrites; keep soft confidences.

### Validation
- Understand better? **Required yes**—Model.v1 > v0.  
- Independence? Framing challenges answer-seeking without shame.  
- Evidence: diff list + optional student confirmation.

---

# Step 11 — Learning DNA update

### Purpose
Store first revisable “how you learn” prior—not astrology.

### Inputs
Scaffold A vs B outcome; pacing; recovery needs

### AI reasoning
Example DNA.v0.1:
- Question-prompts produced more thinking than examples (if true)  
- Short loop tolerated; long monologue ignored  
- Needs encouragement before second attempt  

All tagged `prior_strength=low`, `revisit_soon=true`.

### Student experience
Invisible or one line: “I’ll try more question-hints tomorrow since that seemed to help.”

### Observable evidence
N/A

### Learning State changes
None.

### Student Model changes
Link to DNA.v0.1

### Learning DNA changes
DNA.v0.1 saved.

### Decision Engine output
Tomorrow strategy prior ← DNA.v0.1

### Failure cases
“You are a visual learner forever.”

### Recovery strategy
Delete hard labels; keep experimental priors only.

### Validation
- Understand better? Yes—actionable pedagogy prior.  
- Independence? DNA should enable faster fade later, not tighter control.  
- Evidence: DNA entries with low prior strength.

---

# Step 12 — Reflection generation

### Purpose
Metacognition + ownership. Learner practices running their own kernel.

### Inputs
State Reflecting; artifacts; Model.v1

### AI reasoning
**Max two prompts**, prefer choice + one short free response:
1. “Which is truer: I can explain a bit more than before / I still feel lost but I tried / I want a break?”  
2. “What helped more: questions or example?”  

AI summarizes in their words—does not invent fake insight.

### Student experience
Feels quick, respectful, useful—not a diary essay.

### Observable evidence
Reflection choice + optional sentence.

### Learning State changes
Reflecting → Ready/Recovering for exit.

### Student Model changes
Motivation/confidence soft update from reflection.

### Learning DNA changes
Confirm scaffold preference if they answer Q2.

### Decision Engine output
Close content; open Tomorrow + Parent Insight generation.

### Failure cases
Long forced journal; AI-written reflection spoken as theirs.

### Recovery strategy
Single emoji/choice reflection; still counts.

### Validation
- Understand better? Yes.  
- Independence? **Critical yes**—they evaluate their learning.  
- Evidence: reflection artifact.

---

# Step 13 — Tomorrow planning

### Purpose
Continuity without stranger-reset; Next Decision stage.

### Inputs
Model.v1; DNA.v0.1; open loops; energy

### AI reasoning
Plan **one** tomorrow objective tied to today:
- If explanation weak → rebuild same atom with fade  
- If explanation strong → tiny transfer probe  
- If affect fragile → confidence micro-win first  
Include Why; allow student to pick between two OK options (**ownership**).

### Student experience
“Tomorrow I suggest A or B—which do you prefer?” (two constrained choices beats void).

### Observable evidence
Their choice = agency marker.

### Learning State changes
Exit state logged.

### Student Model changes
`Tomorrow Plan` + student choice stored.

### Learning DNA changes
Choice pattern noted.

### Decision Engine output
`Next Decision = {plan, why, student_choice}` ready for next open.

### Failure cases
Tomorrow = 10 topics; no student choice; punishment for unfinished.

### Recovery strategy
Default shortest plan; no guilt language.

### Validation
- Understand better? Plan depends on today—proof of memory.  
- Independence? **Choice = ownership.**  
- Evidence: selected tomorrow option.

---

# Step 14 — Parent Insight generation

### Purpose
Peace of mind + explainability—not surveillance.

### Inputs
Decision why; state path; Model diff; reflection; tomorrow plan

### AI reasoning
Parent message (concept):
- What we did (one idea)  
- What we saw (Signals/state in human words)  
- Why we chose this (Decision)  
- Growth: explanation attempt / confidence landing  
- Tomorrow direction  
- How parent can gently support (optional one tip)  
Ban: ranks, shame, raw chat dump, “your child is bad at X.”

### Student experience
Usually not shown; trust that home won’t become a courtroom.

### Observable evidence
Parent opens/understands (future metric); for v1, completeness of explain chain.

### Learning State changes
None.

### Student Model / DNA
No punitive writes from parent channel.

### Decision Engine output
Insight packaged; consistent with student-facing story.

### Failure cases
Score dashboard; comparison to classmates; alarming tone.

### Recovery strategy
Rewrite to Care language; remove labels.

### Validation
- Understand better (family system)? Parent can restate why.  
- Independence? Parent tip must not replace student thinking.  
- Evidence: Insight passes Explainability checklist.

---

# Step 15 — Teacher Insight generation (optional)

### Purpose
Respectful visibility for teachers when context exists; never replace teacher.

### Inputs
Same educational facts; school-safe subset

### AI reasoning
Share: focus concept; misconception hypothesis (soft); what scaffold helped; independence note.  
Omit family private affect details unless necessary/safe.  
Tone: colleague brief, not AI replacing pedagogy.

### Student experience
Invisible unless school product surface exists.

### Observable evidence
N/A for first consumer loop; keep schema-ready.

### Model/DNA
No extra labeling.

### Decision Engine output
Optional channel; default off on pure family first launch.

### Failure cases
Teacher surveillance packet; automated grading theater.

### Recovery strategy
Disable channel; family-only Insight.

### Validation
- Understand better? Only if teacher partnership real.  
- Independence? Teacher Insight must not increase homework-as-punishment.  
- Evidence: optional, privacy-preserving summary.

---

# End-of-Loop Acceptance Checklist

| Criterion | Proof in this loop |
|-----------|--------------------|
| AI understands learner better | Model.v0 → v1 + DNA.v0.1 + state path |
| Learner more independent | Produced explanation; chose tomorrow option; less pure answer-demand if trend improves |
| Greater understanding | Explain/apply artifact |
| Greater confidence | Affect landing / reflection choice |
| Greater ownership | Explanation + tomorrow choice |
| Less AI dependence | Guide>answer held; student thought first |
| Parent trust path | Insight explain chain |
| Tomorrow intelligibility | Next Decision ready |

If any critical proof missing → session incomplete; recover with one missing piece if energy allows, else honest defer.

---

# Critical Review (challenge our own design)

## 1. Unnecessary complexity — FOUND & REDESIGNED

**Risk:** 15 steps feel like a heavyweight ceremony for minute one.  
**Redesign:** Internally 15 stages may collapse into **4 student-facing moments** only:

1. Open + tiny check-in  
2. One learning atom (think → explain)  
3. One reflection choice + tomorrow A/B  
4. Parent insight (async)

OS stages still run; **student-visible surface stays small.** Lifelong learning > impressive pipeline theater.

## 2. Missing educational evidence — FOUND & REDESIGNED

**Risk:** “Understanding” claimed without transfer.  
**Redesign:** Day-one success = **self-explanation** mandatory; Apply is optional.  
Day-two default includes a **tiny transfer probe** when day-one explanation was strong—so we don’t crown false fluency on day one.

## 3. Unnatural AI behaviors — FOUND & REDESIGNED

**Risk:** Narrating Model/DNA jargon; over-transparent “I’m updating your Learning DNA.”  
**Redesign:** Student hears human coach language only. System terms stay under the hood. At most one plain sentence: “I’ll remember what helped you.”

## 4. Passive could become passive — FOUND & REDESIGNED

**Risk:** Tutor over-explains; student nods.  
**Redesign:** Hard rule—**student generates first idea before any example**; example only if freeze; AI never writes their final explanation.

## 5. Student relies too much on AI — FOUND & REDESIGNED

**Risk:** Delightful coach becomes crutch.  
**Redesign:** Agency targets baked into Decision: (a) their explanation, (b) tomorrow A/B choice, (c) if they say “just give answer,” AI uses a **2-step think ladder** then fades—never rewards answer-demand with full dump. Independence meter checked at close.

## 6. Optimize for impressive AI — REJECTED

No multi-agent spectacle, no fake deep psych profile on minute five.  
**Optimize for lifelong learning:** short loop, real explanation, honest Model sketch, kinder tomorrow.

---

# Subject Reuse Contract

Future subjects must reuse this loop:

| Keep fixed | Swap per subject |
|------------|------------------|
| Steps 1–15 order & contracts | Concept atom content |
| State/Kernel/OS write-backs | Domain misconception library |
| Agency success criteria | Worked examples / probes |
| Parent Insight ethics | Domain vocabulary |

If a subject design needs “skip explanation” or “AI solves homework,” it **violates** this reference implementation.

---

## Final Belief

The first session is not a demo of how smart the model is.  
It is the first proof that StudySignal can **meet a stranger, leave with a sketch of a learner, and return tomorrow wiser—while the student leaves more able to think without us.**

> Same loop. Every subject.  
> Philosophy made observable.  
> Independence or it doesn’t count.

---

*FIRST_LEARNING_LOOP.md · v1.0*  
*Reference implementation of StudySignal behavior · Foundations immutable · Optimize for lifelong learning.*

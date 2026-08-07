# LEARNING_STATE_ENGINE.md  
# StudySignal Learning State Engine  
# 學習狀態引擎

> **地位：** 判斷學習者**當前認知／學習狀態**的引擎——所有 AI Tutor 決策的地基。  
> **AI 永不先問：**「答案是什麼？」  
> **AI 永遠先問：**「學習者現在處於什麼狀態？」  
> **本文件定義：** StudySignal 如何知道**學習是否真的正在發生。**  
> **服從：** [`LEARNING_KERNEL.md`](./LEARNING_KERNEL.md) · [`LEARNING_OS.md`](./LEARNING_OS.md) · [`PRD-000`](./prd/PRD-000-StudySignal-Constitution.md) · [`AGENT.md`](./AGENT.md)  
> **版本：** 1.0  
> **日期：** 2026-08-07  
> **性質：** 認知狀態系統 — 非 UI、非資料庫實作、非題庫規格  
> **North Star：** 每個狀態判斷都服務於把學習主導權逐漸交還給學生。

---

## Core Question

```text
What is the learner's current state?
        ↓
Is learning actually happening?
        ↓
What intervention protects growth + independence?
```

正確率可以是**證據之一**。  
正確率**不是**狀態本身。  
「做很多題」可以毫無學習；「暫時答錯」可以正在深度建構。

---

## Design Order

```text
State Taxonomy
  → Transitions
  → Observable Evidence
  → Confidence Calculation
  → Failure Detection
  → Recovery Strategies
  → Update Rules
  → Student Model Integration
  → Learning DNA Impact
  → Decision Engine Interaction
```

---

# 1. Learning State Taxonomy

States are **temporary**, **observable**, **revisable**.  
Language: *Today / right now the learner appears to be in…*  
Never: *This learner is (forever)…*

## 1.1 Primary States

| ID | State | One-line meaning |
|----|-------|------------------|
| S0 | **Ready** | Available to engage; low threat; can start |
| S1 | **Orienting** | Activating priors; figuring out the problem space |
| S2 | **Building** | Constructing new understanding with traction |
| S3 | **Productive Struggle** | Effortful, desirable difficulty; learning in motion |
| S4 | **Unproductive Stuck** | Looping without new insight; learning stalled |
| S5 | **Misconception-Led** | Stable wrong model driving answers |
| S6 | **Consolidating** | Strengthening what is already roughly known |
| S7 | **Transferring** | Applying understanding to a new context |
| S8 | **Creating** | Generating explanation/solution/artifact of own |
| S9 | **Overloaded** | Cognitive load exceeds capacity |
| S10 | **Affect-Blocked** | Emotion/confidence blocks cognition |
| S11 | **Independent** | Learner leads; AI scaffold minimally needed |
| S12 | **Disengaged** | Attention/motivation not on the learning object |
| S13 | **Reflecting** | Metacognitive processing of how/what was learned |
| S14 | **Recovering** | Rest/repair; not a push-learning state |

## 1.2 Composite reading (allowed)

The Engine may hold:
- **Primary state** (dominant)
- **Secondary shade** (e.g., Building + rising fatigue)
- **Confidence** in the classification (0–1 conceptual)

Never average a child into a single life label.

---

# 2. State Transitions

## 2.1 Legal transition map (conceptual)

```text
Recovering / Ready
    → Orienting → Building ⇄ Productive Struggle
                      ↓              ↓
              Misconception-Led   Unproductive Stuck
                      ↓              ↓
                 (repair)        (unstick)
                      ↓              ↓
                 Building / Consolidating
                      → Transferring → Creating
                      → Reflecting → Ready / Independent

Any active learning state
    → Overloaded or Affect-Blocked or Disengaged
         → Recovering → Ready (re-entry)

Independent
    → (self) Orienting/Building/... with thin AI
    → Reflecting
```

## 2.2 Transition principles

| Principle | Meaning |
|-----------|---------|
| **Evidence before jump** | Need observable support to change primary state |
| **Hysteresis** | Don’t thrash states every utterance; require sustained cues |
| **Safety override** | Affect-Blocked / Overloaded can interrupt any push state |
| **Independence bias** | When evidence ties, prefer states that grant more learner agency |
| **No shame transitions** | Moving to Stuck/Recovering is diagnosis, not failure identity |

## 2.3 Forbidden transitions

- Ready → Creating with no Orienting/Building evidence (fantasy mastery)  
- Unproductive Stuck → Creating by giving answers (fake progress)  
- Affect-Blocked → Productive Struggle by pressure (harm)  
- Any state → identity branding in Student Model

---

# 3. Observable Evidence

Evidence classes the Engine may use (conceptual sensors):

| Class | Examples |
|-------|----------|
| **Verbal** | “I don’t get it”, partial explanation, answer-seeking vs think-seeking |
| **Behavioral** | Retry, abandon, rapid guess, slow deliberation, hint request rate |
| **Performance pattern** | Same error type repeating; success only on isomorphic items; transfer fail/success |
| **Affective** | Withdrawal, self-insult, brightening after micro-win, curiosity questions |
| **Metacognitive** | Can name what is confusing; can choose next strategy |
| **Load** | Fragmented answers, forgotten instructions mid-step, rising latency + collapse |
| **Agency** | Proposes next step; refuses spoon-feeding; self-checks |

**Correctness is one feature in Performance pattern—never the sole voter.**

---

# 4. Confidence Calculation

## 4.1 What “confidence” means here

**State confidence** = how sure the Engine is that the **primary state label** fits *now*.  
Not the learner’s self-confidence (that is a Signal / Model facet).

## 4.2 Conceptual formula (not code)

```text
StateConfidence =
  evidence_agreement
  × evidence_recency_weight
  × (1 − contradiction_penalty)
  × stability_bonus
```

| Factor | Idea |
|--------|------|
| **evidence_agreement** | Multiple independent cues point to same state |
| **recency_weight** | Newer evidence counts more; state is temporary |
| **contradiction_penalty** | Mixed cues (e.g., smiles but rapid guessing) lower confidence |
| **stability_bonus** | Same state sustained across a short window increases confidence |

## 4.3 Policy by confidence band

| Band | Kernel behavior |
|------|-----------------|
| High | Act on state; still keep diagnoses provisional |
| Medium | Prefer safer intervention; run a discriminating micro-probe |
| Low | Ask/observe one clarifying move; default Care-conservatism |

**Humility rule:** Low state-confidence → never high-certainty teaching claims.

---

# 5. Failure Detection

“Failure” here = **learning not happening**, or **harm path**, not “wrong answer.”

## 5.1 Failure detectors

| Detector | Suggests |
|----------|----------|
| **Looping errors** | Unproductive Stuck or Misconception-Led |
| **Hint addiction** | Disengaged thinking / dependency risk |
| **Speed + shallow success** | Consolidating illusion; weak Transfer |
| **Collapse after challenge** | Overloaded or Affect-Blocked |
| **Self-contempt language** | Affect-Blocked (interrupt) |
| **No Model write-back opportunity** | Interaction is chat noise, not learning |
| **Agency decline across loops** | Over-scaffolding failure of the OS |

## 5.2 Learning-happening detectors (positive)

| Detector | Suggests |
|----------|----------|
| Better self-explanation | Building / Transferring |
| Error → revised reasoning | Productive Struggle |
| Spontaneous strategy try | Independent rising |
| Transfer item success after struggle | Real learning |
| Reflection names process | Reflecting |

---

# 6. Recovery Strategies

Global recoveries when learning is not happening:

| Situation | Recovery |
|-----------|----------|
| Unproductive Stuck | Shrink problem; change representation; misconception probe; or pause |
| Misconception-Led | Confront gently with counter-example; rebuild concept; don’t add random volume |
| Overloaded | Cut scope; one step; Recovering |
| Affect-Blocked | Care first; micro-win; no rank/shame; possibly stop |
| Disengaged | Re-orient purpose; shorter loop; or allow exit without punishment |
| Fake fluency | Force explain/transfer check before advancing |
| Dependency | Fade hints; force Think step; increase learner choice |

Recovery must still update Signals/Model—recovery is learning data too.

---

# 7. State Update Rules

## 7.1 Update cadence

- **Micro-update:** after each meaningful Learning Action turn  
- **Stabilize:** primary state changes only if evidence persists (hysteresis)  
- **Force interrupt:** Affect-Blocked / Overloaded may cut in immediately  

## 7.2 Update rules (normative)

1. New evidence revises state; silence decays confidence (state is temporary).  
2. Single item correctness cannot alone promote Transferring/Creating.  
3. Student self-report matters but can be biased—triangulate.  
4. Rest/Recovering is a first-class state, not “missing data.”  
5. Write state in change language for all downstream modules.  
6. If intervention changes behavior, allow fast reclassification.  
7. Never persist primary state as Student Model identity.

## 7.3 Conflict resolution

| Conflict | Win condition |
|----------|---------------|
| Journey plan vs state | **State wins** |
| Parent preference for intensity vs Affect-Blocked | **Learner safety wins** |
| High score streak vs failed transfer probe | **Transfer probe wins** (demote false fluency) |

---

# 8. Student Model Integration

| State Engine output | Student Model write |
|---------------------|---------------------|
| Primary + secondary state | Current State (time-scoped, decaying) |
| State confidence | Uncertainty honesty for Explainability |
| Recurrent Stuck/Misconception patterns | Challenges / misconception map (soft) |
| Recurrent Independent / Transfer success | Strengths / growth narrative |
| Affect-Blocked frequency trends | Confidence pattern (careful, non-labeling) |
| Recovery what worked | Preferences / strategy effectiveness |

**Integration law:** State Engine describes *now*; Student Model accumulates *becoming*.  
Repeated states may inform Model; one spike must not brand the child.

---

# 9. Learning DNA Impact

Learning DNA stores **how this learner moves between states**, not a zodiac type.

| DNA pattern examples | Future effect |
|----------------------|---------------|
| Enters Productive Struggle quickly after Orienting | Allow earlier challenge |
| Collapses to Affect-Blocked when corrected harshly | Softer feedback DNA prior |
| Needs Consolidating before Transferring | Sequence strategies accordingly |
| Reaches Independent after explain-back ritual | Prefer explain-back as fade tool |
| Overloads when steps > N | Default shorter Journey slices |

DNA updates when state-transition patterns stabilize across days—always revisable.

---

# 10. Decision Engine Interaction

Decision Engine **consumes** Learning State; it does not invent tasks first.

```text
Learning State Engine
    → primary state + confidence + failure flags
        → Decision Engine
            → advance / ease / rest
            → Teaching Strategy priors
            → Journey step sizing
            → AI Tutor move permissions
```

| Primary state | Decision bias |
|---------------|---------------|
| Ready / Orienting | Start gentle cognitive flow |
| Building / Productive Struggle | Continue; protect struggle; don’t steal thinking |
| Unproductive Stuck | Unstick or shrink; don’t add volume |
| Misconception-Led | Targeted repair strategy |
| Consolidating | Practice with checks against fake fluency |
| Transferring / Creating | Raise agency; thinner scaffolds |
| Overloaded / Affect-Blocked / Recovering | Ease or rest; Care first |
| Independent | Fade AI; offer choice |
| Disengaged | Re-purpose or allow stop |
| Reflecting | Don’t rush next content |

**Hard gate:** AI Tutor may not dump answers while state ∈ {Building, Productive Struggle, Transferring, Creating, Independent} unless ethics/safety exception—and even then, prefer guided reveal.

---

# Per-State Specifications

For each state: Purpose · Observable behaviors · Typical misconceptions *(about learning in this state)* · Evidence required · Confidence update · Possible interventions · Next recommended state · Long-term effect

---

## S0 — Ready

**Purpose:** Mark availability to begin without threat.  
**Observable behaviors:** Calm start, accepts next step, low self-insult, follows brief orientation.  
**Typical misconceptions:** “Ready means already knows” / “Not ready means lazy.”  
**Evidence required:** Low threat cues + willingness cue + absence of overload/affect block.  
**Confidence update:** ↑ with stable start; ↓ if immediate collapse on first step.  
**Possible interventions:** Set clear tiny goal; explain why today; begin Orienting.  
**Next recommended state:** Orienting (default), or Recovering if readiness was misread.  
**Long-term effect:** Protects sustainable rhythm; teaches safe entry into learning.

---

## S1 — Orienting

**Purpose:** Activate priors; frame the problem space.  
**Observable behaviors:** Restates problem partially; asks what is being asked; recalls related idea.  
**Typical misconceptions:** Skipping orientation saves time (usually costs understanding).  
**Evidence required:** Sense-making talk or behaviors before solution rush.  
**Confidence update:** ↑ when learner can restate goal; ↓ if pure guessing begins.  
**Possible interventions:** Goal paraphrase; prior-knowledge prompts; vocabulary anchors.  
**Next recommended state:** Building or Productive Struggle; Affect-Blocked if fear appears.  
**Long-term effect:** Strengthens metacognitive “what am I solving?” habit.

---

## S2 — Building

**Purpose:** Construct new understanding with visible traction.  
**Observable behaviors:** Partial correct reasoning; refining explanations; fewer random guesses.  
**Typical misconceptions:** Only full correctness counts as building (partial models matter).  
**Evidence required:** Improving explanation quality OR error becoming more principled.  
**Confidence update:** ↑ with successive refinement; ↓ if refinement stalls → Stuck.  
**Possible interventions:** Scaffolded questions; examples with fading; encourage explain-back.  
**Next recommended state:** Productive Struggle, Consolidating, or Transferring probe.  
**Long-term effect:** Real knowledge growth; Model misconception map improves.

---

## S3 — Productive Struggle

**Purpose:** Hold desirable difficulty where effort produces learning.  
**Observable behaviors:** Persistent tries; strategy changes; “wait—maybe…” revisions; frustration without collapse.  
**Typical misconceptions:** Struggle = failure; AI should remove all struggle.  
**Evidence required:** Effort + some progress signal (better reason, narrower error).  
**Confidence update:** ↑ while progress tokens appear; flip to Stuck if loop with zero insight.  
**Possible interventions:** Protect thinking time; light hints as questions; do **not** steal the answer.  
**Next recommended state:** Building / Consolidating after breakthrough; Stuck if no insight.  
**Long-term effect:** Builds resilience and independent problem-solving identity (becoming).

---

## S4 — Unproductive Stuck

**Purpose:** Detect learning stall so we stop digging the same hole.  
**Observable behaviors:** Same wrong approach repeated; blank looping; escalating answer demands.  
**Typical misconceptions:** More items will unstick (often worsens).  
**Evidence required:** Repeated attempts with no strategy change + no explanation growth.  
**Confidence update:** ↑ after N near-identical failures; ↓ if sudden strategy shift appears.  
**Possible interventions:** Representational change; smaller subgoal; misconception check; break.  
**Next recommended state:** Orienting (reframe), Misconception-Led (if pattern), or Recovering.  
**Long-term effect:** Teaches adaptive help-seeking and strategy switching—not helplessness.

---

## S5 — Misconception-Led

**Purpose:** Recognize a stable wrong model driving performance.  
**Observable behaviors:** Confident wrong answers; consistent error signature across items.  
**Typical misconceptions:** “Just practice more” will fix a wrong model (it often entrenches).  
**Evidence required:** Same explanatory error across ≥2 contexts OR explicit wrong rule stated.  
**Confidence update:** ↑ with cross-item consistency; ↓ if error diversity rises (maybe Stuck instead).  
**Possible interventions:** Counter-example; contrast cases; rebuild concept; guided conflict.  
**Next recommended state:** Building (repair), then Consolidating; Reflecting on the old model.  
**Long-term effect:** Clears durable barriers; major Student Model misconception updates.

---

## S6 — Consolidating

**Purpose:** Strengthen emerging understanding toward stability.  
**Observable behaviors:** Success on familiar forms; faster accurate explain; fewer hints.  
**Typical misconceptions:** Consolidation = endless drills; high speed = deep mastery.  
**Evidence required:** Accuracy + adequate explanation on known type; not only click-correct.  
**Confidence update:** ↑ with explain-success; ↓ if transfer probe fails (false fluency).  
**Possible interventions:** Spaced retrieval; varied isomorphic practice; explain-back checks.  
**Next recommended state:** Transferring probe; Independent micro-choice; Reflecting.  
**Long-term effect:** Retention and fluency without sacrificing understanding.

---

## S7 — Transferring

**Purpose:** Verify understanding moves to new contexts.  
**Observable behaviors:** Maps old idea to new problem; adapts method; justified analogy.  
**Typical misconceptions:** One correct transfer = permanent mastery.  
**Evidence required:** Success or high-quality attempt on near/far variant + reasoning.  
**Confidence update:** ↑ with reasoned transfer; ↓ with memorized template mismatch.  
**Possible interventions:** Varied contexts; “what changes / what stays?” prompts.  
**Next recommended state:** Creating, Consolidating (if shaky), Independent.  
**Long-term effect:** True learning signal; strongest growth evidence for parents/teachers.

---

## S8 — Creating

**Purpose:** Learner generates novel explanation, solution path, or artifact.  
**Observable behaviors:** Own examples; teaching-back; novel combination of ideas.  
**Typical misconceptions:** Creating is only for “gifted” days; skip if not advanced track.  
**Evidence required:** Production beyond recognition/selection tasks.  
**Confidence update:** ↑ when creation includes correct constraints; ↓ if pure fluff with no structure.  
**Possible interventions:** Invite teach-back; invent a problem; compare two methods.  
**Next recommended state:** Reflecting; Independent; Consolidating gaps found in creation.  
**Long-term effect:** Peak agency practice; DNA learns creation as available mode.

---

## S9 — Overloaded

**Purpose:** Protect working memory; stop false “more teaching.”  
**Observable behaviors:** Drops instructions; fragmented speech; meltdown pace; many simultaneous demands.  
**Typical misconceptions:** Pushing through overload builds grit (often builds avoidance).  
**Evidence required:** Load cues across behavior + performance fragmentation.  
**Confidence update:** ↑ with multiple load cues; interrupt other states.  
**Possible interventions:** Cut to one step; externalize notes; shorten Journey; Recovering.  
**Next recommended state:** Recovering → Ready; never jump to Creating.  
**Long-term effect:** Teaches sustainable intensity; Decision Engine learns load limits (DNA).

---

## S10 — Affect-Blocked

**Purpose:** Recognize emotion/confidence as the bottleneck.  
**Observable behaviors:** “I’m stupid”; freeze; refusal; tears/anger; panic guessing.  
**Typical misconceptions:** Affect is off-topic; only content tutoring matters.  
**Evidence required:** Affective language/behavior dominating task engagement.  
**Confidence update:** High priority interrupt when contempt/fear present.  
**Possible interventions:** Care first; validate; micro-win; reduce threat; possibly stop.  
**Next recommended state:** Recovering / Ready; then Orienting with tiny goal.  
**Long-term effect:** Protects trust and confidence pattern; enables future cognition.

---

## S11 — Independent

**Purpose:** Detect learner-led cognition; AI should fade.  
**Observable behaviors:** Chooses next step; self-checks; asks thinking questions not answers.  
**Typical misconceptions:** Independent means AI silent forever / never needs help.  
**Evidence required:** Learner initiative + adequate strategy without heavy scaffold.  
**Confidence update:** ↑ with repeated agency; ↓ if sudden dependency relapse.  
**Possible interventions:** Offer choices; coach as advisor; celebrate process; thin hints.  
**Next recommended state:** Self-chosen Building/Transfer/Create; Reflecting.  
**Long-term effect:** Directly realizes North Star—AI becomes less necessary.

---

## S12 — Disengaged

**Purpose:** Detect attention/motivation not on the learning object.  
**Observable behaviors:** Off-topic chatter; minimal responses; click-through; delay without thinking signs.  
**Typical misconceptions:** Always punish disengagement; always entertain (engagement optimization).  
**Evidence required:** Persistent non-learning attention pattern.  
**Confidence update:** ↑ if continues after re-orient; consider overload/affect differentials.  
**Possible interventions:** Reconnect purpose; shorten; change modality; allow graceful stop.  
**Next recommended state:** Orienting (if re-hooked), Recovering, or end-of-day Decision.  
**Long-term effect:** Protects relationship; avoids engagement-addiction product drift.

---

## S13 — Reflecting

**Purpose:** Metacognitive integration—“what/how I learned.”  
**Observable behaviors:** Names strategy; compares before/after; plans next time.  
**Typical misconceptions:** Reflection wastes time vs more items.  
**Evidence required:** Learner articulates process or selects accurate reflection choice.  
**Confidence update:** ↑ with specific (not vague) reflection.  
**Possible interventions:** One strong prompt; keep short; store growth Memory.  
**Next recommended state:** Ready / Independent; feed Next Decision.  
**Long-term effect:** Learner begins to run their own inner kernel.

---

## S14 — Recovering

**Purpose:** Legitimate non-push state for rest/repair.  
**Observable behaviors:** Accepted stop; calmer affect; reduced task demand.  
**Typical misconceptions:** Recovery = laziness or product failure.  
**Evidence required:** Prior overload/affect/disengage OR explicit rest Decision.  
**Confidence update:** Stable while protecting; re-assess before re-entry.  
**Possible interventions:** Validate; tiny optional warm-up later; Parent Insight: reassure.  
**Next recommended state:** Ready when cues allow; never force Productive Struggle.  
**Long-term effect:** Consistency > intensity; tomorrow still possible.

---

# How StudySignal Knows Learning Is Happening

Learning is **likely happening** when state ∈  
{Orienting, Building, Productive Struggle, Consolidating*(with explain)*, Transferring, Creating, Reflecting, Independent}  
**and** positive detectors fire (explanation growth, strategy change, transfer, agency).

Learning is **likely not happening** when state ∈  
{Unproductive Stuck, Misconception-Led*(untreated)*, Overloaded, Affect-Blocked, Disengaged}  
**or** fake fluency (fast correct without explain/transfer).

**Correct answers alone never certify learning.**  
State + evidence + transfer/explain checks do.

---

# Explainability Contract

When asked “Why this activity?”, the system can say:

> We believe you are in **[state]** because **[evidence]**.  
> Confidence is **[band]**.  
> So we chose **[intervention]** to help you toward **[next state / independence]**.

Parent version: peace-of-mind language, no shame labels.

---

# Final Belief

The Learning State Engine exists so StudySignal never confuses motion with learning, or answers with understanding.

> First ask what state the learner is in.  
> Then decide how to accompany.  
> Always aim for the next state that returns agency to the student.

When the Engine can tell Building from Stuck, Struggle from Overload, Fluency from Transfer—  
the Tutor finally knows whether learning is actually happening.

---

*LEARNING_STATE_ENGINE.md · v1.0*  
*State before answers · Learning before correctness · Independence as destination.*

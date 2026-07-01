# 🧭 HOW TO USE — Four-Agent Dev Workflow

## Philosophy

This workflow is built on one core principle:

> **You are always in control — not the AI.**

This isn't about automation vs. manual. It's about who holds the wheel.

Every code change must pass through explicit approval. No agent is allowed to assume, improvise, or continue without a clear signal from you. The result: no silent corruption, no surprises in production.

Battle-tested for building production-grade systems at high complexity — as a **solo developer**.

---

## What This Is Not

- ❌ Not a CI/CD replacement
- ❌ Not an automated testing framework
- ❌ Not an agentic loop that runs unsupervised
- ❌ Not a shortcut — it's a discipline

This workflow trades speed for control. If you want fully automated pipelines, this isn't it. If you want to know exactly what changed and why — this is exactly it.

---

## Four Agents, One Flow

```
[ PLANNER ] → prd.md → [ EXECUTOR ] → "Ready for QA" → [ QA ] → PASS → [ SKILL EXTRACTOR ]
      ↑                       ↑                              ↑                    ↑
  you approve             you trigger                  you decide           you trigger
  the spec first          execution                    ship or revise       on-demand
```

| Agent | File | Role |
|---|---|---|
| 🧠 Planner | `planner.md` | Architect — writes the spec, never writes code |
| ⚙️ Executor | `executor.md` | Implementor — follows the spec, never improvises |
| 🔍 QA | `qa.md` | Verifier — checks output vs spec, never assumes |
| 📚 Skill Extractor | `skill-extractor.md` | Documentarian — distills patterns into reusable skill files |

---

## How to Use

### 1. Start with the Planner
Use this when you have a new feature, bug fix, or refactor that doesn't have a spec yet.

**Trigger phrases:**
- "plan this feature"
- "make a spec for..."
- "create an implementation plan"

The Planner will ask clarifying questions before writing anything — **do not skip this phase**. An ambiguous spec costs more than the time spent clarifying upfront.

Output: a `prd.md` containing scope, files to touch, implementation steps, breaking changes assessment, and a Definition of Done.

> ⚠️ **You must review and approve `prd.md` before moving to the Executor.**

---

### 2. Hand off to the Executor
Use this when `prd.md` exists and has been approved by you.

**Trigger phrases:**
- "execute the plan"
- "implement this spec"
- "follow the prd"

The Executor runs step by step, one change at a time, confirming each step with you. If anything is ambiguous or impossible → it **stops and reports**, never improvises a workaround silently.

If the Executor gets stuck mid-way, it will report a **Partial Execution Report** — completed steps, what blocked it, and what's not yet started. You decide how to proceed.

> ⚠️ **If the Executor stops — that's the system working correctly.**
> ⚠️ **Do not trigger QA on a partial execution.**

---

### 3. Trigger QA
Use this after the Executor finishes and reports "Ready for QA".

**Trigger phrases:**
- "review this"
- "check the output"
- "run QA"

QA verifies four things:
1. Was everything in the spec actually implemented?
2. Were breaking changes handled correctly?
3. Is the Definition of Done met?
4. Are there any issues — logic, security, side effects, consistency?

Output: a report with a clear status — **PASS / FAIL / PASS WITH WARNINGS** — and an explicit verdict on whether it's safe to ship.

---

### 4. Run the Skill Extractor (optional but recommended)
Use this after QA returns PASS — especially when a new pattern, module, or convention was introduced.

**Trigger phrases:**
- "extract skill from this"
- "document this pattern"
- "buatin skill.md untuk..."

The Skill Extractor reads the relevant files, identifies recurring patterns and anti-patterns, then **confirms with you before writing anything**. Output is saved to `skills/[scope].md`.

Skills are reusable across future sessions — the Planner and Executor can read them before starting work on familiar modules.

> ⚠️ **This step is optional per feature, but highly recommended after any new module or architectural pattern is introduced.**

---

## Alternative Entry Points

Not every task needs to start from the Planner.

| Situation | Start from |
|---|---|
| New feature / significant change | Planner |
| Spec already exists, ready to build | Executor |
| Executor finished, need verification | QA |
| Small bug with a clearly bounded scope | Executor (with an inline mini-spec) |
| Auditing existing code | QA |
| New pattern just shipped and needs documenting | Skill Extractor |
| Onboarding a new codebase | Skill Extractor |

---

## Why Human in the Loop?

Automated workflows are fast — but if they go wrong at step 3, they've already touched 7 files before you notice.

This workflow is slower by design, but **safe by control**:

- The Planner doesn't move forward until you understand the requirement
- The Executor doesn't improvise when something is unclear
- The Executor stops and reports if it gets stuck — it never silently skips
- QA doesn't approve when a Critical issue exists
- The Skill Extractor confirms patterns with you before documenting them

For a solo developer managing architecture, operations, and delivery all at once — **control beats speed**.

---

## Cross-Agent Hard Rules

- Each agent has a clearly defined boundary — do not blur the roles
- You approve every transition between agents
- If an agent says stop → stop, do not push through
- The spec is a contract — if scope changes, go back to the Planner
- Never trigger QA on incomplete execution
- Never let the Skill Extractor write without your confirmation of the patterns

---

*Built from real experience shipping production systems as a solo developer.*

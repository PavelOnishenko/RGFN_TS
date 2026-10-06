# RGFN Architecture Assessment and Low-Cost Migration Plan (2026-03-30)

## Context and intent

This document answers:

1. Do we already have an architecture in RGFN?
2. How does it work in practice?
3. Can we describe it schematically?
4. Can classes be grouped by semantics?
5. What architecture would be a realistic next step during refactoring, with minimal migration cost and low risk?

The analysis is based on current `rgfn_game/js` runtime structure and recent refactor notes already done in the repository.

---

## 1) Do we have architecture in RGFN now?

Short answer: **yes** — RGFN already has an architecture, but it is a **hybrid modular monolith** rather than a strict textbook architecture.

### Current architectural characteristics

- **Single-process modular game runtime** (no service split): everything runs in one browser runtime.
- **Composition root present**: `GameFacade` + `GameFactory` together wire core systems and dependencies.
- **State-machine driven mode transitions**: world/battle/village transitions are explicit through `GameModeStateMachine`.
- **Coordinator pattern is actively used**: battle/hud/village/game lifecycle are split into coordinators.
- **Domain-ish folders exist**: `systems/world`, `systems/quest`, `systems/village`, `systems/combat`, etc.
- **Recent refactor trend already pushes toward smaller files + explicit runtime helpers** (Rule 3 and Rule 16 work).

### Why this matters

This means we are not “starting from chaos.” We already have enough structure to do **incremental architecture hardening** instead of a costly rewrite.

---

## 2) How current runtime architecture works

## Boot and wiring flow

1. `Game.ts` exports `GameFacade` as the entry point.
2. `GameFacade` creates low-level runtime primitives (`Renderer`, `InputManager`, `GameLoop`) and calls `createGameRuntime(...)`.
3. `GameFactory` creates entities/systems/controllers and binds UI/events.
4. `GameFacade.assignRuntime(...)` receives all wired components.
5. Lifecycle coordinator starts loop and drives update/render.

## Core execution flow

- `GameLoop` calls facade update/render.
- `StateMachine` controls current mode (`WORLD_MAP`, `BATTLE`, `VILLAGE`).
- Mode handlers delegate to dedicated coordinators and controllers.
- Rendering is routed by `GameRenderRouter` per mode.

## Architectural center of gravity

The **real composition root** is currently `GameFactory`.
The **real orchestration facade** is `GameFacade` (+ lifecycle/world interaction coordinators).

---

## 3) Schematic description

## High-level schematic

```text
                 +--------------------+
                 |      Game.ts       |
                 | (entry re-export)  |
                 +---------+----------+
                           |
                           v
                 +--------------------+
                 |    GameFacade      |
                 | Orchestration API  |
                 +----+---------+-----+
                      |         |
      lifecycle/update|         |world interactions
                      v         v
       +-------------------+  +-------------------------------+
       | LifecycleCoord    |  | WorldInteractionCoordinator   |
       +---------+---------+  +-------------------------------+
                 |
                 | uses
                 v
         +---------------+        wires everything
         |  GameFactory  +------------------------------------+
         +-------+-------+                                    |
                 |                                            |
                 v                                            v
      +----------------------+                  +-----------------------------+
      | GameModeStateMachine |<---------------->| Coordinators/Controllers   |
      | WORLD/BATTLE/VILLAGE |                  | world, battle, hud, village|
      +----------+-----------+                  +--------------+--------------+
                 |                                             |
                 +-------------------------+-------------------+
                                           |
                                           v
                                +---------------------+
                                | Domain systems      |
                                | world/quest/combat/ |
                                | village/encounter   |
                                +----------+----------+
                                           |
                                           v
                                +---------------------+
                                | Entities + Config   |
                                | + Utils + UI types  |
                                +---------------------+
```

## Mode runtime schematic

```text
StateMachine
  WORLD_MAP -> WorldModeController.updateWorldMode()
  BATTLE    -> GameBattleCoordinator.updateBattleMode()
  VILLAGE   -> GameVillageCoordinator (mode-specific flow)
```

---

## 4) Semantic grouping of classes/modules

RGFN already groups well by semantics; we can formalize this taxonomy for refactoring decisions.

## A. Composition & orchestration layer

- `js/game/*`
- `js/game/runtime/*`
- Selected `systems/game/runtime/*`

Role: construction, dependency wiring, high-level flow.

## B. Mode/application layer (use-case controllers)

- `systems/world/worldMap/WorldModeController.ts`
- `systems/game/runtime/GameBattleCoordinator.ts`
- `systems/game/runtime/GameVillageCoordinator.ts`
- `systems/game/runtime/GameHudCoordinator.ts`

Role: user-facing scenario flow per game mode.

## C. Feature domain services

- `systems/quest/*`
- `systems/combat/*`
- `systems/village/*`
- `systems/encounter/*`
- `systems/hud/*`

Role: game rules and feature behavior.

## D. Entities / domain objects

- `entities/player/*`, `entities/Skeleton.ts`, `entities/Item.ts`, etc.

Role: actor state and behavior.

## E. Infrastructure + platform adapters

- `engine/*`
- browser/UI binding code
- persistence wrappers (`GamePersistenceRuntime`, localStorage interaction)

Role: technical concerns (render/input/loop/storage).

## F. Configuration/policy data

- `config/*`, especially `config/balance/*`, theme, timings.

Role: tunable balancing and presentation rules.

## G. Cross-cutting utilities

- `utils/*` (state machine, random provider, grid map helpers).

Role: reusable utilities with no feature ownership.

---

## 5) Is this good enough for refactoring stage?

Yes. The current shape is good for **incremental architecture** work because:

- Mode boundaries already exist.
- Runtime is already coordinator-centric.
- Refactor momentum is ongoing (Rule 3/Rule 16).
- Team can improve architecture by adding contracts and boundaries, not by massive rewrites.

---

## 6) Recommended target architecture (minimal migration cost)

Best fit for near future: **“Modular Monolith with Vertical Slices + Ports/Adapters edges.”**

This is not a hard replacement; it is a strengthening of what already exists.

## Why this target fits RGFN now

- Reuses current folder and coordinator structure.
- Keeps current runtime and test setup largely intact.
- Lets us migrate one feature/module at a time.
- Avoids costly framework-level rewrite.

## What to add (not rewrite)

1. **Feature contracts (ports) at slice edges**
   - Define narrow interfaces between modules (e.g., quest -> world lookup, battle -> HUD notifications).
   - Reduce direct cross-module method calls.

2. **Event-driven communication where coupling is high**
   - Introduce a lightweight in-process event bus for cross-feature notifications (e.g., monster killed, village entered, quest updated).
   - Keep direct calls for hot paths where simplicity/perf matters.

3. **Use-case objects for complex flows**
   - Where coordinator methods still grow, split flows into explicit use-case classes.

4. **Application state boundary per mode**
   - Keep state ownership explicit: world state, battle state, village state.
   - Avoid hidden mutation via distant callbacks.

---

## 7) Migration plan (painless, low-risk)

## Phase 0 — Baseline documentation (now)

- Keep this document as architecture map.
- For each refactor PR, tag files by layer (orchestration / mode / domain / infra).

## Phase 1 — Interface hardening (very low cost)

- Introduce small TypeScript interfaces for coordinator dependencies.
- Replace “full object passing” with interface-based dependency slices.

Expected benefit: fewer accidental imports and easier tests.

## Phase 2 — Cross-module event normalization (low to medium cost)

- Create internal event types (`QuestProgressed`, `BattleEnded`, `VillageEntered`, etc.).
- Replace the noisiest callback chains first.

Expected benefit: less spaghetti callbacks and easier feature extension.

## Phase 3 — Vertical slice folders where pain is highest (medium cost)

- Start from modules already active in refactors (game runtime, world mode, battle).
- Keep old entrypoints temporarily; move internals behind stable facades.

Expected benefit: clearer ownership, lower cognitive load.

## Phase 4 — Test architecture alignment (low cost, high payoff)

- Mirror semantic layers in tests:
  - slice-level scenario tests
  - pure domain unit tests
  - orchestration contract tests

Expected benefit: refactors become safer and cheaper.

---

## 8) “What is likely to change soon?” and architectural readiness

Given recent repository activity (Rule 3 and folder regrouping), nearest-future changes are likely to include:

- Continued file-size and structure compliance refactors.
- More extraction from large coordinators/controllers.
- Better scenario-level test coverage around runtime mode flows.
- Potential further grouping of gameplay logic by feature.

The proposed modular-monolith target directly supports those likely changes.

---

## 9) Practical class grouping policy for ongoing refactors

When touching a class, classify it first:

- **Orchestrator?** (facade/factory/coordinator) -> keep thin, delegate behavior.
- **Domain service?** -> keep pure gameplay decisions here.
- **Infrastructure adapter?** -> keep IO/browser/persistence here.
- **Entity/value object?** -> keep state + local invariants here.

Refactor rule of thumb:

- Move business decisions **toward domain services/entities**.
- Move wiring/flow concerns **toward orchestrators**.
- Move browser/localStorage/canvas specifics **toward adapters**.

---

## 10) Risks and anti-patterns to avoid

- Over-abstracting too early (interfaces everywhere before pain appears).
- Replacing all direct calls with events (harder debugging if overused).
- Big-bang folder rewrite (high merge conflict and migration cost).
- Mixing rendering/persistence logic back into domain services.

---

## 11) Suggested immediate next refactor candidates

Low-risk, high-value candidates:

1. Any coordinator still trending toward large orchestration methods.
2. Callback-heavy paths between world mode, battle flow, and quest tracking.
3. Places where test setup requires many unrelated dependencies (good signal for missing interface boundary).

---

## 12) Final recommendation

RGFN already has a strong architectural foundation for incremental improvement.

Recommended direction:

- Keep `GameFacade` + `GameFactory` as composition/orchestration entry.
- Continue coordinator/use-case splitting.
- Add explicit module contracts and selective event-driven boundaries.
- Migrate by feature slice, not by global rewrite.

This is the **lowest-cost architecture path** with the highest chance of stable progress during current refactoring work.


---

## 13) LG (LLM/Agent) execution policy for future feature tasks

To make this architecture plan actionable across future tasks, use this policy as a mandatory pre-flight checklist before implementing new functionality.

### Important limitation

The coding agent does not have persistent memory across unrelated sessions.
To ensure continuity, keep this policy in repository docs and require feature PRs to reference it explicitly.

### Mandatory pre-flight checklist (for each feature task)

1. Identify touched files and assign each to a semantic layer:
   - orchestration
   - mode/application
   - feature domain
   - entity/value
   - infrastructure adapter
   - config/policy
   - utility
2. Confirm the change follows this architecture target:
   - modular monolith
   - vertical slice ownership
   - explicit ports/adapters at boundaries
3. If adding cross-module communication, choose one:
   - direct call (if local/simple/hot path)
   - typed event (if cross-feature coupling would otherwise increase)
4. Verify no business rules leak into infrastructure adapters.
5. Verify no browser/persistence/rendering detail leaks into domain services.
6. Add/adjust tests at the same semantic layer as the change.
7. In PR description, include section: `Architecture adherence` with explicit bullets stating how this checklist was satisfied.

### PR template snippet (copy/paste)

```md
## Architecture adherence
- Layers touched: <list layers>
- Boundary decision: <direct call | typed event>, rationale: <why>
- Domain purity check: <passed/notes>
- Adapter purity check: <passed/notes>
- Tests added/updated by layer: <list>
- Migration impact: <none | low | medium>
```

### Refactor safety rules for new features

- Prefer extending an existing feature slice before creating a new cross-cutting utility.
- If a coordinator grows due to a feature, extract a use-case class in the same slice.
- Add narrow interfaces first; avoid introducing broad shared abstractions.
- Avoid “big relocation” commits mixed with behavior changes; keep architecture movement and feature logic separable when possible.

### Recommended task-opening phrase (for humans creating tasks)

When assigning future feature tasks, include:

> Follow `rgfn_game/docs/refactors/rgfn-architecture-assessment-and-migration-plan-2026-03-30.md` section 13 and `rgfn_game/docs/refactors/rgfn-feature-architecture-checklist.md`.

This makes adherence explicit and reduces architectural drift over time.

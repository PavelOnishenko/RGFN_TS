# RGFN Feature Architecture Checklist (LG Guide)

Purpose: a lightweight, repeatable checklist to keep new feature work aligned with the RGFN architecture plan.

Primary reference:
- `rgfn_game/docs/refactors/rgfn-architecture-assessment-and-migration-plan-2026-03-30.md`
- `rgfn_game/docs/refactors/rgfn-expandable-content-architecture-vision-2026-03-31.md` (content-heavy category expansion contracts and registry model)

---

## 1) One-minute triage

Before coding, answer:

1. Which feature slice owns this change?
2. Which layers are touched?
3. Do we need a new boundary contract (interface/event), or can we reuse existing ones?
4. What is the smallest safe migration footprint?

If you cannot answer these in under one minute, pause and create a short design note in PR description first.

---

## 2) Layer assignment matrix

Assign each touched class/file to one primary layer:

- Orchestration: facade/factory/coordinator wiring
- Mode/Application: world/battle/village scenario flow
- Feature Domain: quest/combat/village/encounter game rules
- Entity/Value: character/item/state local invariants
- Infrastructure Adapter: render/input/storage/browser integration
- Config/Policy: balance/theme/timing and constants
- Utility: generic reusable helpers

Rule: each file should have one primary owner layer; avoid mixed-responsibility files.

---

## 3) Boundary decision guide

When module A needs module B:

- Use **direct call** when:
  - same slice
  - simple, local interaction
  - performance-sensitive hot path

- Use **typed event** when:
  - cross-slice notifications
  - many listeners or future listener growth expected
  - callback chains are becoming hard to track

- Use **interface/port** when:
  - you need to consume behavior without exposing full dependency surface
  - testing setup is getting heavy due to over-coupled dependencies

---

## 4) Feature implementation guardrails

- Keep coordinators thin; move feature decisions into domain services/use-cases.
- Keep browser/localStorage/canvas logic out of domain services/entities.
- Keep business rules out of rendering/persistence adapters.
- Prefer additive extraction (new helper/use-case class) over disruptive rewrites.
- Separate architecture movement commits from behavior changes where practical.

---

## 5) Testing expectations by layer

- Domain layer changes:
  - unit tests for decision logic and edge conditions
- Mode/application changes:
  - scenario tests for transitions and orchestration behavior
- Infrastructure adapter changes:
  - focused integration-style checks with stubs/mocks
- Orchestration wiring changes:
  - contract tests for dependency hookups where possible

At minimum, run:
1. `npm run build:rgfn`
2. `npm test` (capture known baseline failures separately from new failures)

Optional focused suites should be listed in PR if relevant.

---

## 6) PR checklist (must include)

Add this section to PR description:

```md
## Architecture adherence
- Feature slice owner: <name>
- Layers touched: <list>
- Boundary decisions: <direct call | interface | event>, with rationale
- Domain purity check: <pass/fail + note>
- Adapter purity check: <pass/fail + note>
- Tests by layer: <list>
- Migration cost: <none/low/medium>
```

---

## 7) Drift signals (when to stop and refactor)

If any is true, do a small architecture correction before adding more features:

- Coordinator method becomes hard to summarize in one sentence.
- New feature requires passing many unrelated dependencies into tests.
- A domain class imports UI/browser/persistence details directly.
- Cross-module callbacks form deep chains with low traceability.

---

## 8) Change log note for future maintainers

For every substantial feature PR, add one short “architecture note” bullet in docs/refactor notes:

- what boundary was introduced/changed
- why that boundary was chosen
- what future refactor it enables

This keeps architecture knowledge cumulative and discoverable.

---

## 9) Content-heavy category checklist (for RGFN expansion work)

When the change touches monsters, quest templates, encounters, items, locations, spells, stats/skills, terrain, HUD panels, factions, acts, or battle map objects:

- Define/update a category contract (`I*Definition` / `I*Template`) before adding more concrete entries.
- Ensure the category has registry-level lookup and validation.
- Avoid adding new hardcoded unions/if-else chains in orchestration code unless covered by an explicit migration exception.
- Add/update authoring notes in `docs/` so future content additions avoid rediscovering pitfalls.
- Prefer additive adapter migration from legacy paths over in-place rewrites.

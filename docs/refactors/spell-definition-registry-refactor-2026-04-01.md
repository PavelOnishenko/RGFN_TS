# Spell Definition Registry Refactor (2026-04-01)

## Goal
Make spell expansion predictable and low-friction: new spells should be added through a clear contract and a small, explicit set of files.

## What changed

### 1) New spell contract layer
Added `SpellDefinition` contract and level metadata in:
- `js/systems/controllers/magic/spells/SpellDefinition.ts`

This contract standardizes:
- base spell identity (`baseId`),
- target type,
- level tier metadata,
- cast payload creation per level.

### 2) One class per base spell
Moved each base spell into its own definition module:
- `FireballSpellDefinition.ts`
- `CurseSpellDefinition.ts`
- `SlowSpellDefinition.ts`
- `RageSpellDefinition.ts`
- `ArcaneLanceSpellDefinition.ts`

### 3) Central spell registry
Added `SpellRegistry.ts` as the source of truth for:
- all registered spell definitions,
- all valid base spell ids (`getBaseSpellIds()`).

### 4) SpellBook now composes from registry
`SpellBook.ts` now flattens registry definitions + level tiers into runtime `Spell[]`.

### 5) MagicSystem bootstraps from registry ids
`MagicSystem.ts` now initializes spell levels and validates ids using `getBaseSpellIds()`.

This removes duplicate hardcoded base-id lists across runtime paths.

---

## Resulting authoring workflow

To add new spell behavior:
1. create one `*SpellDefinition.ts` file,
2. register it in `SpellRegistry.ts`,
3. optionally add new reusable effect class,
4. if introducing new spell outcome type, extend message/result typing.

This is the first step toward fully dynamic spell UI.

---

## What still requires manual wiring (known limitation)

For a **new base spell button** (not just new levels/effects), UI is still static and requires manual updates in:
- `rgfn_game/index.html` (buttons + upgrade rows)
- HUD/controller bindings

This is a planned next migration item (registry-driven HUD spell rendering).

---

## Suggested next architecture targets

Based on the expansion roadmap and current coupling hotspots:

1. **HUD panel + spell-button registry rendering** (next, small-medium)
   - unlocks truly additive spells without hand-editing battle panel markup.
2. **Items/weapons registry adapters** (parallel-friendly)
   - inventory/equip runtime already exists; add typed lookup registry first.
3. **Location type registry for world generation** (parallel-friendly)
   - add definitions and adapters before introducing cave/instance families.
4. **Encounter type registry** (depends on location tags, can start in parallel with items)
5. **Quest template contracts migration** (after ids/tags stabilize across items/locations/encounters)
6. **Monster registry finalization** (after encounter + location contracts converge)

---

## Parallelization plan (to accelerate migration)

### Track A (Combat/UI)
- registry-driven spell/HUD button rendering
- cast/upgrade button generation from spell metadata

### Track B (Economy)
- item/weapon definition registry
- compatibility adapter from current declarations

### Track C (World)
- location definitions + spawn constraints
- terrain/location query API for world generation

### Track D (Events)
- shared typed event schema (`monster.killed`, `location.entered`, ...)
- adoption by quest and encounter systems

Tracks B/C/D can progress mostly in parallel while Track A completes spell UX decoupling.

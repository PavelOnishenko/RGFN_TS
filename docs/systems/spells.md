# Magic Spells (RGFN)

## Core rules
- All spells consume mana.
- Higher spell level means higher mana cost and stronger effects.
- Magic damage ignores armor.
- Spell levels are upgraded with **magic points**.
- All spells start at level 0 and must be learned by investing magic points.

---

## Architecture (April 2026)

Spells are now defined through a **single contract** and a **central registry**:

- Contract: `SpellDefinition` (`baseId`, `targetType`, `levels[]`, `buildLevelSpell(...)`).
- One file per base spell in `js/systems/controllers/magic/spells/*SpellDefinition.ts`.
- Registry: `spells/SpellRegistry.ts`.
- Runtime flattening into castable spell tiers: `SpellBook.ts`.

### Why this is better
- No giant hardcoded spellbook list with repeated boilerplate.
- New spell logic is isolated in one class file.
- `MagicSystem` now gets spell ids from registry, so initialization and parsing stay in sync.
- Existing combat/HUD flow remains compatible (same spell id pattern: `<base-id>-lvl-<n>`).

---

## How to add a new spell (authoring checklist)

Example target spell: **Freezing Fountain**.

1. Create file:
   - `js/systems/controllers/magic/spells/FreezingFountainSpellDefinition.ts`
2. Implement `SpellDefinition`:
   - `baseId` (e.g. `'freezing-fountain'`)
   - `targetType` (`'enemy'` or `'self'`)
   - `levels` array (mana, names, descriptions)
   - `buildLevelSpell(...)` with effect stack for each cast
3. Register spell in:
   - `js/systems/controllers/magic/spells/SpellRegistry.ts`
4. Add any new effect class if needed:
   - `js/systems/controllers/magic/SpellEffects.ts`
5. If the spell adds a **new result type** in combat log:
   - extend `SpellEffectType` in `MagicTypes.ts`
   - add text handling in `MagicSystem.castSpell(...)`
6. Hook UI controls if this is a **new base spell button**:
   - battle buttons + upgrade row markup (`index.html`)
   - HUD controller fields/text wiring (`HudMagicController.ts`)
   - button availability mapping (`BattleUiActionAvailability.ts` and binders)

> Important: current magic runtime is registry-driven, but HUD buttons are still static. Therefore, adding a base spell currently requires both registry and UI wiring.

---

## Current spells

### 1) Fire Ball
- Target: Enemy
- Effect: direct magic damage (armor-ignoring).
- Scaling:
  - Lv1: moderate damage, lower mana cost.
  - Lv2+: increased damage and mana cost.

### 2) Curse
- Target: Enemy
- Effects:
  - Applies curse that reduces effective armor for several turns.
  - Also deals magic damage immediately.
- Scaling:
  - Higher levels increase armor reduction and duration, plus mana cost.

### 3) Slow
- Target: Enemy
- Effect: enemy skips turns while slowed.
- Scaling:
  - Higher levels increase skipped-turn duration and mana cost.

### 4) Rage
- Target: Self
- Effect: temporary multiplier to physical and magical output.
- Scaling:
  - Higher levels increase duration and multiplier, plus mana cost.

### 5) Arcane Lance
- Target: Enemy
- Effect: focused magic strike that ignores armor.
- Scaling:
  - Higher levels increase damage and mana cost.

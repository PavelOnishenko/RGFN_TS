# Items System (RGFN)

## Core rules
- Items are represented by `ItemData` runtime records and wrapped by the `Item` entity class.
- Item ids are stable save-game keys; persistence stores ids only, then restores via item factory lookup.
- Equipment flow currently supports `weapon` and `armor` as equipable item categories.
- Potions are `consumable` items and are consumed directly from player inventory.

---

## Architecture (April 2026)

Items now follow the same pattern as spells:

- Contract: `ItemDefinition` (`baseId`, `type`, `tiers[]`, `buildTierItem(...)`).
- One definition module per item category helper (`WeaponItemDefinition`, `ArmorItemDefinition`, `ConsumableItemDefinition`).
- Central registry: `js/entities/items/ItemRegistry.ts`.
- Runtime flattening: `flattenItemDefinitions(...)` produces canonical `ItemData[]` for game systems.

### Why this is better
- Item authoring is now registry-driven instead of giant hardcoded arrays in `Item.ts`.
- New item families can be added without touching multiple runtime call sites.
- Discovery, persistence, village trade, encounter generation, and loot all read from the same source of truth.
- Architecture now explicitly supports extension for future item categories (`quest`, `misc`) even before gameplay wiring is added.

---

## File organization

### Required files for new item families
1. **Usually one registry edit only**
   - `js/entities/items/ItemRegistry.ts`
2. **Optional new definition helper (only when needed)**
   - `js/entities/items/definitions/<YourDefinition>.ts`
3. **Optional data shape extension (new fields/new behavior contracts)**
   - `js/entities/ItemDeclarations.ts`

### Existing item architecture files
- `js/entities/items/ItemDefinition.ts` - shared contract and flatten helper.
- `js/entities/items/ItemRegistry.ts` - source of truth for registered item families.
- `js/entities/items/definitions/WeaponItemDefinition.ts` - tiered weapons helper.
- `js/entities/items/definitions/ArmorItemDefinition.ts` - tiered armor helper.
- `js/entities/items/definitions/ConsumableItemDefinition.ts` - single-entry consumables helper.
- `js/entities/Item.ts` - runtime adapter for legacy call sites (`ITEM_LIBRARY`, `createItemById`, etc.).

---

## How to add a new item

Example target item family: **Spear** with 4 tiers.

1. Open `js/entities/items/ItemRegistry.ts`.
2. Add a new `WeaponItemDefinition` entry:
   - set `baseId` (e.g. `'spear'`),
   - set requirements/hands/attack range,
   - define `tiers[]` with names, damage, value, weights.
3. If the item should appear in random discovery:
   - add ids/weights to `js/config/balance/itemsEncountersBalance.ts` discovery pool.
4. If villagers should sell it:
   - add a new kind entry or extend existing one in `js/systems/village/actions/VillageActionsTypes.ts`.
5. If the item has unique gameplay behavior beyond current fields:
   - extend `ItemEffects` or `ItemData` in `ItemDeclarations.ts`,
   - wire behavior where damage/armor/consumption is resolved.

### How many files typically change
- **1 file**: registry-only addition for item data that fits existing behavior.
- **2–3 files**: if it also participates in drops and village trade.
- **4+ files**: if introducing new gameplay effect types with runtime logic.

---

## How to add quest items / non-combat items

Current architecture supports `ItemData.type = 'quest' | 'misc'` at the data-contract level.

Recommended path:
1. Add a new definition helper or use a consumable-like helper that emits `type: 'quest'`.
2. Register quest item in `ItemRegistry.ts`.
3. Keep it out of discovery/village pools unless desired.
4. Wire quest interaction behavior in quest/event systems (objective completion checks, barter, turn-ins).

This decouples item creation from item behavior and allows gradual rollout.

---

## Compatibility notes
- `Item.ts` still exports `ITEM_LIBRARY`, `DISCOVERABLE_ITEM_LIBRARY`, `HEALING_POTION_ITEM`, `MANA_POTION_ITEM`, and `createItemById(...)` so legacy systems continue working while migration proceeds.
- Save compatibility is preserved because item ids remain unchanged for existing items.

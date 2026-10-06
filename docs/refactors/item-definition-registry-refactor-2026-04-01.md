# Item Definition Registry Refactor (2026-04-01)

## Goal
Mirror the spell-definition migration for economy/inventory content so item growth becomes contract-driven and predictable.

## What changed

### 1) Introduced item definition contract
Added `ItemDefinition` and tier metadata in:
- `js/entities/items/ItemDefinition.ts`

This standardizes:
- base item identity (`baseId`),
- item type,
- tier metadata,
- tier-to-runtime conversion.

### 2) Added reusable definition helpers
Created category helpers:
- `WeaponItemDefinition.ts`
- `ArmorItemDefinition.ts`
- `ConsumableItemDefinition.ts`

### 3) Added central item registry
`js/entities/items/ItemRegistry.ts` is now the source of truth for item families and all generated runtime item records.

### 4) Migrated Item.ts to registry adapter
`Item.ts` now reads from the registry and keeps legacy exports for compatibility.

### 5) Extended item type surface
`ItemDeclarations.ts` now recognizes future-safe item categories (`quest`, `misc`) to support non-combat item pipelines.

---

## Authoring workflow now

To add a normal weapon/armor/consumable:
1. Add one definition block to `ItemRegistry.ts`.
2. Optionally add discovery/village hooks if needed.

To add a novel item behavior:
1. Extend `ItemData` / `ItemEffects`.
2. Add runtime usage where damage/armor/consumption/quest effects are applied.

---

## Migration impact and risk notes
- Existing item ids and data values were preserved to avoid save/load breakage.
- Existing discovery and trade systems continue to work because public exports in `Item.ts` are stable.
- Runtime behavior is unchanged for current items; this is an architecture migration, not a balance pass.

---

## Recommended next step
Move discovery/trade tables from manually duplicated id lists to registry-driven selectors (tags/category filters), so content authors only touch one file for most additions.

# Weapon enchantment system (RGFN)

## Summary
This update adds Diablo/Pixel-Dungeon style random weapon enchantments for **RGFN** (`rgfn_game`) and wires them into:

- random item encounters,
- random monster drops,
- village market offers (including a configurable special enchanted-weapon offer),
- combat effects and pricing.

## Enchantments
Implemented weapon enchantment effects:

- **plasma**: `+N` direct damage and delayed `N/2` damage next turn,
- **wormhole**: `M%` chance to crit for `2x` total attack damage,
- **confusion**: `P%` chance to stun for 1 turn (target skips turn),
- **doubt**: `+Q` damage per turn for `R` turns.

Multiple enchantments can appear on the same weapon.

## Balance knobs
Added under `balanceConfig.items.enchantments` (`rgfn_game/js/config/balance/itemsEncountersBalance.ts`):

- `chanceOnRandomWeapon` – chance a randomly generated weapon is enchanted,
- `chanceForExtraEnchantment` – chance to roll an additional enchantment,
- `maxEnchantmentsPerWeapon` – hard cap for multi-enchant rolls,
- `villageSpecialOfferChance` – probability a village stock refresh includes a special enchanted weapon offer,
- `priceMultiplierPerScore` – scales value from rolled enchantment strength,
- per-enchantment value ranges (`plasma`, `wormhole`, `confusion`, `doubt`).

## Generation/runtime design
- Random enchantment rolling lives in `rgfn_game/js/entities/items/WeaponEnchantments.ts`.
- Effects are attached to per-instance `Item` data (`item.enchantments`), not base registry definitions.
- Generated items now pass through enchantment application in:
  - `EncounterResolver` (item discoveries),
  - `BattleLootManager` (monster drops),
  - `VillageTradeInteractionService` (village purchases).
- Village stock now has optional "Enchanted Weapon" special offer insertion in `VillageStockService`.

## Combat integration
- Attack-time enchantment processing lives in `rgfn_game/js/systems/game/WeaponEnchantmentCombat.ts`.
- Player attack flows (normal + directional) now resolve enchantment procs.
- Monster status effects gained:
  - turn-based stun support,
  - generalized damage-over-time support,
  - consumption of DoT/stun during turn processing.

## UX: inspecting exact enchantment parameters
- Inventory weapon tooltip now includes full per-enchantment parameter lines (not only enchantment names).
- **Shift+click** on a weapon in the inventory logs an explicit enchantment breakdown into the game log.
- **Shift+click** on equipped weapon slots (main hand/off hand) logs the same breakdown for currently held weapons.
- Equipment hint text in the inventory panel now documents this interaction.
- Doubt wording is now consistent with turn-based combat in both item descriptions and combat logs (`damage/turn`, `turns`).

## Persistence
To preserve randomized enchantments through saves:

- item snapshots are now serialized in player state alongside legacy item-id fields,
- restore path prefers snapshots when present and falls back to legacy id-based restore,
- this keeps backward compatibility for older saves.

## Notes for future tuning
- If village enchanted offers feel too common/rare, tune `villageSpecialOfferChance`.
- If total weapon economy inflates too quickly, reduce `priceMultiplierPerScore` and/or enchant ranges.
- If DoT feels too oppressive, lower `doubt` ranges first (especially duration).

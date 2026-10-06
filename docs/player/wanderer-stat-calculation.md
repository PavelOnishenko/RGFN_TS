# Wanderer stat calculation and encounter readout

This note documents how traveler/wanderer stats are currently calculated in RGFN and why encounter text now shows both base and resulting values.

## Why this matters

Wanderers are generated from the **human archetype base profile** and then receive randomized skill points based on level. Because of that:

- `Base profile` values are static (`HP 5, DMG 2, ARM 0, Mana 3` for humans).
- `Resulting stats` are what actually matter in combat after skills + equipment are applied.

If only base values are shown in an encounter line, players can think HP/DMG are bugged when they are actually looking at pre-scaling stats.

## Current formulas

## HP

- `maxHp = baseHp + vitality`
- Human base HP is `5`.
- Example: VIT `11` => `5 + 11 = 16 HP`.

## Armor

- `armor = baseArmor + floor(toughness / 3) + flatArmorFromEquipment`

## Damage

Melee bonus:

- `meleeBonus = floor(strength / 2) + floor(agility / 4)`

Wanderer attack damage:

- No weapon: `(fist + meleeBonus) * 2`
- Two-handed weapon: `weaponDamage + weaponStatBonus`
- One-handed weapon: `weaponDamage + weaponStatBonus + (fist + meleeBonus)`

Where:

- `fist = 1`
- `weaponStatBonus = meleeBonus` for melee weapons and `rangedBonus` for ranged weapons

This keeps Wanderer hand-scaling aligned with the player combat model.

## Encounter description output

Encounter text now explicitly includes:

1. `Base profile` (static archetype values)
2. `Resulting stats` (derived values actually used)
3. Skills, magic details, and equipped gear

That makes debugging and balancing easier when players report a specific generated NPC.

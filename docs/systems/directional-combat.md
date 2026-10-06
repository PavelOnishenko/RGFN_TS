# Directional Combat System

RGFN melee combat now supports six explicit close-range actions:

- `AttackLeft`
- `AttackCenter`
- `AttackRight`
- `Block`
- `DodgeLeft`
- `DodgeRight`

## Resolution Rules

Directional melee only applies to adjacent melee combat. Ranged attacks, spells, and longer-range weapon behavior continue to use the existing combat flow.

### Attack vs Attack

- Same lane (`Left` vs `Left`, `Center` vs `Center`, `Right` vs `Right`): both combatants deal full damage.
- Adjacent lanes (`Left` vs `Center`, `Center` vs `Right`): both combatants deal reduced damage using `combat.adjacentAttackDamagePenalty`.
- Opposite lanes (`Left` vs `Right`): both attacks miss.

### Attack vs Block

- The attack still lands.
- Damage is reduced by `combat.blockDamageReduction`.
- A defender who blocked and was attacked gains `Block Advantage`.

### Attack vs Dodge

- `DodgeLeft` is only hit by `AttackLeft`.
- `DodgeRight` is only hit by `AttackRight`.
- All other attack directions miss.
- A successful dodge grants a temporary damage multiplier using `combat.successfulDodgeDamageMultiplier`.

## Temporary Buffs

### Block Advantage

- Earned by blocking an incoming attack.
- On the next attacking turn, adjacent-direction penalties are ignored and the attack resolves at full damage.
- The buff is consumed on that next attack.
- If the next turn is not an attack, the buff expires.

### Successful Dodge Damage Multiplier

- Earned after a successful dodge.
- Applies to the next attack only.
- The multiplier value comes from `combat.successfulDodgeDamageMultiplier`.
- If the next turn is not an attack, the buff expires.

## Balance Config

The directional combat system is configured in `js/config/balanceConfig.ts` under `combat`:

- `adjacentAttackDamagePenalty`
- `blockDamageReduction`
- `successfulDodgeDamageMultiplier`
- `enemyDirectionalActionWeights`

## UI and Logs

When an adjacent melee target is available, the battle sidebar exposes the directional combat buttons. Combat logs explicitly describe:

- both chosen actions
- whether attacks matched, were adjacent, or opposite
- damage reduction from blocks
- dodge success or failure
- buff gains and buff consumption or expiration

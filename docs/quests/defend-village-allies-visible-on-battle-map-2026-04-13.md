# Defend Village: allied defenders rendered as real battle-map combatants (2026-04-13)

## Issue observed

During **defend** quest battles, village defenders could:
- take turns,
- move/attack in logs,
- take/deal damage,

while not being visibly rendered as entities on the combat map.

This produced confusing behavior where only red/current-turn tile highlights moved around and logs referenced defender actions that seemed to happen "off-map".

## Root cause

`GameRenderRouter.renderBattleMode(...)` drew only:
- player
- active enemies

It did **not** include active allied defenders in `renderer.drawEntities(...)`, even though battle setup and turn order already included those allies.

## Fix

1. Updated `renderBattleMode` signature to accept `allies`.
2. Included active allies in draw list: `player + allies + enemies`.
3. Updated `GameFacadeLifecycleCoordinator.render()` battle call-site to pass `battleCoordinator.getCurrentAllies()`.

## Result

Allied village defenders now follow the same spatial/combat representation model as every other combatant:
- they occupy visible map cells,
- they move visibly,
- their attacks/damage correspond to on-map positions,
- turn highlights now match visible entity bodies.

## Regression-safety notes

- Turn/team logic was already correct (allies in `TurnManager` player-side team).
- This change is rendering integration only, with no combat balance/math modifications.
- If similar symptoms reappear, first verify render pipeline includes all active turn participants.

## Follow-up (2026-04-13): defender HP should start full at defense activation without overriding derived max HP

After the visibility fix, an additional issue was confirmed:
- defenders could spawn at a **fraction** of HP on the first defend battle after activation.

### Cause

Defender roster metadata persisted `maxHp/currentHp`, but defender spawn conversion also reapplied vitality-based HP derivation through `Skeleton` stat calculation.  
That effectively increased runtime combatant `maxHp` beyond persisted `defender.maxHp`, making full persisted HP look partially depleted in combat UI.

### Resolution (updated)

- We no longer override runtime `combatant.maxHp` (so skill/vitality-derived max HP remains authoritative).
- Spawn HP now uses a state-aware rule:
  - if persisted roster state is "full" (`currentHp >= persisted maxHp`), spawn the ally at runtime full (`combatant.hp = combatant.maxHp`);
  - if persisted roster state is wounded, preserve the persisted current HP value (clamped to runtime max HP).
- Battle result persistence now stores both `hp` and `maxHp` from ally survivors, keeping roster max HP aligned with actual combat runtime values for future battles/rest regeneration.

### Expected behavior now

- On first defend fight after objective activation: allied defenders spawn at full HP.
- Subsequent defend fights: allied defenders retain HP losses from prior witnessed battles.
- Passive village-time regeneration still heals living defenders gradually.
- Player HP remains player-owned state (including rest/healing potion effects) and is not overwritten by defend roster logic.

## Additional implementation notes for future debugging

- Persistence handoff location:
  - `GameFacadeLifecycleCoordinator.onBattleEnded(...)` collects survivor allies with both `{ hp, maxHp }`.
  - `GameQuestRuntime.applyDefenderBattleResults(...)` writes back defender `currentHp` and `maxHp`.
- Practical impact:
  - prevents recurring "starts partially wounded" confusion after waiting into first raid,
  - avoids reverting defender caps to stale values between battles,
  - keeps regeneration clamps consistent with what players actually saw in combat.

## Follow-up (2026-04-13): combat action panel could remain disabled after enemy/allied exchanges

### Symptom

In some village-defense encounters against Hired Blades, the combat log advanced normally (moves, attacks, evades), but when control should have returned to the player, all combat action buttons stayed disabled.

### Root cause

Player action readiness was gated through asynchronous turn handoff timing.  
If the handoff chain was interrupted in practice (timing race/order), UI readiness could lag behind turn ownership and leave the player with an inactive action panel even though it was effectively the player's turn.

### Resolution

- `BattleTurnController.processTurn()` now enforces the player-turn invariant synchronously:
  - when `TurnManager` reports player turn, it immediately sets `waitingForPlayer = true`,
  - immediately calls `onPlayerTurnReady()`,
  - immediately enables battle buttons.
- This removes dependence on delayed callback timing for basic player input availability.

### Programmatic safety checks added

- Added scenario regression test that verifies on player turn:
  - `turnManager.waitingForPlayer === true`,
  - action buttons are enabled,
  - `onPlayerTurnReady` is invoked exactly once for that handoff.

### Why this is safe

- The change only affects the transition point into a player turn.
- Enemy/allied AI sequencing, damage resolution, and battle-end checks remain unchanged.
- It hardens input readiness against timing-related UI lock states without changing combat balance.

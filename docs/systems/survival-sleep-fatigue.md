## Survival Loop: Fatigue + Sleep (March 28, 2026)

This document explains the new **travel fatigue** and **sleep safety** loop for RGFN.

### Core idea

- `theme.worldMap.cellTravelMinutes` is treated as the travel-time cost for one world-map step.
- We estimate a comfortable travel day as:
  - `awakeHoursPerDay * 60 / cellTravelMinutes`.
- Fatigue is a bounded stat (`0..maxFatigue`) that grows from travel and is reduced by sleep.

With default values:

- `cellTravelMinutes = 12`
- `awakeHoursPerDay = 16`
- Comfortable cells/day: `floor(16*60 / 12) = 80`

So roughly one full “hard but normal” travel day maps to filling the fatigue bar.

### New balance knobs (`balanceConfig.survival`)

- `awakeHoursPerDay`
- `requiredSleepHours`
- `maxFatigue`
- `cautionFatigueThreshold`
- `highFatigueThreshold`
- `villageSleepFatigueRecovery`
- `wildSleepFatigueRecovery`
- `wildSleepAmbushChance`
- `wildSleepAmbushHpLoss`
- `wildSleepAmbushManaLoss`
- `doctorHealCostGold`
- `innMealCostGold`
- `innMealHpRecovery`
- `innMealManaRecovery`
- `innRoomCostGold`

### Player stat additions

`Player` now tracks:

- `fatigue`
- `getMaxFatigue()`
- `addTravelFatigue(cells)`
- `recoverFatigue(amount)`
- `getFatiguePercent()`
- `getFatigueStateLabel()` (`Rested`, `Tired`, `Exhausted`)

Fatigue is also saved/restored in save-state snapshots.

### Sleep flows

#### 1) World map camping (risky)

- New button: **Camp Sleep (Risky)** in world actions.
- Effects:
  - restores fatigue by `wildSleepFatigueRecovery`.
  - has ambush chance `wildSleepAmbushChance`.
  - if ambushed:
    - shows a popup (`Night ambush!`),
    - immediately starts a full combat encounter instead of only applying direct HP/mana penalties,
    - prioritizes active quest battle packs when available; otherwise starts a normal monster battle.

This models unsafe sleep outside settled places.

#### 2) Village services (paid recovery only)

- Free village waiting recovery has been removed.
- Village sustain now requires explicit paid actions:
  - **Doctor treatment (4g)**:
    - pays `doctorHealCostGold`,
    - restores HP to full,
    - does not restore mana/fatigue.
  - **Inn meal (2g)**:
    - pays `innMealCostGold`,
    - restores `innMealHpRecovery` HP,
    - restores `innMealManaRecovery` mana.

This prevents free spam-healing in villages and makes gold management part of survival.

#### 3) Village inn sleep (safe)

- NPC role pool now includes `Innkeeper`.
- Village action button: **Sleep in room**.
- Only enabled when an innkeeper-like NPC is selected.
- Effects:
  - pay `innRoomCostGold`
  - recover fatigue by `villageSleepFatigueRecovery`
  - small HP/mana restoration bonus
  - no ambush risk

### UI additions

Stats panel now shows:

- `Fatigue: <current>/<max> (<percent>)`
- `Condition: Rested/Tired/Exhausted`

### Future extension ideas

- Convert fatigue state into combat/open-world modifiers.
- Add time-of-day and multi-day calendar progression.
- Add explicit innkeeper dialogue branch (`I want a room for the night`).

### Implementation notes (March 28, 2026 follow-up)

- Ambush battle generation is routed through `EncounterSystem.generateMonsterBattleEncounter()`, which locks event type to `monster` and **throws immediately** if a non-battle encounter result appears.
- Camp-sleep ambush flow in `WorldModeController.handleCampSleep()` now:
  1. recovers fatigue,
  2. rolls ambush chance,
  3. shows popup + log message on ambush,
  4. starts quest battle encounter if available,
  5. otherwise starts regular monster battle at current terrain type.
- This preserves the “risky camp sleep” identity while making consequences interactive (full fight) rather than purely subtractive (stat loss only).

### Engineering policy note (March 29, 2026)

- RGFN default error-handling approach is **fail fast, no silent/degrading fallbacks** unless explicitly requested otherwise.
- For this ambush path specifically, unexpected non-battle outputs are treated as hard logic errors (exception throw), not auto-corrected to substitute encounters.

# Defend objective runtime (village hold contract)

This document explains the newly implemented **defend** main-quest leaf flow for RGFN.

## Player flow

1. A defend leaf now includes objective metadata (`objectiveData.defend`) with:
   - target village;
   - artifact name;
   - quest-contact NPC name;
   - duration in days;
   - active timer state and defender roster.
2. In a village dialogue, the player can use **"I am ready to defend you"** when speaking to NPCs.
3. If the NPC matches an active defend contract for the village, the defense starts and the countdown begins.
4. While advancing time in the village (sleep, barter actions, dialogue actions), periodic attacker waves can trigger.
5. Leaving the village while defense is active rolls the objective back to the initial state (no hard fail for main quest).
6. After timer expiry, objective is completed and artifact outcome is resolved (retained by NPC or awarded narrative to player side).

## Hard axiom: quest people must exist in world NPC rosters

For defend objectives we now enforce this invariant:

- If a quest references a person (`contactName`) in a village objective, that person must appear in that village NPC roster every time the village is entered.
- This is implemented by contract projection from quest runtime (`collectDefendContracts`) into village runtime contract wiring and roster reconciliation (`ensureQuestPeoplePresent` + `appendDefendContactIfMissing`).
- The reconciliation runs:
  - when a village roster is first created;
  - when a cached roster is reused;
  - when defend contracts are refreshed from quest updates.

This makes missing-quest-contact regressions testable and deterministic instead of relying on random NPC generation luck.

## Combat model used by defend encounters

- Defend encounters can spawn both:
  - attackers (`Hired Blade N`), and
  - allied defenders (villager-derived roster).
- Turn system now supports side-aware teams:
  - player + allied defenders are on one side;
  - attackers on the opposing side.
- Allied defenders take turns with simple AI:
  - move to nearest hostile;
  - attack when in range;
  - can die and be removed from defender roster.

## XP and loot sharing

- Enemy XP is split by player-side participant count (`floor(totalXp / participantCount)`, minimum 1 to player).
- Loot drops in multi-participant fights are probabilistically claimed by allied defenders to represent split loot.

## Persistence notes

- Defend objective state is stored in quest tree objective metadata and therefore persists via existing quest save flow.
- Defender casualties and remaining HP are written back into defend objective metadata after each village-defense battle.

## Test coverage for the invariant

- `recoverQuestRuntime.test.js`: validates defend contracts are emitted for known active defend objectives.
- `villageActionsController.test.js`: validates defend contact NPC is injected into the target village roster.

## Current limitations and follow-up opportunities

- Villager roster UI removal for dead defenders is currently metadata-driven but can be expanded with explicit village roster pruning hooks.
- Artifact "awarded to player" branch currently logs reward narrative; if strict inventory reward is required, add deterministic inventory insertion in the completion branch.
- Defender button visibility currently depends on runtime validation at click time; optional pre-filtering can be added for cleaner UI.

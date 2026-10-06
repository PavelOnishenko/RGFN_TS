# Defend Quest Support: Village Wait Action (2026-04-12)

## Why this was needed

Defend-style quests can require holding a village for multiple days (example: 3 days).
Without an explicit **Wait** action in village actions, players had no direct way to advance local time while staying in the defended settlement, making completion impractical.

## What changed

- Reintroduced a **Wait (12h)** button in village actions panel near existing **Doctor treatment** and **Inn meal** actions.
- Wired the new UI control through village UI model/factory/event binding.
- Added a dedicated village-trade interaction handler for waiting:
  - advances game time by **12 hours**,
  - applies fatigue through existing `onAdvanceTime` flow,
  - grants very small passive recovery: **+1 HP**, **+1 mana**.
- Added balance-config knobs for village waiting:
  - `survival.villageWaitMinutes`
  - `survival.villageWaitHpRecovery`
  - `survival.villageWaitManaRecovery`

## Practical gameplay impact

- Defend objectives that require waiting days can now be finished fully from village mode.
- Waiting is not free:
  - fatigue increases (same global fatigue/time systems),
  - regeneration is intentionally very low to avoid replacing inn/doctor/sleep loops.

## Verification notes

- Added scenario test coverage in `villageActionsController.test.js` to ensure:
  - wait triggers one `onAdvanceTime` call with `720` minutes and fatigue scale `0.5`,
  - heal and mana restore are each called with `1`,
  - action emits an in-game log line.

## Follow-up opportunities

- If balancing requests change, tune the three new `survival.villageWait*` fields without refactoring behavior.
- Optional future UX: add quick choices (`Wait 6h`, `Wait 12h`, `Wait 24h`) or hold-to-repeat for long defend windows.
- Optional skill opportunity: a reusable “quest-time progression QA checklist” skill for validating all objectives that depend on time-skipping actions.

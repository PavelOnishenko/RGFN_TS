# Balance Config Refactor Notes (March 2026)

## What changed

- `js/config/balanceConfig.ts` is now a composition root and stays small.
- Balance sections were extracted to `js/config/balance/` modules:
  - `creatureArchetypes.ts`
  - `worldMapBalance.ts`
  - `playerEnemyBalance.ts`
  - `progressionBalance.ts`
  - `itemsEncountersBalance.ts`
- `villageCreationRateMultiplier` is no longer a global key. It now lives at:
  - `balanceConfig.worldMap.villages.creationRateMultiplier`
- Quest UI + quest name generation settings moved from balance to theme:
  - `theme.quest.feedbackMessageDurationMs`
  - `theme.quest.nameGeneration.maxWordsByDomain`
  - `theme.quest.nameGeneration.wordLengthWeightsByDomain`

## Why this matters

- Meets the style-guide intent of splitting overly long files.
- Keeps balance-only data in balance config and non-balance UX settings in theme.
- Makes world generation settings easier to reason about by grouping all village-generation knobs together.
- Reduces coupling between quest systems and combat/economy balance constants.

## Migration map for future edits

- If a value changes encounter/combat/progression outcomes: use balance config.
- If a value changes timing/readability/visual UX only: use theme config.

### Quick references

- Village generation multiplier:
  - `balanceConfig.worldMap.villages.creationRateMultiplier`
- Quest feedback timeout:
  - `theme.quest.feedbackMessageDurationMs`
- Quest title word caps and weights:
  - `theme.quest.nameGeneration.*`

## Validation checklist used in this refactor

1. Update config ownership (balance vs. theme).
2. Update all call sites (`Quest*` systems + `WorldMap`).
3. Run lints/tests.
4. Confirm no remaining TODO markers in `balanceConfig.ts`.

## Economy baseline update (March 31, 2026)

- Added `balanceConfig.player.initialGold` in `js/config/balance/playerEnemyBalance.ts`.
- New player creation now reads startup gold from balance config (`PlayerBase`) instead of randomizing between 0 and 5.
- Current configured value is `500` gold.

### Why this is useful

- Economy tuning can now be done from one balance surface without touching entity logic.
- Test stability improved: player startup gold is deterministic and directly assertable.
- Future scenarios (e.g. “hardcore starts”, “rich merchant starts”) can switch this value via config-only changes.

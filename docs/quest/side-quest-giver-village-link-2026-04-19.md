# Side Quest Giver Village Link in Quest Cards (2026-04-19)

## What changed
- In the **Side Quests** panel card header metadata (`Giver: ... · Village: ...`), the village name is now rendered as a clickable location link button (`data-location-name="<village>"`) instead of plain text.
- The village link reuses existing quest location-link styling (`quest-entity-name location`) so it appears blue/underlined and behaves the same way as other quest location links.

## Implementation notes
- File updated: `rgfn_game/js/systems/quest/ui/QuestUiController.ts`
  - Added `buildLocationLinkMarkup(locationName)` helper.
  - Side-quest card builder now uses that helper for `giverVillageName`.
- No new click handler was required; `handleLocationClick(...)` already delegates all `[data-location-name]` interactions to world-map focus callback.

## Regression coverage
- Extended scenario test in `rgfn_game/test/systems/scenarios/questUiController.test.js`:
  - verifies side-quest card markup contains `data-location-name="Oakcross"`;
  - verifies village uses location-link class (`quest-entity-name location`).

## Why this is safe
- Uses existing event contract and existing CSS class contract.
- Does not alter quest generation/runtime state; UI-only markup update.

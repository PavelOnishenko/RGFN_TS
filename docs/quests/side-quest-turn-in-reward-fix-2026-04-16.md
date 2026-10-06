# Side-Quest Turn-In Reward Fix (2026-04-16)

## Symptom
- Side-quest turn-in logs displayed `"Reward received: <xp>, <gold>, <item>"`, but player progression did not change.
- XP, level progression, and gold stayed unchanged after successful side-quest turn-in.

## Root Cause
- `GameQuestRuntime.turnInSideQuest()` changed quest status to `completed` and returned reward text only.
- `GameFacade.turnInSideQuest()` forwarded runtime results without applying `rewardMetadata` to the player state.
- Result: reward messaging existed, but no gameplay state mutation happened for XP/gold.
- After first fix, another gap remained for legacy/in-flight side quests that had reward text but no `rewardMetadata` (for example from older saves). Those quests still logged rewards without applying XP/gold.
- After applying rewards in runtime/facade, village side-quest turn-in still did not force an immediate HUD refresh (`onUpdateHUD`) like other village economy actions do. This made XP/gold appear unchanged in the UI even after reward mutation.

## Fix
- `GameQuestRuntime.turnInSideQuest()` now returns `rewardMetadata` alongside reward text for successful turn-ins.
- `GameFacade.turnInSideQuest()` now applies:
  - `player.gold += rewardMetadata.gold`
  - `player.addXp(rewardMetadata.xp)`
- Added reward metadata resolver fallback that parses legacy reward text (`"<xp> XP, <gold>g, <item>"`) whenever structured metadata is absent, so side-quest rewards apply consistently across existing and newly generated quests.
- Added an immediate HUD refresh callback invocation after successful side-quest turn-in (`VillageActionsController.completeSideQuestTurnIn -> callbacks.onUpdateHUD()`), so stats/inventory panels reflect new XP and gold instantly.
- This ensures quest rewards are actually granted during hand-in, matching the log output and design intent.

## Notes
- Reward item names generated for side quests (`Repair Kit`, `Hunter Tonic`, `Scout Charm`, `Trail Rations`) are currently descriptive reward text, not wired to concrete inventory item IDs.
- XP and gold are now authoritative reward effects at turn-in.
- Resolver supports all side-quest types because reward application happens centrally in `GameFacade.turnInSideQuest()` after any successful side-quest hand-in, independent of objective type (`scout`, `deliver`, `recover`, etc.).

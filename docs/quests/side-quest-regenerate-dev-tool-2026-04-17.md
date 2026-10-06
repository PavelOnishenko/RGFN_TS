# Side-quest Regenerate Developer Tool (2026-04-17)

## What was added

A developer-only **Regenerate** button now appears in the **Quests → Side** panel on every visible side-quest card.

- The button is only rendered when persistent developer mode is enabled (`DeveloperModeConfig.enabled = true`).
- Clicking the button replaces that specific side quest with a newly generated random side quest from the same giver NPC and village.
- The replacement keeps the quest in the same panel bucket:
  - `available` quests remain `available`.
  - all other statuses are regenerated as `active` (so the regenerated quest is testable immediately).

## Why this helps

This removes the slow loop of waiting for village offer refreshes or manually reloading saves to get new side-quest variants.

It is especially useful for:

- validating objective text variants;
- quickly cycling reward metadata;
- testing location hint formatting;
- stress-testing quest progression and turn-in UX with many random templates.

## Runtime wiring summary

- `QuestUiController` now owns regenerate button rendering and click handling for side-quest cards.
- `GameRuntimeAssembly` wires UI callbacks:
  - `isDeveloperModeEnabled` (visibility gate),
  - `onRegenerateSideQuest` (action callback).
- `GameFacade.regenerateSideQuest` performs generation and replacement orchestration.
- `GameQuestRuntime` provides:
  - `getKnownSideQuest(questId)`,
  - `replaceKnownSideQuest(questId, replacement)`.

## QA notes

Recommended checks:

1. Enable developer mode in the developer modal.
2. Open Quests panel and switch to Side tab.
3. Confirm each side-quest card shows **Regenerate**.
4. Click regenerate on:
   - an available quest,
   - an active quest,
   - a ready/completed quest (if present in known list).
5. Verify the card updates to a new title/objectives and the success feedback message appears.
6. Disable developer mode and verify the button no longer appears.

## Known constraints

- Regeneration currently uses runtime random generation and does not pin seed per click.
- The regenerate action replaces quest identity (new quest id), so external references to old quest ids become stale.

## Follow-up fix (2026-04-19): NPC dialogue panel stale offer details

### Symptom

After regenerating a quest from the Quests panel, the village NPC dialogue side-quest board could still show the pre-regeneration offer text until the NPC was reselected.

### Root cause

`GameQuestRuntime.replaceKnownSideQuest(...)` re-rendered the Quests panel immediately, but the village dialogue side-quest UI was maintained by `VillageActionsController` and was not refreshed from that path.

### Resolution

- Added a public `VillageActionsController.refreshSelectedNpcSideQuestUi()` method to refresh side-quest board content for the currently selected NPC.
- Updated `GameFacade.regenerateSideQuest(...)` to call that refresh method after successful quest replacement.
- Added focused regression coverage in `villageActionsController.test.js` asserting selected-NPC side-quest cards re-render with regenerated offer data.

### Verification checklist

1. Enter a village and open dialogue with an NPC that has a side-quest offer.
2. Regenerate that quest from Quests → Side.
3. Confirm the NPC dialogue offer card updates immediately (title/details/reward) without changing NPC selection.

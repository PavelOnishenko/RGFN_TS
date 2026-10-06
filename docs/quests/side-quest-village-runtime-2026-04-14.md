# Side Quest Village Runtime (2026-04-14)

## What was added

- Quest typing now supports side-quest metadata directly on `QuestNode` root objects:
  - `track: 'main' | 'side'`
  - `giverNpcName`, `giverVillageName`
  - `reward`
  - `status: 'available' | 'active' | 'readyToTurnIn' | 'completed'`
- `GameQuestRuntime` now includes side-quest runtime state:
  - `activeSideQuests: QuestNode[]`
  - per-villager offer registry keyed as `village::npc`
  - configurable per-villager side-quest cap (clamped to 1..3)
- New runtime APIs:
  - `registerVillageSideQuestOffer(quest)`
  - `getVillageSideQuestOffers(villageName, npcName)`
  - `acceptSideQuest(questId)`
  - `markSideQuestReadyToTurnIn(questId)`
  - `turnInSideQuest(questId, npcName, villageName)`

## Runtime behavior

1. **Offer registration**
   - A side quest must include `id`, `giverNpcName`, and `giverVillageName`.
   - Duplicate offers / duplicate active quest IDs are rejected.
   - Offer cap is enforced per villager.

2. **Accepting side quests**
   - Accept removes the quest from that villager's offer list and moves it into `activeSideQuests`.
   - Accepted side quests are normalized to `track='side'` and `status='active'`.

3. **Turn-in validation**
   - Turn-in requires:
     - quest exists in `activeSideQuests`
     - quest status is `readyToTurnIn`
     - NPC + village exactly match the quest giver metadata
   - On success, quest transitions to `completed` and `isCompleted=true`.

## Village controller integration

- On NPC selection, village logic now:
  - checks side-quest offers from that NPC
  - logs offer visibility in dialogue log
  - accepts offered side quests through callback contract
  - attempts turn-in for tracked side quests when revisiting an NPC
- Turn-in validation is delegated to runtime (`turnInSideQuest`) so giver-lock rules are centralized.

## Persistence integration

- Save state now stores `sideQuests` array.
- On load, active side quests are restored as `track='side'` entries.

## Notes / extension points

- The current integration auto-accepts offers on NPC selection for flow simplicity.
- If explicit UI acceptance is needed later, wire a dedicated village action button and call the same callbacks.
- Reward handling currently returns reward text; economic/item granting is expected to be layered by caller.

## 2026-04-15: Player-facing side-quest UX in village dialogue

- The village dialogue modal now includes a **Side quests** panel (`#village-side-quest-panel`) with a per-NPC list (`#village-side-quest-list`).
- The panel renders quest cards with:
  - quest title + status label,
  - description,
  - **reward preview text** (`Reward preview: ...`).
- Action controls are now explicit:
  - **Accept quest** button appears for each offer.
  - **Turn in quest** button appears only when quest status is `readyToTurnIn`.
- Auto-accept-on-select was removed from default player flow.
  - Optional developer-only behavior now exists when developer mode is enabled.
- Side-quest callback surface expanded:
  - `getVillageNpcActiveSideQuests(villageName, npcName)` returns active/ready quests tied to quest giver.
- Logging updates now make progression explicit:
  - side-quest board updated snapshots per selected NPC,
  - accepted quest logs,
  - quest tracker updated logs,
  - ready-to-turn-in logs (once per quest id),
  - turn-in completion logs with reward text.

## 2026-04-16: Side-quest offer cards now show concrete task details before acceptance

- The side-quest card renderer now includes a **Task details** line when the quest has child objective descriptions.
- This line is sourced from the first non-empty child objective description that is different from the root quest description.
- Result: players can inspect the actual objective scope directly in the NPC dialogue side-quest block before clicking **Accept quest**, instead of needing to open the quest panel after accepting.
- Existing card fields remain unchanged:
  - title + status,
  - root quest description,
  - reward preview,
  - accept/turn-in action button depending on status.

### Regression guard added

- `villageActionsController` scenario tests now assert that offer cards surface the new `Task details: ...` line when objective child text exists.

### Verification checklist used for this change

1. Enter village.
2. Select NPC.
3. Confirm side-quest cards are visible with reward previews.
4. Click **Accept quest**.
5. Confirm acceptance + tracker update logs.
6. Return with a `readyToTurnIn` quest.
7. Click **Turn in quest**.
8. Confirm single completion + reward log, and that repeated turn-in does not grant duplicate completion.

## 2026-04-15: Side quest generation expansion

- `QuestObjectiveType` now includes side-focused objective leaves:
  - `localDelivery`
  - `gather`
  - `repair`
  - `patrol`
- `QuestObjectiveData` now carries dedicated payload shapes for those types:
  - `localDelivery` → village + source NPC + recipient NPC + item + completion flag.
  - `gather` → village + item + required/current amount.
  - `repair` → village + structure + required/repaired materials + completion flag.
  - `patrol` → village + checkpoint list + visited checkpoints + completion flag.
- Leaf pools are now split:
  - **Main quest leaf pool** remains unchanged (existing quest objective family only).
  - **Side quest leaf pool** includes all existing objective leaves plus new side-only leaves.
- Side quest leaf generation supports local constraints:
  - A side quest can pass `villageName` and `giverNpcName`.
  - Existing objective types (`deliver`, `travel`, `barter`, etc.) still generate, but are anchored locally to the giver context when generated as side quests.
- Side quest root metadata now includes reward metadata:
  - `rewardMetadata: { xp, gold, itemName, requiresTurnIn: true }`
  - Human-readable `reward` text remains for dialogue/UI continuity.
- Reward claim timing remains unchanged:
  - Rewards are still represented as claimable on giver turn-in (`readyToTurnIn` → `completed`) and not auto-claimed at objective completion.

## 2026-04-15: Proximity-constrained side-quest generation and village NPC locality

- World map village navigation now exposes a proximity query API:
  - `getNearbyVillagesFromVillage(villageName, maxDistanceCells)`
  - Output is distance-sorted and includes direction + distance metadata per nearby village.
- Side quest generation now consumes map proximity context:
  - Side-quest generation path provides current village + nearby villages.
  - Candidate side-quest villages are restricted to:
    - the giver's village
    - nearby villages only (never arbitrary far settlements)
- New balance controls:
  - `balanceConfig.quest.sideQuestMaxVillageDistanceCells` controls maximum allowed side-quest target range from the giver village.
  - `balanceConfig.quest.sideQuestNearbyRosterDistanceCells` controls village roster injection locality for side-quest-related NPC references.
- Objective text now reuses map direction hints:
  - Quest leaf descriptions/conditions annotate nearby settlement names with distance-direction context when available, e.g. `VillageName (north-east, 3 cells)`.
  - Distance annotations are suppressed for zero-distance (same-village) objectives.
- Village action/dialogue locality behavior tightened:
  - Known-person dialogue options are filtered to current village + immediate nearby villages.
  - Accepted side quests can inject referenced NPCs only into local/nearby village rosters, never distant village rosters.
  - This keeps rumor, dialogue, and objective references spatially coherent for the active local play area.

## 2026-04-15: Probabilistic side-quest offers per villager on village entry

- Side-quest offer generation now runs **on village entry**, not on NPC selection.
- New balance parameters were added under `balanceConfig.quest`:
  - `sideQuestVillagerOfferChance` (default `0.2`) → base per-villager chance to have side quests for that entry.
  - `sideQuestMaxOffersPerVillager` (default `2`, clamped to `1..3`) → max generated offers for a villager in one entry roll.
- Roll behavior per villager:
  1. First roll decides whether villager has at least one quest (`chance` check).
  2. If first roll succeeds, at least one quest is guaranteed.
  3. Additional offers up to max are rolled independently with the same chance.
- Runtime integration details:
  - `VillageActionsController` computes per-villager quest-count rolls on `enterVillage`.
  - Callback contract now includes `initializeVillageSideQuestOffers(villageName, npcQuestOfferRolls)`.
  - `GameFacade` clears existing **unaccepted** village offers for that village and asynchronously regenerates offers through `QuestGenerator.generateSideQuest`.
  - `GameQuestRuntime` now provides `clearVillageSideQuestOffers(villageName)` to support per-entry re-roll behavior.
- ID generation details:
  - Side-quest IDs are generated as `side.<village>.<npc>.<timestamp>.<sequence>` to avoid collisions across entries and NPC batches.

### Why this fixes "no villagers have quests"

- Previously there was side-quest offer storage + UI, but no village-entry generation hook guaranteed that NPCs would receive new offers.
- With entry-time probabilistic generation wired into the runtime callback chain, villagers now reliably have a configurable chance to spawn offers whenever the player enters a village.

## 2026-04-16: Clarification for "In progress" side quests shown before manual acceptance

- Root cause observed: side quests could appear as **In progress** immediately for an NPC in some sessions because active side quests already existed in runtime state (from earlier acceptance/save), while UI also previously had a developer-mode auto-accept path.
- UX/runtime adjustments made:
  - Developer-mode auto-accept path was removed so side quests are always explicitly accepted by player action.
  - Village dialogue now emits an explicit line when an NPC has no new offers but does have active quests:
    - `No new side-quest offers from <NPC>. <N> quest(s) already in progress from earlier acceptance.`
- Practical debugging tip:
  - If a quest card is **In progress** with no Accept button, check the log for the line above; this indicates an already-active quest rather than a newly spawned unaccepted offer.

## 2026-04-16: Quests HUD tabs (Main Quests / Side Quests)

- The HUD Quests window now has explicit tabs:
  - **Main Quests**: renders the generated main-quest tree exactly as before.
  - **Side Quests**: renders all side quests known by runtime (`available` offers + accepted `active`/`readyToTurnIn` + `completed`).
- Side quests in the HUD are rendered as expandable cards (`<details>`):
  - each card contains quest metadata (giver NPC + village + optional reward),
  - each card contains the full nested quest objective tree under that side-quest root.
- Status chips are shown in the Side Quests tab:
  - `Available`, `Active`, `Ready to turn in`, `Completed`.
- Side-tab status filter UX:
  - **Main Quests** tab keeps the existing checkbox `Show only known/current quests`.
  - **Side Quests** tab now shows a dedicated **Filter statuses** button.
  - Clicking **Filter statuses** opens a popup list with checkboxes for:
    - `Active`
    - `Available`
    - `Ready to turn in`
    - `Completed`
  - Popup applies changes only after clicking **Apply**.
  - Default side-tab filter set is:
    - `Active` ✅
    - `Ready to turn in` ✅
    - `Completed` ✅
    - `Available` ❌
  - Side-tab filter is persisted in local storage as comma-separated statuses:
    - key: `rgfn_side_quests_status_filter_v1`
    - example: `active,readyToTurnIn,completed`
  - UI wiring note:
    - `#quests-side-filter-controls` must not keep the global `hidden` utility class in markup.
    - Visibility is controlled by `QuestUiController` via tab-aware `style.display`; leaving `hidden` on the container will keep the button invisible even on Side Quests tab.

### Runtime/UI synchronization notes

- `GameQuestRuntime` now re-renders the Quests HUD after side-quest state transitions:
  - offer registration,
  - accept,
  - mark-ready-to-turn-in,

## 2026-04-19: Offer-card header now includes side-quest type and trims boilerplate line

- Village side-quest cards now expose the **side-quest type directly in the first line**:
  - Format: `<Quest Title> — <Status> (<Type>)`
  - Example: `Kadra Zentor's Request — Offer available (Purge)`.
- Type label resolution prioritizes the first leaf objective type when present (the actionable objective), then falls back to the root quest objective type.
- Type labels are normalized for readability:
  - `deliver` / `localDelivery` → `Courier`
  - `eliminate` / `hunt` → `Purge`
  - others map 1:1 (`Scout`, `Recover`, `Escort`, `Defend`, `Gather`, `Repair`, `Patrol`, `Travel`, `Barter`).
- The old root-description boilerplate line is now suppressed when it matches:
  - `Assist <NPC> with a local task in <Village>.`
- Practical result:
  - players can scan offer lists by quest category immediately (Courier/Purge/etc.),
  - redundant introductory copy is removed from the card body,
  - concrete objective context remains available through the existing `Task details: ...` line.

### Regression coverage

- `villageActionsController` scenario tests now assert:
  - offer card header includes the normalized type label,
  - boilerplate root description is omitted,
  - task-details line still renders for leaf objective descriptions.
  - turn-in completion.
- This prevents stale HUD state where village-side quest cards update but HUD Quests panel does not.
  - Offer cards remain labeled **Offer available** and include an **Accept quest** button.

## 2026-04-16: Side-quest offer refusal (hide clutter without accepting)

- Village NPC dialogue side-quest cards now expose a second explicit offer action:
  - **Accept quest** (existing behavior),
  - **Refuse** (new behavior).
- Refuse behavior is intentionally non-destructive:
  - the offer is **hidden from the selected NPC side-quest panel** to reduce clutter,
  - no runtime acceptance occurs,
  - no quest progress/status mutation occurs.
- Scope/identity of hidden offers:
  - hides a **specific offer ID** only,
  - does **not** block future offers from that same NPC.
- Practical UX effect:
  - if multiple offers exist, player can decline noisy ones and keep only relevant cards visible in the dialogue panel.

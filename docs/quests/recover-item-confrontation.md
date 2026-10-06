# Recover Quest: Village Holder Confrontation (RGFN)

## What changed

`recover` objectives are now playable end-to-end:

1. The target artifact starts in a specific village.
2. Talking to villagers can reveal the exact person holding it.
3. Once confirmed, confronting that person starts a forced duel.
4. If player wins, the artifact is awarded and the objective completes.
5. If player flees, the holder escapes to another village and the quest text switches to a person-hunt state.

## Runtime behavior details

- Recover objectives now store dedicated recover metadata in quest objective data:
  - `itemName`, `personName`
  - `initialVillage`, `currentVillage`
  - `isPersonKnown`, `hasFled`
  - `enemyProfile` (persistent combat profile so stats stay stable between encounters)
- When any non-target NPC is selected in the right village, the system can reveal the holder identity.
- Recover confrontation is triggered from village dialogue confirmation flow.
- On `fled`, holder relocation can repeat endlessly; every flee picks a different village when possible.
- Person-location interrogation uses existing person-direction hint pipeline via quest contracts.
- When the holder is revealed by a villager, the holder NPC is injected into the current village rumor roster immediately so the player can select and confront them without leaving/re-entering the village.
- Village dialogue now includes a dedicated **Confront for quest item** button to start recover-target fights explicitly (no barter wording required).

## How to test manually (player-facing)

Use these steps to validate a recover quest from a fresh world:

1. Generate a world and get a main quest that contains a `Recover <Item>` objective.
2. Travel to the quest village shown in objective text.
3. Talk to villagers (click NPC entries in **Village Rumors**).
4. Watch the log for a line like:
   - `"<NPC> lowers their voice: "<Target Name> is carrying <Item>. You'll find them in this village."`
5. Confirm that `<Target Name>` appears as a selectable NPC in the **Village Rumors** list immediately after that reveal line.
6. Select that target NPC and click **Confront for quest item**.
7. Verify battle starts against that exact person.
8. Resolve battle:
   - **Victory**: quest objective completes and item is granted.
   - **Flee**: holder relocates; quest updates to person-hunt wording with latest village lead.

## Troubleshooting

- If quest text says the holder is known, but the holder is not in the village NPC list:
  - Ensure you are on a build that includes the roster-injection fix (holder is added at reveal time).
  - Reproduce on a fresh world and check for the reveal log line; if that line exists, holder should be present immediately in the rumor list.
- If no confrontation starts after selecting the revealed holder:
  - Verify you are in the holder's `currentVillage` from quest text.
  - Verify the holder name in selected NPC exactly matches the quest condition target.
  - Verify you clicked **Confront for quest item** (not barter buttons).

## Files and systems touched

- Quest generation now writes recover objective payload (`QuestLeafFactory`).
- Quest runtime now:
  - reveals holder identity,
  - starts recover confrontation battles,
  - resolves victory/flee outcomes,
  - refreshes contracts after recover state transitions.
- Village interaction now:
  - logs villager lead reveal,
  - starts confrontation battle from dialogue action.
- Battle runtime now exposes a battle-ended callback so recover outcomes are applied centrally.

## Edge cases

- If only one village exists in world data, flee relocation falls back to same village.
- Recover reward item uses type `quest` and is inserted through normal inventory add flow.
- Recover person contracts are discoverability-only (not converted into barter deals).

## Notes for future expansion

- Add dedicated UI button/text for confrontation to separate it from barter semantics.
- Add reputation or legal consequences for aggressive recovery in lawful settlements.
- Add bounty escalation for repeated flee cycles.

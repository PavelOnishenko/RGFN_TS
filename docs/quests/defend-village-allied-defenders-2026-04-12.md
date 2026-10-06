# Defend Quest: Allied Villager Defenders (2026-04-12)

## Problem observed

During defend-quest battles, only hostile **Hired Blade** units were clearly present while village teammates were not reliably represented as a persistent, mortal defense force tied to village population.

## Implemented behavior

1. **Defenders are selected from village NPC names**
   - Defense roster still starts from village-side villager names supplied at defend-quest activation.
   - Defenders are persisted in quest objective data.

2. **Each defender now carries persisted combat profile metadata**
   - `name`
   - `level`
   - `maxHp/currentHp`
   - `inventoryItemIds`
   - `equippedWeaponItemId` / `equippedArmorItemId`
   - `stats` block (damage/armor/mana + six core attributes)

3. **Defense battles spawn allied teammates from that persisted roster**
   - Allies are created from defender profile data (rather than generic throwaway templates).
   - Battle log now explicitly lists defenders participating in each raid.

4. **Mortality is persistent**
   - Defenders missing from survivors are marked dead.
   - Dead names are tracked in `fallenDefenderNames`.
   - Dead defenders are removed from active defend roster and no longer spawn in later defense fights.

5. **Village roster synchronization**
   - Village actions now remove NPCs whose names appear in `fallenDefenderNames` for that village.
   - If a fallen NPC was selected, selection is cleared to avoid stale interactions.
   - This keeps village rumors/NPC list consistent with battle casualties.

6. **Contracts payload expanded**
   - Defend contracts now include:
     - `activeDefenderNames`
     - `fallenDefenderNames`
   - This allows UI/runtime consumers to stay synchronized without re-walking full quest state.

## Test coverage added

- `recoverQuestRuntime.test.js`
  - defend contract now asserts active/fallen defender arrays.
  - new test validates battle casualty processing updates fallen + active lists.
- `villageActionsController.test.js`
  - new test verifies fallen defenders are removed from village rumor roster.

## Balancing + extension notes

- Defender profile generation currently uses lightweight randomized items/stats for robustness and persistence.
- Future extension path:
  - expose defender cards in a dedicated “Village Defense Roster” panel,
  - surface inventory/equipment details directly in UI,
  - add named role heuristics (guard/hunter/blacksmith) to influence generated loadouts.

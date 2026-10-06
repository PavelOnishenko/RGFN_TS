# Courier objective implementation guide

## Goal
Make `Courier: <item>` objectives **fully completable** and self-explanatory from the quest UI and village log.

A courier objective now has an explicit two-step flow:
1. Pick up a named item from a named person in a named source village.
2. Reach the named destination village while still carrying that item.

## Refactoring summary

### 1) Quest data model
- Added `objectiveData.deliver` on `QuestNode`.
- It stores:
  - `sourceVillage`
  - `sourceTrader`
  - `destinationVillage`
  - `itemName`
  - `isPickedUp` (runtime + save-state progression)

This removes ambiguity from relying on free-form text parsing and makes deliver logic deterministic.

### 2) Quest generation
- Deliver leaves now generate:
  - item artifact
  - source trader
  - source village
  - destination village
- Description and condition text include all pickup and delivery details.
- All these values are also placed in `objectiveData.deliver`.

### 3) Progress tracking
- Added `recordLocationEntryWithInventory(locationName, carriedItems)`.
- Deliver objective completion now requires all of:
  - pickup already registered (`isPickedUp = true`)
  - entered destination village
  - item currently in inventory
- `recordBarterCompletion(traderName, itemName, villageName)` now also marks courier pickup only if trader+item+source village all match.

### 4) Village contract wiring
- Quest barter contracts now support typed contracts:
  - `barter`
  - `deliver`
- Deliver contracts can specify `sourceVillage` and `destinationVillage`.
- Source-village assignment now respects courier contract `sourceVillage` instead of assigning only by first village visited.
- Village rumor lines now include courier-specific hints (pickup here, deliver to destination).

## Style guide additions (for future quest work)

1. **No string parsing for core objective state.**
   - Put all machine-critical values in `objectiveData`.
2. **Preserve readable narrative text, but treat it as presentation.**
   - Logic reads structured fields; UI reads both structured fields and human-facing text.
3. **Keep objective tracking methods single-purpose.**
   - e.g., location matcher, barter matcher, courier pickup matcher.
4. **Case-insensitive matching everywhere player-facing names are compared.**
   - trader, item, village.
5. **Persist objective sub-state in save payload.**
   - do not keep transient-only flags for quest completion logic.

## Testing guide

### Unit coverage expected
1. **Quest leaf generation tests**
   - Deliver leaf includes source trader/village and destination in both text and `objectiveData`.
2. **Quest progress tracker tests**
   - Wrong source village pickup does not count.
   - Correct source village pickup sets deliver pickup state.
   - Destination entry without item does not complete.
   - Destination entry with item does complete.
3. **Regression checks**
   - Existing travel and barter behavior still works.

### Manual QA scenario
1. Start a new character and open quest panel.
2. Find a courier objective; confirm it says from **person + source village** to **destination village**.
3. Enter source village and complete barter with named person.
4. Confirm village log mentions transfer + courier rumor hints.
5. Travel to destination with item still in inventory.
6. Confirm courier node becomes completed in quest panel.

## Why this design
- It guarantees that the objective is completable from existing world villages.
- It makes player guidance explicit in both quest panel and village logs.
- It keeps logic maintainable by separating narrative text from objective state.

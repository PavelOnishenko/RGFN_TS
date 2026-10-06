# Courier Side Quest Flow (Local Delivery)

## Problem fixed
Courier/local-delivery side quests could be accepted, but players had no NPC dialogue action to **pick up** the package from the source NPC.
That made these side quests impossible to complete in normal play.

## Implemented runtime behavior
- Added a dedicated dialogue action button in village NPC dialogue: `Discuss courier handoff`.
- Button label is dynamic by context:
  - `Pick up <Item>` when speaking to the courier source NPC and item is not yet picked up.
  - `Hand over <Item>` when speaking to the delivery recipient NPC while carrying the item.
- Pickup:
  - Creates a quest item in inventory (`type: quest`, sprite `quest-item-sprite`).
  - Marks local delivery objective `isPickedUp = true`.
- Delivery:
  - Removes the item from inventory.
  - Marks local delivery objective `isDelivered = true`.
  - Marks side quest `readyToTurnIn` via side-quest runtime callback.

## Important distinction: `localDelivery` vs `deliver`
- `localDelivery` objectives are handoff-in-village objectives with explicit source NPC and recipient NPC in the same village.
- `deliver` objectives are cross-village courier objectives (pickup from source NPC/village, then travel to destination village while carrying item).
- The dialogue courier action now supports pickup for **both** objective types:
  - local in-village pickup/handover (`localDelivery`)
  - source-village pickup for travel courier contracts (`deliver`)

## Side-quest readiness for travel courier contracts
- Active side quests with `deliver` objectives now auto-transition to `readyToTurnIn` when:
  1. the objective item has been picked up, and
  2. the player enters the destination village while carrying that item.
- This closes the gap where pickup worked but travel completion did not update side-quest readiness.

## Data model update
`LocalDeliveryObjectiveData` now supports:
- `isPickedUp?: boolean`
- `isDelivered?: boolean`

Both are stored on the quest objective and drive dialogue action visibility and progression.

## Integration points
- Village dialogue UI and event binding include new button id: `village-courier-action-btn`.
- Village actions controller now scans active side quests to find a matching local-delivery objective for the selected NPC and village.
- Dialogue interaction service executes pickup/delivery and updates side-quest state/UI.

## Why this is safe
- Courier action is shown only when a matching active local-delivery objective exists in the current village.
- Existing barter/recover/escort/defend actions are unchanged.
- Fallback logs are provided for missing item / no matching courier state.

## Tests
A scenario test now verifies end-to-end courier side quest flow:
1. Source NPC shows pickup action.
2. Pickup adds quest item and flips `isPickedUp`.
3. Recipient NPC shows handover action.
4. Handover removes item, flips `isDelivered`, and marks side quest ready to turn in.

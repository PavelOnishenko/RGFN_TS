# Inventory Drop Recovery (RGFN)

## What changed

A new button was added in the **Inventory** panel:

- **Recover Last Dropped Item** (`#undo-last-drop-btn`)

This button allows the player to undo the most recent inventory drop made with **right-click**.

## Player-facing behavior

1. Right-click an inventory item to drop it.
2. The dropped item is stored as the current "last dropped" item.
3. Click **Recover Last Dropped Item** to put that item back into inventory.
4. After successful recovery, the stored item is cleared.

## Rules and edge cases

- Only the **most recently dropped** item can be recovered.
- If another item is dropped before recovery, the previous recoverable item is replaced.
- If inventory is full when trying to recover, recovery fails and a log message is shown.
- The recover button is disabled when there is no recoverable item.

## Log messaging

- On drop: informs that the item can be restored with the recover button.
- On successful recover: logs that the item was recovered.
- On failed recover due to full inventory: logs that recovery failed because inventory is full.

## Implementation notes

- Recovery state is tracked in `HudController` as `lastDroppedItem`.
- UI enabled/disabled state is updated during HUD refresh.
- Recovery uses `player.addItemToInventory(...)` so capacity checks are consistent with normal inventory adds.

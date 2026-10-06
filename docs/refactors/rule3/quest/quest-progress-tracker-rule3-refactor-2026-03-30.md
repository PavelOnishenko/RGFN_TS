# QuestProgressTracker.ts Rule 3 Refactor (2026-03-30)

## Goal
Apply style-guide Rule 3 (`< 200 LOC`) to `js/systems/quest/QuestProgressTracker.ts` without changing quest progress behavior.

## Why this split
The original tracker mixed four responsibilities in one 277-line file:
- location + delivery state updates,
- barter + courier pickup updates,
- monster elimination progress accounting,
- tree completion recomputation.

Splitting by behavior domain lowers cognitive load and reduces regression risk when adding new objective types.

## New structure
- `js/systems/quest/QuestProgressTracker.ts`
  - public API + input normalization + orchestration.
- `js/systems/quest/QuestLocationTradeProgress.ts`
  - travel/scout completion, barter completion, and courier pickup + destination logic.
- `js/systems/quest/QuestMonsterProgress.ts`
  - eliminate/hunt kill accumulation and active objective projection.
- `js/systems/quest/QuestTraversalCompletion.ts`
  - recursive parent completion recomputation.

All files in this change are `< 200 LOC`.

## Behavioral notes
- `recordLocationEntry()` now delegates to `recordLocationEntryWithInventory(location, [])` to remove duplicated normalization/recompute logic while keeping behavior unchanged.
- Courier objective behavior is preserved:
  1. pickup is set only when trader/item/source village all match,
  2. completion requires destination arrival *and* carrying the item.
- Monster objective behavior is preserved:
  - kill count saturates at `requiredKills`,
  - objective completes at threshold,
  - active objective list excludes completed or zero-remaining goals.

## Verification checklist used
1. TypeScript build for RGFN scope.
2. Focused node test suite for quest tracker behavior.
3. Style-guide LOC audit for RGFN scope.

## Useful follow-up ideas
- If future objective types need progress tracking, add a dedicated progress class per objective family and keep `QuestProgressTracker` orchestration-only.
- Consider extracting the repeated leaf-node traversal pattern into a reusable quest tree visitor helper when a third progress domain appears.

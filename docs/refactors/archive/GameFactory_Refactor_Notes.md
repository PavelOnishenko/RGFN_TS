# GameFactory Refactor Notes (Rule 3)

## What changed
- `GameFactory.ts` now focuses on runtime composition only.
- UI event binding logic was moved into `GameRuntimeUiBinder`.
- Game mode state machine construction was moved into `GameRuntimeStateMachineFactory`.
- Runtime setup hotspots were extracted into helper builders:
  - `createPlayer`
  - `createQuestUiController`
  - `createBattleControllers`

## Why this helps
- Keeps each file under 200 LOC in line with style-guide rule 3.
- Reduces the cognitive load in `GameFactory.ts` by isolating responsibilities.
- Makes future changes safer: input/event wiring and state-machine wiring are now independently editable.
- Makes battle wiring easier to review because callbacks are grouped in one helper.

## Follow-up ideas
- If `createGameRuntime` grows again, split battle/world/village assembly into dedicated runtime assemblers.
- Add focused tests around `GameRuntimeUiBinder.createHandlers` interactions and state-machine transitions.
- Consider a typed `RuntimeAssembly` interface for all intermediate services to improve refactor safety.

## April 2, 2026 update: quest text corruption fix (`<pre>Cannot`, `Lang="en"> GET`, leaked paths)

### Reported runtime symptoms
- Quest text intermittently rendered corrupted names containing HTML fragments and path-like strings.
- Example classes observed in UI:
  - `<pre>Cannot ...`
  - `Lang="en"> GET`
  - `/rgfn_game/dist/data/...`

### Root-cause summary
- Quest pack local data files were referenced with a wrong relative depth in `ASSET_PATHS`.
- Asset token parsing accepted arbitrary whitespace tokens (including error payload text), allowing malformed content to leak into generated names.

### Applied fix
- Corrected quest-pack local asset paths in:
  - `js/systems/quest/generation/QuestPackTypes.ts`
  - `../../../data/...` ➜ `../../../../data/...`
- Added strict lexical token filtering in:
  - `js/systems/quest/generation/QuestPackService.ts`
- Added guard that throws when sanitized asset data is empty, preventing silent bad-name generation.
- Added regression coverage in:
  - `test/systems/questPackService.test.js`
  - New test: ignores HTML/error payload tokens in local asset files.

### Commands run
- `npm run build:rgfn` ✅
- `node --test rgfn_game/test/systems/questPackService.test.js` ✅
- `node --test rgfn_game/test/**/*.test.js` ⚠️
  - One pre-existing failure remains in `rgfn_game/test/entities/skeleton.test.js` (`Skeleton behavior checks...`), unrelated to this quest-pack fix.

## March 29, 2026 update: Arrow-function-style warning cleanup in core RGFN gameplay files

### Scope completed in this pass
- Resolved the specific `style-guide/arrow-function-style` warnings reported for:
  - `js/Game.ts`
  - `js/config/creatureStats.ts`
  - `js/entities/Skeleton.ts`
  - `js/entities/Wanderer.ts`
  - `js/entities/monster/MonsterMutationEngine.ts`
  - `js/entities/monster/MonsterStatusEffects.ts`
  - `js/entities/player/core/PlayerBase.ts`

### Implementation notes
- Converted single-return method bodies to concise arrow function style where requested by lint output.
- For class members, used arrow-property syntax (`name = (...) => ...`) to satisfy the local style-guide rule consistently.
- Preserved behavior:
  - no algorithm changes,
  - no changes to mutation math, combat math, or save/load payload shape,
  - only function form / formatting changes.
- Follow-up formatting pass addressed:
  - indentation shifts introduced by method-to-property conversion,
  - max-line-length splits on long concise-return lines.

### Verification commands and outcomes
- `npx eslint rgfn_game/js/Game.ts rgfn_game/js/config/creatureStats.ts rgfn_game/js/entities/Skeleton.ts rgfn_game/js/entities/Wanderer.ts rgfn_game/js/entities/monster/MonsterMutationEngine.ts rgfn_game/js/entities/monster/MonsterStatusEffects.ts rgfn_game/js/entities/player/core/PlayerBase.ts --ext .ts` ✅
  - No lint warnings remain in the explicitly requested files.
- `npm run lint:ts:rgfn` ⚠️
  - Targeted files are clean.
  - Repo still contains many pre-existing arrow-style warnings in unrelated RGFN files (outside this request scope).
- `npm test` ⚠️
  - Fails due to pre-existing monorepo test-environment issues (missing `dist` imports in EVA/RGFN tests) and unrelated root gameplay test failures.

### Useful follow-up if full green CI is required
- If the team wants global arrow-style cleanup, run an incremental per-folder remediation to avoid mega-diffs.
- If `npm test` should be green locally, add/verify pre-test build steps that materialize expected `dist/**` JS entrypoints for both `eva_game` and `rgfn_game`.

## March 29, 2026 update: Rule 17 now covers multiline function parameter lists

### What changed
- Extended ESLint custom rule `style-guide/rule17-comma-layout` to treat **function/method/type parameter lists** as the same class of comma-separated list as object/array initializers.
- New behavior mirrors the existing brace/bracket logic exactly:
  - if multiline params can fit into one line under Rule 17 line budget, lint warns to compact,
  - multiline layout must keep list members strictly between opening and closing parenthesis lines,
  - each internal member line must remain within line-length budget.
- Applies to runtime and TS signature nodes (`FunctionDeclaration`, `FunctionExpression`, `ArrowFunctionExpression`, `TSDeclareFunction`, `TSCallSignatureDeclaration`, `TSConstructSignatureDeclaration`, `TSMethodSignature`, `TSFunctionType`).

### Why this is useful
- Makes formatting policy consistent across all comma-separated value lists.
- Catches verbose multiline signatures like:
  - `public drawEntity( ... many short params ... ): void { ... }`
  - when they actually fit in a single compact line.

### Verification commands and outcomes
- `npm run lint:ts:rgfn:eslint` ✅
  - Rule now emits parameter-list warnings across RGFN where signatures are compactable (16 warnings in current tree).
- `npm run build:rgfn` ✅
- `node --test rgfn_game/test/**/*.test.js` ⚠️
  - 9 pre-existing failures remain due to missing dist imports (`rgfn_game/dist/config/balanceConfig.js`, `rgfn_game/dist/entities/Player.js`) in several test files.

## March 29, 2026 update: RGFN Rule 17 layout cleanup pass (20 violations fixed)

### Scope and objective
- Task targeted **RGFN only** (`rgfn_game/**`), not Neon Void root gameplay code.
- Goal was to remove the reported Rule 17 comma-layout violations by applying compact one-line initializers where allowed by line-length budget.

### What was fixed
- All currently reported RGFN Rule 17 warnings were addressed in one formatting-only pass (no behavior changes intended).
- Affected areas:
  - player persistence inventory restore payload object,
  - village dialogue compact refusal/uncertain response objects,
  - village life crossroads point array,
  - village population palette arrays,
  - world map display config and several compact object initializer sites,
  - world map renderer hex-color parse return object,
  - battle splash modal element return object,
  - grid-map cell/dimension return objects,
  - state-machine callback container object.

### Verification commands and outcomes
- `npm run lint:ts:rgfn` ✅
  - ESLint warnings for `style-guide/rule17-comma-layout` are now cleared for `rgfn_game`.
  - Style-guide audit still reports historical Rule 2/3/16 backlog; that audit is informational and unrelated to this Rule 17 task.
- `npm run build:rgfn` ✅
  - TypeScript compile for RGFN completed successfully.
- `node --test rgfn_game/test/**/*.test.js` ⚠️
  - Multiple pre-existing test failures remain due to missing compiled artifacts in `rgfn_game/dist` imports (not introduced by this formatting pass), especially missing `dist/config/balanceConfig.js` and certain dist entity modules required by specific test files.
- `npm test` ⚠️
  - Monorepo-wide tests fail for additional pre-existing reasons outside RGFN formatting scope (missing EVA/RGFN dist modules and several unrelated root-suite assertion/type errors).

### Useful follow-up notes
- If strict CI requires green `node --test rgfn_game/test/**/*.test.js`, ensure all dist dependencies expected by tests are actually produced by the current build graph (notably `rgfn_game/dist/config/balanceConfig.js` and `rgfn_game/dist/entities/Player.js` for tests that import those files directly).
- Consider adding a pre-test guard script that verifies required dist entrypoints and prints actionable build hints before test execution.

## March 28, 2026 update (follow-up): World Map panel vanished when sibling panel toggled due in-flow draggable layout

### New issue after prior fix
- World Map became draggable/closable again, but could disappear when another panel was opened.
- When that second panel was hidden, World Map reappeared near prior location.
- This indicated position state was preserved but rendering origin was drifting.

### Root cause
- Draggable windows were styled as `position: relative` and moved by `transform`.
- Relative elements remain in normal flex flow, so opening/closing sibling panels changed each panel’s base layout box.
- Stored transform offsets were then applied on top of a shifted base, causing apparent jump/vanish behavior.

### Final fix
- Updated `.draggable-panel` to out-of-flow absolute positioning (`position:absolute; top:0; left:0`) so sibling visibility no longer shifts base origin.
- Preserved existing offset-based drag/spawn behavior (`--panel-offset-x/y`), so no controller logic rewrite was required.
- Added explicit mobile fallback reset (`position: static; transform: none` inside `max-width: 920px`) to keep stacked small-screen UX intact.

### Manual QA steps
1. Open World Map and drag it to a distinct location.
2. Open/close `Stats`, `Skills`, and `Inventory` in varying order.
3. Confirm World Map does not vanish/jump and remains draggable/closable.
4. Confirm all draggable HUD panels now exhibit identical show/hide/drag behavior.
5. Verify mobile breakpoint fallback still stacks panels without absolute overlap.

### Commands to run
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`

## March 28, 2026 update: World Map panel must remain independent from sibling panel visibility

### Reported issue
- World Map panel became visually unstable when additional HUD panels were open.
- Symptoms:
  - panel looked auto-resized/compressed,
  - vertical scrollbar appeared in the panel unexpectedly,
  - behavior depended on how many other overlay panels were currently visible.

### Root cause summary
- World Map panel uses the same draggable-window decoration logic as other HUD windows (this is expected and should be preserved).
- CSS grouped `#world-sidebar` with `#game-log-container` under shared `max-height` + `overflow:auto`, allowing flex shrink + forced scrolling under constrained overlay layout.

### Fix summary
- Updated `#world-sidebar` CSS to remove auto-clamp/scroll coupling:
  - `flex-shrink: 0`
  - `max-height: none`
  - `overflow: visible`
- Kept World Map panel in the same draggable/closable HUD window flow so behavior matches other panels (`drag handle` + `✕` close).

### Why this is the correct behavior
- World Map panel is a primary interaction panel (navigation + recenter + travel actions), not a transient utility panel.
- It should remain dimensionally stable regardless of how many informational HUD windows are opened nearby.
- Drag/overlap mechanics and quick close affordance remain available to the player for consistency with other HUD panels.

### Manual QA steps
1. Open World Map panel and confirm no forced scrollbar appears.
2. Open/close several other panels (`Stats`, `Skills`, `Inventory`, `Log`) in different sequences.
3. Verify World Map panel dimensions and content layout remain unchanged.
4. Verify World Map remains draggable and closable (`✕`) like other HUD panels.
5. On small viewport/mobile fallback width, confirm layout still stacks without world panel clipping.

### Commands to run
- `npm run build:rgfn`
## March 28, 2026 update (follow-up 4): roads are now discoverable by road cells, not only by villages

### Problem seen after first road pass
- Curved roads were rendered only when their endpoint villages were visible.
- Result: standing directly on a road corridor could still show no road unless both connected villages had already been discovered.
- This contradicted expected exploration behavior (road discovery should happen from road traversal itself).

### What was changed
- Added explicit **road-per-cell** world state:
  - `roadIndexSet: Set<number>` stores whether each world-map cell contains a road fragment.
  - `villageRoadLinks` stores deterministic curved road topology used for rendering.
- Added deterministic road network build step:
  - `generateVillageRoadNetwork()` now runs after village generation and after village restore.
  - Links are still nearest-neighbor + de-duplicated, but each link is sampled and rasterized into road cells.
- Rendering behavior changed:
  - Roads are no longer gated by village visibility.
  - Renderer samples each curved link and draws only contiguous segments whose sampled cells are no longer `unknown` fog.
  - This means road fragments become visible as soon as those road cells are discovered (visited/seen), even before both villages are known.
- Styling kept:
  - Thin warm-yellow line with soft glow.
  - Smooth visual path via sampled points + quadratic smoothing in renderer.

### Additional regression coverage
- Added a world-map test that verifies:
  - road cells are actually tracked (`roadIndexSet` populated),
  - non-village road cells exist,
  - drawing emits road paths after revealing a road cell (without requiring both village endpoints to be known).

### Commands run
- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/worldMap.test.js rgfn_game/test/systems/worldMapRenderer.test.js`
- `node --test rgfn_game/test/**/*.test.js` (full suite pass in this run)

## March 28, 2026 update (follow-up 3): curved village roads on the world map

### Feedback addressed
- Villages looked disconnected on larger maps.
- Requested presentation: thin yellow roads, visually smooth (curves instead of rectangular/angular turns), and stylized enough to feel "alive" rather than purely geometric.

### What was changed
- Added a dedicated curved-road draw pass in world-map rendering:
  - `WorldMap.drawVillageRoads(...)` now runs before village icon rendering, so roads sit under village markers.
- Road link generation:
  - For each visible village, map selects its two nearest visible village neighbors.
  - Duplicate links are normalized and removed (A↔B drawn once).
- Curve shaping:
  - Per-road deterministic bend is generated from world-seed-derived pair hashing, so road silhouettes are stable for a given world seed/layout.
  - Each road is rendered as two chained quadratic curves (smooth S/C arcs), avoiding rectilinear elbows.
- Style pass:
  - Thin warm-yellow core stroke with a soft wider glow stroke underneath.
  - Alpha is slightly reduced for hidden (but discovered) villages and stronger for currently visible discovered villages.

### Files touched
- `js/systems/world/WorldMap.ts`
- `js/systems/world/WorldMapRenderer.ts`

### Notes for future tuning
- If map density increases, road count may become visually busy; if so, reduce nearest-neighbor count from 2 → 1 for sparse "main route" style.
- If roads should avoid water/mountain biomes in a future pass, add terrain-aware pathfinding/polyline sampling before final curve fitting.

### Commands run
- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/worldMap.test.js rgfn_game/test/systems/worldMapRenderer.test.js`
- `node --test rgfn_game/test/**/*.test.js` (one unrelated pre-existing failure in `skeleton.test.js`)

## March 28, 2026 update (follow-up): village names shortened + spacing frequency increased

### Feedback addressed
- Names felt too bulky after the first expansion (too many stitched segments).
- Multi-word names with spaces were too rare.
- Desired profile: mostly 1–2 words, 3-word rare, 4-word very rare.

### What was changed
- Reworked village generator to two-level weighting:
  1. **Name pattern weighting** controls word count (`COMPACT` / `DESCRIPTOR` / `PLACE` tokens).
  2. **Compound complexity weighting** controls stitched-part count inside compact words.
- Compact word internals now strongly prefer 2-part compounds, with 3-part rare and 4-part very rare.
- Spaced outputs are intentionally frequent enough to avoid a constant one-token look.

### Regression tests updated
- `test/systems/worldMap.test.js`
  - samples 20x20 coordinate names (400 total),
  - validates uniqueness growth,
  - validates 1–2 word dominance,
  - validates 4-word rarity,
  - validates spaced-name frequency,
  - validates deterministic same-coordinate output.

### Commands run
- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/worldMap.test.js`
- `node --test rgfn_game/test/**/*.test.js`

## March 28, 2026 update: expanded deterministic village name generator

### Problem statement
- Village names had a very small combinatorial pool (100 variants), so repeats appeared quickly.
- This reduced perceived world scale and made quest location flavor feel repetitive.

### Implementation summary
- Added a dedicated generator module with token dictionaries + pattern templates:
  - `js/systems/world/VillageNameGenerator.ts`
- Wired `WorldMap.getVillageName(...)` to use the new deterministic seed-driven generator.
- Wired `VillageLifeRenderer` fallback naming path to the same generator style.

### Reliability constraints kept
- Name remains deterministic for identical world seed + coordinates.
- Name style remains readable and settlement-like.
- No network dependency added.

### Regression tests
- `test/systems/worldMap.test.js`
  - Added test that samples a 15x15 coordinate area and expects >100 unique village names.
  - Added deterministic same-coordinate equality check.

### Commands run
- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/worldMap.test.js`
- `node --test rgfn_game/test/**/*.test.js`

## March 26, 2026 update: village rumors NPC roster persistence fix (actual root cause)

### Symptom seen in UI
- Entering the same village repeatedly still produced different **Village rumors** NPC buttons (different names/roles each visit).
- This was visible even when staying on the same village tile and re-entering immediately.

### Root cause (important)
- Previous fix addressed animated background villagers (`VillagePopulation`) only.
- Rumor/chat NPCs are created in `VillageActionsController.enterVillage(...)` via `VillageDialogueEngine.createNpcRoster(...)`.
- Because that call ran on every entry, rumor roster was re-randomized each visit.

### Final fix
- Added per-village roster cache in `VillageActionsController`:
  - `villageNpcRosters: Map<string, VillageNpcProfile[]>`
  - `getOrCreateVillageNpcRoster(villageName)`
- `enterVillage(...)` now reuses cached roster for previously visited villages.
- Different villages still keep different rumor rosters.

### Regression tests added
- `test/systems/villageActionsController.test.js`
  - verifies same village re-entry keeps identical rumor roster,
  - verifies separate villages keep separate rosters and returning to the first village restores it.

### Manual QA checklist
1. Enter village A and record rumor NPC names/roles.
2. Leave + re-enter village A several times.
3. Confirm roster in village A stays unchanged.
4. Travel to village B and confirm roster differs from village A.
5. Return to village A and confirm original roster is restored.

## March 25, 2026 update: village populations are now persistent per settlement

### What changed
- Villagers are now generated once per village name and cached in `VillagePopulation`.
- Re-entering the same village no longer re-rolls NPC roster size, colors, animations, or base routing indices.
- Different villages still receive different villager rosters.
- On re-entry, villagers are re-aligned to current village layout coordinates (important when canvas size changes) before rendering resumes.

### Why this matters
- Fixes immersion break where villagers changed every time the player left and re-entered the same village tile.
- Keeps village social context stable over time while preserving per-village uniqueness.

### Files involved
- `js/systems/village/VillagePopulation.ts`
- `js/systems/village/VillageLifeRenderer.ts`
- `test/systems/villagePopulation.test.js`

### Verification checklist
1. Enter village A, note visible villagers (count/look).
2. Leave and re-enter village A multiple times.
3. Confirm same villagers remain present.
4. Travel to village B and confirm villagers differ from village A.
5. Return to village A and confirm original villagers are restored.

# Verification and Testing Discussion

## March 26, 2026 update (follow-up): hard-refresh still showed quest modal due default-visible markup

### Why the first fix was not enough
- The previous logic fix correctly stopped calling `showIntro()` for saved quests.
- However, the intro modal container in `index.html` was rendered **without** the `hidden` class by default.
- Because `.quest-intro-modal` is styled as a visible fixed overlay, the modal appeared immediately on page load even when `showIntro()` was never called.

### Final hardening fix
- Added `hidden` directly in quest intro modal markup:
  - `class="quest-intro-modal hidden"`
- Added defensive runtime behavior in `QuestUiController` constructor:
  - always apply `this.introModal.classList.add('hidden')` on initialization.
- This gives two layers of safety:
  1. Correct initial DOM state from HTML.
  2. Runtime guard in case markup/class is accidentally changed in future edits.

### Regression coverage
- Updated `questUiController` tests to reflect constructor-level default hiding.
- Added a dedicated test ensuring intro modal remains hidden by default until `showIntro()` is called.

### Manual retest checklist
1. Open game with existing save and press `F5`.
2. Confirm intro modal does **not** auto-open.
3. Repeat with `Ctrl+Shift+R` hard refresh and confirm modal remains closed.
4. Press **New Character** and confirm intro modal opens for newly rolled quest.
5. Close intro modal, refresh again, confirm modal remains closed.

### Commands run for this follow-up
- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/questUiController.test.js`
- `node --test rgfn_game/test/**/*.test.js`

## March 26, 2026 update: quest intro modal only opens for brand-new characters

### Reported issue
- The quest intro modal ("initial quests info") opened on every page refresh/reopen.
- Desired behavior: show it only when a **new character** is created (the same moment the main quest is first rolled), not when loading an existing save.

### Root cause
- `initializeQuestUi(...)` always called `questUiController.showIntro()` after rendering quest content.
- That happened for both code paths:
  - saved quest restored from localStorage,
  - newly generated quest for fresh runs.

### Fix implemented
- Added a `shouldShowIntro` guard in quest bootstrap:
  - `true` only when no saved quest exists and a fresh main quest is generated,
  - `false` when loading an existing save with an already-created main quest.
- Result:
  - **New Character** (or first-ever run): intro modal opens.
  - **Refresh/reopen with save present**: intro modal stays closed; quests remain accessible via quest panel.

### Manual QA checklist
1. Start from a fresh state (no `rgfn_game_save_v1` key) and load game.
2. Confirm quest intro modal opens once after initial character/main-quest creation.
3. Close modal, refresh page.
4. Confirm modal does **not** auto-open after refresh.
5. Click **New Character** and confirm modal opens again for the newly rolled character.

### Commands run for this change
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`

## March 26, 2026 update: quest completion now persists across refresh

### Problem observed
- Quest nodes correctly flipped to completed during runtime (checkmark + strikethrough style), but after a browser refresh the same objective appeared incomplete again.
- Repro path from report:
  1. Enter a village tied to a location objective (for example, `Scout Oakcross` / `Enter Oakcross.`).
  2. Confirm the quest node is marked complete.
  3. Refresh page.
  4. Observe completion state reset.

### Root cause
- Save payload (`rgfn_game_save_v1`) did not include quest tree state.
- On boot, quest UI always generated a new random main quest in `initializeQuestUi(...)`, regardless of existing save payload.

### Changes made
- Added `quest: QuestNode | null` to the game save state contract.
- Save snapshots now serialize the active quest tree including node-level `isCompleted` values.
- Quest initialization now:
  - attempts to read saved save-state first,
  - reuses saved quest when present,
  - falls back to random quest generation only when save has no quest.
- Consolidated save parsing through a shared helper (`getParsedSaveState`) used by both load and quest bootstrap paths.

### Compatibility notes
- Older saves without `quest` field still load world/player/spell data.
- After first save on new code, quest state is included and future refreshes keep completion progress.

### Commands run for this change
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`

## March 25, 2026 update: village sidebar now shows current village name

### Problem observed
- Village UI heading was static (`Village`) and did not show the current settlement name.
- This caused avoidable orientation friction when moving between multiple villages or quickly re-entering from world mode.

### Changes made
- Added a dedicated village title element ID in the village sidebar (`#village-title`).
- Extended `VillageUI` typing + UI factory wiring so runtime code can update this header directly.
- Updated village entry flow so `VillageActionsController.enterVillage(...)` sets heading text to `Village: <currentVillageName>`.

### Why this implementation
- The game already passes canonical village names through `WorldMap -> GameVillageCoordinator -> VillageActionsController`.
- Reusing that flow avoids duplicate state and keeps title updates deterministic across both first entry and re-entry.

### Regression checks
1. Discover/enter a village and verify heading shows its real name.
2. Leave and re-enter the same tile (Space or world panel button) and confirm heading still matches that village.
3. Travel to a different village and confirm heading updates to the new name.
4. Confirm village prompt/actions still open/close as before.

### Commands run for this change
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`

## March 25, 2026 update: vitality save should keep full HP at full-health breakpoint

### Bug report context
- Repro from gameplay UI:
  1. Character HP is currently full (`hp === maxHp`), e.g. `7/7`.
  2. Player allocates points into **vitality** and clicks **Save**.
  3. Before fix, `maxHp` increased but `hp` stayed unchanged (e.g. `7/9`).
- Expected behavior: when character was already at full HP before the vitality save, current HP should track new max (e.g. `9/9`).

### Root cause
- `Player.addStat(...)` recalculated derived stats via `updateStats()`, then clamped HP using `Math.min(this.hp, this.maxHp)`.
- That clamp preserved the old numeric HP value, but it did not preserve the "was full" state.

### Resolution
- Added a full-HP guard in `Player.addStat(...)`:
  - capture `hadFullHp` before recalculation,
  - if true after stat application, set `hp = maxHp`,
  - otherwise preserve prior value with standard clamp (`Math.min(previousHp, maxHp)`).
- This keeps non-full HP behavior stable while fixing the full-HP vitality-save flow.

### Regression test added
- New entity test: `Player keeps full HP state when max HP increases from vitality`.
- The test verifies:
  - max HP increases after vitality allocation,
  - HP remains exactly equal to max HP when player started at full HP.

### Suggested manual smoke checks
1. Open character with full HP (e.g. `7/7`), allocate vitality, press Save → confirm `9/9` style result.
2. Repeat when not full HP (e.g. `4/7`), allocate vitality, press Save → confirm current HP does **not** jump to full.
3. Confirm intelligence/connection upgrades still preserve existing mana behavior.
## March 25, 2026 update: village sell-list synchronization hardening

### Problem observed
- In village mode, the **Sell inventory item** dropdown could occasionally show a stale snapshot of inventory contents after buy-driven inventory changes.
- Result: players could see incomplete sell choices until another village UI refresh happened.

### Changes made
- Added proactive sell-list refresh hooks on the sell dropdown itself:
  - refresh on `focus`
  - refresh on `pointerdown` (right before opening)
- This keeps sell options synchronized with the most current inventory right as the player opens/uses the control.
- Also fixed sell button enablement logic to follow the select's disabled state directly, preventing action enablement drift when placeholder text is shown.

### Regression checks
1. Enter village and buy items multiple times in a row.
2. Open the sell dropdown immediately after each buy and confirm every current inventory item is listed.
3. Sell until inventory is empty and confirm:
   - dropdown shows placeholder text,
   - **Sell selected** button is disabled.
4. Obtain a new item, reopen sell dropdown, confirm button re-enables and item appears.

### Commands run for this change
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`

## March 2026 update: village re-entry controls on world map

### Feature summary
- Added a world-map action button: **Enter Village (Space)**.
- Added keyboard shortcut: **Space**.
- Both controls re-enter village mode when the player is standing on a village tile (including immediately after leaving a village).
- If used away from a village tile, game stays in world mode and writes a guidance log message.

### Why this was needed
- Previously, entering villages was mostly movement-driven encounter flow.
- After leaving a village while still standing on that same tile, there was no direct "re-enter now" action.
- New behavior mimics old Fallout-style interaction: stand on location and press action key/button.

### Regression checks to keep
1. Enter a village by moving onto a village tile still works.
2. Leave village, press **Space**, and confirm village prompt opens again.
3. Leave village, open World Map panel, click **Enter Village (Space)**, and confirm village prompt opens again.
4. Press **Space** while not on a village tile and confirm no state transition occurs.
5. Confirm existing world controls still work:
   - movement (WASD / arrows),
   - zoom by mouse wheel over canvas,
   - zoom fallback via `Ctrl + +` and `Ctrl + -`,
   - middle-mouse drag panning,
   - keyboard pan fallback (`I/J/K/L`, numpad `8/4/2/6`),
   - centering via `Center on Character`.

---

## March 2026: Battle view player visibility fix

### Change summary
- The player battle rendering now draws a visible mini-avatar (shadow/body/head/shoulders) in addition to the HP bar.
- Previously, players could appear as "only a highlighted cell + tiny HP bar", especially when turn highlights moved to enemies.

### Fast regression checklist for this specific area
1. Start a battle and confirm the player pawn is clearly visible in their tile even when it is **not** the player's turn.
2. Confirm enemy sprites still draw correctly and are not occluded by player rendering.
3. Verify HP bars still render above entities and update after damage.
4. Enter/exit battle mode and ensure no rendering artifacts remain on world map.
5. Resize browser window during battle and confirm avatar scales/positions correctly with battle grid resize.

### Programmatic verification commands
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`

---

## March 24, 2026 – Inventory Equip Regression Note

### Problem statement
- Reported UX bug: picking up a weapon could immediately equip it, even when the player intended to keep current loadout.
- This behavior came from `PlayerInventory.addItem(...)`, which auto-equipped any weapon/armor that passed `canEquip`.

### Resolution summary
- Updated inventory behavior so pickup only adds items to bag storage.
- Equipment changes are now explicit-only via:
  - inventory click/drag equip actions,
  - direct slot interactions,
  - explicit equip APIs.

### Regression coverage added/updated
- `Player inventory keeps discovered equipment in inventory until explicitly equipped`
  - verifies that newly found weapons/armor stay in inventory and do not alter equipped state.
- `Equipped items are removed from inventory and return on unequip`
  - now performs explicit equip actions first, then validates round-trip equip/unequip behavior.

### Commands run for this change
- `npm run build:rgfn`
- `node --test rgfn_game/test/**/*.test.js`
- `node --test rgfn_game/test/entities/player.test.js`

### Current suite status snapshot
- The focused player tests pass after this fix.
- The full `rgfn_game` suite still contains at least one unrelated pre-existing failure in `creatures.test.js` (`Enemy archetypes derive resulting stats from base stats plus shared skills`), which is outside the inventory workflow touched here.

## How I Verified the XP Fix

### The Honest Truth
I didn't actually run the game and verify the fix works through manual testing. Here's what I actually did:

1. **Code Inspection**
   - Read through the codebase to understand the data flow
   - Traced how XP is awarded in `handleAttack()` when an enemy dies
   - Identified issues by reading the code, not by seeing it fail

2. **Issues Found by Analysis**
   - Type casting: `(target as any).xpValue` was unreliable - better to cast to `Skeleton` explicitly
   - Missing HUD updates: `updateHUD()` wasn't called when entering/exiting battle modes
   - The XP award logic was there but UI updates weren't propagating to world mode

3. **Fixes Applied Through Logic**
   - Made the type cast explicit: `const skeleton = target as Skeleton`
   - Added `updateHUD()` calls to `enterWorldMode()` and `enterBattleMode()`
   - Already had `updateHUD()` after kills but added one after every attack too

4. **TypeScript Compilation**
   - Ran `npx tsc` to ensure no type errors
   - This catches syntax and type issues but doesn't verify runtime behavior

5. **Debug Logging Added**
   - Added `console.log()` statements to track XP awards
   - These will help YOU verify it works when you run the game
   - Example output: `Skeleton defeated: Skeleton XP Value: 3`

### What I Can't Know
- Whether the XP actually increments when you play
- Whether the HUD visually updates correctly in the browser
- Whether returning to world map preserves the XP/level/skill points
- Whether the level up animation/messages appear correctly
- Whether there are edge cases or timing issues

### You Need To Verify
The fix is **logically sound** based on code analysis, but you need to:
1. Open the game in a browser
2. Kill a skeleton
3. Check the browser console for debug messages
4. Verify the HUD shows "+3 XP"
5. Verify XP persists after returning to world map
6. Level up and verify skill points are granted

---

## Should RGFN Have Tests Like Neon Void?

### Neon Void's Test Coverage
I checked the root project (Neon Void) and it has **extensive tests**:
- 30+ test files covering:
  - Game logic (wave management, enemy spawning, projectiles)
  - Engine systems (Entity, GameLoop, Renderer, InputManager)
  - Game systems (saves, high scores, audio)
  - State management
  - Asset loading
  - Integration tests

They use Node.js built-in test runner with assertions and mocked helpers.

### Would Tests Be Good For RGFN?

**YES - If You Want Confidence**

The RGFN game has complex systems that would benefit from tests:

#### What Should Be Tested
1. **Level System Math**
   - XP calculation: `getXpForLevel(level)` returns correct values
   - Total XP: `getTotalXpForLevel(5)` = sum of levels 1-4
   - XP overflow: Gain 20 XP at level 1, verify it levels up AND carries over

2. **Stat Conversions**
   - `calculateMaxHp(vitality)`: Verify formula (5 + vitality × 1)
   - `calculateArmor(toughness)`: Verify 3 points = 1 armor
   - `calculateTotalDamage(strength)`: Verify 2 points = +1 damage

3. **Player Leveling**
   - `player.addXp(5)`: Should level from 1 → 2
   - `player.addXp(15)`: Should level multiple times
   - Verify skill points granted correctly
   - Verify HP heals to full on level up

4. **Combat Mechanics**
   - `player.takeDamage(8)` with 3 armor: Should take 5 damage
   - `player.takeDamage(2)` with 3 armor: Should take 1 damage (minimum chip damage)
   - Skeleton dies → XP awarded correctly


**Armor rule note:** Armor reduces incoming damage, but positive hits always deal at least 1 damage.

5. **Stat Allocation**
   - `player.addStat('vitality')`: Decrements skill points, increases maxHp
   - Verify can't allocate without skill points
   - Verify HP percentage preserved (not healed mid-battle)

#### Benefits
- **Catch regressions**: If you change XP formula, tests fail
- **Refactoring confidence**: Change internals, tests verify behavior unchanged
- **Document behavior**: Tests show how systems should work
- **Balance tuning**: Verify damage/armor formulas work as intended

#### Costs
- **Time to write**: Initial investment to set up test infrastructure
- **Maintenance**: Tests need updating when you change systems
- **Overhead**: RGFN is much simpler than Neon Void - might be overkill

### My Recommendation

**Start Small, Test What Matters:**

1. **High Priority**: Test the math functions
   - `levelConfig.ts` calculation functions
   - Stat conversion formulas
   - These are pure functions - easy to test

2. **Medium Priority**: Test Player class logic
   - Level up mechanics
   - Stat allocation
   - XP accumulation

3. **Lower Priority**: Integration tests
   - Full battle flow
   - State transitions
   - UI updates

**Example Test Structure:**
```
rgfn_game/
  test/
    config/
      levelConfig.test.ts    # Test XP formulas
      balanceConfig.test.ts  # Verify config values
    entities/
      Player.test.ts         # Test leveling, stats, damage
      Skeleton.test.ts       # Test enemy stats
    systems/
      combat.test.ts         # Test damage calculations
```

### When To Add Tests

**Now (If Time):**
- Test suite would catch the XP bug immediately
- Good foundation for future features

**Later (When Needed):**
- Add tests when you hit bugs
- Add tests before refactoring
- Add tests for new features

**Never (If Small Project):**
- RGFN is a learning/prototype project
- Manual testing might be sufficient
- Focus effort on features, not infrastructure

---

## Conclusion

I verified the XP fix through **code analysis and TypeScript compilation**, not runtime testing. The logic is sound, but **you must verify it actually works** by playing the game.

For tests: **RGFN would benefit from tests like Neon Void**, especially for level/stat math. But whether to invest that time depends on project goals. Start with testing the math functions if you decide to add tests - they're the most valuable and easiest to write.

---

*Written by Claude - January 2026*

## 2026-03 Regression Notes (Current Test Workflow)

### Reliable local command sequence
1. Build RGFN TypeScript output first:
   - `npm run build:rgfn`
2. Run the RGFN test suite against compiled `dist/` modules:
   - `node --test $(find rgfn_game/test -name '*.test.js' -print)`

### Why the build step matters
RGFN tests import from `rgfn_game/dist/**`. If `dist` is missing/stale, many suites fail with `ERR_MODULE_NOT_FOUND` before running assertions.

### Enemy stat expectation gotcha
Enemy HP in runtime is not raw archetype HP. `Skeleton` applies `balanceConfig.enemies.hpMultiplier` to derived HP:
- `finalMaxHp = Math.round(derivedMaxHp * hpMultiplier)`

So tests asserting fixed literal HP values (for example zombie `7`) will fail when multiplier is `2` (actual becomes `14`). The stable assertion pattern is:
- derive with `deriveCreatureStats(...)`
- then apply `hpMultiplier` for expected HP

### Practical guidance for future test additions
- Prefer formula-based expectations tied to `balanceConfig` over hardcoded literals when behavior is config-driven.
- Keep one regression note per behavior change here to avoid rediscovering the same pitfalls.

## 2026-03 Equipment Change Turns in Battle (RGFN)

### Behavior change
- Equipping or unequipping **weapons/armor during battle** now costs **3 total turns**:
  - current player turn is spent immediately,
  - plus 2 additional upcoming player turns are consumed automatically.
- Out of battle, equipment still changes instantly (no turn cost).
- In battle, equipment changes are only accepted on the player's own active turn.

### Technical notes
- `TurnManager` now tracks consumed turns as a per-entity counter map instead of a boolean-style set, so multiple queued skipped turns are supported for one combatant.
- `BattleCommandController` now exposes `handleEquipmentAction(...)` and applies the 3-turn flow for battle-only equipment interactions.
- `HudController` routes inventory/equipment slot changes through the battle action handler before applying actual equip/unequip mutations.

### Regression tests added
- `test/systems/turnManager.test.js`
  - verifies multi-turn consumption on a single entity.
- `test/systems/battleCommandController.test.js`
  - verifies equipment action in battle queues 2 additional consumed turns and advances battle flow.
- `test/helpers/testUtils.js`
  - combat entity test helper now assigns stable synthetic `id` values, which is required for turn-consumption tracking keyed by entity id.

## Village dialogue verification
- Build RGFN bundle: `npm run build:rgfn`.
- Run RGFN tests: `node --test rgfn_game/test/**/*.test.js`.
- New coverage includes `villageDialogueEngine.test.js` for truthful/lying/refusal behavior.

## 2026-03 Victory Popup Movement Input Guard (RGFN)

### Symptom
- During the **victory splash popup** shown at battle end, pressing a movement key (`WASD` or arrow keys) could leak a queued player movement action into battle mode.
- On a subsequent encounter, this stale battle input path could trigger an immediate battle-end flow, causing players to see a victory popup right away and effectively skip intended combat.

### Root cause
- `GameBattleCoordinator.updateBattleMode()` still forwarded movement polling while splash transitions were active.
- The existing transition flag (`turnTransitioning`) already blocked click/button actions but did not block the movement polling path.

### Fix
- `GameBattleCoordinator` now:
  - sets `turnTransitioning = true` as soon as battle entry begins (before the battle-start splash dismisses),
  - early-returns from `updateBattleMode()` while transitioning,
  - sets `turnTransitioning = true` at battle end (victory/defeat/flee transition window),
  - resets `turnTransitioning = false` on battle exit cleanup.

### Verification checklist
1. Win a battle and keep pressing movement during the victory splash.
2. Allow return to world map, continue moving, and trigger another encounter.
3. Confirm battle-start splash appears normally and combat proceeds (no immediate victory splash).
4. Confirm normal in-battle movement still works once player turn becomes ready.

### Automated regression coverage
- Added `test/systems/gameBattleCoordinator.test.js` with guards for:
  - no movement updates during battle-start splash transition,
  - no movement updates during battle-end splash transition,
  - movement updates resuming after `onPlayerTurnReady()`.

## 2026-03 Skills Panel GOD Button (RGFN, dev-only)

### Behavior summary
- Skills panel now includes `GOD +20 ALL` (`#god-skills-btn`) for development/debug workflows.
- On click, all six skills are boosted by +20 in one action.
- The action is persisted immediately via `Game.saveGameIfChanged()` callback wiring (instead of waiting for the next frame tick).

### Why implementation uses temporary skill-point credit
- `Player.addStat(...)` already handles:
  - derived stat recomputation,
  - HP/mana clamping rules,
  - intelligence-to-magic-point gains.
- To reuse this safely, the coordinator temporarily credits exactly enough `skillPoints` for the bulk operation, applies six `addStat` calls, and ends with original net skill points.
- This avoids adding a second stat-mutation path that could drift from normal leveling/stat rules.

### Manual verification checklist
1. Open `Skills` panel.
2. Record current values for all 6 skills.
3. Click `GOD +20 ALL`.
4. Verify each skill increased by exactly 20.
5. Refresh the page and confirm boosted values persist from save data.
6. Confirm battle log contains: `[DEV] GOD boost applied: +20 to all skills.`
## March 26, 2026 update: purge packs are now completable with anchored village hunting zones

### Summary

- `eliminate` and `hunt` objectives now carry explicit monster objective metadata (name, required kills, village anchor, mutation details).
- Kill events are now fed into `QuestProgressTracker` for objective completion.
- World mode now injects quest-target monster encounters when traveling near the target village.
- Mutation traits listed in generator output now execute gameplay behavior in combat.

### Manual verification flow

1. Start a fresh run and inspect generated quest leaves for `Purge` / `Hunt`.
2. Confirm objective text includes `near <VillageName>` and mutation intel in description.
3. Travel toward that village (can use lore/world map hints).
4. Roam nearby cells and verify quest encounter hint appears in log.
5. Enter battle against target monsters and defeat required count.
6. Confirm quest node completion updates immediately after kill.
7. Check retaliation log lines for `acid blood` / `barbed hide` when applicable.

### Regression focus

- Existing location objective completion remains functional.
- Existing barter objective completion remains functional.
- Non-quest random encounters still function when no objective encounter is injected.

## March 28, 2026 update: villages are map-generated only (no encounter-based village creation)

### What changed
- Village creation through the encounter pipeline was fully removed.
- Villages now come only from initial world generation (`WorldMap.generateVillages`).
- Random encounter event types now include only:
  - `monster`,
  - `item`,
  - `traveler`.
- Forced developer queue no longer offers a `village` event option.

### Why this was changed
- Previous behavior still allowed encounter-driven village creation.
- Requested behavior is stricter: **only initial villages should exist**.
- This eliminates late-run world map mutation from random encounter rolls.

### Configuration knobs that still matter
- `balanceConfig.villageCreationRateMultiplier`
  - Applies to initial world generation village count only.
  - Default `1 / 3` keeps the reduced world density target.
- `balanceConfig.worldMap.villages.minCount`
  - Baseline floor before multiplier.
- `balanceConfig.worldMap.villages.densityPerCell`
  - Baseline density before multiplier.

### Verification checklist
1. Start a fresh run and note village count/distribution on map.
2. Travel extensively on undiscovered and discovered tiles:
   - confirm no village encounter result appears,
   - confirm no new villages are added at player position by encounters.
3. Open developer event queue:
   - confirm `Village` is absent from queue options,
   - confirm random encounter toggles list only Monster / Item / Traveler.
4. Confirm existing systems that depend on village names still work:
   - quest map-village sourcing,
   - village direction hints,
   - village entry/re-entry from existing tiles.

### Implementation notes
- `EncounterSystem.RandomEncounterType` and resolver event type list no longer include `village`.
- `WorldModeController` no longer has runtime branch that marks a village on `encounter.type === 'village'`.
- `ForcedEncounterType` no longer includes `village`, and dev UI no longer exposes village queue actions.

## March 28, 2026 update: world-map travel scale and forest visibility readability

### What changed
- World-map pace baseline changed to **12 min per cell** (from 20).
- Default world-map visibility radius changed to **3** (from 2).
- Forest line-of-sight now allows visibility of the immediate target forest tile, while still blocking sight beyond forest.

### Why
- Improve navigation readability without removing terrain identity.
- Preserve forest tension while avoiding the prior near-blind orientation effect.

### Manual checks
1. Start world mode and inspect scale legend:
   - should read `12 min walk / cell`.
2. Place the hero near mixed terrain (grass + forest).
3. Confirm adjacent forest tile can be seen/revealed when in radius.
4. Confirm tile behind that forest (same line) is still blocked from visibility.
5. Confirm mountains still block line-of-sight beyond mountain cells.

### Automated checks
- Updated unit coverage in `worldMap.test.js` for terrain LoS expectations.
- Added regression assertion in `themeConfig.test.js` to lock baseline defaults:
  - `theme.worldMap.cellTravelMinutes === 12`
  - `balanceConfig.worldMap.visibilityRadius === 3`

## March 28, 2026 update: travel fatigue + risky wild sleep + safe inn rooms

- Added fatigue as a persistent player stat driven by world-map travel.
- Fatigue growth now uses `cellTravelMinutes` as travel-time basis and estimates comfortable daily distance from awake-hour budget.
- Added **Camp Sleep (Risky)** action on world map:
  - restores fatigue,
  - can trigger ambush while sleeping,
  - applies HP/mana surprise penalties on ambush.
- Added **Sleep in room** in villages:
  - requires selecting an innkeeper NPC,
  - costs gold,
  - safely restores large fatigue amount plus minor HP/mana.
- HUD now shows fatigue value and condition state (`Rested/Tired/Exhausted`).

### Files touched

- `js/entities/Player.ts`
- `js/systems/WorldModeController.ts`
- `js/systems/village/VillageActionsController.ts`
- `js/systems/village/VillageDialogueEngine.ts`
- `js/config/balanceConfig.ts`
- `index.html`
- UI wiring updates in `js/systems/game/*`

### Manual smoke checklist

1. Move across multiple world cells and confirm fatigue rises.
2. Use **Camp Sleep (Risky)** outside village:
   - confirm fatigue decreases,
   - confirm occasional ambush penalty logs.
3. Enter village, select **Innkeeper**, use **Sleep in room**:
   - confirm gold spent,
   - fatigue decreases more safely than wild camp,
   - no ambush penalties.
4. Save + reload and confirm fatigue persists.
## March 28, 2026 update (follow-up 2): map villages now use the new quest-pack-style naming pipeline

### Issue
- Villages generated at world creation still looked like legacy compounds (`MossStead`, `OakCrook`, etc.).
- Request was to switch map village naming to the newer naming direction from recently merged name-generation work.

### What changed
- Replaced legacy village token pools with a quest-pack-aligned pipeline in:
  - `js/systems/world/VillageNameGenerator.ts`
- New village naming now composes from:
  - deterministic **echo syllable** words (same phonetic family as quest-name echo generation),
  - curated adjective + place-word sets aligned with quest naming vocabulary.
- This removes the old oak/moss/stead-style bias while preserving deterministic behavior by coordinate seed.

### Determinism and save safety
- `WorldMap` integration path is unchanged (`getVillageName(...)` still derives from stable coordinate hash).
- Same world seed + same tile coordinates still produce the same village name.

### Validation performed
1. `npm run build:rgfn`
2. `node --test rgfn_game/test/systems/worldMap.test.js`
3. `node --test rgfn_game/test/systems/questPackService.test.js`
4. `node --test rgfn_game/test/systems/villageActionsController.test.js`

### Notes for future iteration
- If we later want fully shared generation internals (not just style family), we can extract a common deterministic token source module used by both quest and village generators.
- Biome-aware weighting can be layered on top of this without changing external APIs.

## March 28, 2026 update: quest-generated monster encounters now obey dev Monster toggle

### Reported issue
- In world travel, quest-target monster packs (generated from active objective data) could still trigger even after disabling **Monster** encounters from the Developer Console.
- This created a mismatch: random monster encounters were disabled, but objective monster battles still happened.

### Root cause
- `WorldModeController` always requested quest monster encounters via `getQuestBattleEncounter()` before normal random encounter flow.
- That callback path was not gated by `EncounterSystem.isEncounterTypeEnabled('monster')`.

### Fix implemented
- Added a monster-toggle gate in `WorldModeController.onPlayerMoved(...)`:
  - if `isEncounterTypeEnabled('monster')` is `false`, quest battle callback is skipped entirely,
  - therefore no quest monster encounter is started while Monster encounters are disabled.
- Existing behavior when Monster is enabled is unchanged.

### Validation strategy
1. Unit test for positive path:
   - with Monster enabled and movement occurring, quest encounter callback is consulted and battle starts.
2. Unit test for disabled path:
   - with Monster disabled and movement occurring, quest encounter callback is not consulted and no battle starts.
3. Full RGFN test run to ensure no regressions in encounter, world, and quest flows.

### Notes
- This fix intentionally treats quest-generated monster packs as part of the same Monster encounter category exposed in Developer Console.
- Item/traveler random encounter toggles are unaffected.

## March 31, 2026 update: persistent developer mode presets (localStorage)

### What changed
- Developer Console now has **Enable persistent developer mode** (`#dev-mode-enabled`).
- The switch persists in browser `localStorage` key `rgfn_developer_mode_v1`.
- When enabled, runtime now auto-applies these defaults every load:
  - **Everything discovered = ON**
  - **Fog of war = ON** (unchanged from standard default)
  - **Random encounters = OFF** for Monster/Item/Traveler
  - **Quest intro modal = OFF** on fresh character creation
  - **GOD +20 ALL** is automatically applied once for each brand-new character.
- When disabled, defaults are restored to normal gameplay baseline:
  - everything discovered off,
  - fog of war on,
  - all random encounter types on,
  - quest intro enabled,
  - no auto-GOD boost.

### Runtime behavior details
- Presets are applied at startup before player interaction, so developer UI checkboxes and active systems stay aligned from the first frame.
- Opening the Developer Console re-renders controls from live runtime state, so toggles accurately reflect the active preset.
- New-character GOD boost only runs when there is no save snapshot (`rgfn_save_v1` absent), preventing repeated boosts on normal reloads of an existing run.

### Verification checklist
1. Open Developer Console (`~`) and enable persistent developer mode.
2. Confirm UI immediately shows:
   - encounter toggles unchecked,
   - everything discovered checked.
3. Click **New Character**.
4. After reload, verify:
   - character stats include one GOD +20 application,
   - quest intro modal does not auto-open,
   - random encounters remain disabled,
   - everything discovered remains enabled.
5. Reload browser tab without touching settings and confirm the same persisted state.
6. Disable persistent developer mode and verify defaults revert immediately and on next reload.

## March 28, 2026 update: road-aware travel time on world map

### Request
- Travel on **roads** should use baseline per-cell world travel time (`theme.worldMap.cellTravelMinutes`).
- Travel **off-road** should be slower:
  - **Grassland:** 2x slower.
  - **Forest:** 4x slower.

### Implementation details
- Added road-presence API to `WorldMap`:
  - `isRoadAt(col, row)` for generic road-cell checks.
  - `isPlayerOnRoad()` for current player tile checks.
- Updated `WorldModeController` movement handling:
  - On each successful move, fatigue gain now uses a terrain/road multiplier (as a proxy for travel time cost).
  - Multiplier rules:
    - `1x` when `isPlayerOnRoad()` is true.
    - `4x` when off-road on `forest`.
    - `2x` when off-road on `grass`.
    - `1x` fallback for other terrain types.

### Why fatigue was used
- RGFN currently models travel burden through fatigue growth (derived from `cellTravelMinutes`) rather than a separate explicit world-clock increment on each step.
- Because of this, scaling fatigue per step is the most direct way to make movement effectively consume more/less in-game travel time under current systems.

### Added/updated tests
- `worldModeController.test.js` now verifies:
  1. Road movement keeps standard cost (`1x`) even on forest tiles.
  2. Off-road grass movement uses `2x` multiplier.
  3. Off-road forest movement uses `4x` multiplier.

### Notes for future extension
- If/when a dedicated world clock is introduced, this same multiplier function can be reused to scale minute increments directly (not only fatigue).
- Consider surfacing the active travel multiplier in HUD/log for player readability (e.g., "Off-road forest: 4x travel time").
## March 28, 2026 update: wild camp night ambush now launches full battles

### Requested behavior
- During wild **Camp Sleep (Risky)** ambush, do not only apply HP/mana loss + log.
- Show explicit player-facing popup (`Night ambush!`) and launch full combat.
- If a quest battle encounter is currently eligible, that quest encounter should be used first.

### Implementation summary
- `WorldModeController.handleCampSleep()` now triggers:
  - popup (`window.alert('Night ambush!')`) when ambush occurs,
  - quest battle start when `getQuestBattleEncounter()` returns enemies,
  - regular monster battle via `EncounterSystem.generateMonsterBattleEncounter()` when no quest encounter is available.
- `EncounterSystem` received `generateMonsterBattleEncounter()` to produce battle-only monster encounters (event type hard-locked to `monster`) and **throw immediately** if a non-battle encounter appears.

### Validation
1. Build:
   - `npm run build:rgfn`
2. Targeted test:
   - `node --test rgfn_game/test/systems/worldModeController.test.js`
3. Full RGFN test suite:
   - `node --test rgfn_game/test/**/*.test.js`

### Added/updated unit coverage
- `worldModeController.test.js`
  - verifies ambush starts quest battle when quest encounter exists,
  - verifies ambush starts normal monster battle when quest encounter is absent,
  - retains existing movement/village/quest-toggle coverage.

### Engineering policy capture (March 29, 2026)
- Default RGFN implementation stance: **fail fast and hard** for unexpected states; avoid silent/degrading fallbacks unless explicitly requested.
- Any future ambush/encounter work should preserve this rule and prefer explicit errors over substitute behavior.


## LOC analysis utility

Use this when you need a quick size/profile snapshot of the RGFN codebase and engine split.

```bash
python3 rgfn_game/scripts/loc_report.py
```

This prints:
- RGFN-only LOC by language,
- engine-only LOC by language,
- combined totals with language percentages.

## March 31, 2026 update: held movement keys now continue movement in RGFN

### Request
- Holding movement keys (`W/A/S/D` or arrows) should keep moving continuously until key release.

### Root cause
- `InputManager.handleKeyDown` ignored browser `KeyboardEvent.repeat` events.
- RGFN world movement polling (`wasActionPressed`) therefore only saw the initial keydown frame and did not receive additional held-key pulses.

### Implementation
- Updated `engine/systems/InputManager.js` with **backward-compatible opt-in repeat mode**:
  - default behavior remains unchanged (`KeyboardEvent.repeat` does not retrigger `wasPressed`),
  - new constructor option `enableRepeatPress: true` enables repeat keydowns as per-frame press pulses when key is held.
- Enabled the option only in RGFN bootstrap (`new InputManager({ enableRepeatPress: true })`), so other games keep old behavior.
- This preserves `isActionActive`/`isKeyDown` semantics and isolates the behavior change to RGFN.

### Test coverage added
- Updated `test/engine/systems/InputManager.test.js`:
  - explicit default-mode test confirms repeat events are still ignored,
  - repeat-enabled test confirms a fresh `wasPressed` pulse after `update()`.

### Notes
- Behavior is intentionally based on native browser key-repeat cadence (user OS settings), not fixed in-game timers.
- Change scope is isolated to RGFN by constructor option; EVA and other engine consumers remain behavior-stable unless they opt in.
- Validation snapshot (March 31, 2026 refresh):
  - `node --test test/engine/systems/InputManager.test.js` → pass (34/34).
  - `node --test rgfn_game/test/**/*.test.js` → 119/120 pass; one unrelated failure in world-map render test due mock canvas missing `ctx.rect`.


## March 31, 2026 update: ferry-connected water road segments are now dashed and visible

### Reported issue
- Water-crossing road parts were not drawn at all after ferry dock integration.
- Players could see ferry docks but lacked a visual connection line between paired docks.

### Implementation summary
- World-map road segmentation now keeps two render styles instead of skipping water samples:
  - `land` segments: existing solid overland road style.
  - `waterCrossing` segments: dashed blue-tinted line style over water.
- Fog behavior remains unchanged: unknown tiles still suppress segment rendering.

### Code touchpoints
- `js/systems/world/worldMap/WorldMapRoadNetwork.ts`
  - `buildVisibleRoadSegments(...)` now emits segment metadata (`style`) and allows water samples to produce drawable segments.
- `js/systems/world/worldMap/layers/WorldMapNamedLocationAndVillageOverlays.ts`
  - draw pass now dispatches by segment style to solid vs dashed renderer calls.
- `js/systems/world/worldMap/WorldMapRenderer.ts`
  - added `drawWaterCrossingRoadPath(...)` forwarding API.
- `js/systems/world/WorldMapFeatureRenderer.ts`
  - added dashed-path drawer (`setLineDash([6, 5])`) for water-crossing corridors.

### Why this is safe
- No ferry route pairing logic changes (`detectFerryRoutePairs` path unchanged).
- No traversal changes: player still cannot walk onto water and ferry travel remains dock-driven.
- No village-link graph changes: only visual segmentation/rendering behavior changed.

### Suggested regression checks
1. Render a map with a known water crossing and verify dashed segment appears exactly across water region.
2. Verify land portions of the same road remain solid.
3. Verify hidden/unknown fog tiles do not render any road segment artifacts.
4. Verify ferry prompt and travel still function from both docks.

## April 2, 2026 update: village free wait removed; paid sustain actions added

### Player-facing behavior change
- The old village **Wait** action is removed.
- Villages now provide explicit paid sustain options:
  - **Doctor treatment (4g)**: full HP restore.
  - **Inn meal (2g)**: small HP + mana restore.
  - **Sleep in room** remains and continues to be the safe fatigue recovery path.

### Why
- Prevent free recovery loops in villages.
- Force active resource management decisions (gold vs survivability).

### Manual verification checklist
1. Enter any village and confirm there is no `Wait` button in village actions.
2. Use **Doctor treatment** with enough gold:
   - gold decreases by 4,
   - HP becomes full,
   - mana does not jump to full from this action.
3. Use **Inn meal** with enough gold:
   - gold decreases by 2,
   - HP and mana increase by small configured amounts.
4. Try each action with insufficient gold and confirm clear rejection log messages.
5. Confirm **Sleep in room** behavior is unchanged.

## 2026-04-06 — Inventory offhand drag visual desync fix

### Symptom
- Dragging a one-handed weapon from inventory into the **Off Hand** slot could remove the icon from inventory but leave the offhand UI reading `Fist`.
- Player stats/damage could still reflect the dragged weapon, which made the panel look out of sync with gameplay state.

### Root cause
- HUD drag/drop relied on a **dragged inventory index** instead of item identity.
- If inventory order changed while dragging (or if a stale index was read during drop timing), the drop handler could resolve the wrong slot or no item at all.
- A separate high-impact bug also existed in player equipment accessors: `PlayerInventoryAndRender` defined a **setter-only** `equippedOffhandWeapon`, which shadowed the inherited getter and made all reads return `undefined` at runtime.

### Fix summary
- Switched drag tracking from index-based to **item-reference-based** tracking in `HudInventoryController`.
- Added explicit `clearDraggedInventoryItem()` to reset drag state from equipment drop handlers.
- Removed fallback recovery paths; drag state now enforces strict invariants and throws immediately on impossible states (e.g., dragged index without dragged item reference, or dragged item reference not present in inventory).
- Restored offhand read behavior by adding a concrete `get equippedOffhandWeapon()` accessor in `PlayerInventoryAndRender` that proxies to `inventorySystem.getEquippedOffhandWeapon()`.

### Regression test added
- New scenario test verifies dragged item identity remains correct when inventory order changes mid-drag:
  - `rgfn_game/test/systems/scenarios/hudInventoryController.test.js`
- Added player entity regression:
  - `Player exposes equippedOffhandWeapon getter after equipping offhand slot`
  - guards against future setter-only accessor regressions that would break HUD/offhand rendering.

### Practical verification flow
1. Put two one-handed weapons in inventory (e.g., `Knife +1`, `Knife +4`).
2. Equip one to main hand.
3. Drag the other to offhand.
4. Confirm offhand slot displays the weapon sprite/name and inventory count remains consistent.
5. Unequip both and confirm both return to inventory.

## 2026-04-15 — Weapon enchantment inspection UX (inventory + equipped)

### What changed
- Added explicit enchantment parameter inspection flow for weapons:
  - Shift+click inventory weapon to print exact enchantment values to the game log.
  - Shift+click equipped Main Hand/Off Hand weapon slot to print the same details.
- Expanded tooltip content so enchantments show parameter lines (e.g., Doubt damage per turn + duration turns), not only enchantment type names.
- Updated all user-facing Doubt text from "damage/sec" to "damage/turn" to match turn-based mechanics.

### Manual verification checklist
1. Open Inventory panel and ensure at least one enchanted weapon exists in inventory.
2. Hover the weapon and verify tooltip includes detailed enchantment parameter lines.
3. Shift+click that weapon in inventory and confirm game log prints the full enchantment breakdown.
4. Equip the weapon, then Shift+click Main Hand slot and confirm the same breakdown appears.
5. If weapon has Doubt enchantment, verify all text uses "damage/turn" and "turns".

### Regression notes
- Regular click behavior remains unchanged:
  - inventory weapon click equips,
  - equipped slot click unequips,
  - right-click inventory still drops item.

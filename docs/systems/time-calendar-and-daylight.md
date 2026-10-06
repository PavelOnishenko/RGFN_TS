# Time, Calendar, and Daylight System (RGFN)

## What was added

- A runtime **time/calendar generator** (`GameTimeRuntime`) now creates a random world calendar:
  - Start year sampled on a logarithmic-like curve in range `0..10000`.
  - Month count sampled in range `1..30` using **equal-probability logarithmic buckets**:
    - `1`
    - `2..3`
    - `4..7`
    - `8..15`
    - `16..30`
    - each bucket has the same selection chance.
  - Month names are generated procedurally.
  - Month day counts are also constrained to `1..30` with the same bucketed logarithmic distribution.
  - Month day count style is randomized between:
    - fully uniform,
    - near-uniform with small variation,
    - fully varied month lengths.
- World time now advances as actions are performed.
- Calendar generation is now **bound to world + character generation context**:
  - generation seed is derived from `worldSeed XOR hash(player.name)`,
  - so the initial calendar is deterministic for the same world/character pair,
  - while still remaining random across different newly generated worlds/characters.
- HUD now displays:
  - `Time` (`HH:MM`)
  - `Date` (`Y<year> • <month> <day>`)
- Lore panel now exposes world calendar through a dedicated **Open World Calendar** action:
  - month index + generated month name + day count for every month in the year,
  - current month is marked with `→`,
  - summary includes months/year, days/year, and epoch start year.
  - calendar content appears in a separate dismissible popover window, so the Lore Book list itself stays focused on character/village/creature entries.
- World-map rendering now applies a **day/night tint**:
  - darker at night,
  - brighter during daytime and twilight (only night remains dark),
  - transitions at dawn/dusk.

## Time advancement model in this iteration

### World travel
- Each world-map movement step advances time.
- Base step duration is tied to `theme.worldMap.cellTravelMinutes` (default `12` min/cell).
- Terrain modifiers currently in use:
  - road: `x1`
  - off-road grass: `x2`
  - off-road forest: `x4`
- Night travel penalties:
  - movement time multiplier: `x1.5`,
  - fatigue multiplier on top of travel scale: `x1.35`.

### Ferry travel
- Ferry action advances time based on water-cell length (`waterCells * 2` minutes).
- At night, ferry fatigue gain also increases (`x1.2` over ferry fatigue scale).

### Sleep (camp)
- Camp sleep advances time by 8 hours.
- Existing ambush and fatigue recovery behavior is preserved.

### Village actions
Village actions now advance time, including at least:
- doctor treatment,
- inn meal,
- inn sleep,
- buy/sell,
- NPC approach and dialogue actions,
- leave village.

## Fatigue model alignment

- Time advancement callback also carries fatigue scaling.
- Heavy activities (travel/ferry) pass higher fatigue scale values.
- Night travel explicitly increases fatigue beyond daytime baseline.
- Lighter village/social actions pass much lower fatigue scale values.
- Sleep still primarily recovers fatigue through existing recovery mechanics.

## Save/load notes

- Time state is now serialized into save data as optional `time` payload.
- Older saves without `time` remain loadable; a new random calendar is generated when absent.
- If `time` is absent (legacy save), the runtime deterministically regenerates calendar from current world+character seed source, then continues from there.

## Calendar generation details (new)

- `months/year` and `days/month` now share the same distribution model:
  - sample one of log buckets (`1`, `2..3`, `4..7`, `8..15`, `16..30`) with equal chance,
  - then sample uniformly inside the chosen bucket.
- This keeps very small calendars possible while preventing extreme-size calendars from dominating generation.
- Day-length style outcomes:
  - **Uniform worlds:** every month has identical day count.
  - **Slightly varied worlds:** months are close to a base value (small ± drift).
  - **Random worlds:** each month can independently vary across the full `1..30` space.
- Determinism is preserved per generation seed; same world/character seed context still reproduces the same generated calendar.

## Integration points

- Runtime calendar: `js/systems/time/GameTimeRuntime.ts`
- World movement/encounters time ticks: `js/systems/world-mode/WorldModeTravelEncounterController.ts`
- Village action time ticks: `js/systems/village/*`
- HUD clock/date binding: `js/systems/controllers/HudController.ts` and `index.html`
- Full calendar display wiring in Lore panel + popover window: `js/game/GameFacade.ts`, `js/systems/controllers/HudController.ts`, `index.html`, `style.css`
- Day/night world tint: `js/systems/world/worldMap/WorldMapVillageNavigationAndRender.ts`
- Save snapshot extension: `js/game/runtime/GamePersistenceRuntime.ts`

## Lore calendar popover visibility guarantee

- The calendar popover is explicitly hidden by default in CSS (`display: none`) and only becomes visible in the `:popover-open` state.
- This prevents accidental always-visible rendering in browsers that might otherwise paint the `<section>` as a normal block element.
- Automated regression checks cover:
  - Lore button + popover target wiring in `index.html`.
  - required CSS visibility rules for hidden-by-default and open-state display.
  - test file: `rgfn_game/test/ui/loreCalendarPopover.test.js`.

## Practical follow-up ideas

1. Add explicit **combat time ticks** per turn/action for full parity with "everything costs time".
2. Add per-action fatigue profiles in config (`balanceConfig`) instead of constants in logic.
3. Add calendar-aware quest/event hooks (seasonal rumors, festival days, etc.).
4. Add optional moon-phase/night-vision rendering layer.
5. Display world date/time in village and battle sidebars too, not only main stat panel.

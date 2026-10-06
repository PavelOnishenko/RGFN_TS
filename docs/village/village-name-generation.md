# Village Name Generation (RGFN)

## Why this exists

Village names previously repeated too quickly and also drifted toward legacy compound style (`MossStead`/`OakCrook`-like forms) that no longer matched the newer naming direction used by the quest pipeline.

The current generator balances four constraints:

1. **High variety** (avoid repeats on medium/large worlds),
2. **Readable length** (mostly short names),
3. **Mixed spacing style** (single-word and multi-word names both common enough),
4. **Quest-pipeline stylistic alignment** (echo-syllable + curated lexical sets, not legacy oak/moss/stead compounds).

## Target output profile

The generator is tuned so that:

- **1–2 words** are the default in most cases,
- **3-word names** are rare,
- names with spaces remain common enough for visual variety.

Inside single-token echo words:

- 2 syllables are most common,
- 3 syllables are uncommon,
- 4 syllables are rare.

## Implementation

Primary file:
- `js/systems/world/VillageNameGenerator.ts`

### Pattern layer (word-count control)

`NAME_PATTERNS` uses weighted templates over token classes:

- `ECHO` (deterministic pseudo-word from short syllable inventory)
- `ADJECTIVE`
- `PLACE`

Examples of produced style:
- `Lorzen`
- `Silver Vale`
- `Quinesh Harbor`
- `Ancient Gate Watch` (rare longer form)

### Word-construction layer

- `ECHO` words are built from deterministic syllable picks (`va`, `lor`, `quin`, ...).
- `ADJECTIVE` and `PLACE` are picked from curated short lists aligned to quest vocabulary direction.

## Determinism model

- World map calls the generator via a stable coordinate hash seed.
- Same world seed + same tile coordinates => same village name.
- Save/load stability remains intact.

## Runtime integration

- `WorldMap.getVillageName(...)` delegates to `generateVillageName(seed)`.
- `VillageLifeRenderer` fallback naming path uses the same generator, so fallback village names follow identical style rules.

## Regression checks

`test/systems/worldMap.test.js` validates:

- large effective unique name space,
- mostly 1–2 word names,
- 3+ word names remain rare,
- spaced names occur often enough,
- deterministic same-coordinate behavior.

## Future extension ideas

- Biome-sensitive token weighting (e.g., fewer coastal place words in arid zones).
- Region/culture packs with alternate syllable inventories.
- Optional reserved names for story-critical settlements.

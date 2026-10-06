# World map travel-time scale and visibility model (design note)

_Date: 2026-03-28_

## Why this note exists

Current RGFN world-map assumptions combine two factors:

- **Cell travel time** is currently set to `20` minutes per step (`theme.worldMap.cellTravelMinutes`).
- **Visibility radius** is currently `2`, but line-of-sight is heavily cut by forests and mountains (`balanceConfig.worldMap.visibilityRadius` + `WorldMap.isCellVisible(...)`).

This can make forest navigation feel harsh: technically radius is not zero, but forests block line-of-sight aggressively and effectively create a "blind tunnel" feeling.

## Implementation status (March 28, 2026 follow-up)

Implemented in code:

- `theme.worldMap.cellTravelMinutes` updated from `20` to **`12`**.
- `balanceConfig.worldMap.visibilityRadius` updated from `2` to **`3`**.
- Forest line-of-sight updated to allow seeing the **target forest cell itself** while still blocking vision beyond forest (same blocker behavior model as mountain target handling).

Practical effect:

- Open terrain feels less claustrophobic due to larger default radius.
- Forest traversal remains tense, but immediate orientation in forest is now possible (no longer effectively "blind" for adjacent forest tile).

## Practical target for better pacing

For RGFN specifically, a strong baseline is:

- **12 minutes per cell** as the new default travel unit.

Why 12 min is a good anchor:

1. **Session rhythm:** 5 cells ≈ 1 hour of in-world time (easy mental math).
2. **Meaningful but not sluggish:** travel still feels non-trivial; unlike 20 min, routes no longer feel overlong.
3. **Quest readability:** shorter per-cell time reduces friction when players traverse several tiles to validate rumors/objectives.
4. **Future scaling flexibility:** allows adding terrain modifiers (e.g., mountain 1.5x, road 0.75x) without exploding total travel time.

## Recommended visibility interpretation by terrain

If cells become conceptually "smaller" (because time per step is reduced), visibility can be slightly more generous while preserving terrain identity:

- **Grassland/plains:** effective sight radius around player ≈ **3–4 cells**.
- **Forest:** effective sight radius around player ≈ **1 cell** (instead of near-blind behavior).
- **Mountain ridges:** block beyond themselves, but immediate mountain-adjacent cells should remain legible.

This keeps forest tense, but no longer disorienting.

## Suggested balancing presets

Use one of the presets below for rapid playtesting.

### Preset A (recommended first test)
- `cellTravelMinutes`: **12**
- global `visibilityRadius`: **3**
- forest LoS behavior: "dense blocker" but allow immediate neighborhood readability

Result: noticeably better navigation, still survival-ish.

### Preset B (faster exploration)
- `cellTravelMinutes`: **10**
- global `visibilityRadius`: **4**
- forest LoS behavior: partial attenuation (not full block)

Result: exploration-forward, less tension.

### Preset C (conservative change)
- `cellTravelMinutes`: **15**
- global `visibilityRadius`: **3**
- forest LoS behavior: unchanged

Result: minimal risk, but forest pain point may remain.

## If implementing in code later

Primary touchpoints:

1. `rgfn_game/js/config/ThemeConfig.ts`
   - `theme.worldMap.cellTravelMinutes`
2. `rgfn_game/js/config/balanceConfig.ts`
   - `worldMap.visibilityRadius`
3. `rgfn_game/js/systems/world/WorldMap.ts`
   - `isCellVisible(...)` terrain line-of-sight rules, especially forest handling.

## Recommendation summary

If we pick one value today as a new conceptual standard for RGFN world-map scale:

- **Adopt 12 minutes per cell**.

Then run short playtests with improved forest readability (at least 1-cell neighborhood visibility) before finalizing terrain-specific LoS rules.

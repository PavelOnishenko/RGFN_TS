## Purge / Hunt pack runtime contract (March 26, 2026)

This note documents how **Purge XXX Pack** and **Hunt XXX** tasks are now fully completable in runtime.

### What changed

- Purge (`eliminate`) and hunt (`hunt`) leaves now always bind to a real generated village name (from world map village set).
- Leaf quest data now stores machine-readable monster objective metadata:
  - target monster name,
  - required kills,
  - village anchor,
  - mutation traits,
  - mutation origin species.
- Runtime quest tracking now supports kill-based progression and count accumulation.
- World exploration can spawn objective monster packs when the hero is roaming near the objective village.

### Player-facing completion loop

1. Receive objective, e.g. `Purge Torka Kaquin Pack`.
2. Read condition and description:
   - where to search (`near <VillageName>`),
   - what target to kill (exact monster name),
   - mutation origin + observed traits.
3. Travel around that village area.
4. Quest-specific encounters begin spawning there.
5. Defeat required number of matching targets.
6. Objective auto-completes in quest tracker.

### Trait support in code

The following generator trait names are supported in enemy runtime behavior:

- `feral strength` → increased physical damage,
- `void armor` → extra armor,
- `acid blood` → retaliation damage when hit,
- `blink speed` → higher avoid chance,
- `barbed hide` → extra retaliation damage on melee hit,
- `grave intellect` → improved magic profile + stronger attack behavior.

### Code reference map

- Quest metadata + monster entity support:
  - `js/systems/quest/QuestTypes.ts`
  - `js/systems/quest/QuestLeafFactory.ts`
- Kill progress tracking + active objective feed:
  - `js/systems/quest/QuestProgressTracker.ts`
- Runtime encounter injection near village anchors:
  - `js/systems/WorldModeController.ts`
  - `js/Game.ts`
- Enemy mutation runtime behavior:
  - `js/entities/Skeleton.ts`
  - `js/systems/game/BattleCommandController.ts`

### Testing checklist

- Generate a quest with an `eliminate` or `hunt` leaf.
- Confirm condition contains `near <VillageName>`.
- Travel close to that village.
- Verify battle log hint for objective tracks and quest-specific monster spawn.
- Kill objective monsters and verify kill counter progression.
- Confirm node auto-completes when required kills reached.
- Validate mutation reactions in battle logs (acid/barbed retaliation).

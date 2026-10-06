# Village Bone Animation Integration (RGFN)

The former EVA animation code is owned entirely by RGFN because Neon Void does not consume it.

## Runtime ownership

- `rgfn_game/js/animations/importedAnimation.js` interpolates imported keyframes and converts them into a pose.
- `rgfn_game/js/rendering/StickFigure.js` draws the pose.
- `rgfn_game/js/animations/imported/walkImported.js` owns the walk clip.
- `rgfn_game/js/utils/StickFigure.ts` applies RGFN line widths and colors.
- `rgfn_game/js/systems/village/life/VillageLifeRenderer.ts` selects animation progress, facing, position, and scale.

These JavaScript runtime files are part of the RGFN source tree and are emitted to `rgfn_game/dist/` by `npm run build:rgfn`.

## Runtime behavior

- Walking villagers animate over normalized progress `[0..1]`.
- Idle villagers use frame `0` as their standing pose.
- Facing direction comes from the movement vector between village spots.

## Tuning

- Line and outline widths live in `rgfn_game/js/utils/StickFigure.ts`.
- Village anchoring and scale live in `VillageLifeRenderer.ts`.
- Imported animation shapes are typed in `rgfn_game/js/animations/types.ts`.

## Verification

- `npm run build:rgfn`
- `npm run test:rgfn`
- Manual village pass: walkers animate and face their movement direction.

# RGFN Lint Warning Playbook

## What was fixed

This pass removed style-guide and ESLint warnings in core RGFN gameplay modules by applying consistent patterns:

- Converted single-return methods to concise arrow members/functions when requested by `style-guide/arrow-function-style`.
- Repacked comma-separated parameter lists and initializers to satisfy `style-guide/rule17-comma-layout`.
- Broke long expressions and object literals to satisfy `max-len` (170 char cap).
- Added explicit braces for single-line conditionals (`curly`) where eslint autofix applied it.

## Useful patterns for future edits

- **Single-expression method in classes**
  - Prefer: `private fn = (a: A): B => expr;`
- **Dependency-heavy factory constructors**
  - Keep callback bags and argument lists multiline with one property per line once length approaches 170.
- **Rule 17 compactness guidance**
  - If a parameter list can fit in one line under the configured threshold, keep it on one line.
  - Otherwise, split clearly and keep each internal line under 170 chars.

## Test/lint workflow notes

From repository root:

1. Lint only the RGFN TypeScript scope:
   - `npm run lint:ts:rgfn:eslint`
2. Full RGFN lint + style audit:
   - `npm run lint:ts:rgfn`
3. Full test suite currently depends on built `dist/` artifacts for `rgfn_game` tests:
   - `npm test` will fail early with `ERR_MODULE_NOT_FOUND` if dist files are missing.

## Optional follow-up ideas

- Add a dedicated script that builds required dist outputs before `node --test`.
- Consider adding a focused `test:rgfn` script that excludes unrelated suites when iterating on RGFN-only changes.

## 2026-03-30 remediation notes

- `js/game/GameFactory.ts` exceeded both file-length and function-length guidance.
- The fix extracted construction helpers into `js/game/GameFactoryHelpers.ts` so the top-level factory file stays orchestration-focused and below rule thresholds.
- `createGameRuntime` was reduced to a short coordinator function by moving binding/assignment details into a dedicated helper.
- Root folder child-count warning was resolved by moving this playbook from `rgfn_game/LINT_WARNING_PLAYBOOK.md` to `rgfn_game/docs/LINT_WARNING_PLAYBOOK.md`, reducing root-level clutter.

### Practical refactor template for future factory files

1. Keep the file with the public factory entrypoint (`createXRuntime`) to wiring only.
2. Move verbose callback bags and object construction to a `*Helpers.ts` module.
3. Add narrowly scoped helper functions (`bindAndAssignX`) when one function starts mixing setup and registration responsibilities.
4. Track non-code style-guide warnings (like folder child limits) by relocating standalone docs to existing docs folders.

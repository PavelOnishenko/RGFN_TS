# RGFN

Standalone turn-based RPG with overworld, village, quest, and battle systems.

## Godot + C# development plan

The migration vision, shared-repository layout, small-step agent workflow, and
current work state are documented in [docs/godot-migration/README.md](docs/godot-migration/README.md).
The TypeScript version remains at the repository root while the new version is
developed under `game/`.

The first headless C# core test is now implemented. With a compatible .NET 8 SDK:

```bash
cd game
dotnet test tests/Rgfn.Core.Tests/Rgfn.Core.Tests.csproj
```

Source-test mappings are tracked in [TEST-MAP.md](docs/godot-migration/TEST-MAP.md).
Cloud-local SDK setup is described in [REPOSITORY.md](docs/godot-migration/REPOSITORY.md).

## Repository extraction

Move this directory's contents to the new repository root, including hidden `.github/` and `.gitignore`. Do not transfer generated `node_modules/`, `dist/`, or `deploy/` directories.

## Requirements

- Node.js 18 or newer
- npm

## Development

```bash
npm ci
npm test
```

`npm test` builds `js/` into `dist/` before running the Node test suite. To rebuild continuously, use `npm run watch`.

## Run locally

After `npm run build`, serve the repository root over HTTP:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Opening `index.html` directly is unsupported because the game uses ES modules and fetches quest-pack data.

## Deployment

`npm run deploy:prepare` creates a complete static site in `deploy/`, including compiled modules, CSS, and quest-pack data. The included GitHub Actions workflow tests the game and deploys this directory to GitHub Pages from `super_release` or by manual dispatch.

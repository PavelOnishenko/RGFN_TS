# RGFN Quest Generation Methodology

## April 2, 2026 reliability hotfix: sanitize quest-pack asset tokens + correct dist-relative paths

### Symptom that was fixed
- Some generated names for NPCs, locations, and quest items occasionally contained:
  - raw HTML snippets (for example `<pre>Cannot`),
  - stray transport/debug fragments (for example `Lang="en"> GET`),
  - absolute/relative filesystem-like paths.

### Root causes
1. **Local quest-pack path depth was off by one directory** for runtime `import.meta.url` resolution.
   - Source file: `js/systems/quest/generation/QuestPackTypes.ts`
   - Old paths used `../../../data/...` from `js/systems/quest/generation`, which does not climb back to project root.
   - Correct paths are `../../../../data/...`.
2. **Asset tokenization accepted any whitespace token**, including HTML/error-page text when content loading returned non-word payloads.

### Fix implemented
- Updated every `ASSET_PATHS` entry from `../../../data/...` to `../../../../data/...`.
- Hardened `QuestPackService.wordList()` to keep only lexical tokens matching:
  - `^[a-z][a-z'-]*$` (case-insensitive).
- Added a load-time guard:
  - if a quest-pack asset yields zero usable tokens after sanitization, initialization throws a clear error with asset key + path.

### Why this improves stability
- Prevents malformed payloads from being silently converted into generated entity names.
- Fails fast when asset resolution breaks instead of emitting corrupted quest strings into UI.
- Keeps valid fantasy-style tokens (letters with optional apostrophes/hyphens) while dropping markup and path fragments.

## Goal
Create a **central main quest** for each character that defines whether that run is considered "game completed".
The main quest is shown:
1. On page load (full text in a modal window).
2. Later in HUD via **Quests** button/panel.

## Core Data Model
- **Task**: universal quest node concept.
- Task can be:
  - **Composite** (contains subtasks).
  - **Elementary** (leaf, contains no subtasks).
- Completion rule:
  - Elementary task is complete when its condition is met.
  - Composite task is complete when all required child tasks are complete.
  - Main quest is complete when all top-level tasks are complete.

## Tree Structure Strategy
- Use a rooted tree (main quest root).
- Nesting depth is theoretically unbounded, but practical median depth target: **2-3**.
- Branch count per composite node target: **2-3 subtasks**.
- Keep generated structure readable for UI.

## Elementary Objective Families
Current implemented/target families:
- **Eliminate** (kill target).
- **Deliver** (bring item to destination).
- **Travel** (arrive at location).
- **Barter** (complete trade).
- **Scout** (investigate area, fallback universal objective).

## Parameter Questions (Generation Method)
For each objective family, produce parameters by answering question slots.

### 1) Eliminate
Questions:
- Who is target? (archetype: skeleton/zombie/..., or specific named unit)
- Quantity? (1..N)
- Any location restriction?
- Is kill type-specific? (melee only / any)

Condition template examples:
- "Kill 3 skeletons."
- "Kill Dark Knight in Burnt Orchard."

### 2) Deliver
Questions:
- Which item?
- To what location / NPC?
- Must item remain intact (not consumed)?
- Deadline or no deadline?

Condition template:
- "Reach destination while carrying X."

### 3) Travel
Questions:
- Which location?
- Is one-time visit enough?
- Must route include checkpoints?

Condition template:
- "Enter location X."

### 4) Barter
Questions:
- Which trader/NPC type?
- Exchange requirement (any deal / specific deal)?
- Required output item?

Condition template:
- "Complete barter and obtain X."

### 5) Scout (creative extension)
Questions:
- Which zone?
- What evidence/object must be inspected?
- One scan or multiple points?

Condition template:
- "Complete scouting investigation at X."

## Generation Pipeline
1. Create main quest root with narrative framing text.
2. Roll top-level branch count (1..3).
3. For each branch:
   - Decide composite vs elementary by depth-sensitive probability.
   - If composite: recurse, generate 2..3 children.
   - If leaf: roll objective family and fill parameter slots.
4. Build human-readable condition strings.
5. Render full tree in intro modal and quests panel.

## Tuning Rules
- Keep text concise but explicit.
- Favor mixed objective families for variety.
- Avoid too many leaves with identical type in one branch.
- If future telemetry appears, tune probabilities by completion rates.

## Name Length Control (March 28, 2026)

To reduce awkward ultra-long quest entities and make names easier to read in UI, quest name generation now has centralized word-length controls in config:

- File: `js/config/balanceConfig.ts`
- Section: `balanceConfig.questNameGeneration`
  - `maxWordsByDomain`: hard caps per domain (`location`, `artifact`, `character`, `monster`, `mainQuest`).
  - `wordLengthWeightsByDomain`: weighted length distribution per domain.

Current policy:
- 1-word and 2-word names are dominant.
- 3-word names are intentionally uncommon.
- 4-word names are intentionally **extremely rare**.

Implementation details:
- `QuestLeafFactory` and `QuestGenerator` no longer hardcode `3`/`4` caps; they request limits from config.
- `QuestPackService` now resolves target word count via the configured weighted tables for **all** quest name domains.
- For each generated name:
  1. Pick target word count from weights (respecting the domain cap).
  2. Compose name tokens from available pack sources (`local-pattern`, `echo`, optional remotes, map village source for locations).

Practical balancing workflow:
1. Increase weight of `1` and/or `2` to make names shorter more often.
2. Lower weight of `3` if UI lines wrap too much.
3. Keep weight of `4` at `1` (or `0`) unless long ceremonial names are desired.
4. Keep domain caps explicit, so content teams can tune domains independently (e.g., shorter NPC names but slightly longer main-quest titles).

## Future Expansion Ideas
- Specific named targets (boss IDs).
- Optional tasks that grant bonuses but are not required for completion.
- Logical operators for composite nodes (ALL / ANY / N-of-M).
- World-state reactive generation (biome, player build, encountered factions).

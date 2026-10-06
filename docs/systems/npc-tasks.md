# NPC Tasks and Daily Schedules

## Runtime ownership

`WorldSimulationRuntime` is the source of truth for every persistent village NPC's identity, home village, profession, life status, current world-map cell, route, current task, and deterministic daily schedule. `VillageNpcRoster` remains the dialogue/passport view and reports all roster changes back to the simulation.

The anonymous figures animated by `VillagePopulation` are decorative and are not scheduled NPC identities.

## Time processing

`GameFacade.advanceTime` advances `GameTimeRuntime`, then advances the world simulation to the clock's absolute `totalMinutes`. The simulation consumes every crossed minute, which makes one twelve-hour wait equivalent to twelve one-hour advances. Save data stores `simulatedToMinute`, active routes, movement progress, task timestamps, and daily choices.

All NPCs sleep from 22:00 until 06:00 by default. These and all profession timings are configured in `js/config/balance/npcTasksBalance.ts`.

## Profession behavior

- Hunters leave after 07:00, choose reachable non-water cells within three cells of home, hunt for 30–120 minutes, repeat, and return after 18:00.
- Traders remain in their village. They run the shop from 09:00–17:00 and can talk throughout their waking day.
- Millers and carpenters work in the village from 08:00–18:00 and cannot talk while working.
- Guards remain in the village and can always talk while awake.
- Herbalists deterministically spend about half their days gathering within their separately configured six-cell range. On other days they process herbs in the village and remain talkable.
- Innkeepers run inn services from 09:00–20:00. They provide meals and rooms, never the village shop.
- Unrecognized or quest-specific roles use the resident schedule: village chores while awake, with dialogue available.

Routes use eight-direction movement and cannot enter water. Candidate cells and every route step remain inside the profession's configured expedition radius.

## Interaction invariants

Capabilities are derived from live simulation state:

- Sleeping, dead, outside-village, hunting, gathering, and traveling NPCs cannot talk.
- Working millers and carpenters cannot talk.
- Shop actions require a selected on-duty trader.
- Meal and room actions require a selected on-duty innkeeper.
- UI buttons and service/controller handlers both enforce these rules.

Village Rumors keeps unavailable residents visible but disables their buttons with a status. If elapsed time makes the selected NPC unavailable, the dialogue closes immediately. Disabled appearance uses the shared themed button styles and `--color-disabled`.

## Persistence

NPC task state is stored inside `worldSimulation` in save version 3. Version 1 and 2 saves are migrated. Saves without canonical NPC state generate the roster once after the saved world map has been restored, reconcile it to the restored clock, and then persist it as version 3.

The developer NPC List displays each NPC's home, a readable description of where they are now, what they are doing, where their active route is headed, personality, and life status.

import test from 'node:test';
import assert from 'node:assert/strict';

import WorldMap from '../../dist/systems/world/worldMap/WorldMap.js';
import { balanceConfig } from '../../dist/config/balance/balanceConfig.js';
import { theme } from '../../dist/config/ThemeConfig.js';
import { createMockCanvasContext, withMockedRandom, withPatchedProperty } from '../helpers/testUtils.js';

function placePlayerAt(worldMap, col, row) {
  const state = worldMap.getState();
  delete state.viewport;
  worldMap.restoreState({
    ...state,
    playerGridPos: { col, row },
    visitedCells: [`${col},${row}`],
  });
}

test('WorldMap starts the player in a random traversable cell and exposes pixel position', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(100, 100, 20);
  const state = worldMap.getState();
  const terrain = worldMap.terrainData.get(`${state.playerGridPos.col},${state.playerGridPos.row}`);
  const [x, y] = worldMap.getPlayerPixelPosition();

  assert.equal(terrain.type === 'water', false);
  assert.equal(terrain.type === 'mountain', false);
  assert.equal(Number.isFinite(x), true);
  assert.equal(Number.isFinite(y), true);
  assert.notDeepEqual(state.playerGridPos, { col: 50, row: 50 });
}));

test('WorldMap generation excludes mountain and desert terrain types', () => withMockedRandom([0.37], () => {
  const worldMap = new WorldMap(60, 45, 20);
  const terrainTypes = Array.from(worldMap.terrainData.values()).map((terrain) => terrain.type);

  assert.equal(terrainTypes.includes('mountain'), false);
  assert.equal(terrainTypes.includes('desert'), false);
}));

test('WorldMap generates villages before placing the player into the world', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  const state = worldMap.getState();

  assert.equal(state.villages.includes(`${state.playerGridPos.col},${state.playerGridPos.row}`), false);
}));

test('WorldMap scales generated village count with world-map village creation multiplier', () => withMockedRandom([0.11, 0.11], () => {
  const fullVillageCount = withPatchedProperty(balanceConfig.worldMap.villages, 'creationRateMultiplier', 1, () => (
    new WorldMap(100, 100, 20).getState().villages.length
  ));

  const reducedVillageCount = withPatchedProperty(balanceConfig.worldMap.villages, 'creationRateMultiplier', 1 / 3, () => (
    new WorldMap(100, 100, 20).getState().villages.length
  ));

  assert.equal(reducedVillageCount < fullVillageCount, true);
  assert.equal(Math.abs(reducedVillageCount - Math.floor(fullVillageCount / 3)) <= 2, true);
}));


test('WorldMap village naming generator produces a large deterministic name space with mostly short names', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  const sampledNames = [];

  for (let col = 0; col < 20; col += 1) {
    for (let row = 0; row < 20; row += 1) {
      sampledNames.push(worldMap['getVillageName'](col, row));
    }
  }

  const uniqueNames = new Set(sampledNames);
  const wordCounts = sampledNames.map((name) => name.trim().split(/\s+/).length);
  const oneOrTwoWordCount = wordCounts.filter((count) => count <= 2).length;
  const fourWordCount = wordCounts.filter((count) => count >= 4).length;
  const spacedCount = sampledNames.filter((name) => name.includes(' ')).length;

  assert.equal(uniqueNames.size > 180, true);
  assert.equal(oneOrTwoWordCount >= sampledNames.length * 0.9, true);
  assert.equal(fourWordCount <= sampledNames.length * 0.05, true);
  assert.equal(spacedCount >= sampledNames.length * 0.35, true);
  assert.equal(worldMap['getVillageName'](4, 7), worldMap['getVillageName'](4, 7));
}));

test('WorldMap uses a different persistent seed for each new world generation', () => withMockedRandom([0.11, 0.25], () => {
  const firstWorld = new WorldMap(24, 18, 20);
  const secondWorld = new WorldMap(24, 18, 20);

  assert.notEqual(firstWorld.getState().worldSeed, secondWorld.getState().worldSeed);
  assert.notDeepEqual(firstWorld.terrainData.get('0,0'), secondWorld.terrainData.get('0,0'));
}));

test('WorldMap restoreState regenerates terrain from the saved world seed', () => withMockedRandom([0.15, 0.82], () => {
  const originalWorld = new WorldMap(24, 18, 20);
  const savedState = originalWorld.getState();

  const restoredWorld = new WorldMap(24, 18, 20);
  restoredWorld.restoreState(savedState);

  assert.deepEqual(restoredWorld.getState().worldSeed, savedState.worldSeed);
  assert.deepEqual(restoredWorld.terrainData.get('1,1'), originalWorld.terrainData.get('1,1'));
  assert.deepEqual(restoredWorld.terrainData.get('8,6'), originalWorld.terrainData.get('8,6'));
}));

test('WorldMap movePlayer handles blocked and valid moves', () => {
  const worldMap = new WorldMap(12, 9, 10);
  placePlayerAt(worldMap, 6, 4);

  ['6,3', '6,2', '6,1', '6,0'].forEach((key) => {
    const terrain = worldMap.terrainData.get(key);
    worldMap.terrainData.set(key, {
      ...terrain,
      type: 'grass',
      color: theme.worldMap.terrain.grass,
      pattern: 'plain',
    });
  });

  assert.deepEqual(worldMap.movePlayer('up'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('up'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('up'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('up'), { moved: true, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('up'), { moved: false, isPreviouslyDiscovered: false });
});

test('WorldMap movePlayer blocks walking onto water tiles', () => {
  const worldMap = new WorldMap(12, 9, 10);
  placePlayerAt(worldMap, 6, 4);

  worldMap.terrainData.set('6,3', {
    ...worldMap.terrainData.get('6,3'),
    type: 'water',
    color: theme.worldMap.terrain.water,
    pattern: 'waves',
  });
  worldMap.terrainData.set('7,4', {
    ...worldMap.terrainData.get('7,4'),
    type: 'grass',
    color: theme.worldMap.terrain.grass,
    pattern: 'plain',
  });

  assert.deepEqual(worldMap.movePlayer('up'), { moved: false, isPreviouslyDiscovered: false });
  assert.deepEqual(worldMap.movePlayer('right'), { moved: true, isPreviouslyDiscovered: false });
});

test('WorldMap movePlayer allows diagonal travel across corner-only connections', () => {
  const worldMap = new WorldMap(12, 9, 10);
  placePlayerAt(worldMap, 6, 4);

  worldMap.terrainData.set('6,3', {
    ...worldMap.terrainData.get('6,3'),
    type: 'water',
    color: theme.worldMap.terrain.water,
    pattern: 'waves',
  });
  worldMap.terrainData.set('5,4', {
    ...worldMap.terrainData.get('5,4'),
    type: 'water',
    color: theme.worldMap.terrain.water,
    pattern: 'waves',
  });
  worldMap.terrainData.set('5,3', {
    ...worldMap.terrainData.get('5,3'),
    type: 'grass',
    color: theme.worldMap.terrain.grass,
    pattern: 'plain',
  });

  assert.deepEqual(worldMap.movePlayer('upLeft'), { moved: true, isPreviouslyDiscovered: false });
});

test('WorldMap marks revisited cells as previously discovered', () => {
  const worldMap = new WorldMap(12, 9, 10);
  placePlayerAt(worldMap, 6, 4);

  worldMap.terrainData.set('6,3', { ...worldMap.terrainData.get('6,3'), type: 'grass', color: theme.worldMap.terrain.grass, pattern: 'plain' });
  worldMap.terrainData.set('6,4', { ...worldMap.terrainData.get('6,4'), type: 'grass', color: theme.worldMap.terrain.grass, pattern: 'plain' });
  worldMap.movePlayer('up');
  worldMap.movePlayer('down');

  const result = worldMap.movePlayer('up');
  assert.equal(result.moved, true);
  assert.equal(result.isPreviouslyDiscovered, true);
});

test('WorldMap applies terrain-based line of sight rules', () => {
  const worldMap = new WorldMap(12, 9, 10);
  placePlayerAt(worldMap, 6, 4);
  const originalRadius = balanceConfig.worldMap.visibilityRadius;
  balanceConfig.worldMap.visibilityRadius = 2;

  try {
    worldMap.terrainData.set('7,4', {
      ...worldMap.terrainData.get('7,4'),
      type: 'forest',
      color: theme.worldMap.terrain.forest,
      pattern: 'groves',
    });
    worldMap.terrainData.set('8,4', {
      ...worldMap.terrainData.get('8,4'),
      type: 'grass',
      color: theme.worldMap.terrain.grass,
      pattern: 'plain',
    });
    worldMap.terrainData.set('6,3', {
      ...worldMap.terrainData.get('6,3'),
      type: 'mountain',
      color: theme.worldMap.terrain.mountain,
      pattern: 'ridges',
    });
    worldMap.terrainData.set('6,2', {
      ...worldMap.terrainData.get('6,2'),
      type: 'grass',
      color: theme.worldMap.terrain.grass,
      pattern: 'plain',
    });

    worldMap.restoreState({ ...worldMap.getState(), playerGridPos: { col: 6, row: 4 } });

    assert.equal(worldMap.isCellVisible(7, 4), true);
    assert.equal(worldMap.isCellVisible(8, 4), false);
    assert.equal(worldMap.isCellVisible(6, 3), true);
    assert.equal(worldMap.isCellVisible(6, 2), false);
    assert.equal(worldMap.isCellVisible(5, 4), true);
  } finally {
    balanceConfig.worldMap.visibilityRadius = originalRadius;
  }
});

test('WorldMap supports zooming and scrolling for large maps', () => {
  const worldMap = new WorldMap(100, 100, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);

  const viewportBefore = worldMap.getState().viewport;
  const [beforeX] = worldMap.getPlayerPixelPosition();

  assert.equal(worldMap.zoomIn(), true);
  assert.equal(worldMap.pan('right'), true);

  const viewportAfter = worldMap.getState().viewport;
  const [afterX] = worldMap.getPlayerPixelPosition();

  assert.ok(viewportAfter.cellSize > viewportBefore.cellSize);
  assert.notEqual(afterX, beforeX);
});

test('WorldMap can center the viewport back on the player after panning', () => {
  const worldMap = new WorldMap(100, 100, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);
  worldMap.centerOnPlayer();

  const centeredViewport = worldMap.getState().viewport;
  worldMap.pan('right');
  worldMap.centerOnPlayer();
  const reCenteredViewport = worldMap.getState().viewport;

  assert.deepEqual(reCenteredViewport, centeredViewport);
});

test('WorldMap supports pixel-based panning for middle-mouse dragging', () => {
  const worldMap = new WorldMap(100, 100, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);
  worldMap.centerOnPlayer();

  const viewportBefore = worldMap.getState().viewport;
  const changed = worldMap.panByPixels(48, -36);
  const viewportAfter = worldMap.getState().viewport;

  const viewportMoved = viewportAfter.offsetX !== viewportBefore.offsetX || viewportAfter.offsetY !== viewportBefore.offsetY;
  assert.equal(changed, viewportMoved);
});

test('WorldMap supports developer map display combinations for full reveal and fog-free exploration', () => {
  const worldMap = new WorldMap(12, 9, 20);
  placePlayerAt(worldMap, 6, 4);
  worldMap.selectedGridPos = { col: 0, row: 0 };

  assert.ok(['unknown', 'hidden'].includes(worldMap.getSelectedCellInfo()?.fogState));

  worldMap.setMapDisplayConfig({ fogOfWar: false });
  assert.equal(worldMap.getSelectedCellInfo()?.fogState, 'hidden');

  worldMap.setMapDisplayConfig({ everythingDiscovered: true });
  assert.equal(worldMap.getSelectedCellInfo()?.fogState, 'discovered');
});

test('WorldMap exposes selected cell info from mouse position after viewport transforms', () => {
  const worldMap = new WorldMap(12, 9, 20);
  placePlayerAt(worldMap, 6, 4);
  worldMap.resizeToCanvas(480, 360);
  worldMap.zoomIn();

  const [x, y] = worldMap.getPlayerPixelPosition();
  worldMap.updateSelectedCellFromPixel(x, y);

  assert.deepEqual(worldMap.getSelectedCellInfo(), {
    mode: 'world',
    col: 6,
    row: 4,
    terrainType: worldMap.getCurrentTerrain().type,
    fogState: 'discovered',
    isVisible: true,
    isVillage: false,
    villageName: null,
    villageStatus: null,
    locationFeatureIds: [],
    isTraversable: worldMap.getCurrentTerrain().type !== 'water',
  });
});

test('WorldMap draw renders visible terrain, fog and grid without throwing on a 100x100 map', () => {
  const worldMap = new WorldMap(100, 100, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);
  const ctx = createMockCanvasContext();

  worldMap.draw(ctx, null);

  assert.ok(ctx.calls.some(c => c[0] === 'fillRect'));
  assert.ok(ctx.calls.some(c => c[0] === 'fillText'));
  assert.ok(ctx.calls.some(c => c[0] === 'stroke'));
});

test('WorldMap render layer toggles can fully blank the global map draw output', () => {
  const worldMap = new WorldMap(30, 20, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);
  const ctx = createMockCanvasContext();
  ctx.clearRect = (...args) => ctx.calls.push(['clearRect', ...args]);
  let drawBackgroundCalls = 0;
  const originalDrawBackground = worldMap.renderer.drawBackground.bind(worldMap.renderer);
  worldMap.renderer.drawBackground = (...args) => {
    drawBackgroundCalls += 1;
    return originalDrawBackground(...args);
  };

  worldMap.setRenderLayerToggles({
    terrain: false,
    roads: false,
    locations: false,
    character: false,
    selectionCursor: false,
  });

  worldMap.draw(ctx, null);

  assert.equal(drawBackgroundCalls, 0);
  assert.ok(ctx.calls.some((call) => call[0] === 'clearRect'));
});

test('WorldMap render layer toggles independently control character and selection cursor markers', () => {
  const worldMap = new WorldMap(30, 20, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);
  placePlayerAt(worldMap, 4, 4);
  worldMap.selectedGridPos = { col: 5, row: 5 };
  worldMap.setMapDisplayConfig({ everythingDiscovered: true, fogOfWar: false });

  const playerCalls = [];
  const cursorCalls = [];
  const originalDrawPlayerMarker = worldMap.renderer.drawPlayerMarker.bind(worldMap.renderer);
  const originalDrawCursorMarker = worldMap.renderer.drawCursorMarker.bind(worldMap.renderer);
  worldMap.renderer.drawPlayerMarker = (...args) => {
    playerCalls.push(args);
    return originalDrawPlayerMarker(...args);
  };
  worldMap.renderer.drawCursorMarker = (...args) => {
    cursorCalls.push(args);
    return originalDrawCursorMarker(...args);
  };

  worldMap.setRenderLayerToggles({ character: false, selectionCursor: true });
  worldMap.draw(createMockCanvasContext(), null);
  worldMap.setRenderLayerToggles({ character: true, selectionCursor: false });
  worldMap.draw(createMockCanvasContext(), null);

  assert.equal(playerCalls.length, 1);
  assert.equal(cursorCalls.length, 1);
});

test('WorldMap draw profiling exposes section timing snapshots', () => {
  const worldMap = new WorldMap(60, 45, theme.worldMap.cellSize.default);
  worldMap.resizeToCanvas(720, 720);
  const ctx = createMockCanvasContext();
  worldMap.setDrawProfilingEnabled(true);
  worldMap.resetDrawProfiling();

  worldMap.draw(ctx, null);
  worldMap.draw(ctx, null);

  const snapshot = worldMap.getDrawProfilingSnapshot();
  assert.ok(snapshot.drawTotal.frames >= 2);
  assert.ok(snapshot.terrain.frames >= 2);
  assert.ok(snapshot.entities.frames >= 2);
  assert.ok(snapshot.visibleTileCalculation.frames >= 2);
  assert.equal(typeof snapshot.drawTotal.avgMs, 'number');
  assert.equal(snapshot.drawTotal.maxMs >= 0, true);
  assert.equal(snapshot.drawTotal.lastFrameMs >= 0, true);
});


test('WorldMap draw switches to low-detail rendering when zoomed out with fog disabled', () => {
  const worldMap = new WorldMap(100, 100, theme.worldMap.cellSize.min);
  worldMap.resizeToCanvas(720, 720);
  worldMap.setMapDisplayConfig({ fogOfWar: false });
  const ctx = createMockCanvasContext();
  const detailLevels = new Set();
  let drawGridCalled = false;
  const originalDrawCell = worldMap.renderer.drawCell.bind(worldMap.renderer);
  const originalDrawGrid = worldMap.renderer.drawGrid.bind(worldMap.renderer);

  worldMap.renderer.drawCell = (drawCtx, cell, fogState, terrain, neighbors, options) => {
    detailLevels.add(options?.detailLevel);
    return originalDrawCell(drawCtx, cell, fogState, terrain, neighbors, options);
  };
  worldMap.renderer.drawGrid = (...args) => {
    drawGridCalled = true;
    return originalDrawGrid(...args);
  };

  worldMap.draw(ctx, null);

  assert.deepEqual([...detailLevels], ['low']);
  assert.equal(drawGridCalled, false);
  assert.ok(ctx.calls.some((call) => call[0] === 'fillRect'));
});

test('WorldMap medium-detail caching avoids full terrain redraw on subsequent frames', () => {
  const worldMap = new WorldMap(100, 100, 12);
  worldMap.resizeToCanvas(720, 720);
  worldMap.setMapDisplayConfig({ fogOfWar: true, everythingDiscovered: false });
  const ctx = createMockCanvasContext();
  ctx.drawImage = (...args) => ctx.calls.push(['drawImage', ...args]);
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => createMockCanvasContext(),
    }),
  };
  const originalDrawCell = worldMap.renderer.drawCell.bind(worldMap.renderer);
  let drawCellCallsFirst = 0;
  let drawCellCallsSecond = 0;
  try {
    worldMap.renderer.drawCell = (drawCtx, cell, fogState, terrain, neighbors, options) => {
      drawCellCallsFirst += 1;
      return originalDrawCell(drawCtx, cell, fogState, terrain, neighbors, options);
    };
    worldMap.draw(ctx, null);

    worldMap.renderer.drawCell = (drawCtx, cell, fogState, terrain, neighbors, options) => {
      drawCellCallsSecond += 1;
      return originalDrawCell(drawCtx, cell, fogState, terrain, neighbors, options);
    };
    worldMap.draw(ctx, null);
  } finally {
    globalThis.document = originalDocument;
  }

  assert.ok(drawCellCallsSecond > 0);
  assert.ok(drawCellCallsFirst > drawCellCallsSecond * 2);
});

test('WorldMap terrain cache render is fog-agnostic and does not draw unknown cells into cached terrain layer', () => {
  const worldMap = new WorldMap(100, 100, 12);
  worldMap.resizeToCanvas(720, 720);
  worldMap.setMapDisplayConfig({ fogOfWar: true, everythingDiscovered: false });
  const ctx = createMockCanvasContext();
  ctx.drawImage = (...args) => ctx.calls.push(['drawImage', ...args]);
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => createMockCanvasContext(),
    }),
  };

  const originalDrawCell = worldMap.renderer.drawCell.bind(worldMap.renderer);
  const cachedTerrainFogStates = [];
  try {
    worldMap.renderer.drawCell = (drawCtx, cell, fogState, terrain, neighbors, options) => {
      if (options?.showFogOverlay === false) {
        cachedTerrainFogStates.push(fogState);
      }
      return originalDrawCell(drawCtx, cell, fogState, terrain, neighbors, options);
    };
    worldMap.draw(ctx, null);
  } finally {
    globalThis.document = originalDocument;
  }

  assert.ok(cachedTerrainFogStates.length > 0);
  assert.deepEqual(new Set(cachedTerrainFogStates), new Set(['discovered']));
});

test('WorldMap roads are tracked per-cell and become drawable when any road cell is discovered', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  const roadIndices = Array.from(worldMap.roadIndexSet.values());
  const villageIndices = new Set(Array.from(worldMap.villageIndexSet.values()));
  const standaloneRoadIndex = roadIndices.find((index) => !villageIndices.has(index));

  assert.ok(roadIndices.length > 0);
  assert.ok(typeof standaloneRoadIndex === 'number');

  const col = standaloneRoadIndex % worldMap.grid.columns;
  const row = Math.floor(standaloneRoadIndex / worldMap.grid.columns);
  const state = worldMap.getState();
  worldMap.restoreState({
    ...state,
    playerGridPos: { col, row },
    visitedCells: [state.villages[0], `${col},${row}`],
  });

  let drawnRoadPaths = 0;
  const originalDrawRoadPath = worldMap.renderer.drawVillageRoadPath.bind(worldMap.renderer);
  worldMap.renderer.drawVillageRoadPath = (...args) => {
    drawnRoadPaths += 1;
    return originalDrawRoadPath(...args);
  };

  worldMap.draw(createMockCanvasContext(), null);

  assert.ok(drawnRoadPaths > 0);
}));

test('WorldMap exposes village names and anchors matching quest locations to village tiles', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  const state = worldMap.getState();
  const [villageCol, villageRow] = state.villages[0].split(',').map(Number);
  const villageName = worldMap.getAllVillageNames().find((name) => worldMap['findVillagePositionByName'](name)?.col === villageCol && worldMap['findVillagePositionByName'](name)?.row === villageRow);

  assert.ok(villageName);

  worldMap.registerNamedLocation(villageName);
  worldMap.setMapDisplayConfig({ everythingDiscovered: true });
  worldMap.restoreState({ ...state, playerGridPos: { col: villageCol, row: villageRow }, visitedCells: [`${villageCol},${villageRow}`] });

  assert.equal(worldMap.getCurrentNamedLocation(), villageName);
  assert.equal(worldMap.revealNamedLocation(villageName), true);
}));

test('WorldMap revealNamedLocation works when everythingDiscovered map mode is enabled', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  const villageName = worldMap.getAllVillageNames()[0];
  assert.ok(villageName);

  worldMap.registerNamedLocation(villageName);
  worldMap.setMapDisplayConfig({ everythingDiscovered: true, fogOfWar: false });

  assert.equal(worldMap.revealNamedLocation(villageName), true);
}));

test('WorldMap getKnownSettlementNames excludes undiscovered named locations', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  worldMap.registerNamedLocation('Questspire');
  const location = worldMap['namedLocations'].get('Questspire');
  assert.ok(location);

  const originalIsDiscovered = worldMap.isDiscovered.bind(worldMap);
  worldMap.isDiscovered = (col, row) => {
    if (col === location.position.col && row === location.position.row) {
      return false;
    }
    return originalIsDiscovered(col, row);
  };

  const hiddenNames = worldMap.getKnownSettlementNames();
  assert.equal(hiddenNames.includes('Questspire'), false);

  worldMap.isDiscovered = (col, row) => {
    if (col === location.position.col && row === location.position.row) {
      return true;
    }
    return originalIsDiscovered(col, row);
  };
  const revealedNames = worldMap.getKnownSettlementNames();
  assert.equal(revealedNames.includes('Questspire'), true);
}));

test('WorldMap stores multiple location features per cell and surfaces them in selected cell info', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  const villageIndex = Array.from(worldMap.villageIndexSet.values())[0];
  assert.ok(typeof villageIndex === 'number');

  const col = villageIndex % worldMap.grid.columns;
  const row = Math.floor(villageIndex / worldMap.grid.columns);
  worldMap.addLocationFeatureAt(col, row, 'ferry-dock');

  const cellSize = worldMap.grid.cellSize;
  const pixelX = worldMap.grid.offsetX + (col * cellSize) + (cellSize / 2);
  const pixelY = worldMap.grid.offsetY + (row * cellSize) + (cellSize / 2);
  worldMap.updateSelectedCellFromPixel(pixelX, pixelY);
  const selected = worldMap.getSelectedCellInfo();

  assert.ok(selected);
  assert.equal(selected.mode, 'world');
  assert.deepEqual(new Set(selected.locationFeatureIds), new Set(['village', 'ferry-dock']));
}));

test('WorldMap persists location feature occupancy in save state', () => withMockedRandom([0.11], () => {
  const worldMap = new WorldMap(40, 30, 20);
  const villageIndex = Array.from(worldMap.villageIndexSet.values())[0];
  const col = villageIndex % worldMap.grid.columns;
  const row = Math.floor(villageIndex / worldMap.grid.columns);
  worldMap.addLocationFeatureAt(col, row, 'ferry-dock');

  const saved = worldMap.getState();
  const restored = new WorldMap(40, 30, 20);
  restored.restoreState(saved);

  const restoredFeatures = restored.getLocationFeatureIdsAt(col, row);
  assert.deepEqual(new Set(restoredFeatures), new Set(['village', 'ferry-dock']));
}));

test('WorldMap performance snapshot exposes cache and redraw diagnostics', () => {
  const worldMap = new WorldMap(20, 16, 10);
  const snapshot = worldMap.getPerformanceSnapshot();

  assert.equal(typeof snapshot.cacheHits, 'number');
  assert.equal(typeof snapshot.cacheRebuilds, 'number');
  assert.equal(typeof snapshot.chunkRedrawCount, 'number');
  assert.equal(typeof snapshot.invalidatedChunkCount, 'number');
  assert.equal(typeof snapshot.staticRedrawCount, 'number');
  assert.equal(typeof snapshot.dynamicRedrawCount, 'number');
  assert.equal(typeof snapshot.fullRecompositionCount, 'number');
  assert.equal(typeof snapshot.renderPausedForVisibility, 'boolean');
  assert.equal(typeof snapshot.visibilityPauseCount, 'number');
});

test('WorldMap reuses chunk cache for repeated draw in same tier', () => {
  const originalDocument = globalThis.document;
  const worldMap = new WorldMap(20, 16, 10);
  const frameCtx = createMockCanvasContext();
  frameCtx.drawImage = (...args) => frameCtx.calls.push(['drawImage', ...args]);
  frameCtx.clearRect = (...args) => frameCtx.calls.push(['clearRect', ...args]);
  const offscreenFactory = () => {
    const cacheCtx = createMockCanvasContext();
    cacheCtx.drawImage = () => {};
    cacheCtx.clearRect = () => {};
    return { width: 0, height: 0, getContext: () => cacheCtx };
  };
  globalThis.document = { createElement: () => offscreenFactory() };

  try {
    worldMap.beginRenderFrame(1);
    worldMap.draw(frameCtx, null);
    worldMap.finishRenderFrame(1);

    worldMap.markCameraMovedThisFrame();
    worldMap.beginRenderFrame(2);
    worldMap.draw(frameCtx, null);
    worldMap.finishRenderFrame(1);
  } finally {
    globalThis.document = originalDocument;
  }

  const snapshot = worldMap.getPerformanceSnapshot();
  assert.equal(snapshot.cacheHits > 0, true);
});

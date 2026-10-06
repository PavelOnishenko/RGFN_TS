export const worldMapBalance = {
    dimensions: { columns: 100, rows: 100 },
    villages: { minCount: 6, densityPerCell: 0.012, creationRateMultiplier: 1 / 3 },
    visibilityRadius: 3,
    terrainWeights: { grass: 0.4, forest: 0.52, water: 0.08 },
    forestCoverage: { min: 0.3, max: 0.6 },
    highlandThreshold: 0.86,
    inlandWaterThreshold: 0.79,
    lakes: { count: 7, minRadius: 2, maxRadius: 5, jitter: 0.38 },
    rivers: { count: 5, maxLengthFactor: 0.72, turnRate: 0.34, width: 1 },
};

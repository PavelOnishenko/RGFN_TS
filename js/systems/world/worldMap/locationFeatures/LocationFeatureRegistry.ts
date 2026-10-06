import { FerryDockLocationFeatureDefinition } from './FerryDockLocationFeatureDefinition.js';
import { LocationFeatureDefinition, LocationFeatureId } from './LocationFeatureDefinition.js';
import { VillageLocationFeatureDefinition } from './VillageLocationFeatureDefinition.js';

const locationFeatureRegistry: LocationFeatureDefinition[] = [
    new VillageLocationFeatureDefinition(),
    new FerryDockLocationFeatureDefinition(),
];

export const getLocationFeatureDefinitions = (): LocationFeatureDefinition[] => locationFeatureRegistry.map((definition) => definition);

export const getLocationFeatureDefinitionById = (id: LocationFeatureId): LocationFeatureDefinition | null =>
    locationFeatureRegistry.find((definition) => definition.id === id) ?? null;

export const getLocationFeatureIds = (): LocationFeatureId[] => locationFeatureRegistry.map((definition) => definition.id);

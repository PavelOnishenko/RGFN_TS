import Skeleton from '../../entities/Skeleton.js';
import Wanderer from '../../entities/Wanderer.js';
import { TerrainType } from '../../types/game.js';
import { FerryRouteOption } from './WorldModeFerryPromptController.js';

export type WorldModeCallbacks = {
    onEnterVillage: () => void;
    onRequestVillageEntryPrompt: (villageName: string, anchor: { x: number; y: number }) => void;
    onCloseVillageEntryPrompt: () => void;
    onRequestFerryPrompt: (options: FerryRouteOption[], selectedRouteIndex: number, anchor: { x: number; y: number }) => void;
    onCloseFerryPrompt: () => void;
    onStartBattle: (enemies: Skeleton[], terrainType: TerrainType) => void;
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onAdvanceTime: (minutes: number, fatigueScale: number) => void;
    isNightTime: () => boolean;
    onRememberTraveler: (traveler: Wanderer, disposition: 'hostile' | 'peaceful') => void;
    getQuestBattleEncounter: () => { enemies: Skeleton[]; hint?: string } | null;
};

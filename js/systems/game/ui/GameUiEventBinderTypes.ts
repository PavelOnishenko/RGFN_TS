import { BaseSpellId } from '../../controllers/magic/MagicSystem.js';
import { CombatMove } from '../../combat/DirectionalCombat.js';

export type GameUiEventCallbacks = {
    onAttack: () => void;
    onDirectionalCombatMove: (move: CombatMove) => void;
    onFlee: () => void;
    onWait: () => void;
    onUsePotionFromBattle: () => void;
    onUseManaPotionFromBattle: () => void;
    onUsePotionFromHud: () => void;
    onUseManaPotionFromHud: () => void;
    onNewCharacter: () => void;
    onAddStat: (stat: StatName) => void;
    onRemoveStat: (stat: StatName) => void;
    onSaveSkillChanges: () => void;
    onGodSkillsBoost: () => void;
    onCastSpell: (spellId: BaseSpellId) => void;
    onUpgradeSpell: (spellId: BaseSpellId) => void;
    onCanvasClick: (event: MouseEvent) => void;
    onCanvasMove: (event: MouseEvent) => void;
    onCanvasLeave: () => void;
    onWorldMapWheel: (event: WheelEvent) => void;
    onWorldMapMiddleDragStart: (event: MouseEvent) => void;
    onWorldMapKeyboardZoom: (direction: 'in' | 'out') => void;
    onCenterWorldMapOnPlayer: () => void;
    onUsePotionFromWorld: () => void;
    onEnterVillageFromWorld: () => void;
    onConfirmVillageEntryPrompt: () => void;
    onDismissVillageEntryPrompt: () => void;
    onFerryRouteSelectionChanged: (index: number) => void;
    onConfirmFerryTravelPrompt: () => void;
    onDismissFerryTravelPrompt: () => void;
    onCampSleepFromWorld: () => void;
    onTogglePanel: (panel: HudPanelToggle) => void;
};

export type StatName = 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence';

export type HudPanelToggle = 'stats' | 'skills' | 'inventory' | 'magic' | 'quests' | 'group' | 'lore' | 'selected' | 'worldMap' | 'log' | 'worldInfo' | 'roster';

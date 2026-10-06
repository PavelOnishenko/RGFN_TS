export type PlayerStat = 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence';

export type NewPlayerCreationOptions = {
    mode?: 'new';
    startingSkillAllocation?: Partial<Record<PlayerStat, number>> | null;
};

export type RestoredPlayerCreationOptions = {
    mode: 'restore';
};

export type PlayerCreationOptions = NewPlayerCreationOptions | RestoredPlayerCreationOptions;

export const RANDOM_NAME_POOL = [
    'Arin', 'Kael', 'Nyx', 'Sable', 'Thorne', 'Mira', 'Orin', 'Vex', 'Lyra', 'Dorian',
    'Selene', 'Riven', 'Kara', 'Juno', 'Bram', 'Talia', 'Ezra', 'Nora', 'Cassian', 'Iris'
];

export const RANDOM_STAT_POOL: PlayerStat[] = ['vitality', 'toughness', 'strength', 'agility', 'connection', 'intelligence'];

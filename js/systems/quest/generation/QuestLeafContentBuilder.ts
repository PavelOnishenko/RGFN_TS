import { QuestRandom } from './QuestRandom.js';
import {
    GeneratedName,
    QuestNode,
    QuestObjectiveData,
    QuestObjectiveType,
    QuestTextEntity,
    RareMonsterProfile,
} from '../QuestTypes.js';

const MONSTER_STATS = ['feral strength', 'void armor', 'acid blood', 'blink speed', 'barbed hide', 'grave intellect'];
const MONSTER_EFFECTS = ['causes fear', 'leaves toxic fog', 'shatters armor', 'drains mana', 'summons spores', 'breaks formation'];
const MONSTER_BONUSES = ['rich trophy cache', 'legendary reagent drop', 'rare relic trail', 'faction gratitude', 'reputation surge'];
const MUTATED_FROM_SPECIES = ['wolf', 'boar', 'bear', 'crow', 'human', 'stag', 'hound', 'lizard'];

type NameGenerator = () => Promise<GeneratedName>;

export default class QuestLeafContentBuilder {
    private readonly random: QuestRandom;

    constructor(random: QuestRandom) {
        this.random = random;
    }

    public removeText = (amount: number, target: GeneratedName, where: string): string => `Remove ${amount} ${this.pluralLabel(target, amount)}${where}.`;

    public killText = (amount: number, target: GeneratedName, where: string): string => `Kill ${amount} ${this.pluralLabel(target, amount)}${where}.`;

    public pluralLabel = (name: GeneratedName, count: number): string => `${this.label(name)}${count > 1 ? 's' : ''}`;

    public label = (name: GeneratedName): string => name.text;

    public rareMonsterProfile = async (generateMonsterName: NameGenerator): Promise<RareMonsterProfile> => ({
        name: await generateMonsterName(),
        count: this.random.nextInt(1, 3),
        stats: this.pickMany(MONSTER_STATS, 2),
        effects: this.pickMany(MONSTER_EFFECTS, 2),
        bonus: this.random.pick(MONSTER_BONUSES),
        mutatedFrom: this.random.pick(MUTATED_FROM_SPECIES),
    });

    public randomMutatedSpecies = (): string => this.random.pick(MUTATED_FROM_SPECIES);

    public randomMutations = (count: number): string[] => this.pickMany(MONSTER_STATS, count);

    public entities(...names: Array<GeneratedName | null>): QuestTextEntity[] {
        const unique = new Map<string, QuestTextEntity>();

        for (const name of names) {
            const type = this.resolveEntityType(name);
            if (!name || !type) {
                continue;
            }
            unique.set(`${type}:${name.text}`, { text: name.text, type });
        }

        return Array.from(unique.values());
    }

    public node = (
        id: string,
        title: string,
        description: string,
        conditionText: string,
        objectiveType: QuestObjectiveType,
        entities: QuestTextEntity[],
        objectiveData?: QuestObjectiveData,
    ): QuestNode => ({ id, title, description, conditionText, objectiveType, entities, objectiveData, children: [] });

    private pickMany(pool: string[], count: number): string[] {
        const selected = new Set<string>();
        let attempts = 0;

        while (selected.size < count && attempts < pool.length * 4) {
            selected.add(this.random.pick(pool));
            attempts += 1;
        }

        for (const candidate of pool) {
            if (selected.size >= count) {
                break;
            }
            selected.add(candidate);
        }

        return Array.from(selected);
    }

    private resolveEntityType = (name: GeneratedName | null): QuestTextEntity['type'] | null => {
        if (!name) {
            return null;
        }
        if (name.domain === 'location') {
            return 'location';
        }
        if (name.domain === 'artifact') {
            return 'item';
        }
        if (name.domain === 'character') {
            return 'person';
        }
        if (name.domain === 'monster') {
            return 'monster';
        }
        return null;
    };
}

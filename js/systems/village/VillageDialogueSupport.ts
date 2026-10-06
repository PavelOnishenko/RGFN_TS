import type { CompassDirection, NpcDisposition, VillageNpcProfile } from './VillageDialogueEngine.js';

const DIRECTIONS: CompassDirection[] = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

export class VillageDirectionService {
    public randomDirection = (): CompassDirection => DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

    public oppositeDirection(direction: CompassDirection): CompassDirection {
        const idx = DIRECTIONS.indexOf(direction);
        return DIRECTIONS[(idx + 4) % DIRECTIONS.length];
    }

    public nearbyDirection(direction: CompassDirection): CompassDirection {
        const idx = DIRECTIONS.indexOf(direction);
        const shift = Math.random() < 0.5 ? -1 : 1;
        return DIRECTIONS[(idx + shift + DIRECTIONS.length) % DIRECTIONS.length];
    }

    public distanceText(distanceCells: number): string {
        if (distanceCells <= 4) {
            return 'a short walk';
        }
        if (distanceCells <= 12) {
            return 'half a day';
        }
        if (distanceCells <= 24) {
            return 'about a day';
        }
        return 'several days';
    }

    public impreciseDistance(distanceCells: number): string {
        if (distanceCells <= 8) {
            return 'nearby';
        }
        if (distanceCells <= 18) {
            return 'not too far';
        }
        return 'far from here';
    }
}

export class VillageNpcFactory {
    private readonly names = ['Mara', 'Iven', 'Tor', 'Selene', 'Garr', 'Nira', 'Bram', 'Talia', 'Daren', 'Ysolde'];
    private readonly roles = ['Trader', 'Hunter', 'Miller', 'Guard', 'Herbalist', 'Carpenter', 'Innkeeper'];

    private readonly looks = [
        'scarred face, travel cloak, muddy boots',
        'sunburnt skin, braided hair, patched vest',
        'silver earrings, clean gloves, observant eyes',
        'broad shoulders, old armor, calm expression',
        'ink-stained fingers, satchel of notes, tired smile',
    ];

    private readonly speechStyles = ['calm and measured', 'fast and nervous', 'warm and direct', 'cold and formal', 'playful but evasive'];
    private readonly dispositions: NpcDisposition[] = ['truthful', 'imprecise', 'liar', 'silent', 'malicious', 'random'];

    public createNpcRoster(villageName: string): VillageNpcProfile[] {
        const rosterSize = 3 + Math.floor(Math.random() * 3);
        return Array.from({ length: rosterSize }, (_, index) => this.createNpc(villageName, index));
    }

    private createNpc = (villageName: string, index: number): VillageNpcProfile => ({
        id: `${villageName.toLowerCase()}-${index}`,
        name: this.pick(this.names),
        role: this.pick(this.roles),
        look: this.pick(this.looks),
        speechStyle: this.pick(this.speechStyles),
        disposition: this.pick(this.dispositions),
        settlementKnowledgeRadiusCells: 6 + Math.floor(Math.random() * 40),
    });

    private pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
}

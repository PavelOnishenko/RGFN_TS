import { VillageDirectionService, VillageNpcFactory } from './VillageDialogueSupport.js';

export type CompassDirection = 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west';

export type VillageDirectionHint = {
    settlementName: string;
    exists: boolean;
    direction?: CompassDirection;
    distanceCells?: number;
};

export type PersonDirectionHint = {
    personName: string;
    exists: boolean;
    villageName?: string;
    direction?: CompassDirection;
    distanceCells?: number;
};

export type NpcDisposition = 'silent' | 'truthful' | 'imprecise' | 'liar' | 'malicious' | 'random';

export type VillageNpcProfile = {
    id: string;
    name: string;
    role: string;
    look: string;
    speechStyle: string;
    disposition: NpcDisposition;
    settlementKnowledgeRadiusCells?: number;
};

export type VillageDialogueOutcome = {
    speech: string;
    tone: string;
    truthfulness: 'truth' | 'imprecise' | 'lie' | 'refusal' | 'random';
};

export default class VillageDialogueEngine {
    private static readonly PERSON_DIRECTION_KNOWLEDGE_CHANCE = 0.26;

    private readonly directionService = new VillageDirectionService();
    private readonly npcFactory = new VillageNpcFactory();

    public createNpcRoster = (villageName: string): VillageNpcProfile[] => this.npcFactory.createNpcRoster(villageName);

    public buildLocationAnswer(npc: VillageNpcProfile, hint: VillageDirectionHint): VillageDialogueOutcome {
        if (npc.disposition === 'silent') {
            return { speech: `"I don't discuss roads with strangers."`, tone: `${npc.name} folds their arms and avoids eye contact.`, truthfulness: 'refusal' };
        }
        if (!hint.exists) {
            return this.buildUnknownVillageAnswer(npc, hint);
        }
        return this.buildKnownVillageAnswer(npc, hint);
    }

    public buildPersonLocationAnswer(npc: VillageNpcProfile, hint: PersonDirectionHint): VillageDialogueOutcome {
        if (npc.disposition === 'silent') {
            return { speech: `"I keep names to myself."`, tone: `${npc.name} glances around and refuses to continue.`, truthfulness: 'refusal' };
        }

        const hasReliableInfo = Math.random() < VillageDialogueEngine.PERSON_DIRECTION_KNOWLEDGE_CHANCE;
        if (!hasReliableInfo && npc.disposition !== 'malicious' && npc.disposition !== 'liar') {
            return {
                speech: `"I heard the name, but I don't know where ${hint.personName} is now."`,
                tone: `${npc.name} hesitates and offers no firm lead.`,
                truthfulness: 'refusal',
            };
        }

        if (!hint.exists) {
            return this.buildUnknownPersonAnswer(npc, hint);
        }
        return this.buildKnownPersonAnswer(npc, hint);
    }

    public buildNearbySettlementsAnswer(
        npc: VillageNpcProfile,
        knownSettlements: VillageDirectionHint[],
        currentVillageName: string,
    ): VillageDialogueOutcome {
        if (npc.disposition === 'silent') {
            return {
                speech: '"I do not list roads and villages for every passerby."',
                tone: `${npc.name} turns away and pretends to study the weather.`,
                truthfulness: 'refusal',
            };
        }

        const knowledgeRadius = npc.settlementKnowledgeRadiusCells ?? 20;
        const nearbyKnown = knownSettlements
            .filter((hint) => hint.exists && hint.settlementName !== currentVillageName && (hint.distanceCells ?? Number.MAX_SAFE_INTEGER) <= knowledgeRadius)
            .sort((left, right) => (left.distanceCells ?? Number.MAX_SAFE_INTEGER) - (right.distanceCells ?? Number.MAX_SAFE_INTEGER));

        if (nearbyKnown.length === 0 && npc.disposition !== 'liar' && npc.disposition !== 'malicious' && npc.disposition !== 'random') {
            return {
                speech: `"From what I know, nothing notable lies close enough to call a proper settlement. My road knowledge fades beyond about ${this.directionService.distanceText(
                    knowledgeRadius,
                )} from here."`,
                tone: `${npc.name} speaks thoughtfully, but cannot provide concrete names.`,
                truthfulness: 'refusal',
            };
        }

        if (npc.disposition === 'truthful') {
            const statements = nearbyKnown.slice(0, 4)
                .map((hint) => `${hint.settlementName} lies ${hint.direction}, roughly ${this.directionService.distanceText(hint.distanceCells ?? 0)}`)
                .join('; ');
            return {
                speech: statements.length > 0
                    ? `"Nearby? Listen carefully: ${statements}. That's what I can vouch for."`
                    : '"Nothing nearby that I can honestly name."',
                tone: `${npc.name} gives a structured, map-like answer and counts points on their fingers.`,
                truthfulness: 'truth',
            };
        }

        if (npc.disposition === 'imprecise') {
            const statements = nearbyKnown.slice(0, 3)
                .map((hint) => `${hint.settlementName} should be ${this.directionService.nearbyDirection(hint.direction!)}, maybe ${this.directionService.impreciseDistance(hint.distanceCells ?? 0)}`)
                .join('; ');
            return {
                speech: statements.length > 0
                    ? `"I can try to recall: ${statements}. If the roads split, ask again in the next hamlet."`
                    : '"I heard of places around here, but the paths blur together in my memory."',
                tone: `${npc.name} speaks in long uncertain fragments, trying to be useful.`,
                truthfulness: 'imprecise',
            };
        }

        if (npc.disposition === 'liar' || npc.disposition === 'malicious') {
            const deceptiveBase = nearbyKnown.length > 0 ? nearbyKnown : knownSettlements.filter((hint) => hint.exists);
            const statements = deceptiveBase.slice(0, 3)
                .map((hint) => `${hint.settlementName} is ${this.directionService.oppositeDirection(hint.direction!)} and only ${this.directionService.impreciseDistance(hint.distanceCells ?? 0)}`)
                .join('; ');
            return {
                speech: statements.length > 0
                    ? `"Plenty. ${statements}. Follow my advice and you'll 'arrive quickly'."`
                    : `"Easy question. Just march ${this.directionService.randomDirection()} until dusk and you'll hit three villages in a row."`,
                tone: npc.disposition === 'malicious'
                    ? `${npc.name} leans in with a crooked grin, clearly enjoying your uncertainty.`
                    : `${npc.name} answers with theatrical confidence.`,
                truthfulness: 'lie',
            };
        }

        return {
            speech: `"Let's see... maybe ${this.directionService.randomDirection()} for one village, then ${this.directionService.randomDirection()} for another. Roads move in my head."`,
            tone: `${npc.name} rambles at length without ever settling on a reliable route.`,
            truthfulness: 'random',
        };
    }

    private buildUnknownVillageAnswer(npc: VillageNpcProfile, hint: VillageDirectionHint): VillageDialogueOutcome {
        if (npc.disposition === 'liar' || npc.disposition === 'malicious') {
            return {
                speech: `"Of course I know it. Go ${this.directionService.randomDirection()} until nightfall."`,
                tone: `${npc.name} speaks with suspicious confidence.`,
                truthfulness: 'lie',
            };
        }
        return {
            speech: `"Never heard of ${hint.settlementName}. Maybe try another village."`,
            tone: `${npc.name} shrugs apologetically.`,
            truthfulness: npc.disposition === 'random' ? 'random' : 'refusal',
        };
    }

    private buildKnownVillageAnswer(npc: VillageNpcProfile, hint: VillageDirectionHint): VillageDialogueOutcome {
        if (npc.disposition === 'truthful') {
            return this.truthfulVillageAnswer(npc, hint);
        }
        if (npc.disposition === 'imprecise') {
            return this.impreciseVillageAnswer(npc, hint);
        }
        if (npc.disposition === 'liar' || npc.disposition === 'malicious') {
            return this.deceptiveVillageAnswer(npc, hint);
        }
        return {
            speech: `"Hmm... try ${this.directionService.randomDirection()}. I have a feeling."`,
            tone: `${npc.name} waves vaguely without checking the sky.`,
            truthfulness: 'random',
        };
    }

    private buildUnknownPersonAnswer(npc: VillageNpcProfile, hint: PersonDirectionHint): VillageDialogueOutcome {
        if (npc.disposition === 'liar' || npc.disposition === 'malicious') {
            return {
                speech: `"${hint.personName}? Yes, absolutely. Go ${this.directionService.randomDirection()} and ask the first camp you see."`,
                tone: `${npc.name} answers too quickly for comfort.`,
                truthfulness: 'lie',
            };
        }
        return { speech: `"Never met ${hint.personName}. Could be a false trail."`, tone: `${npc.name} shrugs with visible uncertainty.`, truthfulness: 'refusal' };
    }

    private buildKnownPersonAnswer(npc: VillageNpcProfile, hint: PersonDirectionHint): VillageDialogueOutcome {
        if (npc.disposition === 'truthful') {
            return this.truthfulPersonAnswer(npc, hint);
        }
        if (npc.disposition === 'imprecise') {
            return this.imprecisePersonAnswer(npc, hint);
        }
        if (npc.disposition === 'liar' || npc.disposition === 'malicious') {
            return this.deceptivePersonAnswer(npc, hint);
        }
        return {
            speech: `"Could be ${this.directionService.randomDirection()}. Ask again when you reach the next market."`,
            tone: `${npc.name} gives you a vague hand-wave.`,
            truthfulness: 'random',
        };
    }

    private truthfulVillageAnswer = (npc: VillageNpcProfile, hint: VillageDirectionHint): VillageDialogueOutcome => ({
        speech: `"${hint.settlementName}? Head ${hint.direction}. It's about ${this.directionService.distanceText(hint.distanceCells ?? 0)} away."`,
        tone: `${npc.name} answers clearly and points on the horizon.`,
        truthfulness: 'truth',
    });

    private impreciseVillageAnswer = (npc: VillageNpcProfile, hint: VillageDirectionHint): VillageDialogueOutcome => ({
        speech: `"I think it's ${this.directionService.nearbyDirection(hint.direction!)}... maybe ${
            this.directionService.impreciseDistance(hint.distanceCells ?? 0)
        } from here."`,
        tone: `${npc.name} scratches their chin, unsure but trying to help.`,
        truthfulness: 'imprecise',
    });

    private deceptiveVillageAnswer = (npc: VillageNpcProfile, hint: VillageDirectionHint): VillageDialogueOutcome => ({
        speech: `"Easy. Just go ${this.directionService.oppositeDirection(hint.direction!)} and you cannot miss it."`,
        tone: npc.disposition === 'malicious'
            ? `${npc.name} lowers their voice and gives a predatory grin.`
            : `${npc.name} smiles too quickly.`,
        truthfulness: 'lie',
    });

    private truthfulPersonAnswer = (npc: VillageNpcProfile, hint: PersonDirectionHint): VillageDialogueOutcome => ({
        speech: `"${hint.personName} stays in ${hint.villageName}. Travel ${hint.direction} for about ${this.directionService.distanceText(
            hint.distanceCells ?? 0,
        )}."`,
        tone: `${npc.name} answers quietly and points along the road.`,
        truthfulness: 'truth',
    });

    private imprecisePersonAnswer = (npc: VillageNpcProfile, hint: PersonDirectionHint): VillageDialogueOutcome => ({
        speech: `"I think ${hint.personName} is around ${hint.villageName}, maybe ${this.directionService.nearbyDirection(hint.direction!)} from here."`,
        tone: `${npc.name} tries to help but does not sound certain.`,
        truthfulness: 'imprecise',
    });

    private deceptivePersonAnswer = (npc: VillageNpcProfile, hint: PersonDirectionHint): VillageDialogueOutcome => ({
        speech: `"${hint.personName} is easy to find. Take the ${this.directionService.oppositeDirection(hint.direction!)} track and don't stop."`,
        tone: `${npc.name} smiles in a way that feels wrong.`,
        truthfulness: 'lie',
    });
}

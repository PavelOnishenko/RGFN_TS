import { theme } from '../../../config/ThemeConfig.js';
import QuestPackService from './QuestPackService.js';

export default class QuestCharacterNameReservoir {
    private readonly names: string[] = [];
    private isRefilling = false;

    constructor(private readonly packService: QuestPackService, private readonly refillSize: number = 10, private readonly refillThreshold: number = 5) {
        this.triggerRefill();
    }

    public nextName = (): string => {
        const selectedName = this.names.shift();
        if (this.names.length < this.refillThreshold) {
            this.triggerRefill();
        }
        return selectedName ?? '';
    };

    private triggerRefill(): void {
        if (this.isRefilling) {
            return;
        }
        this.isRefilling = true;
        void this.refill();
    }

    private async refill(): Promise<void> {
        try {
            const maxWords = Math.max(1, Math.floor(theme.quest.nameGeneration.maxWordsByDomain.character ?? 2));
            for (let index = 0; index < this.refillSize; index += 1) {
                const generatedName = (await this.packService.generateName('character', maxWords)).text.trim();
                if (generatedName.length > 0) {
                    this.names.push(generatedName);
                }
            }
        } catch {
            // Keep reservoir resilient: village naming can safely fall back when source generation is temporarily unavailable.
        } finally {
            this.isRefilling = false;
        }
    }
}

import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { calculateBowDamageBonus, calculateMeleeDamageBonus } from '../../config/levelConfig.js';
import Item from '../../entities/Item.js';
import Player from '../../entities/player/Player.js';
import { buildEnchantmentDetailLine } from '../../entities/items/WeaponEnchantments.js';

type LogHandler = (message: string) => void;

export default class HudInventoryItemMetadata {
    private readonly player: Player;
    private readonly addLog: LogHandler;

    constructor(player: Player, addLog: LogHandler) {
        this.player = player;
        this.addLog = addLog;
    }

    public triggerEquipRequirementsFeedback(item: Item, slotElement: HTMLButtonElement): void {
        slotElement.classList.remove('inventory-slot-failed');
        void slotElement.offsetWidth;
        slotElement.classList.add('inventory-slot-failed');
        const details = this.getRequirementEntries(item)
            .map(({ label, required, current }) => `${label}: required ${required}, have ${current}, lack ${Math.max(0, required - current)}`)
            .join(' | ');
        this.addLog(`Cannot equip ${item.name}. ${details}`);
    }

    public buildInventoryTooltip(item: Item): string {
        const lines = [`${item.name} — right-click to drop`];
        if (item.type === 'weapon' || item.type === 'armor') {
            lines[0] = `${item.name} — click to equip • shift+click to inspect • right-click to drop`;
        }

        const requirements = this.getRequirementEntries(item);
        if (requirements.length > 0) {
            lines.push(`Requirements: ${requirements.map(({ label, required, current }) => `${label} ${current}/${required}`).join(', ')}`);
        }
        if (item.type === 'weapon') {
            lines.push(`Damage if requirements met: ${this.calculateWeaponDamageAtRequirements(item)}`);
            this.appendWeaponEnchantmentDetails(lines, item);
        }

        return lines.join('\n');
    }

    public inspectWeaponEnchantments(item: Item): string[] {
        if (item.type !== 'weapon') {
            return [`${item.name} has no weapon enchantments.`];
        }
        if (item.enchantments.length === 0) {
            return [`${item.name} has no enchantments.`];
        }
        return [`${item.name} enchantments:`, ...item.enchantments.map((enchantment) => buildEnchantmentDetailLine(enchantment))];
    }

    private appendWeaponEnchantmentDetails(lines: string[], item: Item): void {
        if (item.enchantments.length === 0) {
            return;
        }
        lines.push(`Enchantments: ${item.enchantments.map((enchantment) => enchantment.type).join(', ')}`);
        lines.push(...item.enchantments.map((enchantment) => buildEnchantmentDetailLine(enchantment)));
    }

    private calculateWeaponDamageAtRequirements(item: Item): number {
        const requiredStrength = item.requirements.strength ?? 0;
        const requiredAgility = item.requirements.agility ?? 0;
        const effectiveStrength = Math.max(this.player.strength, requiredStrength);
        const effectiveAgility = Math.max(this.player.agility, requiredAgility);
        const statBonus = item.isRanged
            ? calculateBowDamageBonus(effectiveStrength, effectiveAgility)
            : calculateMeleeDamageBonus(effectiveStrength, effectiveAgility);
        const offHandDamage = item.handsRequired === 1 ? balanceConfig.combat.fistDamagePerHand : 0;
        return item.damageBonus + item.getPlasmaBonusDamage() + offHandDamage + statBonus;
    }

    private getRequirementEntries(item: Item): Array<{ label: 'AGI' | 'STR'; required: number; current: number }> {
        const entries: Array<{ label: 'AGI' | 'STR'; required: number; current: number }> = [];
        if ((item.requirements.agility ?? 0) > 0) {
            entries.push({ label: 'AGI', required: item.requirements.agility ?? 0, current: this.player.agility });
        }
        if ((item.requirements.strength ?? 0) > 0) {
            entries.push({ label: 'STR', required: item.requirements.strength ?? 0, current: this.player.strength });
        }
        return entries;
    }
}

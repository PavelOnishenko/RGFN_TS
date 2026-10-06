export function withDamageable(BaseClass) {
    return class extends BaseClass {
        constructor(...args) {
            super(...args);
        }

        initDamageable(maxHp) {
            this.maxHp = maxHp;
            this.hp = maxHp;
        }

        takeDamage(amount) {
            this.hp -= amount;
            if (this.hp < 0)
                this.hp = 0;
            return this.isDead();
        }

        heal(amount) {
            this.hp += amount;
            if (this.hp > this.maxHp)
                this.hp = this.maxHp;
        }

        isDead() {
            return this.hp <= 0;
        }

        getHealthPercent() {
            return this.hp / this.maxHp;
        }

        healToFull() {
            this.hp = this.maxHp;
        }
    };
}

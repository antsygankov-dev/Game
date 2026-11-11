import { TOWER_STATS } from './constants.js';
import { distance } from './math_utils.js';

export class Tower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.damage = TOWER_STATS.damage;
        this.radius = TOWER_STATS.radius;
        this.cooldown = 0;
        this.isPowered = false;
        this.kills = 0;
    }

    update(dt, enemies) {
        if (!this.isPowered) return;
        this.cooldown -= dt;
        if (this.cooldown > 0) return;

        let target = null;
        let minDist = this.radius;

        for (let e of enemies) {
            const d = distance(this.x, this.y, e.x, e.y);
            if (d <= minDist) {
                minDist = d;
                target = e;
            }
        }

        if (target) {
            this.cooldown = 1.0; // Кулдаун 1 секунда
            target.hp -= this.damage;
            if (target.hp <= 0) this.kills++;
        }
    }
}
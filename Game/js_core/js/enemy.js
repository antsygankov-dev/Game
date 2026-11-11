import { PATH_POINTS, MONSTER_STATS, STATE } from './constants.js';
import { distance } from './math_utils.js';

export class Enemy {
    constructor() {
        this.x = PATH_POINTS[0].x;
        this.y = PATH_POINTS[0].y;
        this.pathIndex = 1;
        this.hp = MONSTER_STATS.hp;
        this.speed = MONSTER_STATS.speed;
        this.state = STATE.MOVING;
    }

    update(dt) {
        if (this.state !== STATE.MOVING) return;

        if (this.hp <= 0) {
            this.state = STATE.DEAD;
            return;
        }

        if (this.pathIndex >= PATH_POINTS.length) {
            this.state = STATE.REACHED_END;
            return;
        }

        const target = PATH_POINTS[this.pathIndex];
        const dist = distance(this.x, this.y, target.x, target.y);
        const moveStep = this.speed * dt;

        if (moveStep >= dist) {
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
        } else {
            this.x += ((target.x - this.x) / dist) * moveStep;
            this.y += ((target.y - this.y) / dist) * moveStep;
        }
    }
}
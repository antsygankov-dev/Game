import { Enemy } from './enemy.js';
import { Tower } from './tower.js';
import { EnergyGrid } from './energy_grid.js';
import { GENERATOR, TOWER_STATS } from './constants.js';

export class GameField {
    constructor() {
        this.enemies = [];
        this.towers = [];
        this.gold = 100;
        this.hp = 10;
        this.time = 0;
    }

    update(dt) {
        this.time += dt;

        // Спавн монстров каждые 2 секунды для теста
        if (Math.floor(this.time / 2) > this.enemies.length) {
            this.enemies.push(new Enemy());
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt);
            if (e.state === 'ReachedEnd') {
                this.hp--;
                this.enemies.splice(i, 1);
            } else if (e.state === 'Dead') {
                this.gold += 10; // Reward
                this.enemies.splice(i, 1);
            }
        }

        for (let t of this.towers) {
            t.update(dt, this.enemies);
        }
    }

    buildTower(x, y) {
        if (this.gold < TOWER_STATS.price) return false;
        this.gold -= TOWER_STATS.price;
        this.towers.push(new Tower(x, y));
        EnergyGrid.optimize(this.towers, GENERATOR);
        return true;
    }
}
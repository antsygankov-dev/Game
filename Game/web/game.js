// web/game.js

// --- 1. Базовые настройки ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const TILE_SIZE = 40;
const GRID_COLS = 20;
const GRID_ROWS = 15;

const PATH_POINTS = [
    { x: 0, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 300 },
    { x: 500, y: 300 }, { x: 500, y: 500 }, { x: 800, y: 500 }
];

const GENERATOR = { x: 60, y: 60 };

// Балансы (из ЛР2)
const MONSTER_STATS = { hp: 60, speed: 50, reward: 10 };
const TOWER_STATS = { price: 50, damage: 15, radius: 90, cableCostPerPx: 0.5 };

// --- 2. Классы сущностей ---
class Enemy {
    constructor(hpMultiplier = 1.0) {
        this.x = PATH_POINTS[0].x;
        this.y = PATH_POINTS[0].y;
        this.pathIndex = 1;
        this.maxHp = MONSTER_STATS.hp * hpMultiplier;
        this.hp = this.maxHp;
        this.speed = MONSTER_STATS.speed;
        this.reachedEnd = false;
    }

    update(dt) {
        if (this.reachedEnd || this.pathIndex >= PATH_POINTS.length) return;

        const target = PATH_POINTS[this.pathIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 1) {
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
            if (this.pathIndex >= PATH_POINTS.length) this.reachedEnd = true;
            return;
        }

        const moveStep = this.speed * dt;
        if (moveStep >= distance) {
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
        } else {
            this.x += (dx / distance) * moveStep;
            this.y += (dy / distance) * moveStep;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#dc4646';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // HP bar
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - 15, this.y - 20, 30, 4);
        ctx.fillStyle = '#78f078';
        ctx.fillRect(this.x - 15, this.y - 20, 30 * (this.hp / this.maxHp), 4);
    }
}

class Tower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.damage = TOWER_STATS.damage;
        this.radius = TOWER_STATS.radius;
        this.cooldown = 0;
        this.isPowered = false;
    }

    update(dt, enemies) {
        if (!this.isPowered) return null;

        this.cooldown -= dt;
        if (this.cooldown > 0) return null;

        let target = null;
        let minDist = this.radius;
        for (let e of enemies) {
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < minDist) {
                minDist = d;
                target = e;
            }
        }

        if (target) {
            this.cooldown = 1.0;
            target.hp -= this.damage;
            return target;
        }
        return null;
    }

    draw(ctx) {
        ctx.fillStyle = this.isPowered ? 'rgba(60, 160, 220, 0.1)' : 'rgba(255, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.isPowered ? '#3ca0dc' : '#6e6e78';
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
    }
}

// --- 3. MST (Энергосеть) ---
class EnergyGrid {
    static optimize(towers, generator) {
        if (towers.length === 0) return { edges: [], cableCost: 0 };

        const nodes = [{ ...generator, isGen: true }, ...towers];
        const inMST = new Set([0]);
        const edges = [];
        let totalLength = 0;

        towers.forEach(t => t.isPowered = false);

        while (inMST.size < nodes.length) {
            let minDist = Infinity;
            let bestU = -1;
            let bestV = -1;

            for (let u of inMST) {
                for (let v = 0; v < nodes.length; v++) {
                    if (inMST.has(v)) continue;

                    const d = Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y);
                    if (d < minDist) {
                        minDist = d;
                        bestU = u;
                        bestV = v;
                    }
                }
            }

            if (bestV !== -1) {
                inMST.add(bestV);
                edges.push([nodes[bestU], nodes[bestV]]);
                totalLength += minDist;
                if (!nodes[bestV].isGen) nodes[bestV].isPowered = true;
            } else {
                break;
            }
        }
        const cableCost = Math.round(totalLength * TOWER_STATS.cableCostPerPx);
        return { edges, cableCost };
    }
}

// --- 4. Игровое поле ---
class GameField {
    constructor() {
        this.enemies = [];
        this.towers = [];
        this.gold = 100;
        this.hp = 10;
        this.energyEdges = [];
        this.cableCost = 0;

        // Настройки волн
        this.waves = [
            { count: 5, interval: 1.5, hpMultiplier: 1.0 },
            { count: 8, interval: 1.2, hpMultiplier: 1.5 },
            { count: 12, interval: 1.0, hpMultiplier: 2.0 },
            { count: 15, interval: 0.8, hpMultiplier: 2.5 }
        ];
        this.currentWaveIndex = 0;
        this.spawnedInWave = 0;
        this.waveTimer = 0;
        this.isWaveActive = true;
        this.waveCooldown = 0;

        canvas.addEventListener('mousedown', (e) => this.handleClick(e));
    }

    handleClick(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const tileX = Math.floor(mouseX / TILE_SIZE);
        const tileY = Math.floor(mouseY / TILE_SIZE);

        const gx = tileX * TILE_SIZE + TILE_SIZE / 2;
        const gy = tileY * TILE_SIZE + TILE_SIZE / 2;

        if (this.towers.some(t => t.x === gx && t.y === gy)) return;
        if (this.gold < TOWER_STATS.price) return;
        if (this.isTileOnPath(tileX, tileY)) return;

        this.gold -= TOWER_STATS.price;
        this.towers.push(new Tower(gx, gy));
        this.updateEnergyGrid();
    }

    isTileOnPath(tileX, tileY) {
        const padding = 5;
        const corners = [
            { x: tileX * TILE_SIZE + padding, y: tileY * TILE_SIZE + padding },
            { x: (tileX + 1) * TILE_SIZE - padding, y: tileY * TILE_SIZE + padding },
            { x: tileX * TILE_SIZE + padding, y: (tileY + 1) * TILE_SIZE - padding },
            { x: (tileX + 1) * TILE_SIZE - padding, y: (tileY + 1) * TILE_SIZE - padding },
            { x: tileX * TILE_SIZE + TILE_SIZE / 2, y: tileY * TILE_SIZE + TILE_SIZE / 2 }
        ];

        for (let corner of corners) {
            if (this.isPointOnPath(corner.x, corner.y)) return true;
        }
        return false;
    }

    isPointOnPath(px, py) {
        const pathWidth = 30;
        const halfWidth = pathWidth / 2 + 2;

        for (let i = 0; i < PATH_POINTS.length - 1; i++) {
            const p1 = PATH_POINTS[i];
            const p2 = PATH_POINTS[i + 1];
            const dist = this.distanceToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
            if (dist < halfWidth) return true;
        }
        return false;
    }

    distanceToSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D, len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }

        const dx = px - xx, dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    updateEnergyGrid() {
        const result = EnergyGrid.optimize(this.towers, GENERATOR);
        this.energyEdges = result.edges;
        this.cableCost = result.cableCost;
        document.getElementById('cable-cost').textContent = this.cableCost;
    }

    update(dt) {
        // --- 1. Логика волн ---
        if (this.isWaveActive) {
            const currentWave = this.waves[this.currentWaveIndex];

            if (this.spawnedInWave < currentWave.count) {
                this.waveTimer -= dt;
                if (this.waveTimer <= 0) {
                    this.enemies.push(new Enemy(currentWave.hpMultiplier));
                    this.spawnedInWave++;
                    this.waveTimer = currentWave.interval;
                }
            } else if (this.enemies.length === 0) {
                // Волна окончена, пауза
                this.isWaveActive = false;
                this.waveCooldown = 3.0;
            }
        } else {
            this.waveCooldown -= dt;
            if (this.waveCooldown <= 0) {
                this.currentWaveIndex++;
                if (this.currentWaveIndex >= this.waves.length) {
                    this.currentWaveIndex = 0; // Зацикливаем
                }
                this.isWaveActive = true;
                this.spawnedInWave = 0;
                this.waveTimer = 0;
            }
        }

        // --- 2. Обновление монстров ---
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt);
            if (e.reachedEnd) {
                this.hp -= 1;
                this.enemies.splice(i, 1);
            } else if (e.hp <= 0) {
                this.gold += MONSTER_STATS.reward;
                this.enemies.splice(i, 1);
            }
        }

        // --- 3. Обновление башен ---
        for (let t of this.towers) {
            t.update(dt, this.enemies);
        }

        // --- 4. Обновление HUD ---
        document.getElementById('gold').textContent = this.gold;
        document.getElementById('hp').textContent = this.hp;
        document.getElementById('wave').textContent = this.currentWaveIndex + 1;
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Сетка
        ctx.strokeStyle = '#2d343c';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_COLS; i++) {
            ctx.beginPath(); ctx.moveTo(i * TILE_SIZE, 0); ctx.lineTo(i * TILE_SIZE, canvas.height); ctx.stroke();
        }
        for (let j = 0; j <= GRID_ROWS; j++) {
            ctx.beginPath(); ctx.moveTo(0, j * TILE_SIZE); ctx.lineTo(canvas.width, j * TILE_SIZE); ctx.stroke();
        }

        // Дорога
        ctx.strokeStyle = '#786446';
        ctx.lineWidth = 30;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
        for (let i = 1; i < PATH_POINTS.length; i++) {
            ctx.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
        }
        ctx.stroke();

        // MST (линии энергии)
        ctx.strokeStyle = '#ffe680';
        ctx.lineWidth = 2;
        for (let edge of this.energyEdges) {
            ctx.beginPath();
            ctx.moveTo(edge[0].x, edge[0].y);
            ctx.lineTo(edge[1].x, edge[1].y);
            ctx.stroke();
        }

        // Генератор
        ctx.fillStyle = '#fac832';
        ctx.beginPath();
        ctx.arc(GENERATOR.x, GENERATOR.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.fillText('G', GENERATOR.x - 5, GENERATOR.y + 5);

        // Отрисовка башен и монстров
        this.towers.forEach(t => t.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
    }
}

// --- 5. Главный цикл ---
const game = new GameField();
let lastTime = performance.now();

function gameLoop(currentTime) {
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    game.update(dt);
    game.draw();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
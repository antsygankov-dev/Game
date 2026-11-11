import { Rect } from './js/rect.js';
import { distance } from './js/math_utils.js';
import { Enemy } from './js/enemy.js';
import { Tower } from './js/tower.js';
import { EnergyGrid } from './js/energy_grid.js';
import { GameField } from './js/game_field.js';
import { GENERATOR } from './js/constants.js';

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log(`✅ PASS: ${m}`); } else { failed++; console.error(`❌ FAIL: ${m}`); } }

console.log("=== ЗАПУСК САМОПРОВЕРКИ ===\n");
const r1 = new Rect(0, 0, 10, 10); const r2 = r1.move(5, 5);
assert(r2.x === 5, "Rect.move"); assert(r1.x === 0, "Rect no mutation");
assert(r1.collidepoint(5, 5), "Rect.collidepoint true"); assert(!r1.collidepoint(15, 15), "Rect.collidepoint false");
assert(r1.colliderect(new Rect(5, 5, 10, 10)), "Rect.colliderect");
assert(distance(0, 0, 3, 4) === 5, "distance 3-4-5"); assert(distance(0, 0, 0, 0) === 0, "distance zero");

const e = new Enemy(); assert(e.state === 'Moving', "Enemy starts Moving"); assert(e.hp === 60, "Enemy HP 60");
e.update(100); assert(e.state === 'ReachedEnd' || e.pathIndex > 1, "Enemy moved"); e.hp = 0; e.update(0.1); assert(e.state === 'Dead', "Enemy dies");

const t = new Tower(100, 100); assert(!t.isPowered, "Tower unpowered"); t.isPowered = true;
const mock = { x: 110, y: 100, hp: 100 }; t.update(2.0, [mock]);
assert(mock.hp === 85, "Tower deals damage"); assert(t.cooldown > 0, "Tower cooldown");

const towers = [new Tower(100, 100), new Tower(200, 200)]; const mst = EnergyGrid.optimize(towers, GENERATOR);
assert(mst.edges.length === 2, "MST edges 2"); assert(towers[0].isPowered, "T1 powered"); assert(towers[1].isPowered, "T2 powered");

const game = new GameField(); assert(game.gold === 100, "Start gold");
assert(game.buildTower(300, 300), "Build tower"); assert(game.gold === 50, "Gold spent"); assert(!game.buildTower(400, 400), "No gold");
game.update(2.5); assert(game.enemies.length > 0, "Enemy spawned");

console.log(`\n=== РЕЗУЛЬТАТ: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
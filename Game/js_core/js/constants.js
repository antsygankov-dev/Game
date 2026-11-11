export const TILE_SIZE = 40;
export const GRID_COLS = 20;
export const GRID_ROWS = 15;

export const PATH_POINTS = [
    { x: 0, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 300 },
    { x: 500, y: 300 }, { x: 500, y: 500 }, { x: 800, y: 500 }
];

export const GENERATOR = { x: 60, y: 60 };

export const MONSTER_STATS = { hp: 60, speed: 50, reward: 10 };
export const TOWER_STATS = { price: 50, damage: 15, radius: 90, cableCostPerPx: 0.5 };

// Состояния для конечного автомата (FSM) монстра
export const STATE = Object.freeze({
    MOVING: 'Moving',
    DEAD: 'Dead',
    REACHED_END: 'ReachedEnd'
});
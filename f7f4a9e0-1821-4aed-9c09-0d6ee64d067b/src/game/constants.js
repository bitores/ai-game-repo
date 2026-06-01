// Game dimensions
export const GAME_WIDTH = 800
export const GAME_HEIGHT = 600

// Grid system
export const GRID_COLS = 10
export const GRID_ROWS = 8
export const CELL_SIZE = 64
export const GRID_OFFSET_X = Math.floor((GAME_WIDTH - GRID_COLS * CELL_SIZE) / 2)
export const GRID_OFFSET_Y = Math.floor((GAME_HEIGHT - GRID_ROWS * CELL_SIZE) / 2)

// Core position (grid coordinates)
export const CORE_GRID_ROW = 7
export const CORE_GRID_COL = 9

// Convert grid coords to pixel center
export function gridToPixel(row, col) {
  return {
    x: GRID_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2,
    y: GRID_OFFSET_Y + row * CELL_SIZE + CELL_SIZE / 2
  }
}

// Enemy path waypoints in grid coordinates (row, col)
// The path zigzags through the grid from left entry to the core
export const PATH_WAYPOINTS = [
  { row: 1, col: -1 },  // entry from left
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: 3 },
  { row: 3, col: 3 },
  { row: 3, col: 5 },
  { row: 3, col: 6 },
  { row: 5, col: 6 },
  { row: 5, col: 8 },
  { row: 5, col: 9 },
  { row: CORE_GRID_ROW, col: CORE_GRID_COL }  // core
]

// Mark path cells for rendering (cells that are part of the path)
export function isPathCell(row, col) {
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const from = PATH_WAYPOINTS[i]
    const to = PATH_WAYPOINTS[i + 1]
    // Check if (row, col) lies on the segment
    const minR = Math.min(from.row, to.row)
    const maxR = Math.max(from.row, to.row)
    const minC = Math.min(from.col, to.col)
    const maxC = Math.max(from.col, to.col)
    if (row >= minR && row <= maxR && col >= minC && col <= maxC) {
      // Check that it's on the line (either same row or same col)
      if (from.row === to.row && row === from.row) return true
      if (from.col === to.col && col === from.col) return true
    }
  }
  return false
}

// Tower types
export const TOWER_TYPES = {
  BASIC: {
    name: '基本晶石',
    key: 'BASIC',
    cost: 50,
    range: 130,
    damage: 12,
    fireRate: 60,      // frames between shots
    color: 0x00ffff,
    glowColor: 0x00ffff,
    upgrades: [
      { cost: 40, range: 145, damage: 18, fireRate: 55 },
      { cost: 80, range: 160, damage: 28, fireRate: 50 }
    ]
  },
  ICE: {
    name: '寒冰晶石',
    key: 'ICE',
    cost: 80,
    range: 120,
    damage: 8,
    fireRate: 70,
    slowAmount: 0.4,   // speed multiplier when slowed
    slowDuration: 90,  // frames
    color: 0x88ccff,
    glowColor: 0x88ccff,
    upgrades: [
      { cost: 60, range: 135, damage: 12, fireRate: 65, slowAmount: 0.35, slowDuration: 110 },
      { cost: 120, range: 150, damage: 18, fireRate: 60, slowAmount: 0.3, slowDuration: 130 }
    ]
  },
  FIRE: {
    name: '烈焰晶石',
    key: 'FIRE',
    cost: 100,
    range: 110,
    damage: 25,
    fireRate: 80,
    splashRadius: 45,
    color: 0xff6600,
    glowColor: 0xff4400,
    upgrades: [
      { cost: 80, range: 125, damage: 35, fireRate: 75, splashRadius: 55 },
      { cost: 150, range: 140, damage: 50, fireRate: 70, splashRadius: 65 }
    ]
  },
  LIGHTNING: {
    name: '闪电晶石',
    key: 'LIGHTNING',
    cost: 120,
    range: 140,
    damage: 15,
    fireRate: 45,
    chainCount: 2,
    color: 0xffdd00,
    glowColor: 0xffff00,
    upgrades: [
      { cost: 100, range: 155, damage: 22, fireRate: 42, chainCount: 3 },
      { cost: 180, range: 170, damage: 32, fireRate: 38, chainCount: 4 }
    ]
  }
}

export const TOWER_TYPE_LIST = Object.values(TOWER_TYPES)

// Fusion
export const FUSION_COST = 50
export const MAX_TOWER_LEVEL = 3  // 1 = base, 2 = upgraded, 3 = max

// Enemy types
export const ENEMY_TYPES = {
  NORMAL: { key: 'NORMAL', hp: 40, speed: 55, reward: 10, color: 0xff6666, size: 10 },
  FAST:   { key: 'FAST', hp: 25, speed: 90, reward: 15, color: 0xffaa00, size: 8 },
  TANK:   { key: 'TANK', hp: 100, speed: 30, reward: 25, color: 0xcc4444, size: 14 },
  BOSS:   { key: 'BOSS', hp: 300, speed: 22, reward: 100, color: 0xff0000, size: 20 }
}

// Wave definitions
export const WAVES = [
  // Wave 1: 8 normal enemies
  { enemies: [{ type: 'NORMAL', count: 8, interval: 40 }], reward: 30 },
  // Wave 2: mix
  { enemies: [{ type: 'NORMAL', count: 6, interval: 35 }, { type: 'FAST', count: 3, interval: 30 }], reward: 40 },
  // Wave 3: more
  { enemies: [{ type: 'NORMAL', count: 8, interval: 30 }, { type: 'TANK', count: 2, interval: 60 }], reward: 50 },
  // Wave 4: fast wave
  { enemies: [{ type: 'FAST', count: 10, interval: 25 }, { type: 'NORMAL', count: 4, interval: 30 }], reward: 60 },
  // Wave 5: tanks
  { enemies: [{ type: 'TANK', count: 5, interval: 50 }, { type: 'NORMAL', count: 6, interval: 30 }], reward: 80 },
  // Wave 6: mixed
  { enemies: [{ type: 'NORMAL', count: 10, interval: 28 }, { type: 'FAST', count: 6, interval: 25 }, { type: 'TANK', count: 3, interval: 55 }], reward: 100 },
  // Wave 7: fast + tanks
  { enemies: [{ type: 'FAST', count: 8, interval: 22 }, { type: 'TANK', count: 4, interval: 45 }], reward: 120 },
  // Wave 8: boss wave
  { enemies: [{ type: 'NORMAL', count: 10, interval: 25 }, { type: 'TANK', count: 4, interval: 40 }, { type: 'BOSS', count: 1, interval: 120 }], reward: 200 },
  // Wave 9
  { enemies: [{ type: 'FAST', count: 12, interval: 20 }, { type: 'TANK', count: 5, interval: 40 }, { type: 'NORMAL', count: 8, interval: 25 }], reward: 250 },
  // Wave 10: final boss wave
  { enemies: [{ type: 'BOSS', count: 2, interval: 100 }, { type: 'TANK', count: 6, interval: 35 }, { type: 'FAST', count: 10, interval: 20 }], reward: 500 }
]

// Starting resources
export const STARTING_GOLD = 200
export const STARTING_LIVES = 10

// Game states
export const GS = {
  MENU: 'menu',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
  COMPLETE: 'complete',
  WON: 'won'
}

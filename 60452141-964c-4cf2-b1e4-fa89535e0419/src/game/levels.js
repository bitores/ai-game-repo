/**
 * Level definitions for 时光回溯迷宫
 *
 * Map characters:
 *   'W' = wall   '.' = floor
 *   'P' = player start   'B' = box start
 *   'E' = correct pedestal (energy base)
 *   'X' = time fissure (wrong pedestal)
 *
 * All levels are exactly 20 cols × 13 rows at 48px tile size.
 */

const COLS = 20

const parseLevel = (mapStr, boxPedestalPairs, timeLimit) => {
  const rawRows = mapStr.trim().split('\n').map(r => r.trim())
  // Normalize each row to exactly COLS characters
  const rows = rawRows.map(r => {
    if (r.length < COLS) return r + '.'.repeat(COLS - r.length)
    return r.slice(0, COLS)
  })
  const grid = []
  const playerStart = { col: 0, row: 0 }

  rows.forEach((row, r) => {
    const tiles = []
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      switch (ch) {
        case 'W': tiles.push(1); break
        case 'P': tiles.push(0); playerStart.col = c; playerStart.row = r; break
        case 'B': tiles.push(0); break
        case 'E': tiles.push(0); break
        case 'X': tiles.push(0); break
        default:  tiles.push(0)
      }
    }
    grid.push(tiles)
  })

  // Build pedestals: correct ones from pairs + time fissures
  const timeFissures = []
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'X') timeFissures.push({ col: c, row: r })
    }
  })

  const pedestals = boxPedestalPairs.map((pair, i) => ({
    col: pair.pedestalCol,
    row: pair.pedestalRow,
    isCorrect: true,
    boxIndex: i
  }))
  for (const f of timeFissures) {
    pedestals.push({ col: f.col, row: f.row, isCorrect: false, boxIndex: -1 })
  }

  return {
    grid,
    cols: COLS,
    rows: rows.length,
    playerStart,
    boxStarts: boxPedestalPairs.map(p => ({ col: p.boxCol, row: p.boxRow })),
    pedestals,
    timeLimit: timeLimit || 120
  }
}

export const LEVELS = [
  // ═══════════════════════════════════════════════════════
  // Level 1: 初识回溯 (Introduction)
  // One box, simple open path — learn to push and use time pause.
  // ═══════════════════════════════════════════════════════
  parseLevel(`
    WWWWWWWWWWWWWWWWWWWW
    W..................W
    W..WWWWWWWWWWWWW..W.
    W..................W
    W..................W
    W...P.B............W
    W..................W
    W..................W
    W..................W
    W..................W
    W..................W
    W......E..........W.
    WWWWWWWWWWWWWWWWWWWW
  `, [
    { boxCol: 6, boxRow: 5, pedestalCol: 7, pedestalRow: 11 }
  ], 90),

  // ═══════════════════════════════════════════════════════
  // Level 2: 齿轮迷局 (Gear Puzzle)
  // Two boxes, two rooms, one time fissure to avoid.
  // ═══════════════════════════════════════════════════════
  parseLevel(`
    WWWWWWWWWWWWWWWWWWWW
    W.......P..........W
    W..................W
    W....WWWWWWW.......W
    W..............X...W
    W..B...............W
    W....WWWWWWW.......W
    W..................W
    W..................W
    W..B...............W
    W..................W
    W....E.......E.....W
    WWWWWWWWWWWWWWWWWWWW
  `, [
    { boxCol: 3, boxRow: 5, pedestalCol: 5, pedestalRow: 11 },
    { boxCol: 3, boxRow: 9, pedestalCol: 13, pedestalRow: 11 }
  ], 120),

  // ═══════════════════════════════════════════════════════
  // Level 3: 时光回廊 (Time Corridor)
  // Three boxes, tight corridors, time fissure hazards.
  // ═══════════════════════════════════════════════════════
  parseLevel(`
    WWWWWWWWWWWWWWWWWWWW
    W.B..........X....W.
    W..................W
    W.WWWWW..WWWWWW...W.
    W..................W
    W.X...............W.
    W..........B......W.
    W..................W
    W...WWWWWWWWWW....W.
    W..................W
    W..........X.B....W.
    W...E..E.......E..W.
    WWWWWWWWWWWWWWWWWWWW
  `, [
    { boxCol: 2, boxRow: 1, pedestalCol: 4, pedestalRow: 11 },
    { boxCol: 11, boxRow: 6, pedestalCol: 7, pedestalRow: 11 },
    { boxCol: 13, boxRow: 10, pedestalCol: 15, pedestalRow: 11 }
  ], 150)
]

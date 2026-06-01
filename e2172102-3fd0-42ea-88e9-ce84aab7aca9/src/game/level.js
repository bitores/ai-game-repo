import { PT, GAME_HEIGHT, GAME_WIDTH, PLAYER_WIDTH, PLAYER_HEIGHT } from './constants.js'

/**
 * Generate a level with platforms and memory fragments.
 * Returns { platforms, fragments, startX, startY, exitX, width }
 */
export function generateLevel(levelNum) {
  const difficulty = Math.min(levelNum, 10)
  const width = GAME_WIDTH * 3 + difficulty * 200
  const startX = 80
  const startY = GAME_HEIGHT - 100

  const platforms = []
  const fragments = []
  let exitX = width - 200

  // === Ground ===
  // Ground with random gaps
  let gx = 0
  while (gx < width) {
    const segLen = 250 + Math.random() * 300 + difficulty * 10
    platforms.push({
      x: gx,
      y: GAME_HEIGHT - 30,
      w: Math.min(segLen, width - gx),
      h: 30,
      type: PT.STATIC,
      baseX: gx,
      baseY: GAME_HEIGHT - 30
    })
    gx += segLen

    // Gap (larger gaps at higher difficulty)
    if (gx < width - 400) {
      const gapSize = 60 + difficulty * 8 + Math.random() * 40
      gx += gapSize
    }
  }

  // === Floating platforms ===
  const numPlatforms = 6 + difficulty * 2
  for (let i = 0; i < numPlatforms; i++) {
    const px = 200 + Math.random() * (width - 400)
    const py = 100 + Math.random() * (GAME_HEIGHT - 200)

    // Don't place too close to start
    if (px < 150 && py > GAME_HEIGHT - 150) continue

    const pw = 80 + Math.random() * 120
    const platformType = pickPlatformType(difficulty, i)

    const plat = {
      x: px,
      y: py,
      w: pw,
      h: 18,
      type: platformType,
      baseX: px,
      baseY: py
    }

    // Moving platform parameters
    if (platformType === PT.MOVING_H) {
      plat.moveRange = 60 + Math.random() * 80
      plat.moveSpeed = 0.015 + Math.random() * 0.015
      plat.movePhase = Math.random() * Math.PI * 2
    } else if (platformType === PT.MOVING_V) {
      plat.moveRange = 50 + Math.random() * 60
      plat.moveSpeed = 0.01 + Math.random() * 0.015
      plat.movePhase = Math.random() * Math.PI * 2
    } else if (platformType === PT.DISAPPEARING) {
      plat.fadeDelay = 500  // ms after player leaves before respawn
      plat.fadeTimer = 0
      plat.visible = true
      plat.alpha = 1
    } else if (platformType === PT.TIMER) {
      plat.onDuration = 2000 + Math.random() * 1000
      plat.offDuration = 1500 + Math.random() * 1000
      plat.timer = Math.random() * plat.onDuration
      plat.visible = true
      plat.alpha = 1
    }

    platforms.push(plat)

    // === Memory fragments on platforms ===
    if (Math.random() < 0.6 || (platformType === PT.STATIC && Math.random() < 0.8)) {
      const aboveY = py - 30 - Math.random() * 10
      fragments.push({
        x: px + pw / 2 - 7,
        y: aboveY,
        collected: false,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.02 + Math.random() * 0.02,
        floatRange: 4 + Math.random() * 4
      })
    }
  }

  // Add some extra fragments in harder-to-reach places
  const extraFrags = Math.floor(difficulty / 2)
  for (let i = 0; i < extraFrags; i++) {
    const fx = 300 + Math.random() * (width - 500)
    const fy = 80 + Math.random() * 200
    // Check not overlapping platform fragments too much
    fragments.push({
      x: fx,
      y: fy,
      collected: false,
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.02 + Math.random() * 0.02,
      floatRange: 4 + Math.random() * 4
    })
  }

  // Ensure at least 3 fragments
  if (fragments.length < 3) {
    for (let i = 0; i < 3; i++) {
      const px = 300 + i * 400
      const py = GAME_HEIGHT - 120 - i * 60
      fragments.push({
        x: px,
        y: py,
        collected: false,
        floatPhase: i,
        floatSpeed: 0.02,
        floatRange: 5
      })
    }
  }

  // === Exit platform ===
  exitX = Math.max(exitX, startX + 600)
  platforms.push({
    x: exitX - 30,
    y: GAME_HEIGHT - 80,
    w: 60,
    h: 18,
    type: PT.STATIC,
    baseX: exitX - 30,
    baseY: GAME_HEIGHT - 80
  })

  return {
    platforms,
    fragments,
    startX,
    startY,
    exitX,
    width
  }
}

function pickPlatformType(difficulty, index) {
  // First few platforms are always static
  if (index < 2) return PT.STATIC

  const roll = Math.random()
  if (difficulty <= 2) {
    // Easy: mostly static, some moving
    if (roll < 0.7) return PT.STATIC
    if (roll < 0.9) return PT.MOVING_H
    return PT.MOVING_V
  } else if (difficulty <= 5) {
    if (roll < 0.4) return PT.STATIC
    if (roll < 0.6) return PT.MOVING_H
    if (roll < 0.8) return PT.MOVING_V
    if (roll < 0.9) return PT.DISAPPEARING
    return PT.TIMER
  } else {
    if (roll < 0.25) return PT.STATIC
    if (roll < 0.45) return PT.MOVING_H
    if (roll < 0.6) return PT.MOVING_V
    if (roll < 0.8) return PT.DISAPPEARING
    return PT.TIMER
  }
}

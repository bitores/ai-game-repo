import { PT, GAME_HEIGHT, GAME_WIDTH, PLAYER_WIDTH, PLAYER_HEIGHT, DATA_TYPE } from './constants.js'

/**
 * Generate a level with responsive platforms and data fragments.
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

  // === Ground with responsive gaps ===
  let gx = 0
  let groundIndex = 0
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
    groundIndex++

    // Responsive gap: larger gaps at higher difficulty
    if (gx < width - 400) {
      const gapSize = 60 + difficulty * 8 + Math.random() * 40
      gx += gapSize
    }
  }

  // === Responsive floating platforms (vertically reachable) ===
  const numPlatforms = 6 + difficulty * 2

  // Collect platform definitions first, then sort by x for vertical progression
  const platformDefs = []
  for (let i = 0; i < numPlatforms; i++) {
    const px = 200 + Math.random() * (width - 400)
    // Don't place too close to start
    if (px < 150) continue

    const platformType = pickPlatformType(difficulty, i)
    platformDefs.push({ px, type: platformType, index: i })
  }

  // Sort by x position so platforms form a left-to-right path
  platformDefs.sort((a, b) => a.px - b.px)

  // Track vertical reachability starting from the ground surface
  let reachableSurfaceY = GAME_HEIGHT - 30
  const MAX_JUMP_UP = 100   // safe jump height margin
  const MAX_DROP_DOWN = 120 // max downward step

  for (const def of platformDefs) {
    // Calculate y within reachable range from the current reachable surface
    const minY = Math.max(60, reachableSurfaceY - MAX_JUMP_UP)
    const maxY = Math.min(GAME_HEIGHT - 60, reachableSurfaceY + MAX_DROP_DOWN)
    const py = minY + Math.random() * Math.max(20, maxY - minY)

    // Update reachable surface (player can now stand on this platform)
    reachableSurfaceY = Math.min(reachableSurfaceY, py)

    const pw = 80 + Math.random() * 120
    const platformType = def.type

    const plat = {
      x: def.px,
      y: py,
      w: pw,
      h: 18,
      type: platformType,
      baseX: def.px,
      baseY: py
    }

    // Moving platform parameters
    if (platformType === PT.MOVING_H) {
      plat.moveRange = 60 + Math.random() * 100
      plat.moveSpeed = 0.012 + Math.random() * 0.018
      plat.movePhase = Math.random() * Math.PI * 2
    } else if (platformType === PT.MOVING_V) {
      plat.moveRange = 50 + Math.random() * 80
      plat.moveSpeed = 0.01 + Math.random() * 0.015
      plat.movePhase = Math.random() * Math.PI * 2
    } else if (platformType === PT.DISAPPEARING) {
      plat.fadeDelay = 500
      plat.fadeTimer = 0
      plat.visible = true
      plat.alpha = 1
    } else if (platformType === PT.TIMER) {
      plat.onDuration = 2000 + Math.random() * 1000
      plat.offDuration = 1500 + Math.random() * 1000
      plat.timer = Math.random() * plat.onDuration
      plat.visible = true
      plat.alpha = 1
    } else if (platformType === PT.SPRING) {
      plat.springForce = -14 + Math.random() * -3
      plat.springCooldown = 0
      plat.springDelay = 300
    } else if (platformType === PT.CONVEYOR) {
      plat.conveyorSpeed = (Math.random() < 0.5 ? 1 : -1) * (1.5 + Math.random() * 1.5)
      plat.conveyorDir = plat.conveyorSpeed > 0 ? 1 : -1
    }

    platforms.push(plat)

    // Data fragments on platforms
    if (Math.random() < 0.6 || (platformType === PT.STATIC && Math.random() < 0.8)) {
      const aboveY = py - 30 - Math.random() * 10
      fragments.push({
        x: def.px + pw / 2 - 7,
        y: aboveY,
        collected: false,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.02 + Math.random() * 0.02,
        floatRange: 4 + Math.random() * 4,
        dataType: Math.floor(Math.random() * 4)  // 0-3 DATA_TYPE values
      })
    }
  }

  // Extra data fragments in harder-to-reach places
  const extraFrags = Math.floor(difficulty / 2)
  for (let i = 0; i < extraFrags; i++) {
    const fx = 300 + Math.random() * (width - 500)
    const fy = 80 + Math.random() * 200
    fragments.push({
      x: fx,
      y: fy,
      collected: false,
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.02 + Math.random() * 0.02,
      floatRange: 4 + Math.random() * 4,
      dataType: Math.floor(Math.random() * 4)
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
        floatRange: 5,
        dataType: i % 4
      })
    }
  }

  // Responsive exit platform
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
    if (roll < 0.6) return PT.STATIC
    if (roll < 0.8) return PT.MOVING_H
    if (roll < 0.95) return PT.MOVING_V
    return PT.SPRING
  } else if (difficulty <= 5) {
    if (roll < 0.3) return PT.STATIC
    if (roll < 0.45) return PT.MOVING_H
    if (roll < 0.6) return PT.MOVING_V
    if (roll < 0.75) return PT.DISAPPEARING
    if (roll < 0.85) return PT.TIMER
    if (roll < 0.93) return PT.SPRING
    return PT.CONVEYOR
  } else {
    if (roll < 0.2) return PT.STATIC
    if (roll < 0.35) return PT.MOVING_H
    if (roll < 0.5) return PT.MOVING_V
    if (roll < 0.65) return PT.DISAPPEARING
    if (roll < 0.78) return PT.TIMER
    if (roll < 0.89) return PT.SPRING
    return PT.CONVEYOR
  }
}

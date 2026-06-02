/**
 * GameEngine — 时光回溯迷宫
 *
 * Manages the game loop, entity state, time-rewind mechanics,
 * input handling, and all Canvas rendering.
 */

import { LEVELS } from './levels.js'

// ── Constants ──────────────────────────────────────────────
const TILE = 48
const COLS = 20
const ROWS = 13
const CANVAS_W = COLS * TILE   // 960
const CANVAS_H = ROWS * TILE   // 624
// ── Box recording / rewind timing ────────────────────────
const BOX_RECORD_INTERVAL = 200  // ms between position recordings
const BOX_REWIND_INTERVAL = 500  // ms between rewind steps
const BOX_MAX_HISTORY = 25       // 5s ÷ 200ms = 25 entries
const BOX_STAY_DURATION = 800    // ms after push before rewind starts

// Colors — steampunk palette
const C = {
  bg:          '#0f0804',
  floorA:      '#2d1f0e',
  floorB:      '#261a0c',
  wallMain:    '#5c3a1e',
  wallLight:   '#7a5230',
  wallShadow:  '#3a2210',
  wallTop:     '#8b6914',
  brass:       '#d4a017',
  brassDark:   '#b8860b',
  brassLight:  '#f0d060',
  playerBody:  '#c4953a',
  playerCoat:  '#4a2c0a',
  playerSkin:  '#e8c888',
  boxBody:     '#6b3a10',
  boxBrass:    '#d4a017',
  boxLabel:    '#f0d060',
  pedestalOff: '#3a2a14',
  pedestalOn:  '#ffd700',
  pedestalGlow:'rgba(255,215,0,0.3)',
  fissure:     '#8b0000',
  fissureGlow: 'rgba(180,0,0,0.4)',
  steam:       'rgba(200,180,150,0.25)',
  portal:      '#40e0d0',
  portalGlow:  'rgba(64,224,208,0.4)',
  uiBg:        'rgba(10,6,4,0.75)',
  pauseTint:   'rgba(80,120,180,0.12)',
  textGold:    '#d4a017',
  textWhite:   '#f0e8d0',
  textRed:     '#cc4444',
  textGreen:   '#44cc88',
}

// ── Sound effects (Web Audio) ─────────────────────────────
const SFX = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  },
  _osc(type, freq, dur, vol = 0.08) {
    if (!this.ctx) return
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.connect(g); g.connect(this.ctx.destination)
    o.type = type
    o.frequency.setValueAtTime(freq, this.ctx.currentTime)
    g.gain.setValueAtTime(vol, this.ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur)
    o.start(); o.stop(this.ctx.currentTime + dur)
  },
  move()    { this._osc('square', 200, 0.06, 0.04) },
  push()    { this._osc('square', 300, 0.1, 0.06) },
  rewind()  { this._osc('sine', 180, 0.08, 0.03) },
  pause()   { this._osc('triangle', 500, 0.12, 0.05) },
  resume()  { this._osc('triangle', 700, 0.12, 0.05) },
  place()   { this._osc('sine', 800, 0.2, 0.07); setTimeout(() => SFX._osc('sine', 1000, 0.2, 0.07), 100) },
  win()     {
    [600, 800, 1000, 1200].forEach((f, i) => setTimeout(() => SFX._osc('sine', f, 0.25, 0.08), i * 120))
  },
  lose()    { this._osc('sawtooth', 150, 0.4, 0.07) },
  fissure() { this._osc('sawtooth', 100, 0.3, 0.1) },
}

// ── Helper: AABB collision ────────────────────────────────
const tileCenter = (col, row) => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 })
const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

// ── Particle helpers ──────────────────────────────────────
class SteamParticle {
  constructor(x, y) {
    this.x = x + (Math.random() - 0.5) * 8
    this.y = y
    this.vx = (Math.random() - 0.5) * 0.3
    this.vy = -0.3 - Math.random() * 0.3
    this.life = 1.0
    this.decay = 0.008 + Math.random() * 0.012
    this.r = 4 + Math.random() * 8
  }
  update() {
    this.x += this.vx; this.y += this.vy
    this.vy -= 0.01
    this.life -= this.decay
    this.r += 0.05
  }
}

class SparkParticle {
  constructor(x, y, color = C.brassLight) {
    this.x = x; this.y = y
    const angle = Math.random() * Math.PI * 2
    const speed = 0.5 + Math.random() * 1.5
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.life = 1.0
    this.decay = 0.015 + Math.random() * 0.02
    this.color = color
    this.size = 1 + Math.random() * 2
  }
  update() {
    this.x += this.vx; this.y += this.vy
    this.vy += 0.02
    this.life -= this.decay
  }
}

// ── Main Engine ───────────────────────────────────────────
export class GameEngine {
  constructor() {
    this.canvas = null
    this.ctx = null
    this.initialized = false
    this.running = false

    // Level state
    this.levelIndex = 0
    this.grid = []
    this.cols = COLS
    this.rows = ROWS
    this.player = { col: 0, row: 0, moving: false }
    this.boxes = []
    this.pedestals = []
    this.portal = null  // appears when all boxes placed

    // Game state
    this.state = 'loading'  // 'playing' | 'paused' | 'won' | 'lost'
    this.loseReason = ''
    this.placedCount = 0
    this.totalBoxes = 0
    this.timeRemaining = 120
    this.timeElapsed = 0

    // Time system
    this.timePaused = false

    // Input
    this.keys = {}
    this.keyJustPressed = {}
    this.moveTimer = 0
    this.moveDelay = 180  // ms between moves

    // Animation
    this.gearAngle = 0
    this.steamParticles = []
    this.sparkParticles = []
    this.fxTimer = 0

    // Callbacks
    this.onStateChange = null

    // Bind
    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
  }

  // ── Init ──────────────────────────────────────────────
  init(canvas, levelIndex = 0) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    this.levelIndex = levelIndex
    this._loadLevel(levelIndex)
    this._setupInput()
    this.initialized = true
    this.state = 'playing'
    this.running = true
    this._loop()
  }

  destroy() {
    this.running = false
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
  }

  // ── Level Loading ────────────────────────────────────
  _loadLevel(idx) {
    const data = LEVELS[idx]
    if (!data) return

    // Deep clone grid
    this.grid = data.grid.map(row => [...row])
    this.cols = data.cols || COLS
    this.rows = data.rows || ROWS

    // Player
    this.player = { col: data.playerStart.col, row: data.playerStart.row, moving: false }
    this.player.targetCol = this.player.col
    this.player.targetRow = this.player.row
    this.player.animX = this.player.col * TILE
    this.player.animY = this.player.row * TILE
    this.player.facing = 1

    // Boxes — each has a position history for time rewind
    this.boxes = data.boxStarts.map((bs, i) => {
      const pedestal = data.pedestals[i] || data.pedestals[0]
      return {
        col: bs.col,
        row: bs.row,
        // Smooth visual animation
        animX: bs.col * TILE,
        animY: bs.row * TILE,
        isMoving: false,
        moveFromCol: bs.col,
        moveFromRow: bs.row,
        moveToCol: bs.col,
        moveToRow: bs.row,
        moveProgress: 0,
        moveDuration: BOX_REWIND_INTERVAL,
        // Position history: [oldest … newest], continuous recording
        history: [],
        recordTimer: 0,
        rewindTimer: 0,
        stayTimer: 0,
        stayDuration: BOX_STAY_DURATION,
        phase: 'recording',  // 'recording' | 'staying' | 'rewinding'
        pedestalCol: pedestal.col,
        pedestalRow: pedestal.row,
        placed: false,
        index: i
      }
    })

    // Pedestals
    this.pedestals = data.pedestals.map((p, i) => ({
      col: p.col,
      row: p.row,
      isCorrect: p.isCorrect !== false,
      boxIndex: p.boxIndex !== undefined ? p.boxIndex : i,
      activated: false,
      // Pre-generate stable crack data for time fissures
      cracks: !p.isCorrect
        ? Array.from({ length: 8 }, (_, ci) => {
            const seed = (p.col * 991 + p.row * 619 + ci * 773) % 997
            const angle = (seed / 997) * Math.PI * 2
            const len = 4 + ((seed * 53) % 10)
            // secondary branch
            const branchAngle = angle + (((seed * 127) % 360) / 360 - 0.5) * 0.6
            const branchLen = len * 0.4 + ((seed * 37) % 6) * 0.5
            return { angle, len, branchAngle, branchLen }
          })
        : null
    }))

    this.portal = null
    this.placedCount = 0
    this.totalBoxes = this.boxes.length
    this.timeRemaining = data.timeLimit || 120
    this.timeElapsed = 0
    this.timePaused = false
    this.steamParticles = []
    this.sparkParticles = []
  }

  // ── Input ────────────────────────────────────────────
  _setupInput() {
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
  }

  _onKeyDown(e) {
    const key = e.key
    if (!this.keys[key]) {
      this.keyJustPressed[key] = true
    }
    this.keys[key] = true

    // Space toggles pause
    if (key === ' ' || key === 'Spacebar') {
      e.preventDefault()
      if (this.state === 'playing' || this.state === 'paused') {
        this._togglePause()
      }
      return
    }

    // Win state: Enter = next level / restart last, R = restart
    if (this.state === 'won') {
      if (key === 'Enter') {
        e.preventDefault()
        if (this.levelIndex < LEVELS.length - 1) {
          this._loadLevel(this.levelIndex + 1)
        } else {
          this._loadLevel(this.levelIndex)
        }
        this.state = 'playing'
        this._notifyState()
        return
      }
      if (key === 'r' || key === 'R') {
        e.preventDefault()
        this._loadLevel(this.levelIndex)
        this.state = 'playing'
        this._notifyState()
        return
      }
    }

    // Lose state: Enter or R = restart
    if (this.state === 'lost') {
      if (key === 'Enter' || key === 'r' || key === 'R') {
        e.preventDefault()
        this._loadLevel(this.levelIndex)
        this.state = 'playing'
        this._notifyState()
        return
      }
    }
  }

  _onKeyUp(e) {
    this.keys[e.key] = false
  }

  _isKeyDown(key) {
    return !!this.keys[key]
  }

  _isKeyPressed(key) {
    return !!this.keyJustPressed[key]
  }

  _togglePause() {
    this.timePaused = !this.timePaused
    if (this.timePaused) {
      SFX.pause()
    } else {
      SFX.resume()
    }
  }

  // ── State Callback ───────────────────────────────────
  _notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        state: this.state,
        levelIndex: this.levelIndex,
        timeRemaining: Math.ceil(this.timeRemaining),
        timeElapsed: Math.floor(this.timeElapsed),
        placedCount: this.placedCount,
        totalBoxes: this.totalBoxes,
        paused: this.timePaused,
        loseReason: this.loseReason
      })
    }
  }

  // ── Main Loop ────────────────────────────────────────
  _loop() {
    if (!this.running) return
    const loop = (timestamp) => {
      if (!this.running) return
      this._update(16.67)
      this._render()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  _update(dt) {
    if (this.state !== 'playing') {
      // Still animate particles
      this._updateParticles()
      this.gearAngle += dt * 0.001
      return
    }

    SFX.init()

    // Game timer
    this.timeRemaining -= dt / 1000
    this.timeElapsed += dt / 1000
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0
      this._gameOver('时间耗尽！你被时间裂缝吞噬了...')
      return
    }

    // Handle movement input
    this.moveTimer -= dt
    if (this.moveTimer <= 0 && this.player.moving === false) {
      this._handleMovementInput()
    }

    // Animate player movement
    if (this.player.moving) {
      this._animatePlayerMovement(dt)
    }

    // Box recording (continuous position sampling)
    if (!this.timePaused) {
      this._recordBoxPositions(dt)
      this._updateBoxRewind(dt)
    }

    // Animate box movements (always, even when paused — finishes current animations)
    this._animateBoxMovements(dt)

    // Effects
    this.fxTimer += dt
    this._updateParticles()
    this._spawnSteam()
    this._spawnPedestalEffects()

    this.gearAngle += dt * 0.001

    // Win check
    this._checkWin()

    // Clear pressed keys
    this.keyJustPressed = {}
  }

  // ── Player Movement ──────────────────────────────────
  _handleMovementInput() {
    let dx = 0, dy = 0
    if (this._isKeyDown('ArrowUp') || this._isKeyDown('w') || this._isKeyDown('W')) dy = -1
    else if (this._isKeyDown('ArrowDown') || this._isKeyDown('s') || this._isKeyDown('S')) dy = 1
    else if (this._isKeyDown('ArrowLeft') || this._isKeyDown('a') || this._isKeyDown('A')) { dx = -1; this.player.facing = -1 }
    else if (this._isKeyDown('ArrowRight') || this._isKeyDown('d') || this._isKeyDown('D')) { dx = 1; this.player.facing = 1 }

    if (dx === 0 && dy === 0) return

    const newCol = this.player.col + dx
    const newRow = this.player.row + dy

    if (!this._isWalkable(newCol, newRow)) return

    // Check for box to push (only allowed when time is flowing)
    const canPush = !this.timePaused
    const box = this._getBoxAt(newCol, newRow)
    if (box) {
      if (!canPush) return  // can't push while time is frozen
      if (box.placed) return // can't push placed boxes
      const pushCol = newCol + dx
      const pushRow = newRow + dy
      if (!this._isWalkable(pushCol, pushRow)) return
      if (this._getBoxAt(pushCol, pushRow)) return // no chain pushing

      // Push the box
      this._pushBox(box, pushCol, pushRow)
    }

    // Move player
    this.player.col = newCol
    this.player.row = newRow
    this.player.targetCol = newCol
    this.player.targetRow = newRow
    this.player.moving = true
    this.player.animX = (newCol - dx) * TILE
    this.player.animY = (newRow - dy) * TILE
    this.moveTimer = this.moveDelay

    SFX.move()

    // Check for pedestal collision (time fissure)
    for (const p of this.pedestals) {
      if (!p.isCorrect && p.col === newCol && p.row === newRow) {
        this._gameOver('你踏入了时间裂缝！')
        SFX.fissure()
        return
      }
    }
  }

  _animatePlayerMovement(dt) {
    const speed = 200 // px/s
    const targetX = this.player.targetCol * TILE
    const targetY = this.player.targetRow * TILE
    const dx = targetX - this.player.animX
    const dy = targetY - this.player.animY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 1) {
      this.player.animX = targetX
      this.player.animY = targetY
      this.player.moving = false
    } else {
      const step = speed * (dt / 1000)
      if (step >= dist) {
        this.player.animX = targetX
        this.player.animY = targetY
        this.player.moving = false
      } else {
        this.player.animX += (dx / dist) * step
        this.player.animY += (dy / dist) * step
      }
    }
  }

  // ── Box Mechanics ────────────────────────────────────
  _pushBox(box, newCol, newRow) {
    // Record old position for rewind anchor
    const oldCol = box.col
    const oldRow = box.row

    box.col = newCol
    box.row = newRow
    box.phase = 'staying'
    box.stayTimer = 0
    box.rewindTimer = 0
    box.moveFromCol = oldCol
    box.moveFromRow = oldRow
    box.moveToCol = newCol
    box.moveToRow = newRow
    box.moveProgress = 0
    box.isMoving = true
    box.moveDuration = 200  // quick push animation

    // The continuous recorder will pick up this new position naturally

    SFX.push()

    // Spawn push sparks
    for (let i = 0; i < 4; i++) {
      this.sparkParticles.push(new SparkParticle(
        newCol * TILE + TILE / 2,
        newRow * TILE + TILE / 2,
        C.brassLight
      ))
    }

    // Check if box is on its pedestal
    this._checkBoxPlacement(box)
  }

  // ── Box Recording (continuous position sampling) ──────
  _recordBoxPositions(dt) {
    for (const box of this.boxes) {
      if (box.placed) continue
      box.recordTimer += dt
      while (box.recordTimer >= BOX_RECORD_INTERVAL) {
        box.recordTimer -= BOX_RECORD_INTERVAL
        box.history.push({ col: box.col, row: box.row })
        if (box.history.length > BOX_MAX_HISTORY) {
          box.history.shift()
        }
      }
    }
  }

  // ── Box Stay / Rewind ────────────────────────────────
  _updateBoxRewind(dt) {
    for (const box of this.boxes) {
      if (box.placed) continue

      if (box.phase === 'staying') {
        box.stayTimer += dt
        if (box.stayTimer >= box.stayDuration) {
          box.phase = 'rewinding'
          box.rewindTimer = 0
        }
      }

      if (box.phase === 'rewinding') {
        box.rewindTimer += dt
        while (box.rewindTimer >= BOX_REWIND_INTERVAL) {
          box.rewindTimer -= BOX_REWIND_INTERVAL
          this._doRewindStep(box)
        }
      }
    }
  }

  _doRewindStep(box) {
    if (box.history.length <= 1) {
      box.phase = 'recording'
      return
    }

    const prevCol = box.col
    const prevRow = box.row
    const popped = box.history.pop()
    const newLast = box.history[box.history.length - 1]

    box.col = newLast.col
    box.row = newLast.row

    if (box.col !== prevCol || box.row !== prevRow) {
      // Position changed — animate the rewind movement
      box.moveFromCol = prevCol
      box.moveFromRow = prevRow
      box.moveToCol = box.col
      box.moveToRow = box.row
      box.moveProgress = 0
      box.isMoving = true
      box.moveDuration = BOX_REWIND_INTERVAL

      this._checkBoxPlacement(box)

      // Spawn rewind particles
      if (Math.random() < 0.5) {
        this.sparkParticles.push(new SparkParticle(
          prevCol * TILE + TILE / 2,
          prevRow * TILE + TILE / 2,
          'rgba(100,180,255,0.4)'
        ))
      }
    } else {
      // Position unchanged — this pop was a same-position entry.
      // Check if ALL remaining history is at the current position
      const allSame = box.history.every(h => h.col === box.col && h.row === box.row)
      if (allSame) {
        // Fully rewound — restore the popped entry and switch to recording
        box.history.push(popped)
        box.phase = 'recording'
      }
    }
  }

  // ── Smooth box movement animation ────────────────────
  _animateBoxMovements(dt) {
    for (const box of this.boxes) {
      if (!box.isMoving) continue
      box.moveProgress += dt / box.moveDuration
      if (box.moveProgress >= 1) {
        box.moveProgress = 1
        box.isMoving = false
        box.animX = box.col * TILE
        box.animY = box.row * TILE
      } else {
        const t = this._easeInOutQuad(box.moveProgress)
        box.animX = (box.moveFromCol + (box.moveToCol - box.moveFromCol) * t) * TILE
        box.animY = (box.moveFromRow + (box.moveToRow - box.moveFromRow) * t) * TILE
      }
    }
  }

  _easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  _checkBoxPlacement(box) {
    if (box.placed) return

    // Check for wrong pedestal (time fissure) first
    for (const p of this.pedestals) {
      if (!p.isCorrect && box.col === p.col && box.row === p.row) {
        this._gameOver('齿轮箱落入了时间裂缝！')
        SFX.fissure()
        return
      }
    }

    // Check if box is on its correct pedestal
    if (box.col === box.pedestalCol && box.row === box.pedestalRow) {
      // Also prevent duplicates: no other box placed on this pedestal
      const conflict = this.boxes.find(b =>
        b !== box && b.placed &&
        b.pedestalCol === box.pedestalCol &&
        b.pedestalRow === box.pedestalRow
      )
      if (!conflict) {
        box.placed = true
        this.placedCount++

        // Activate pedestal
        for (const p of this.pedestals) {
          if (p.col === box.pedestalCol && p.row === box.pedestalRow) {
            p.activated = true
          }
        }

        SFX.place()

        // Celebration sparks
        for (let i = 0; i < 12; i++) {
          this.sparkParticles.push(new SparkParticle(
            box.col * TILE + TILE / 2,
            box.row * TILE + TILE / 2,
            C.pedestalOn
          ))
        }
      }
    }
  }

  // ── Win/Lose ──────────────────────────────────────────
  _checkWin() {
    if (this.state !== 'playing') return
    if (this.placedCount >= this.totalBoxes && this.totalBoxes > 0) {
      this.state = 'won'
      this.portal = { col: Math.floor(this.cols / 2), row: 1 }
      SFX.win()
      this._notifyState()
    }
  }

  _gameOver(reason) {
    if (this.state !== 'playing') return  // prevent double-trigger
    this.state = 'lost'
    this.loseReason = reason
    SFX.lose()
    this._notifyState()
  }

  // ── Collision Helpers ──────────────────────────────
  _isWalkable(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false
    return this.grid[row][col] === 0
  }

  _getBoxAt(col, row) {
    return this.boxes.find(b => b.col === col && b.row === row && !b.placed) || null
  }

  // ── Particles ──────────────────────────────────────────
  _updateParticles() {
    this.steamParticles = this.steamParticles.filter(p => p.life > 0)
    this.sparkParticles = this.sparkParticles.filter(p => p.life > 0)
    this.steamParticles.forEach(p => p.update())
    this.sparkParticles.forEach(p => p.update())
  }

  _spawnSteam() {
    if (this.fxTimer < 80) return
    this.fxTimer = 0

    // Spawn steam from random wall tiles
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 1 && Math.random() < 0.003) {
          this.steamParticles.push(new SteamParticle(c * TILE + TILE / 2, (r + 1) * TILE))
        }
      }
    }

    // Steam from pedestals
    for (const p of this.pedestals) {
      if (p.activated && Math.random() < 0.05) {
        this.steamParticles.push(new SteamParticle(p.col * TILE + TILE / 2, p.row * TILE))
      }
    }
  }

  _spawnPedestalEffects() {
    for (const p of this.pedestals) {
      if (p.activated && Math.random() < 0.1) {
        this.sparkParticles.push(new SparkParticle(
          p.col * TILE + TILE / 2 + (Math.random() - 0.5) * 20,
          p.row * TILE + TILE / 2 + (Math.random() - 0.5) * 20,
          C.pedestalOn
        ))
      }
    }
  }

  // ── Rendering ────────────────────────────────────────
  _render() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Background
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Floor
    this._drawFloor(ctx)

    // Pedestals
    for (const p of this.pedestals) {
      this._drawPedestal(ctx, p)
    }

    // Boxes
    for (const box of this.boxes) {
      this._drawBox(ctx, box)
    }

    // Player
    this._drawPlayer(ctx)

    // Walls
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 1) {
          this._drawWall(ctx, c, r)
        }
      }
    }

    // Portal (win condition)
    if (this.portal) {
      this._drawPortal(ctx, this.portal)
    }

    // Effects
    this._drawParticles(ctx)

    // Pause overlay
    if (this.timePaused && this.state === 'playing') {
      this._drawPauseOverlay(ctx)
    }

    // UI
    this._drawUI(ctx)

    // Game over overlays
    if (this.state === 'won') {
      this._drawWinOverlay(ctx)
    } else if (this.state === 'lost') {
      this._drawLoseOverlay(ctx)
    }
  }

  // ── Floor Drawing ────────────────────────────────────
  _drawFloor(ctx) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== 0) continue
        const x = c * TILE, y = r * TILE
        // Checkerboard
        ctx.fillStyle = (c + r) % 2 === 0 ? C.floorA : C.floorB
        ctx.fillRect(x, y, TILE, TILE)

        // Subtle stone pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.02)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4)
      }
    }
  }

  // ── Wall Drawing ────────────────────────────────────
  _drawWall(ctx, col, row) {
    const x = col * TILE, y = row * TILE
    const w = TILE, h = TILE

    // Main brick body
    ctx.fillStyle = C.wallMain
    ctx.fillRect(x, y, w, h)

    // Brick texture lines
    ctx.strokeStyle = C.wallShadow
    ctx.lineWidth = 1
    // Horizontal brick line (mid)
    ctx.beginPath()
    ctx.moveTo(x, y + h / 2)
    ctx.lineTo(x + w, y + h / 2)
    ctx.stroke()
    // Vertical brick lines (offset)
    ctx.beginPath()
    ctx.moveTo(x + w * 0.4, y)
    ctx.lineTo(x + w * 0.4, y + h / 2)
    ctx.moveTo(x + w * 0.8, y + h / 2)
    ctx.lineTo(x + w * 0.8, y + h)
    ctx.stroke()

    // Top highlight
    ctx.fillStyle = C.wallLight
    ctx.fillRect(x, y, w, 2)
    ctx.fillRect(x, y, 2, h)

    // Brass top cap (if exposed)
    const hasLeft = col > 0 && this.grid[row][col - 1] === 1
    const hasRight = col < this.cols - 1 && this.grid[row][col + 1] === 1
    const hasUp = row > 0 && this.grid[row - 1][col] === 1

    if (!hasUp) {
      // Top exposed — add brass rail
      ctx.fillStyle = C.wallTop
      ctx.fillRect(x, y, w, 4)
      // Rivets
      ctx.fillStyle = C.brassLight
      ctx.beginPath()
      ctx.arc(x + 8, y + 2, 2, 0, Math.PI * 2)
      ctx.arc(x + w - 8, y + 2, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Pipe corner detail (if L-shaped)
    if (!hasUp && !hasLeft && col > 0 && row > 0) {
      this._drawPipeJoint(ctx, x, y, 'topleft')
    }
    if (!hasUp && !hasRight && col < this.cols - 1 && row > 0) {
      this._drawPipeJoint(ctx, x + w, y, 'topright')
    }

    // Steam pipe on some walls
    if ((col + row) % 5 === 0 && !hasUp) {
      ctx.fillStyle = C.wallShadow
      ctx.fillRect(x + 6, y + 4, w - 12, 6)
      ctx.fillStyle = '#6b5030'
      ctx.fillRect(x + 8, y + 5, w - 16, 4)
      // Gear decoration
      const gx = x + w / 2, gy = y + 10
      this._drawSmallGear(ctx, gx, gy, 4, this.gearAngle * 2)
    }
  }

  _drawPipeJoint(ctx, x, y, corner) {
    ctx.fillStyle = '#4a3020'
    if (corner === 'topleft') {
      ctx.fillRect(x, y, 10, 10)
      ctx.fillStyle = '#6b5030'
      ctx.fillRect(x + 2, y + 2, 6, 6)
      ctx.fillStyle = C.wallShadow
      ctx.beginPath()
      ctx.arc(x + 5, y + 5, 3, 0, Math.PI * 2)
      ctx.stroke()
    } else if (corner === 'topright') {
      ctx.fillRect(x - 10, y, 10, 10)
      ctx.fillStyle = '#6b5030'
      ctx.fillRect(x - 8, y + 2, 6, 6)
    }
  }

  _drawSmallGear(ctx, x, y, r, angle) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.strokeStyle = C.brass
    ctx.lineWidth = 1.5
    // Gear teeth
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      ctx.fillStyle = C.brass
      ctx.fillRect(Math.cos(a) * r - 1, Math.sin(a) * r - 1.5, 2, 3)
    }
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = C.brassDark
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // ── Player Drawing ──────────────────────────────────
  _drawPlayer(ctx) {
    const px = this.player.animX
    const py = this.player.animY
    const cx = px + TILE / 2
    const cy = py + TILE / 2
    const dir = this.player.facing

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(cx, py + TILE - 4, 14, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body / coat
    ctx.fillStyle = C.playerCoat
    ctx.fillRect(cx - 8, cy - 6, 16, 18)

    // Brass buttons
    ctx.fillStyle = C.brass
    ctx.fillRect(cx - 3, cy, 2, 2)
    ctx.fillRect(cx + 1, cy, 2, 2)
    ctx.fillRect(cx - 3, cy + 6, 2, 2)
    ctx.fillRect(cx + 1, cy + 6, 2, 2)

    // Head
    ctx.fillStyle = C.playerSkin
    ctx.beginPath()
    ctx.arc(cx, cy - 12, 9, 0, Math.PI * 2)
    ctx.fill()

    // Top hat
    ctx.fillStyle = '#2a1a0a'
    ctx.fillRect(cx - 10, cy - 24, 20, 6)
    ctx.fillRect(cx - 7, cy - 30, 14, 8)
    // Hat band
    ctx.fillStyle = C.brass
    ctx.fillRect(cx - 10, cy - 19, 20, 2)

    // Goggles
    ctx.fillStyle = '#888'
    ctx.beginPath()
    ctx.ellipse(cx - 4 + dir * 1, cy - 13, 3, 3.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + 4 + dir * 1, cy - 13, 3, 3.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#aaddff'
    ctx.beginPath()
    ctx.ellipse(cx - 4 + dir * 1, cy - 13, 2, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + 4 + dir * 1, cy - 13, 2, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()
    // Goggle strap
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy - 13, 8, -Math.PI * 0.8, -Math.PI * 0.2)
    ctx.stroke()

    // Feet/legs
    ctx.fillStyle = '#1a0e06'
    ctx.fillRect(cx - 6, cy + 12, 5, 6)
    ctx.fillRect(cx + 1, cy + 12, 5, 6)

    // Boots
    ctx.fillStyle = '#3a2210'
    ctx.fillRect(cx - 7, cy + 16, 7, 4)
    ctx.fillRect(cx, cy + 16, 7, 4)
  }

  // ── Box Drawing ─────────────────────────────────────
  _drawBox(ctx, box) {
    const px = box.animX
    const py = box.animY
    const size = TILE - 8

    // ── Ghost trail (semi-transparent history snapshots) ──
    if (!box.placed && box.history.length > 0) {
      // Sample a few historical positions for ghost trail
      const ghostCount = Math.min(4, Math.floor(box.history.length / 2))
      for (let gi = 0; gi < ghostCount; gi++) {
        const idx = Math.max(0, box.history.length - 1 - (gi + 1) * 3)
        if (idx < 0 || idx >= box.history.length) continue
        const h = box.history[idx]
        const gx = h.col * TILE
        const gy = h.row * TILE
        const alpha = 0.08 + (0.06 * (ghostCount - gi)) / ghostCount
        const ghostSize = size - gi * 2

        ctx.fillStyle = `rgba(200,180,100,${alpha})`
        ctx.fillRect(gx + 4 + gi, gy + 4 + gi, ghostSize, ghostSize)

        // Ghost gear symbol
        ctx.strokeStyle = `rgba(200,180,100,${alpha * 0.5})`
        ctx.lineWidth = 0.5
        const gcx = gx + TILE / 2
        const gcy = gy + TILE / 2
        ctx.beginPath()
        ctx.arc(gcx, gcy, 5 - gi, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // ── Shadow ──
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(px + 4, py + 6, size, size)

    // ── Box body ──
    ctx.fillStyle = box.placed ? '#8b6b40' : C.boxBody
    ctx.fillRect(px + 2, py + 2, size, size)

    // ── Box trim (brass bands) ──
    ctx.fillStyle = C.boxBrass
    ctx.fillRect(px + 2, py + 2, size, 3)
    ctx.fillRect(px + 2, py + size - 1, size, 3)
    ctx.fillRect(px + 2, py + 2, 3, size)
    ctx.fillRect(px + size - 1, py + 2, 3, size)

    // ── Horizontal brass band ──
    ctx.fillStyle = C.brassDark
    ctx.fillRect(px + 4, py + size / 2 - 1, size - 4, 3)

    // ── Gear symbol on box ──
    const cx = px + size / 2 + 2
    const cy = py + size / 2 + 2
    ctx.strokeStyle = C.boxLabel
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, 7, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + this.gearAngle
      ctx.fillRect(cx + Math.cos(a) * 7 - 1.5, cy + Math.sin(a) * 7 - 1, 3, 2)
    }
    ctx.fillStyle = C.boxLabel
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fill()

    // ── Time-frozen glow ──
    if (this.timePaused && !box.placed && box.phase !== 'recording') {
      ctx.save()
      ctx.shadowColor = 'rgba(100,180,255,0.4)'
      ctx.shadowBlur = 12
      ctx.strokeStyle = 'rgba(100,180,255,0.3)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(px, py, size + 2, size + 2)
      ctx.restore()
    }

    // ── Placed glow ──
    if (box.placed) {
      ctx.save()
      ctx.shadowColor = C.pedestalGlow
      ctx.shadowBlur = 15
      ctx.strokeStyle = C.pedestalOn
      ctx.lineWidth = 2
      ctx.strokeRect(px, py, size + 2, size + 2)
      ctx.restore()
    }
  }

  // ── Pedestal Drawing ───────────────────────────────
  _drawPedestal(ctx, ped) {
    const px = ped.col * TILE
    const py = ped.row * TILE
    const cx = px + TILE / 2
    const cy = py + TILE / 2

    if (!ped.isCorrect) {
      // Time fissure (wrong pedestal)
      this._drawTimeFissure(ctx, ped)
      return
    }

    // Base platform
    ctx.fillStyle = C.pedestalOff
    ctx.fillRect(px + 6, py + 10, TILE - 12, TILE - 14)

    // Brass rim
    ctx.fillStyle = C.brassDark
    ctx.fillRect(px + 4, py + 8, TILE - 8, 3)
    ctx.fillRect(px + 4, py + TILE - 8, TILE - 8, 3)
    ctx.fillRect(px + 4, py + 8, 3, TILE - 16)
    ctx.fillRect(px + TILE - 7, py + 8, 3, TILE - 16)

    // Energy symbol
    const pulse = Math.sin(this.timeElapsed * 2) * 0.3 + 0.7
    if (ped.activated) {
      ctx.fillStyle = `rgba(255,215,0,${0.2 + pulse * 0.3})`
      ctx.fillRect(px + 10, py + 14, TILE - 20, TILE - 22)
      ctx.fillStyle = C.pedestalOn
      ctx.shadowColor = C.pedestalGlow
      ctx.shadowBlur = 10 * pulse
      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    } else {
      // Gear symbol (empty)
      ctx.strokeStyle = C.brassDark
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.stroke()
      // Dashed ring
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(cx, cy, 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  _drawTimeFissure(ctx, ped) {
    const px = ped.col * TILE
    const py = ped.row * TILE
    const cx = px + TILE / 2
    const cy = py + TILE / 2
    const pulse = Math.sin(this.timeElapsed * 3) * 0.3 + 0.7

    // Dark base
    ctx.fillStyle = '#1a0505'
    ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8)

    // Crack effect — stable, pre-generated per pedestal
    const cracks = ped.cracks || []
    ctx.strokeStyle = `rgba(180,0,0,${0.3 + pulse * 0.4})`
    ctx.lineWidth = 1.5
    for (const c of cracks) {
      // Main crack
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(c.angle) * c.len, cy + Math.sin(c.angle) * c.len)
      ctx.stroke()
      // Branch crack
      ctx.beginPath()
      const bx = cx + Math.cos(c.angle) * c.len * 0.6
      const by = cy + Math.sin(c.angle) * c.len * 0.6
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + Math.cos(c.branchAngle) * c.branchLen, by + Math.sin(c.branchAngle) * c.branchLen)
      ctx.stroke()
    }

    // Glowing center
    ctx.fillStyle = `rgba(139,0,0,${0.3 + pulse * 0.5})`
    ctx.shadowColor = C.fissureGlow
    ctx.shadowBlur = 15 * pulse
    ctx.beginPath()
    ctx.arc(cx, cy, 5 + pulse * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Warning symbol
    ctx.fillStyle = `rgba(255,50,50,${0.5 + pulse * 0.5})`
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚠', cx, cy)
  }

  // ── Portal Drawing ─────────────────────────────────
  _drawPortal(ctx, portal) {
    const cx = portal.col * TILE + TILE / 2
    const cy = portal.row * TILE + TILE / 2
    const pulse = Math.sin(this.timeElapsed * 2) * 0.3 + 0.7

    // Outer ring
    ctx.strokeStyle = `rgba(64,224,208,${0.2 + pulse * 0.3})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, 20 + pulse * 4, 0, Math.PI * 2)
    ctx.stroke()

    // Inner glow
    ctx.fillStyle = `rgba(64,224,208,${0.3 + pulse * 0.2})`
    ctx.shadowColor = C.portalGlow
    ctx.shadowBlur = 20 * pulse
    ctx.beginPath()
    ctx.arc(cx, cy, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Arrow pointing up (exit)
    ctx.fillStyle = C.portal
    ctx.beginPath()
    ctx.moveTo(cx, cy - 8)
    ctx.lineTo(cx - 6, cy + 2)
    ctx.lineTo(cx + 6, cy + 2)
    ctx.fill()
  }

  // ── Particles ──────────────────────────────────────
  _drawParticles(ctx) {
    // Steam
    for (const p of this.steamParticles) {
      ctx.fillStyle = `rgba(200,180,150,${p.life * 0.2})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Sparks
    for (const p of this.sparkParticles) {
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.life
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
    ctx.globalAlpha = 1
  }

  // ── Pause Overlay ──────────────────────────────────
  _drawPauseOverlay(ctx) {
    // Colored overlay tint
    ctx.fillStyle = 'rgba(20,40,80,0.15)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Top pause banner
    const pulse = Math.sin(this.timeElapsed * 3) * 0.3 + 0.7

    ctx.fillStyle = `rgba(60,100,180,${0.15 + pulse * 0.15})`
    ctx.fillRect(CANVAS_W / 2 - 120, 8, 240, 32)

    ctx.fillStyle = `rgba(100,180,255,${0.5 + pulse * 0.3})`
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⏸ 时间暂停  ⏸', CANVAS_W / 2, 24)

    // Hourglass / clock ornament
    const cx = CANVAS_W - 60
    const cy = CANVAS_H - 40
    ctx.strokeStyle = `rgba(100,180,255,${0.15 + pulse * 0.15})`
    ctx.lineWidth = 1
    const r = 14 + 2 * pulse
    // Outer ring
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    // Inner gear
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(this.gearAngle * 0.5)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      ctx.fillStyle = `rgba(100,180,255,${0.1 + pulse * 0.1})`
      ctx.fillRect(Math.cos(a) * 8 - 1, Math.sin(a) * 8 - 2, 2, 4)
    }
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(100,180,255,${0.2 + pulse * 0.15})`
    ctx.stroke()
    ctx.restore()

    // Controls hint during pause
    ctx.fillStyle = 'rgba(240,232,208,0.25)'
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText('空格 = 恢复时间', CANVAS_W - 12, CANVAS_H - 12)
  }

  // ── UI ─────────────────────────────────────────────
  _drawUI(ctx) {
    const barH = 36
    const padX = 10

    // Top bar background
    ctx.fillStyle = C.uiBg
    ctx.fillRect(0, 0, CANVAS_W, barH)

    // Level name
    ctx.fillStyle = C.textGold
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const levelNames = ['初识回溯', '齿轮迷局', '时光回廊']
    ctx.fillText(`第${this.levelIndex + 1}关 ${levelNames[this.levelIndex] || ''}`, padX, barH / 2)

    // Timer
    const timeStr = Math.ceil(this.timeRemaining)
    ctx.textAlign = 'center'
    ctx.fillStyle = timeStr <= 15 ? C.textRed : C.textWhite
    ctx.font = 'bold 18px monospace'
    ctx.fillText(`⏱ ${timeStr}s`, CANVAS_W / 2, barH / 2)

    // Box counter
    ctx.textAlign = 'right'
    ctx.fillStyle = this.placedCount >= this.totalBoxes ? C.textGreen : C.textGold
    ctx.font = 'bold 14px monospace'
    ctx.fillText(`齿轮箱 ${this.placedCount}/${this.totalBoxes}`, CANVAS_W - padX, barH / 2)

    // Time status
    ctx.textAlign = 'right'
    ctx.fillStyle = this.timePaused ? '#88aaff' : C.textWhite
    ctx.font = '12px monospace'
    ctx.fillText(this.timePaused ? '⏸ 暂停' : '▶ 流动', CANVAS_W - padX, barH + 16)

    // Controls hint (bottom)
    ctx.fillStyle = 'rgba(240,232,208,0.4)'
    ctx.font = '11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('方向键移动  |  空格暂停/恢复时间', CANVAS_W / 2, CANVAS_H - 8)
  }

  // ── Win Overlay ────────────────────────────────────
  _drawWinOverlay(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Title
    ctx.fillStyle = C.portal
    ctx.font = 'bold 42px monospace'
    ctx.fillText('✦ 传送门已激活 ✦', CANVAS_W / 2, CANVAS_H / 2 - 50)

    // Subtitle
    ctx.fillStyle = C.textGold
    ctx.font = '16px monospace'
    ctx.fillText('所有齿轮箱已归位！', CANVAS_W / 2, CANVAS_H / 2 + 10)

    // Next level button
    if (this.levelIndex < LEVELS.length - 1) {
      ctx.fillStyle = C.textWhite
      ctx.font = '14px monospace'
      ctx.fillText('按 Enter 进入下一关', CANVAS_W / 2, CANVAS_H / 2 + 50)
    } else {
      ctx.fillStyle = C.textGold
      ctx.font = 'bold 18px monospace'
      ctx.fillText('🎉 通关！恭喜完成所有关卡！', CANVAS_W / 2, CANVAS_H / 2 + 50)
      ctx.fillStyle = C.textWhite
      ctx.font = '14px monospace'
      ctx.fillText('按 R 重新开始', CANVAS_W / 2, CANVAS_H / 2 + 80)
    }

    // Staggered gate animation
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.gearAngle * 3
      const r = 50 + Math.sin(this.timeElapsed * 2 + i) * 5
      ctx.fillStyle = `rgba(64,224,208,${0.1 + Math.sin(a) * 0.1})`
      ctx.beginPath()
      ctx.arc(CANVAS_W / 2 + Math.cos(a) * r, CANVAS_H / 2 - 50 + Math.sin(a) * r, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Lose Overlay ───────────────────────────────────
  _drawLoseOverlay(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = C.textRed
    ctx.font = 'bold 36px monospace'
    ctx.fillText('✦ 时间崩塌 ✦', CANVAS_W / 2, CANVAS_H / 2 - 40)

    ctx.fillStyle = '#cc6666'
    ctx.font = '16px monospace'
    ctx.fillText(this.loseReason || '游戏结束', CANVAS_W / 2, CANVAS_H / 2 + 10)

    ctx.fillStyle = C.textWhite
    ctx.font = '14px monospace'
    ctx.fillText('按 R 或 Enter 重试本关', CANVAS_W / 2, CANVAS_H / 2 + 50)
  }
}

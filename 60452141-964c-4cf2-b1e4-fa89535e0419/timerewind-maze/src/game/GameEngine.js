import { parseLevel } from './LevelData.js'

const TILE_SIZE = 48
const COLORS = {
  bg: '#0d0705',
  floor: '#3e2723',
  floorAlt: '#4a3020',
  wall: '#2c1810',
  wallTop: '#5d4037',
  wallHighlight: '#6d4c41',
  brass: '#d4a574',
  brassDark: '#a67c52',
  brassLight: '#e8c9a0',
  crate: '#6d4c41',
  crateBand: '#4a3728',
  crateLight: '#8d6e63',
  pedestalGlow: '#4caf50',
  pedestalDark: '#1b5e20',
  wrongGlow: '#e74c3c',
  wrongDark: '#7b1a1a',
  pipe: '#5d4037',
  pipeHighlight: '#8d6e63',
  steam: 'rgba(200, 190, 180, 0.15)',
  gold: '#ffd54f',
  pauseOverlay: 'rgba(13, 7, 5, 0.6)',
  text: '#d4a574',
  timeFissure: 'rgba(156, 39, 176, 0.6)'
}

export class GameEngine {
  constructor(canvas, ctx, levelData, input, callbacks) {
    this.canvas = canvas
    this.ctx = ctx
    this.input = input
    this.callbacks = callbacks
    this.hudState = callbacks.hudState || {}
    this.tileSize = TILE_SIZE

    // Parse level
    const parsed = parseLevel(levelData)
    this.rows = parsed.rows
    this.cols = parsed.cols
    this.grid = levelData.grid
    this.walls = parsed.walls
    this.pedestals = parsed.pedestals
    this.wrongPedestals = parsed.wrongPedestals
    this.wrongPedestalValues = new Set()
    parsed.wrongPedestals.forEach(wp => this.wrongPedestalValues.add(`(${wp.x},${wp.y})`))

    // Player
    this.player = {
      x: parsed.player.x,
      y: parsed.player.y,
      animX: parsed.player.x,
      animY: parsed.player.y,
      animProgress: 0,
      animFrom: null,
      animTo: null,
      facing: 1,
      moving: false
    }

    // Crates
    this.crates = parsed.crates.map(c => ({
      ...c,
      animX: c.x,
      animY: c.y,
      rewindProgress: 0,
      idleTimer: Math.random() * 2
    }))

    // Generate gear decoration positions
    this.gearDecorations = this._generateGearDecorations()

    // Steam particles
    this.steamParticles = []
    this.steamSpawnTimer = 0

    // Sparkle particles
    this.sparkles = []

    // Time freeze particles (snow-like)
    this.freezeParticles = []

    // Game state
    this.running = false
    this.lastTime = 0
    this.timeLeft = parsed.timeLimit
    this.isPaused = false
    this.pauseCooldown = 0
    this.gameOver = false
    this.levelName = parsed.name

    // Flash effects
    this.wrongFlash = 0
    this.pauseFlash = 0

    // Win animation
    this.winAnim = 0
    this.won = false

    // Track which tiles have pipes
    this.pipeSegments = this._generatePipeSegments()

    // Init HUD
    this.hudState.timeLeft = this.timeLeft
    this.hudState.totalCrates = this.crates.length
    this.hudState.cratesSecured = 0
    this.hudState.levelName = this.levelName
    this.hudState.isPaused = false
  }

  _generateGearDecorations() {
    const gears = []
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 1 && Math.random() < 0.25) {
          gears.push({ x: c, y: r, size: 8 + Math.random() * 12, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1 })
        }
      }
    }
    return gears
  }

  _generatePipeSegments() {
    const pipes = []
    // Add horizontal pipes on some walls
    for (let r = 0; r < this.rows; r++) {
      let start = -1
      for (let c = 0; c <= this.cols; c++) {
        const isWall = c < this.cols && this.grid[r][c] === 1
        if (isWall && start === -1) start = c
        else if (!isWall && start !== -1) {
          if (c - start >= 3 && Math.random() < 0.5) {
            pipes.push({ x1: start, y1: r, x2: c - 1, y2: r, horizontal: true })
          }
          start = -1
        }
      }
    }
    // Vertical pipes
    for (let c = 0; c < this.cols; c++) {
      let start = -1
      for (let r = 0; r <= this.rows; r++) {
        const isWall = r < this.rows && this.grid[r][c] === 1
        if (isWall && start === -1) start = r
        else if (!isWall && start !== -1) {
          if (r - start >= 3 && Math.random() < 0.5) {
            pipes.push({ x1: c, y1: start, x2: c, y2: r - 1, horizontal: false })
          }
          start = -1
        }
      }
    }
    return pipes
  }

  isTileSolid(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return true
    return this.grid[row][col] === 1
  }

  isTileOccupied(col, row, excludeCrateId = -1) {
    if (this.player.x === col && this.player.y === row) return true
    for (const c of this.crates) {
      if (c.id !== excludeCrateId && c.x === col && c.y === row && !c.onCorrectPedestal) return true
    }
    return false
  }

  start() {
    this.running = true
    this.lastTime = performance.now()
    this._loop(this.lastTime)
  }

  stop() {
    this.running = false
  }

  _loop(timestamp) {
    if (!this.running) return
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05)
    this.lastTime = timestamp
    this._update(dt)
    this._render()
    this.input.clearFrame()
    requestAnimationFrame((t) => this._loop(t))
  }

  _update(dt) {
    if (this.gameOver) return

    if (!this.won) {
      // Pause toggle
      this.pauseCooldown -= dt
      if (this.pauseCooldown <= 0 && this.input.isKeyPressed(' ')) {
        this.isPaused = !this.isPaused
        this.pauseCooldown = 0.25
        this.hudState.isPaused = this.isPaused
        this.pauseFlash = 0.15
        // Spawn freeze particles on pause
        if (this.isPaused) {
          for (let i = 0; i < 20; i++) {
            this.freezeParticles.push({
              x: Math.random() * this.canvas.width,
              y: Math.random() * this.canvas.height,
              vx: (Math.random() - 0.5) * 0.3,
              vy: -0.2 - Math.random() * 0.5,
              life: 1.5 + Math.random() * 1,
              size: 1 + Math.random() * 2,
              alpha: 0.3 + Math.random() * 0.3
            })
          }
        }
      }

      if (!this.isPaused) {
        // Timer
        this.timeLeft -= dt
        this.hudState.timeLeft = Math.max(0, this.timeLeft)
        if (this.timeLeft <= 0) {
          this._gameOver('time')
          return
        }
      }

      // Update player
      this._updatePlayer(dt)

      // Update crates
      for (const crate of this.crates) {
        this._updateCrate(crate, dt)
      }

      // Check win
      this._checkWin()
    }

    // Update effects (always, for visual continuity)
    this._updateEffects(dt)
  }

  _updatePlayer(dt) {
    // Handle animation
    if (this.player.animProgress > 0) {
      this.player.animProgress -= dt * 8
      if (this.player.animProgress <= 0) {
        this.player.animProgress = 0
        this.player.x = this.player.animTo.x
        this.player.y = this.player.animTo.y
        this.player.animX = this.player.x
        this.player.animY = this.player.y
        this.player.moving = false
      } else {
        const t = 1 - this.player.animProgress
        this.player.animX = this.player.animFrom.x + (this.player.animTo.x - this.player.animFrom.x) * t
        this.player.animY = this.player.animFrom.y + (this.player.animTo.y - this.player.animFrom.y) * t
        this.player.moving = true
      }
      return
    }

    // Get input
    let dx = 0, dy = 0
    if (this.input.isKeyDown('ArrowUp')) dy = -1
    else if (this.input.isKeyDown('ArrowDown')) dy = 1
    else if (this.input.isKeyDown('ArrowLeft')) dx = -1
    else if (this.input.isKeyDown('ArrowRight')) dx = 1

    if (dx === 0 && dy === 0) return

    const nx = this.player.x + dx
    const ny = this.player.y + dy

    // Bounds check
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) return
    if (this.isTileSolid(nx, ny)) return

    // Check wrong pedestal
    if (this.wrongPedestalValues.has(`(${nx},${ny})`)) {
      this._gameOver('player_fissure')
      return
    }

    // Check crate push
    const crate = this.crates.find(c => c.x === nx && c.y === ny && !c.onCorrectPedestal)
    if (crate) {
      const pnx = nx + dx
      const pny = ny + dy
      if (this.isTileSolid(pnx, pny) || this.isTileOccupied(pnx, pny, crate.id)) return
      if (this.wrongPedestalValues.has(`(${pnx},${pny})`)) {
        this._gameOver('crate_fissure')
        return
      }

      // Push crate
      crate.x = pnx
      crate.y = pny
      crate.animX = pnx
      crate.animY = pny
      crate.history.unshift({ x: pnx, y: pny })
      if (crate.history.length > 10) crate.history.pop()
      crate.rewindTimer = 0
      crate.rewindProgress = 0

      // Push feedback particles
      for (let i = 0; i < 5; i++) {
        this.sparkles.push({
          x: pnx * TILE_SIZE + TILE_SIZE / 2,
          y: pny * TILE_SIZE + TILE_SIZE / 2,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60 - 20,
          life: 0.5 + Math.random() * 0.5,
          size: 2 + Math.random() * 3,
          color: COLORS.brass
        })
      }
    }

    // Start player animation
    this.player.animFrom = { x: this.player.x, y: this.player.y }
    this.player.animTo = { x: nx, y: ny }
    this.player.animProgress = 1
    this.player.facing = dx !== 0 ? dx : 0

    // Player step particles
    for (let i = 0; i < 2; i++) {
      this.steamParticles.push({
        x: nx * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * 10,
        y: ny * TILE_SIZE + TILE_SIZE - 4,
        vx: (Math.random() - 0.5) * 8,
        vy: -10 - Math.random() * 15,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 2 + Math.random() * 3,
        alpha: 0.2
      })
    }
  }

  _updateCrate(crate, dt) {
    if (crate.onCorrectPedestal) {
      crate.idleTimer += dt
      return
    }

    // Check if crate is on a pedestal
    const pedestal = this.pedestals.find(p => p.x === crate.x && p.y === crate.y && p.crateId === crate.id)
    if (pedestal && !pedestal.occupied) {
      // Check if any other crate blocks this
      const blocked = this.crates.some(c => c.id !== crate.id && c.x === crate.x && c.y === crate.y)
      if (!blocked) {
        crate.onCorrectPedestal = true
        pedestal.occupied = true
        pedestal.activated = true
        this._updateHUDCrates()
        // Win particles
        for (let i = 0; i < 15; i++) {
          this.sparkles.push({
            x: pedestal.x * TILE_SIZE + TILE_SIZE / 2,
            y: pedestal.y * TILE_SIZE + TILE_SIZE / 2,
            vx: (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 80 - 30,
            life: 0.8 + Math.random() * 0.8,
            size: 2 + Math.random() * 4,
            color: COLORS.gold
          })
        }
        return
      }
    }

    // Check if crate is on wrong pedestal
    if (this.wrongPedestalValues.has(`(${crate.x},${crate.y})`)) {
      this._gameOver('crate_fissure')
      return
    }

    // Rewind
    if (this.isPaused) return
    if (crate.history.length <= 1) {
      crate.idleTimer += dt * 2
      return
    }

    crate.rewindTimer += dt
    if (crate.rewindTimer >= crate.rewindInterval) {
      crate.rewindTimer -= crate.rewindInterval

      // Target = second entry in history (the position before current)
      const target = crate.history[1]
      if (!target) return

      // Move one tile toward target (orthogonal)
      const dx = Math.sign(target.x - crate.x)
      const dy = Math.sign(target.y - crate.y)

      // Can only move in one direction at a time
      let moveX = 0, moveY = 0
      if (dx !== 0) moveX = dx
      else if (dy !== 0) moveY = dy

      const newX = crate.x + moveX
      const newY = crate.y + moveY

      // Check if path is clear
      if (this.isTileSolid(newX, newY)) {
        // Path blocked by wall - crate stops rewinding
        crate.history.length = 1 // Reset history
        return
      }

      // Check if blocked by other crates (not on pedestal)
      const blocked = this.crates.some(c =>
        c.id !== crate.id && c.x === newX && c.y === newY && !c.onCorrectPedestal
      )
      if (blocked) return

      // Don't rewind onto locked crate's pedestal
      const otherPedestal = this.pedestals.find(p => p.x === newX && p.y === newY && p.occupied && p.crateId !== crate.id)
      if (otherPedestal) return

      crate.x = newX
      crate.y = newY
      crate.animX = newX
      crate.animY = newY

      // Remove the position we just left from history
      crate.history.shift()
    }
  }

  _checkWin() {
    const allSecured = this.crates.every(c => c.onCorrectPedestal)
    if (allSecured && !this.won) {
      this.won = true
      this.winAnim = 0

      // Win after a brief delay for animation
      setTimeout(() => {
        if (this.running && !this.gameOver) {
          this.callbacks.onWin()
        }
      }, 1500)
    }
  }

  _gameOver(reason) {
    if (this.gameOver) return
    this.gameOver = true
    this.hudState.isPaused = true

    if (reason === 'time') {
      this.callbacks.onLose('time')
    } else if (reason === 'player_fissure' || reason === 'crate_fissure') {
      this.wrongFlash = 1
      // Flash red briefly then callback
      setTimeout(() => {
        if (this.running) this.callbacks.onLose('fissure')
      }, 800)
    }
  }

  _updateHUDCrates() {
    this.hudState.cratesSecured = this.crates.filter(c => c.onCorrectPedestal).length
  }

  _updateEffects(dt) {
    // Steam
    this.steamSpawnTimer += dt
    if (this.steamSpawnTimer > 0.3) {
      this.steamSpawnTimer = 0
      for (const pipe of this.pipeSegments) {
        if (Math.random() < 0.3) {
          const x = ((pipe.x1 + pipe.x2) / 2) * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * 20
          const y = pipe.horizontal
            ? pipe.y1 * TILE_SIZE + TILE_SIZE / 2
            : Math.min(pipe.y1, pipe.y2) * TILE_SIZE + (Math.random() - 0.5) * 20
          this.steamParticles.push({
            x, y,
            vx: pipe.horizontal ? (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 4,
            vy: -8 - Math.random() * 12,
            life: 1 + Math.random() * 1.5,
            maxLife: 2.5,
            size: 3 + Math.random() * 6,
            alpha: 0.2 + Math.random() * 0.15
          })
        }
      }
    }

    // Update steam
    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const p = this.steamParticles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy -= 2 * dt
      p.life -= dt
      p.alpha = Math.max(0, p.life / p.maxLife) * 0.25
      p.size += dt * 2
      if (p.life <= 0) this.steamParticles.splice(i, 1)
    }

    // Sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const p = this.sparkles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 30 * dt
      p.life -= dt
      if (p.life <= 0) this.sparkles.splice(i, 1)
    }

    // Freeze particles
    for (let i = this.freezeParticles.length - 1; i >= 0; i--) {
      const p = this.freezeParticles[i]
      p.x += p.vx
      p.y += p.vy
      p.life -= dt
      if (p.life <= 0) this.freezeParticles.splice(i, 1)
    }

    // Flash decay
    if (this.wrongFlash > 0) this.wrongFlash -= dt * 2
    if (this.pauseFlash > 0) this.pauseFlash -= dt * 3

    // Win animation
    if (this.won) this.winAnim += dt
  }

  _render() {
    const ctx = this.ctx
    const w = this.canvas.width
    const h = this.canvas.height

    // Background
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, w, h)

    // Draw floor tiles
    this._drawFloor(ctx)

    // Draw pedestals
    this._drawPedestals(ctx)

    // Draw wrong pedestals
    this._drawWrongPedestals(ctx)

    // Draw walls
    this._drawWalls(ctx)

    // Draw pipes
    this._drawPipes(ctx)

    // Draw gear decorations
    this._drawGearDecorations(ctx)

    // Draw crate history trails
    this._drawCrateTrails(ctx)

    // Draw crates
    for (const crate of this.crates) {
      this._drawCrate(ctx, crate)
    }

    // Draw player
    this._drawPlayer(ctx)

    // Draw particles
    this._drawParticles(ctx)

    // Draw wrong pedestal flash overlay
    if (this.wrongFlash > 0) {
      ctx.fillStyle = `rgba(231, 76, 60, ${this.wrongFlash * 0.3})`
      ctx.fillRect(0, 0, w, h)
      // Vignette
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.5)
      gradient.addColorStop(0, 'rgba(231, 76, 60, 0)')
      gradient.addColorStop(1, `rgba(231, 76, 60, ${this.wrongFlash * 0.5})`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
    }

    // Draw pause overlay
    if (this.isPaused && !this.gameOver) {
      ctx.fillStyle = COLORS.pauseOverlay
      ctx.fillRect(0, 0, w, h)

      // Pause text
      ctx.save()
      ctx.fillStyle = COLORS.brass
      ctx.font = 'bold 24px "Courier New", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = COLORS.brass
      ctx.shadowBlur = 10
      ctx.fillText('⏸ 时间暂停', w / 2, 28)
      ctx.restore()

      // Draw freeze particles
      ctx.save()
      for (const p of this.freezeParticles) {
        ctx.fillStyle = `rgba(200, 220, 255, ${p.alpha * Math.max(0, p.life / 2.5)})`
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }
      ctx.restore()
    }

    // Draw pause flash
    if (this.pauseFlash > 0) {
      ctx.fillStyle = `rgba(212, 165, 116, ${this.pauseFlash * 0.5})`
      ctx.fillRect(0, 0, w, h)
    }

    // Win animation
    if (this.won) {
      const alpha = Math.min(1, this.winAnim * 2)
      const pulse = 0.5 + 0.5 * Math.sin(this.winAnim * 4)

      ctx.save()
      ctx.fillStyle = `rgba(212, 165, 116, ${alpha * 0.1 * pulse})`
      ctx.fillRect(0, 0, w, h)

      // Portal effect
      const cx = w / 2, cy = h / 2
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100 + this.winAnim * 50)
      gradient.addColorStop(0, `rgba(255, 213, 79, ${alpha * 0.4 * pulse})`)
      gradient.addColorStop(0.5, `rgba(76, 175, 80, ${alpha * 0.2})`)
      gradient.addColorStop(1, 'rgba(76, 175, 80, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }

  _drawFloor(ctx) {
    const ts = this.tileSize
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const val = this.grid[r][c]
        if (val === 1) continue

        const x = c * ts, y = r * ts
        ctx.fillStyle = (r + c) % 2 === 0 ? COLORS.floor : COLORS.floorAlt
        ctx.fillRect(x, y, ts, ts)

        // Subtle gear pattern on floors
        ctx.strokeStyle = 'rgba(255,255,255,0.02)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(x + ts / 2, y + ts / 2, ts * 0.2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  _drawWalls(ctx) {
    const ts = this.tileSize
    for (const wall of this.walls) {
      const x = wall.x * ts, y = wall.y * ts

      // Wall body
      ctx.fillStyle = COLORS.wall
      ctx.fillRect(x, y, ts, ts)

      // Wall top highlight
      ctx.fillStyle = COLORS.wallTop
      ctx.fillRect(x, y, ts, 3)

      // Brass trim on left side (if adjacent to non-wall)
      if (!this.isTileSolid(wall.x - 1, wall.y)) {
        ctx.fillStyle = COLORS.brassDark
        ctx.fillRect(x, y, 3, ts)
      }

      // Brass trim on top (if adjacent to non-wall above)
      if (!this.isTileSolid(wall.x, wall.y - 1)) {
        ctx.fillStyle = COLORS.brassDark
        ctx.fillRect(x, y, ts, 3)
      }

      // Brick lines
      ctx.strokeStyle = 'rgba(93, 64, 55, 0.3)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2)
    }
  }

  _drawPipes(ctx) {
    const ts = this.tileSize
    ctx.strokeStyle = COLORS.pipe
    ctx.lineWidth = 6

    for (const pipe of this.pipeSegments) {
      const x1 = pipe.x1 * ts + ts / 2
      const y1 = pipe.y1 * ts + ts / 2
      const x2 = pipe.x2 * ts + ts / 2
      const y2 = pipe.y2 * ts + ts / 2

      // Pipe shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(x1 + 2, y1 + 2)
      ctx.lineTo(x2 + 2, y2 + 2)
      ctx.stroke()

      // Pipe body
      ctx.strokeStyle = COLORS.pipe
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // Pipe highlight
      ctx.strokeStyle = COLORS.pipeHighlight
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x1, y1 - 1)
      ctx.lineTo(x2, y2 - 1)
      ctx.stroke()

      // Connector joints
      for (const px of [pipe.x1, pipe.x2]) {
        for (const py of [pipe.y1, pipe.y2]) {
          ctx.fillStyle = COLORS.brassDark
          ctx.beginPath()
          ctx.arc(px * ts + ts / 2, py * ts + ts / 2, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = COLORS.brass
          ctx.beginPath()
          ctx.arc(px * ts + ts / 2, py * ts + ts / 2, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  _drawGearDecorations(ctx) {
    const ts = this.tileSize
    const time = performance.now() / 1000

    for (const gear of this.gearDecorations) {
      const x = gear.x * ts + ts / 2
      const y = gear.y * ts + ts / 2
      const size = gear.size
      const angle = time * gear.speed * 0.5 + gear.phase

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)

      // Gear teeth
      ctx.fillStyle = COLORS.brassDark
      ctx.strokeStyle = COLORS.brass
      ctx.lineWidth = 1.5

      const teeth = 8
      const innerR = size * 0.5
      const outerR = size * 0.7
      const toothH = size * 0.25

      ctx.beginPath()
      for (let i = 0; i < teeth; i++) {
        const a1 = (i / teeth) * Math.PI * 2
        const a2 = ((i + 0.5) / teeth) * Math.PI * 2
        const a3 = ((i + 1) / teeth) * Math.PI * 2

        ctx.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR)
        ctx.lineTo(Math.cos(a1) * (outerR + toothH), Math.sin(a1) * (outerR + toothH))
        ctx.lineTo(Math.cos(a2) * (outerR + toothH), Math.sin(a2) * (outerR + toothH))
        ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Inner circle
      ctx.fillStyle = COLORS.wall
      ctx.beginPath()
      ctx.arc(0, 0, innerR * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = COLORS.brass
      ctx.lineWidth = 1
      ctx.stroke()

      // Center dot
      ctx.fillStyle = COLORS.brass
      ctx.beginPath()
      ctx.arc(0, 0, 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }
  }

  _drawPedestals(ctx) {
    const ts = this.tileSize
    const time = performance.now() / 1000

    for (const ped of this.pedestals) {
      const x = ped.x * ts, y = ped.y * ts
      const cx = x + ts / 2, cy = y + ts / 2

      // Base glow
      const glowAlpha = ped.activated ? 0.4 + 0.15 * Math.sin(time * 3) : 0.1
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 0.8)
      gradient.addColorStop(0, `rgba(76, 175, 80, ${glowAlpha})`)
      gradient.addColorStop(1, 'rgba(76, 175, 80, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(x - ts / 2, y - ts / 2, ts * 2, ts * 2)

      // Pedestal base (gear shape)
      ctx.fillStyle = ped.activated ? COLORS.pedestalGlow : COLORS.brassDark
      ctx.strokeStyle = ped.activated ? COLORS.gold : COLORS.brass
      ctx.lineWidth = 2

      // Draw pedestal as a gear-like circle
      ctx.beginPath()
      ctx.arc(cx, cy, ts * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Inner ring
      ctx.fillStyle = ped.activated ? '#2e7d32' : COLORS.floor
      ctx.beginPath()
      ctx.arc(cx, cy, ts * 0.18, 0, Math.PI * 2)
      ctx.fill()

      // Energy symbol
      if (ped.activated) {
        ctx.fillStyle = COLORS.gold
        ctx.font = '16px "Courier New", monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('⚡', cx, cy + 1)
      }

      // Small gear teeth ring
      ctx.strokeStyle = ped.activated ? COLORS.gold : COLORS.brassDark
      ctx.lineWidth = 1.5
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + time * 0.5
        const tx = cx + Math.cos(a) * ts * 0.35
        const ty = cy + Math.sin(a) * ts * 0.35
        ctx.beginPath()
        ctx.arc(tx, ty, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  _drawWrongPedestals(ctx) {
    const ts = this.tileSize
    const time = performance.now() / 1000

    for (const wp of this.wrongPedestals) {
      const x = wp.x * ts, y = wp.y * ts
      const cx = x + ts / 2, cy = y + ts / 2

      // Time裂缝 glow
      const pulse = 0.6 + 0.4 * Math.sin(time * 2.5)
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts)
      gradient.addColorStop(0, `rgba(156, 39, 176, ${pulse * 0.4})`)
      gradient.addColorStop(0.5, `rgba(231, 76, 60, ${pulse * 0.2})`)
      gradient.addColorStop(1, 'rgba(156, 39, 176, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(x - ts, y - ts, ts * 3, ts * 3)

      // Cracked circle
      ctx.strokeStyle = `rgba(231, 76, 60, ${pulse})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, ts * 0.35, 0, Math.PI * 2)
      ctx.stroke()

      // Lightning bolts
      ctx.strokeStyle = `rgba(200, 120, 255, ${pulse * 0.7})`
      ctx.lineWidth = 1.5
      for (let i = 0; i < 3; i++) {
        const startAngle = (i / 3) * Math.PI * 2 + time * 0.5
        const r1 = ts * 0.2
        const r2 = ts * 0.4
        const ax = cx + Math.cos(startAngle) * r1
        const ay = cy + Math.sin(startAngle) * r1
        const bx = cx + Math.cos(startAngle + 0.3) * r2
        const by = cy + Math.sin(startAngle + 0.3) * r2
        const mx = (ax + bx) / 2 + (Math.random() - 0.5) * 6

        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(mx, (ay + by) / 2)
        ctx.lineTo(bx, by)
        ctx.stroke()
      }

      // Center fissure
      ctx.fillStyle = `rgba(180, 60, 60, ${pulse * 0.8})`
      ctx.beginPath()
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  _drawCrateTrails(ctx) {
    const ts = this.tileSize
    for (const crate of this.crates) {
      if (crate.onCorrectPedestal || crate.history.length <= 1) continue

      // Draw ghost trail at each history position
      for (let i = 1; i < crate.history.length; i++) {
        const pos = crate.history[i]
        const alpha = 0.15 * (1 - i / crate.history.length)
        const x = pos.x * ts, y = pos.y * ts

        ctx.fillStyle = `rgba(109, 76, 65, ${alpha})`
        ctx.fillRect(x + 3, y + 3, ts - 6, ts - 6)

        // Ghost gear symbol
        ctx.strokeStyle = `rgba(212, 165, 116, ${alpha * 0.5})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(x + ts / 2, y + ts / 2, ts * 0.15, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw trail line connecting history positions
      if (crate.history.length > 1) {
        ctx.strokeStyle = `rgba(212, 165, 116, 0.1)`
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        for (let i = crate.history.length - 1; i >= 0; i--) {
          const pos = crate.history[i]
          const px = pos.x * ts + ts / 2
          const py = pos.y * ts + ts / 2
          if (i === crate.history.length - 1) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }

  _drawCrate(ctx, crate) {
    const ts = this.tileSize
    const x = crate.animX * ts, y = crate.animY * ts
    const time = performance.now() / 1000

    ctx.save()

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(x + 4, y + 4, ts - 8, ts - 8)

    if (crate.onCorrectPedestal) {
      // Locked crate - glowing effect
      const pulse = 0.8 + 0.2 * Math.sin(time * 2 + crate.id)
      ctx.fillStyle = COLORS.pedestalGlow
      ctx.globalAlpha = 0.2 * pulse
      ctx.fillRect(x, y, ts, ts)
      ctx.globalAlpha = 1
    }

    // Crate body
    ctx.fillStyle = crate.onCorrectPedestal ? COLORS.crateLight : COLORS.crate
    ctx.fillRect(x + 3, y + 3, ts - 6, ts - 6)

    // Metal bands
    ctx.fillStyle = crate.onCorrectPedestal ? COLORS.brass : COLORS.crateBand
    ctx.fillRect(x + 3, y + 3 + ts * 0.25, ts - 6, 3)
    ctx.fillRect(x + 3, y + 3 + ts * 0.55, ts - 6, 3)

    // Corner brackets
    ctx.fillStyle = COLORS.brassDark
    ctx.fillRect(x + 4, y + 4, 4, 4)
    ctx.fillRect(x + ts - 8, y + 4, 4, 4)
    ctx.fillRect(x + 4, y + ts - 8, 4, 4)
    ctx.fillRect(x + ts - 8, y + ts - 8, 4, 4)

    // Gear symbol on crate
    ctx.strokeStyle = COLORS.brass
    ctx.lineWidth = 1.5
    const cx = x + ts / 2, cy = y + ts / 2

    if (crate.onCorrectPedestal) {
      // Green checkmark for locked crate
      ctx.fillStyle = COLORS.pedestalGlow
      ctx.font = 'bold 18px "Courier New", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('✓', cx, cy + 1)
    } else {
      // Gear symbol
      const angle = time * 0.5
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)

      // Outer ring
      ctx.beginPath()
      ctx.arc(0, 0, ts * 0.12, 0, Math.PI * 2)
      ctx.stroke()

      // Inner spokes
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4)
        ctx.lineTo(Math.cos(a) * ts * 0.12, Math.sin(a) * ts * 0.12)
        ctx.stroke()
      }

      // Center dot
      ctx.fillStyle = COLORS.brass
      ctx.beginPath()
      ctx.arc(0, 0, 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()

      // Crate ID badge
      ctx.fillStyle = COLORS.brassDark
      ctx.font = 'bold 9px "Courier New", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('⚙' + (crate.id + 1), cx, y + ts - 7)
    }

    // Rewind indicator (pulsing border when rewinding actively)
    if (!crate.onCorrectPedestal && crate.history.length > 1 && !this.isPaused) {
      ctx.strokeStyle = `rgba(212, 165, 116, ${0.2 + 0.15 * Math.sin(time * 3)})`
      ctx.lineWidth = 1
      ctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4)
    }

    ctx.restore()
  }

  _drawPlayer(ctx) {
    const ts = this.tileSize
    const p = this.player
    const x = p.animX * ts, y = p.animY * ts
    const cx = x + ts / 2, cy = y + ts / 2
    const time = performance.now() / 1000

    ctx.save()

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(cx, y + ts - 4, 14, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body (long coat)
    ctx.fillStyle = '#5d4037'
    ctx.beginPath()
    ctx.moveTo(cx - 10, cy + 4)
    ctx.lineTo(cx + 10, cy + 4)
    ctx.lineTo(cx + 11, cy + 20)
    ctx.lineTo(cx - 11, cy + 20)
    ctx.closePath()
    ctx.fill()

    // Coat details
    ctx.fillStyle = '#4a3020'
    ctx.fillRect(cx - 1, cy + 6, 2, 14)

    // Belt
    ctx.fillStyle = COLORS.brassDark
    ctx.fillRect(cx - 10, cy + 10, 20, 2)
    ctx.fillStyle = COLORS.brass
    ctx.fillRect(cx - 2, cy + 9, 4, 4) // Buckle

    // Shoulders
    ctx.fillStyle = COLORS.brassDark
    ctx.fillRect(cx - 12, cy + 2, 4, 6)
    ctx.fillRect(cx + 8, cy + 2, 4, 6)

    // Head
    ctx.fillStyle = '#d4a574'
    ctx.beginPath()
    ctx.arc(cx, cy - 6, 8, 0, Math.PI * 2)
    ctx.fill()

    // Hat (top hat)
    ctx.fillStyle = '#2c1810'
    ctx.fillRect(cx - 8, cy - 22, 16, 16)
    ctx.fillRect(cx - 12, cy - 8, 24, 3)

    // Hat band
    ctx.fillStyle = COLORS.brass
    ctx.fillRect(cx - 8, cy - 10, 16, 2)

    // Hat buckle
    ctx.fillStyle = COLORS.gold
    ctx.fillRect(cx - 2, cy - 11, 4, 3)

    // Goggles
    ctx.fillStyle = COLORS.brass
    ctx.fillRect(cx - 7, cy - 9, 6, 4)
    ctx.fillRect(cx + 1, cy - 9, 6, 4)
    ctx.fillStyle = '#87CEEB'
    ctx.fillRect(cx - 6, cy - 8, 4, 2)
    ctx.fillRect(cx + 2, cy - 8, 4, 2)

    // Eyes
    ctx.fillStyle = '#333'
    ctx.fillRect(cx - 4, cy - 7, 2, 2)
    ctx.fillRect(cx + 2, cy - 7, 2, 2)

    // Legs
    ctx.fillStyle = '#3e2723'
    ctx.fillRect(cx - 8, cy + 20, 6, 5) // Left leg
    ctx.fillRect(cx + 2, cy + 20, 6, 5)  // Right leg

    // Boots
    ctx.fillStyle = '#2c1810'
    ctx.fillRect(cx - 9, cy + 23, 8, 3) // Left boot
    ctx.fillRect(cx + 1, cy + 23, 8, 3) // Right boot

    if (p.moving) {
      // Movement animation - slightly bob
      const bob = Math.sin(time * 16) * 1
      ctx.fillStyle = COLORS.brass
      ctx.font = 'bold 14px "Courier New", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('⚙', cx + p.facing * 16, cy + 10 + bob)
    }

    ctx.restore()
  }

  _drawParticles(ctx) {
    // Steam
    for (const p of this.steamParticles) {
      ctx.fillStyle = `rgba(200, 190, 180, ${p.alpha})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Sparkles
    for (const p of this.sparkles) {
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
    ctx.globalAlpha = 1
  }
}

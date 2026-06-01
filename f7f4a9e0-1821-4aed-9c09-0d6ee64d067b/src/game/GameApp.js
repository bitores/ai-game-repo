/**
 * Crystal Tower Defense — Canvas 2D Game Engine
 *
 * Grid-based tower defense using native HTML5 Canvas API.
 * Architecture mirrors LayaAir patterns (Sprite, Graphics, Stage).
 */

import {
  GS, GAME_WIDTH, GAME_HEIGHT,
  GRID_COLS, GRID_ROWS, CELL_SIZE,
  GRID_OFFSET_X, GRID_OFFSET_Y,
  gridToPixel, isPathCell, PATH_WAYPOINTS,
  CORE_GRID_ROW, CORE_GRID_COL,
  TOWER_TYPES,
  FUSION_COST,
  STARTING_GOLD, STARTING_LIVES
} from './constants.js'
import { Tower } from './Tower.js'
import { WaveManager } from './WaveManager.js'

// ─── Lightweight Canvas Engine ───

class CanvasEngine {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    canvas.width = GAME_WIDTH
    canvas.height = GAME_HEIGHT

    this.displayObjects = []
    this.frameCount = 0
    this._running = false
    this._lastTime = 0
    this._animId = null
    this._timers = []
  }

  start(updateFn) {
    this._running = true
    this._lastTime = performance.now()
    this._updateFn = updateFn
    const loop = (now) => {
      if (!this._running) return
      const dt = (now - this._lastTime) / 1000
      this._lastTime = now
      this.frameCount++
      if (this._updateFn) this._updateFn(dt)
      this._animId = requestAnimationFrame(loop)
    }
    this._animId = requestAnimationFrame(loop)
  }

  stop() {
    this._running = false
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
  }

  clear(color) {
    this.ctx.fillStyle = color || '#050520'
    this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  }

  get ctx2d() { return this.ctx }
}

// ─── Color Helpers ───

function hexToRgba(hex, alpha = 1) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Main Game App ───

export class GameApp {
  constructor(container, stateCallback) {
    this.container = container
    this.stateCallback = stateCallback

    // Game state
    this.state = GS.MENU
    this.gold = STARTING_GOLD
    this.lives = STARTING_LIVES
    this.maxLives = STARTING_LIVES
    this.score = 0
    this.killCount = 0

    // Game objects
    this.towers = []
    this.enemies = []
    this.projectiles = []
    this.particles = []

    // Selection
    this.selectedTowerType = 'BASIC'
    this.selectedTower = null

    // Wave management
    this.waveManager = new WaveManager()
    this.waveActive = false

    // Mouse
    this.mouseGridPos = null
    this.mouseX = 0
    this.mouseY = 0

    // Keyboard
    this._onKeyDown = (e) => {
      if (e.key === '1') this.selectedTowerType = 'BASIC'
      if (e.key === '2') this.selectedTowerType = 'ICE'
      if (e.key === '3') this.selectedTowerType = 'FIRE'
      if (e.key === '4') this.selectedTowerType = 'LIGHTNING'
      if (e.key === ' ') {
        e.preventDefault()
        if (this.state === GS.PLAYING && !this.waveActive) {
          this._startNextWave()
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        this._tryFusion()
      }
    }

    this._initCanvas()
  }

  _initCanvas() {
    // Create canvas element
    const canvas = document.createElement('canvas')
    canvas.style.display = 'block'
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    // Create engine
    this.engine = new CanvasEngine(canvas)
    this.ctx = this.engine.ctx

    // Append to container
    if (this.container) {
      this.container.appendChild(canvas)
    }

    // Mouse events
    canvas.addEventListener('mousedown', (e) => this._onMouseDown(e))
    canvas.addEventListener('mousemove', (e) => this._onMouseMove(e))

    // Keyboard
    window.addEventListener('keydown', this._onKeyDown)

    // Start engine
    this.engine.start((dt) => this._update(dt))

    this._emitState()
  }

  // ─── Public methods ───

  startGame() {
    this.state = GS.PLAYING
    this.gold = STARTING_GOLD
    this.lives = STARTING_LIVES
    this.score = 0
    this.killCount = 0
    this.towers = []
    this.enemies = []
    this.projectiles = []
    this.particles = []
    this.selectedTower = null
    this.selectedTowerType = 'BASIC'
    this.waveManager = new WaveManager()
    this.waveActive = false
    this._emitState()
  }

  destroy() {
    if (this.engine) {
      this.engine.stop()
    }
    window.removeEventListener('keydown', this._onKeyDown)
  }

  selectTowerType(typeKey) {
    this.selectedTowerType = typeKey
    this.selectedTower = null
  }

  tryPlaceTower(row, col) {
    if (this.state !== GS.PLAYING) return false
    if (this._isOccupied(row, col)) return false
    if (isPathCell(row, col)) return false
    if (row === CORE_GRID_ROW && col === CORE_GRID_COL) return false

    const type = TOWER_TYPES[this.selectedTowerType]
    if (!type) return false
    if (this.gold < type.cost) return false

    this.gold -= type.cost
    const tower = new Tower(row, col, this.selectedTowerType, 1)
    this.towers.push(tower)
    this.selectedTower = tower
    this._emitState()
    return true
  }

  tryUpgradeTower() {
    if (this.state !== GS.PLAYING) return false
    if (!this.selectedTower) return false
    const cost = this.selectedTower.getUpgradeCost()
    if (this.gold < cost) return false
    if (!this.selectedTower.canUpgrade()) return false

    this.gold -= cost
    this.selectedTower.upgrade()
    this._emitState()
    return true
  }

  tryFusion() {
    return this._tryFusion()
  }

  startNextWave() {
    if (this.state === GS.PLAYING && !this.waveActive) {
      this._startNextWave()
    }
  }

  getState() {
    return {
      gameState: this.state,
      gold: this.gold,
      lives: this.lives,
      maxLives: this.maxLives,
      score: this.score,
      wave: this.waveManager.getWaveNumber(),
      totalWaves: this.waveManager.getTotalWaves(),
      waveActive: this.waveActive,
      selectedTowerType: this.selectedTowerType,
      selectedTower: this.selectedTower ? {
        row: this.selectedTower.row,
        col: this.selectedTower.col,
        typeKey: this.selectedTower.typeKey,
        level: this.selectedTower.level,
        name: this.selectedTower.getDisplayName(),
        canUpgrade: this.selectedTower.canUpgrade(),
        upgradeCost: this.selectedTower.canUpgrade() ? this.selectedTower.getUpgradeCost() : null,
        range: this.selectedTower.range,
        damage: this.selectedTower.damage
      } : null,
      remaining: this.waveActive ? this.waveManager.getRemainingEnemies() + this.enemies.length : 0,
      killCount: this.killCount
    }
  }

  // ─── Internal ───

  _startNextWave() {
    if (this.waveActive) return
    if (this.waveManager.isAllWavesDone()) return
    this.waveManager.startNextWave()
    this.waveActive = true
    this._emitState()
  }

  _tryFusion() {
    if (this.state !== GS.PLAYING) return false
    if (!this.selectedTower) return false
    if (this.selectedTower.level >= 3) return false

    const sel = this.selectedTower
    const adjacent = this.towers.filter(t =>
      t !== sel &&
      t.typeKey === sel.typeKey &&
      t.level === sel.level &&
      Math.abs(t.row - sel.row) + Math.abs(t.col - sel.col) === 1
    )
    if (adjacent.length === 0) return false
    if (this.gold < FUSION_COST) return false

    this.gold -= FUSION_COST
    const donor = adjacent[0]
    const idx = this.towers.indexOf(donor)
    if (idx !== -1) this.towers.splice(idx, 1)

    if (!sel.canUpgrade()) {
      this.gold += FUSION_COST
      this.towers.push(donor)
      return false
    }
    sel.upgrade()
    this._addParticleEffect(sel.x, sel.y, 0xffdd00, 15)
    this._emitState()
    return true
  }

  _isOccupied(row, col) {
    return this.towers.some(t => t.row === row && t.col === col)
  }

  // ─── Mouse ───

  _getGridPos(px, py) {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height
    const cx = (px - rect.left) * scaleX
    const cy = (py - rect.top) * scaleY
    const col = Math.floor((cx - GRID_OFFSET_X) / CELL_SIZE)
    const row = Math.floor((cy - GRID_OFFSET_Y) / CELL_SIZE)
    return { row, col, cx, cy }
  }

  _onMouseDown(e) {
    if (this.state === GS.MENU) {
      this.startGame()
      return
    }
    if (this.state !== GS.PLAYING) return

    const { row, col, cx, cy } = this._getGridPos(e.clientX, e.clientY)

    // Click on existing tower
    const clickedTower = this.towers.find(t => t.row === row && t.col === col)
    if (clickedTower) {
      this.selectedTower = clickedTower
      this._emitState()
      return
    }

    // Try to place tower
    if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      if (this.tryPlaceTower(row, col)) {
        const px = GRID_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2
        const py = GRID_OFFSET_Y + row * CELL_SIZE + CELL_SIZE / 2
        this._addParticleEffect(px, py, 0x00ffff, 8)
      }
    }
  }

  _onMouseMove(e) {
    const { row, col } = this._getGridPos(e.clientX, e.clientY)
    this.mouseX = e.clientX
    this.mouseY = e.clientY
    if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      this.mouseGridPos = { row, col }
    } else {
      this.mouseGridPos = null
    }
  }

  // ─── Game Loop ───

  _update(dt) {
    const ctx = this.ctx

    // Menu state
    if (this.state === GS.MENU) {
      this._renderMenu(ctx)
      return
    }

    if (this.state !== GS.PLAYING) {
      this._renderBackground(ctx)
      return
    }

    // Auto-start first wave
    if (!this.waveActive && !this.waveManager.isAllWavesDone() && this.waveManager.getWaveNumber() === 0) {
      this._startNextWave()
    }

    // Update wave
    if (this.waveActive) {
      const newEnemies = this.waveManager.update()
      this.enemies.push(...newEnemies)

      if (this.waveManager.isWaveComplete(this.enemies)) {
        this.waveManager.finishWave()
        this.waveActive = false
        this.gold += 30 + this.waveManager.getWaveNumber() * 10
        this.score += 100

        if (this.waveManager.isAllWavesDone()) {
          this.state = GS.COMPLETE
          this._emitState()
          return
        }
        this._emitState()
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      enemy.update()
      if (enemy.reachedEnd) {
        this.lives--
        this._addParticleEffect(enemy.x, enemy.y, 0xff0000, 10)
        if (this.lives <= 0) {
          this.lives = 0
          this.state = GS.GAMEOVER
          this._emitState()
          return
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.alive)

    // Update towers -> projectiles
    for (const tower of this.towers) {
      const proj = tower.update(this.enemies)
      if (proj) this.projectiles.push(proj)
    }

    // Update projectiles
    this._updateProjectiles()

    // Update particles
    this._updateParticles()

    // Render
    this._renderFrame(ctx)
  }

  _updateProjectiles() {
    const toRemove = []
    for (let i = 0; i < this.projectiles.length; i++) {
      const proj = this.projectiles[i]
      if (!proj.target || !proj.target.alive) {
        toRemove.push(i); continue
      }
      const dx = proj.target.x - proj.x
      const dy = proj.target.y - proj.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 10) {
        this._applyProjectileDamage(proj)
        toRemove.push(i)
      } else {
        const step = proj.speed * (1 / 60)
        proj.x += (dx / dist) * step
        proj.y += (dy / dist) * step
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.projectiles.splice(toRemove[i], 1)
    }
  }

  _applyProjectileDamage(proj) {
    const target = proj.target
    if (!target || !target.alive) return

    target.takeDamage(proj.damage)
    this._addParticleEffect(proj.x, proj.y, proj.color, 5)

    if (proj.slowAmount > 0 && proj.slowDuration > 0) {
      target.setSpeedMultiplier(proj.slowAmount, proj.slowDuration)
    }

    // Splash
    if (proj.splashRadius > 0) {
      for (const enemy of this.enemies) {
        if (enemy === target || !enemy.alive) continue
        const dx = enemy.x - proj.x
        const dy = enemy.y - proj.y
        if (Math.sqrt(dx * dx + dy * dy) <= proj.splashRadius) {
          enemy.takeDamage(Math.floor(proj.damage * 0.5))
          this._addParticleEffect(enemy.x, enemy.y, 0xff6600, 4)
        }
      }
      this._addParticleEffect(proj.x, proj.y, 0xff4400, 12)
    }

    // Chain
    if (proj.chainCount > 0) {
      let chainTarget = target
      for (let c = 0; c < proj.chainCount; c++) {
        let nearest = null, nearDist = Infinity
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy === chainTarget) continue
          const d = Math.sqrt((enemy.x - chainTarget.x) ** 2 + (enemy.y - chainTarget.y) ** 2)
          if (d < nearDist && d < 150) { nearDist = d; nearest = enemy }
        }
        if (nearest) {
          nearest.takeDamage(Math.floor(proj.damage * 0.6))
          this._addParticleEffect(nearest.x, nearest.y, 0xffff00, 6)
          chainTarget = nearest
        }
      }
    }

    if (!target.alive) {
      this.gold += target.reward
      this.score += target.reward * 10
      this.killCount++
      this._addParticleEffect(target.x, target.y, target.color, 10)
    }
  }

  _addParticleEffect(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 20 + Math.random() * 40
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        life: 15 + Math.random() * 20,
        maxLife: 15 + Math.random() * 20
      })
    }
  }

  _updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * (1 / 60)
      p.y += p.vy * (1 / 60)
      p.vx *= 0.95
      p.vy *= 0.95
      p.life--
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  // ─── Rendering ───

  _renderBackground(ctx) {
    ctx.fillStyle = '#0a0a2e'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  }

  _renderFrame(ctx) {
    // Background
    ctx.fillStyle = '#0a0a2e'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Grid
    this._drawGrid(ctx)

    // Path
    this._drawPath(ctx)

    // Core
    this._drawCore(ctx)

    // Towers
    this._drawTowers(ctx)

    // Selection highlight
    this._drawSelection(ctx)

    // Enemies
    this._drawEnemies(ctx)

    // Projectiles
    this._drawProjectiles(ctx)

    // Particles
    this._drawParticles(ctx)
  }

  _drawGrid(ctx) {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = GRID_OFFSET_X + c * CELL_SIZE
        const y = GRID_OFFSET_Y + r * CELL_SIZE
        const isPath = isPathCell(r, c)
        ctx.fillStyle = isPath ? '#1a1a3e' : '#0f0f30'
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        ctx.strokeStyle = '#1a1a40'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE)
      }
    }
  }

  _drawPath(ctx) {
    for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
      const from = PATH_WAYPOINTS[i]
      const to = PATH_WAYPOINTS[i + 1]
      let x1 = gridToPixel(from.row, from.col).x
      let y1 = gridToPixel(from.row, from.col).y
      let x2 = gridToPixel(to.row, to.col).x
      let y2 = gridToPixel(to.row, to.col).y
      if (from.col < 0) x1 = 0
      if (to.col < 0) x2 = 0

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = '#2a2a5e'
      ctx.lineWidth = 4
      ctx.stroke()

      // Direction dot
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      ctx.beginPath()
      ctx.arc(mx, my, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#4444aa'
      ctx.fill()
    }

    // Entry arrow
    const entry = PATH_WAYPOINTS[0]
    const ep = gridToPixel(entry.row, entry.col)
    ctx.beginPath()
    ctx.moveTo(0, ep.y)
    ctx.lineTo(ep.x, ep.y)
    ctx.strokeStyle = '#4444aa'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  _drawCore(ctx) {
    const pos = gridToPixel(CORE_GRID_ROW, CORE_GRID_COL)

    // Glow
    const grad = ctx.createRadialGradient(pos.x, pos.y, 5, pos.x, pos.y, 28)
    grad.addColorStop(0, 'rgba(255, 0, 255, 0.3)')
    grad.addColorStop(1, 'rgba(255, 0, 255, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2)
    ctx.fill()

    // Diamond
    const s = 16
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - s)
    ctx.lineTo(pos.x + s, pos.y)
    ctx.lineTo(pos.x, pos.y + s)
    ctx.lineTo(pos.x - s, pos.y)
    ctx.closePath()
    ctx.fillStyle = '#ff44ff'
    ctx.fill()
    ctx.strokeStyle = '#ff00ff'
    ctx.lineWidth = 2
    ctx.stroke()

    // Label
    ctx.fillStyle = '#ff88ff'
    ctx.font = '12px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('核心', pos.x, pos.y + s + 14)
  }

  _drawTowers(ctx) {
    for (const tower of this.towers) {
      const x = tower.x, y = tower.y
      const config = TOWER_TYPES[tower.typeKey]
      const baseColor = config.color
      const size = 12 + tower.level * 3

      // Glow
      ctx.beginPath()
      ctx.arc(x, y, size + 4, 0, Math.PI * 2)
      ctx.fillStyle = hexToRgba(baseColor, 0.15)
      ctx.fill()

      // Crystal shape
      const points = this._getCrystalPoints(x, y, size, tower.level)
      ctx.beginPath()
      ctx.moveTo(points[0], points[1])
      for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i], points[i + 1])
      }
      ctx.closePath()
      ctx.fillStyle = hexToRgba(baseColor, 0.7)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.stroke()

      // Level dots
      for (let lv = 0; lv < tower.level; lv++) {
        ctx.beginPath()
        ctx.arc(x - 6 + lv * 6, y - size - 6, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      }

      // Symbol
      const symbols = { 'BASIC': '◆', 'ICE': '❄', 'FIRE': '🔥', 'LIGHTNING': '⚡' }
      ctx.fillStyle = '#ffffff'
      ctx.font = '16px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(symbols[tower.typeKey] || '◆', x, y)
    }
  }

  _getCrystalPoints(cx, cy, size, level) {
    const count = 6 + level
    const pts = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2
      const r = size * (i % 2 === 0 ? 1 : 0.6 + level * 0.1)
      pts.push(cx + Math.cos(angle) * r)
      pts.push(cy + Math.sin(angle) * r)
    }
    return pts
  }

  _drawSelection(ctx) {
    if (this.state !== GS.PLAYING) return

    // Hover highlight
    if (this.mouseGridPos) {
      const { row, col } = this.mouseGridPos
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        const x = GRID_OFFSET_X + col * CELL_SIZE
        const y = GRID_OFFSET_Y + row * CELL_SIZE
        const isOccupied = this._isOccupied(row, col)
        const isPath = isPathCell(row, col)
        const isValid = !isOccupied && !isPath && !(row === CORE_GRID_ROW && col === CORE_GRID_COL)

        ctx.fillStyle = isValid ? 'rgba(0, 255, 255, 0.12)' : 'rgba(255, 0, 0, 0.08)'
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        ctx.strokeStyle = isValid ? '#00ffff' : '#ff0000'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE)
      }
    }

    // Selected tower
    if (this.selectedTower) {
      const x = GRID_OFFSET_X + this.selectedTower.col * CELL_SIZE
      const y = GRID_OFFSET_Y + this.selectedTower.row * CELL_SIZE
      ctx.strokeStyle = '#00ffff'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE)

      // Range circle
      ctx.beginPath()
      ctx.arc(this.selectedTower.x, this.selectedTower.y, this.selectedTower.range, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 255, 255, 0.06)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  _drawEnemies(ctx) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue

      const s = enemy.size
      const isSlowed = enemy.slowTimer > 0

      // Shadow
      ctx.beginPath()
      ctx.arc(enemy.x + 2, enemy.y + 2, s, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fill()

      // Body
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, s, 0, Math.PI * 2)
      ctx.fillStyle = isSlowed ? '#88ccff' : hexToRgba(enemy.color)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.stroke()

      // HP bar
      const barW = s * 2, barH = 3
      const hpPct = enemy.hp / enemy.maxHp
      const bx = enemy.x - barW / 2, by = enemy.y - s - 6
      ctx.fillStyle = '#333'
      ctx.fillRect(bx, by, barW, barH)
      ctx.fillStyle = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffaa00' : '#ff4444'
      ctx.fillRect(bx, by, barW * hpPct, barH)
    }
  }

  _drawProjectiles(ctx) {
    for (const proj of this.projectiles) {
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = hexToRgba(proj.color || 0x00ffff)
      ctx.fill()

      // Trail
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2)
      ctx.fillStyle = hexToRgba(proj.color || 0x00ffff, 0.4)
      ctx.fill()
    }
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fillStyle = hexToRgba(p.color, alpha)
      ctx.fill()
    }
  }

  _renderMenu(ctx) {
    // Background
    ctx.fillStyle = '#050520'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Decorative grid
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = GRID_OFFSET_X + c * CELL_SIZE
        const y = GRID_OFFSET_Y + r * CELL_SIZE
        ctx.fillStyle = isPathCell(r, c) ? '#15153a' : '#0a0a2e'
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        ctx.strokeStyle = isPathCell(r, c) ? '#2a2a5e' : '#1a1a3a'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE)
      }
    }

    // Title
    ctx.fillStyle = '#00ffff'
    ctx.font = 'bold 48px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('晶 石 塔 防', GAME_WIDTH / 2, 140)

    ctx.fillStyle = '#8888cc'
    ctx.font = '16px "Courier New", monospace'
    ctx.fillText('Crystal Tower Defense', GAME_WIDTH / 2, 180)

    ctx.fillStyle = '#aaaaff'
    ctx.font = '18px "Courier New", monospace'
    ctx.fillText('点击任意位置开始游戏', GAME_WIDTH / 2, 380)

    ctx.fillStyle = '#666688'
    ctx.font = '12px "Courier New", monospace'
    ctx.fillText('点击网格放置晶石塔  |  空格开始波次', GAME_WIDTH / 2, 540)
    ctx.fillText('1-4选择塔类型  |  F融合升级相邻同型塔', GAME_WIDTH / 2, 558)
  }

  _emitState() {
    if (this.stateCallback) {
      this.stateCallback(this.getState())
    }
  }
}

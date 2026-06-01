import {
  GAME_WIDTH, GAME_HEIGHT,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, JUMP_FORCE, GRAVITY, MAX_FALL_SPEED,
  MAX_REWIND_FRAMES, MAX_REWIND_ENERGY, REWIND_DRAIN_RATE, REWIND_RECHARGE_RATE,
  PT, FRAGMENT_SIZE, GS, COLORS, DATA_TYPE
} from './constants.js'
import { generateLevel } from './level.js'

/**
 * Main game engine - handles all game logic, physics, and rendering.
 * Code/data realm theme: player is a code character, collect data fragments.
 */
export class GameEngine {
  constructor(canvas, stateRef) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.stateRef = stateRef   // reactive state object for Vue UI

    // Input
    this.keys = {}

    // Game time
    this.gameTime = 0
    this.dt = 0

    // Parallax background layers
    this.stars = []
    this.codeRain = []
    this.nebulae = []
    this._initBackground()

    // Level
    this.level = 1

    // Initialize game
    this.reset()
  }

  // ───────── Initialization ─────────

  _initBackground() {
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: 0.5 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        layer: Math.floor(Math.random() * 3)
      })
    }
    // Code rain background effect (falling code snippets)
    for (let i = 0; i < 20; i++) {
      this.codeRain.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        speed: 0.3 + Math.random() * 0.8,
        length: 3 + Math.floor(Math.random() * 8),
        opacity: 0.03 + Math.random() * 0.06,
        chars: this._generateCodeString(3 + Math.floor(Math.random() * 8))
      })
    }
    for (let i = 0; i < 6; i++) {
      this.nebulae.push({
        x: Math.random() * GAME_WIDTH * 1.5,
        y: Math.random() * GAME_HEIGHT,
        r: 80 + Math.random() * 200,
        color: ['rgba(0,60,30,0.12)', 'rgba(0,40,80,0.10)', 'rgba(60,20,80,0.08)',
                'rgba(0,80,60,0.10)', 'rgba(40,30,80,0.10)'][i % 5],
        layer: Math.floor(Math.random() * 2)
      })
    }
  }

  _generateCodeString(len) {
    const chars = '01{}[]()<>/\\=+-*&|!~:;.,'
    let s = ''
    for (let i = 0; i < len; i++) {
      s += chars[Math.floor(Math.random() * chars.length)]
    }
    return s
  }

  reset(levelNum) {
    this.level = levelNum || 1
    this.gameTime = 0
    this.isRewinding = false
    this.rewindEnergy = MAX_REWIND_ENERGY
    this.rewindHistory = []
    this.rewindIndex = -1
    this.particles = []
    this.floatingTexts = []
    this.screenShake = 0
    this.deathTimer = 0
    this.fragmentSparkles = []

    this.loadLevel(this.level)
    this._updateStateRef()
  }

  loadLevel(levelNum) {
    const data = generateLevel(levelNum)
    this.platforms = data.platforms
    this.fragments = data.fragments
    this.totalFragments = data.fragments.length
    this.levelWidth = data.width
    this.exitX = data.exitX

    this.player = {
      x: data.startX,
      y: data.startY,
      vx: 0,
      vy: 0,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT,
      onGround: false,
      jumped: false,
      facing: 1,
      trail: []
    }

    this.camera = { x: 0, y: 0, targetX: 0 }
    this.collectedFragments = 0
    this.score = 0
    this.gameState = GS.PLAYING

    // Store collected states
    this.fragmentCollected = new Array(this.fragments.length).fill(false)
    this._updateStateRef()
  }

  // ───────── Game Loop ─────────

  update(dt) {
    this.dt = dt
    this.gameTime += dt

    if (this.gameState === GS.DYING) {
      this.deathTimer -= dt * 1000
      this._updateParticles(dt)
      if (this.deathTimer <= 0) {
        this.reset(this.level)
      }
      return
    }

    if (this.gameState !== GS.PLAYING && this.gameState !== GS.REWINDING) return

    // ── Time rewind logic ──
    if (this.keys.rewind && this.rewindEnergy > 0 && this.rewindHistory.length > 0) {
      this.isRewinding = true
      this.gameState = GS.REWINDING
      this.rewindEnergy = Math.max(0, this.rewindEnergy - REWIND_DRAIN_RATE)
      this._applyRewind()
      this._updateParticles(dt)
      this._updateCamera()
      this._updateStateRef()
      return
    } else {
      if (this.gameState === GS.REWINDING) {
        this.gameState = GS.PLAYING
      }
      this.isRewinding = false
      this.rewindEnergy = Math.min(MAX_REWIND_ENERGY, this.rewindEnergy + REWIND_RECHARGE_RATE)
    }

    // ── Record snapshot ──
    this._recordSnapshot()

    // ── Player input ──
    this._handleInput()

    // ── Physics ──
    this._applyGravity()
    this._updatePlayerPosition(dt)

    // ── Update platforms ──
    this._updatePlatforms(dt)

    // ── Collisions ──
    this._checkPlatformCollisions(dt)
    this._checkFragmentCollisions()

    // ── Code rain update ──
    this._updateCodeRain()

    // ── Check death ──
    if (this.player.y > GAME_HEIGHT + 100) {
      this._die()
      return
    }

    // ── Camera ──
    this._updateCamera()

    // ── Particles ──
    this._spawnPlayerTrail()
    this._updateParticles(dt)

    // ── Fragment sparkles ──
    this._updateFragmentSparkles()

    // ── Level complete check ──
    if (this.collectedFragments >= this.totalFragments && this.totalFragments > 0) {
      if (this.player.x > this.exitX - 30 && this.player.x < this.exitX + 60 &&
          this.player.y > GAME_HEIGHT - 120 && this.player.y < GAME_HEIGHT - 40) {
        this.gameState = GS.LEVEL_COMPLETE
        this._updateStateRef()
        return
      }
    }

    // Screen shake decay
    if (this.screenShake > 0) this.screenShake *= 0.9

    this._updateStateRef()
  }

  // ───────── Input ─────────

  _handleInput() {
    const p = this.player
    p.vx = 0

    if (this.keys.left) {
      p.vx = -PLAYER_SPEED
      p.facing = -1
    }
    if (this.keys.right) {
      p.vx = PLAYER_SPEED
      p.facing = 1
    }

    if (this.keys.jump && p.onGround && !p.jumped) {
      p.vy = JUMP_FORCE
      p.onGround = false
      p.jumped = true
      this._spawnJumpParticles()
    }
    if (!this.keys.jump) {
      p.jumped = false
      if (p.vy < -3) {
        p.vy *= 0.92
      }
    }
  }

  // ───────── Physics ─────────

  _applyGravity() {
    this.player.vy = Math.min(MAX_FALL_SPEED, this.player.vy + GRAVITY)
  }

  _updatePlayerPosition() {
    this.player.x += this.player.vx
    this.player.y += this.player.vy
  }

  // ───────── Platform Collisions ─────────

  _getPlatformCurrentPos(plat, time) {
    const t = time || this.gameTime
    const p = { ...plat }

    if (plat.type === PT.MOVING_H) {
      p.x = plat.baseX + Math.sin(t * plat.moveSpeed + plat.movePhase) * plat.moveRange
    } else if (plat.type === PT.MOVING_V) {
      p.y = plat.baseY + Math.sin(t * plat.moveSpeed + plat.movePhase) * plat.moveRange
    } else if (plat.type === PT.DISAPPEARING) {
      p.visible = plat.visible
      p.alpha = plat.alpha
    } else if (plat.type === PT.TIMER) {
      p.visible = plat.visible
      p.alpha = plat.alpha
    } else if (plat.type === PT.SPRING) {
      // Always visible, always bouncy
    } else if (plat.type === PT.CONVEYOR) {
      // Always visible
    }

    return p
  }

  _updatePlatforms(dt) {
    for (const plat of this.platforms) {
      if (plat.type === PT.DISAPPEARING) {
        const wasStanding = this._isPlayerOnPlatform(plat)
        if (wasStanding) {
          plat.fadeTimer = plat.fadeDelay
        } else if (plat.alpha !== undefined) {
          plat.fadeTimer = Math.max(0, plat.fadeTimer - dt * 1000)
          if (plat.fadeTimer <= 0 && !plat.visible) {
            plat.visible = true
            plat.alpha = 0
          }
        }

        if (!plat.visible && plat.alpha !== undefined) {
          plat.alpha = Math.min(1, plat.alpha + dt * 2)
          if (plat.alpha >= 1) plat.visible = true
        }
      } else if (plat.type === PT.TIMER) {
        plat.timer = (plat.timer + dt * 1000) % (plat.onDuration + plat.offDuration)
        const wasVisible = plat.visible
        plat.visible = plat.timer < plat.onDuration
        plat.alpha = plat.visible ? 1 : 0.3
      } else if (plat.type === PT.SPRING) {
        if (plat.springCooldown > 0) {
          plat.springCooldown -= dt * 1000
        }
      }
    }
  }

  _isPlayerOnPlatform(plat) {
    const p = this.player
    const pp = this._getPlatformCurrentPos(plat, this.gameTime)
    if (!pp.visible && pp.alpha !== undefined && pp.alpha < 0.5) return false
    return p.x + p.w > pp.x &&
           p.x < pp.x + pp.w &&
           Math.abs(p.y + p.h - pp.y) < 5 &&
           p.vy >= 0
  }

  _checkPlatformCollisions(dt) {
    const p = this.player
    p.onGround = false

    for (const plat of this.platforms) {
      const pp = this._getPlatformCurrentPos(plat, this.gameTime)

      // Skip invisible / faded platforms
      if (plat.type === PT.DISAPPEARING && plat.visible === false) continue
      if (plat.type === PT.TIMER && !plat.visible) continue
      if (pp.alpha !== undefined && pp.alpha < 0.3) continue

      // AABB collision
      if (p.x + p.w <= pp.x || p.x >= pp.x + pp.w ||
          p.y + p.h <= pp.y || p.y >= pp.y + pp.h) continue

      const overlapLeft = (p.x + p.w) - pp.x
      const overlapRight = (pp.x + pp.w) - p.x
      const overlapTop = (p.y + p.h) - pp.y
      const overlapBottom = (pp.y + pp.h) - p.y

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)

      if (minOverlap === overlapTop && p.vy >= 0) {
        // Landing on top of platform
        p.y = pp.y - p.h
        p.vy = 0
        p.onGround = true

        // Spring platform: bounce player upward
        if (plat.type === PT.SPRING && plat.springCooldown <= 0) {
          p.vy = plat.springForce || -14
          p.onGround = false
          plat.springCooldown = plat.springDelay || 300
          this._spawnParticles(pp.x + pp.w / 2, pp.y, '#ff6666', 12)
          this.screenShake = 4
        }

        // Conveyor platform: add horizontal velocity
        if (plat.type === PT.CONVEYOR) {
          p.vx += plat.conveyorSpeed || 0
        }

        // Trigger disappearing platform
        if (plat.type === PT.DISAPPEARING && plat.visible) {
          plat.visible = false
          plat.alpha = 0
          plat.fadeTimer = plat.fadeDelay
          this._spawnParticles(p.x + p.w / 2, pp.y, '#88ccff', 8)
        }
      } else if (minOverlap === overlapBottom && p.vy < 0) {
        // Hit head
        p.y = pp.y + pp.h
        p.vy = 0
      } else if (minOverlap === overlapLeft) {
        p.x = pp.x - p.w
        // Conveyor pushes player
        if (plat.type === PT.CONVEYOR) {
          p.x -= plat.conveyorSpeed * 0.5
        }
      } else if (minOverlap === overlapRight) {
        p.x = pp.x + pp.w
        // Conveyor pushes player
        if (plat.type === PT.CONVEYOR) {
          p.x += plat.conveyorSpeed * 0.5
        }
      }
    }
  }

  // ───────── Fragment Collisions ─────────

  _checkFragmentCollisions() {
    const p = this.player
    for (let i = 0; i < this.fragments.length; i++) {
      const f = this.fragments[i]
      if (f.collected) continue

      const fx = f.x
      const fy = f.y + Math.sin(this.gameTime * f.floatSpeed + f.floatPhase) * f.floatRange

      // Simple circle-rect collision
      const cx = fx + FRAGMENT_SIZE / 2
      const cy = fy + FRAGMENT_SIZE / 2
      const r = FRAGMENT_SIZE / 2

      const nearX = Math.max(p.x, Math.min(p.x + p.w, cx))
      const nearY = Math.max(p.y, Math.min(p.y + p.h, cy))
      const dx = cx - nearX
      const dy = cy - nearY

      if (dx * dx + dy * dy < r * r) {
        f.collected = true
        this.fragmentCollected[i] = true
        this.collectedFragments++
        this.score += 100
        // Fragment-specific color for particles
        const fragColors = ['#00e876', '#00d4ff', '#b87af8', '#ffd700']
        const fColor = fragColors[f.dataType || 0] || '#00d4ff'
        this._spawnParticles(cx, cy, fColor, 15)
        this._spawnFloatingText('+100', cx, cy - 20, fColor)
        this.screenShake = 3
      }
    }

    this._updateStateRef()
  }

  // ───────── Time Rewind ─────────

  _recordSnapshot() {
    this.rewindHistory.push({
      px: this.player.x,
      py: this.player.y,
      pvx: this.player.vx,
      pvy: this.player.vy,
      onGround: this.player.onGround,
      collected: [...this.fragmentCollected],
      score: this.score,
      collectedFragments: this.collectedFragments,
      time: this.gameTime,
      platStates: this.platforms.map(p => ({
        visible: p.visible,
        alpha: p.alpha,
        fadeTimer: p.fadeTimer,
        timer: p.timer,
        springCooldown: p.springCooldown
      }))
    })

    if (this.rewindHistory.length > MAX_REWIND_FRAMES) {
      this.rewindHistory.shift()
    }
    this.rewindIndex = this.rewindHistory.length - 1
  }

  _applyRewind() {
    if (this.rewindHistory.length === 0) return

    this.rewindIndex = Math.max(0, this.rewindIndex - 1)
    const snap = this.rewindHistory[this.rewindIndex]

    this.player.x = snap.px
    this.player.y = snap.py
    this.player.vx = snap.pvx
    this.player.vy = snap.pvy
    this.player.onGround = snap.onGround

    this.fragmentCollected = [...snap.collected]
    this.collectedFragments = snap.collectedFragments
    this.score = snap.score
    this.gameTime = snap.time

    for (let i = 0; i < this.platforms.length && i < snap.platStates.length; i++) {
      const ps = snap.platStates[i]
      this.platforms[i].visible = ps.visible
      this.platforms[i].alpha = ps.alpha
      this.platforms[i].fadeTimer = ps.fadeTimer
      this.platforms[i].timer = ps.timer
      this.platforms[i].springCooldown = ps.springCooldown
    }

    for (let i = 0; i < this.fragments.length; i++) {
      this.fragments[i].collected = this.fragmentCollected[i] || false
    }

    if (Math.random() < 0.3) {
      this._spawnParticles(
        this.player.x + this.player.w / 2,
        this.player.y + this.player.h / 2,
        '#b87af8', 3
      )
    }

    this.rewindHistory = this.rewindHistory.slice(0, this.rewindIndex + 1)
  }

  // ───────── Code Rain ─────────

  _updateCodeRain() {
    const cam = this.camera
    for (const cr of this.codeRain) {
      cr.y += cr.speed
      // Wrap around with parallax
      const wrapX = (cr.x - cam.x * 0.03) % GAME_WIDTH
      cr.drawX = wrapX < 0 ? wrapX + GAME_WIDTH : wrapX
      if (cr.y > GAME_HEIGHT + cr.length * 10) {
        cr.y = -cr.length * 10
        cr.x = Math.random() * GAME_WIDTH
        cr.chars = this._generateCodeString(3 + Math.floor(Math.random() * 8))
      }
    }
  }

  // ───────── Camera ─────────

  _updateCamera() {
    const targetX = this.player.x - GAME_WIDTH / 3
    this.camera.x += (targetX - this.camera.x) * 0.08
    this.camera.x = Math.max(0, Math.min(this.levelWidth - GAME_WIDTH, this.camera.x))
  }

  // ───────── Particles ─────────

  _spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        decay: 0.015 + Math.random() * 0.025,
        size: 2 + Math.random() * 4,
        color,
        type: 'spark'
      })
    }
  }

  _spawnPlayerTrail() {
    const p = this.player
    if (Math.abs(p.vx) > 0.5 || !p.onGround) {
      if (Math.random() < 0.4) {
        const trailColor = this.isRewinding ? '#b87af8' : '#00e876'
        this.particles.push({
          x: p.x + p.w / 2 + (Math.random() - 0.5) * 10,
          y: p.y + p.h,
          vx: -p.vx * 0.1 + (Math.random() - 0.5) * 0.5,
          vy: -0.5 + Math.random() * 0.5,
          life: 1,
          decay: 0.03 + Math.random() * 0.02,
          size: 3 + Math.random() * 2,
          color: trailColor,
          type: 'trail'
        })
      }
    }
  }

  _spawnJumpParticles() {
    const p = this.player
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: p.x + p.w / 2 + (Math.random() - 0.5) * 20,
        y: p.y + p.h,
        vx: (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 1.5,
        life: 1,
        decay: 0.025 + Math.random() * 0.02,
        size: 3 + Math.random() * 3,
        color: '#88ffaa',
        type: 'jump'
      })
    }
  }

  _spawnFloatingText(text, x, y, color) {
    this.floatingTexts.push({ text, x, y, vy: -2, life: 1, color })
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.02
      p.life -= p.decay
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.y += ft.vy
      ft.vy *= 0.95
      ft.life -= 0.02
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1)
      }
    }
  }

  _updateFragmentSparkles() {
    for (const f of this.fragments) {
      if (!f.collected && Math.random() < 0.02) {
        const cy = f.y + Math.sin(this.gameTime * f.floatSpeed + f.floatPhase) * f.floatRange
        const fragColors = ['#00e876', '#00d4ff', '#b87af8', '#ffd700']
        const fColor = fragColors[f.dataType || 0] || '#00d4ff'
        this._spawnParticles(
          f.x + FRAGMENT_SIZE / 2 + (Math.random() - 0.5) * 16,
          cy + FRAGMENT_SIZE / 2 + (Math.random() - 0.5) * 16,
          fColor, 1
        )
      }
    }
  }

  // ───────── Death ─────────

  _die() {
    this.gameState = GS.DYING
    this.deathTimer = 800
    this._spawnParticles(
      this.player.x + this.player.w / 2,
      this.player.y,
      '#ff4444', 20
    )
    this.screenShake = 10
  }

  // ───────── Rendering ─────────

  render() {
    const ctx = this.ctx
    const cam = this.camera
    const shakeX = Math.random() * this.screenShake - this.screenShake / 2
    const shakeY = Math.random() * this.screenShake - this.screenShake / 2

    ctx.save()
    ctx.translate(shakeX, shakeY)

    // Background
    this._renderBackground(ctx, cam)

    // Code rain background
    this._renderCodeRain(ctx, cam)

    // Game world
    ctx.save()
    ctx.translate(-cam.x, 0)

    // Platforms
    this._renderPlatforms(ctx)

    // Fragments
    this._renderFragments(ctx)

    // Exit portal
    if (this.collectedFragments >= this.totalFragments && this.totalFragments > 0) {
      this._renderExit(ctx)
    }

    // Player
    this._renderPlayer(ctx)

    // Particles
    this._renderParticles(ctx)

    // Floating texts
    this._renderFloatingTexts(ctx)

    ctx.restore()

    // Rewind overlay
    if (this.isRewinding) {
      this._renderRewindOverlay(ctx)
    }

    ctx.restore()
  }

  // ───── Background ─────

  _renderBackground(ctx, cam) {
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    grad.addColorStop(0, '#0a0a1a')
    grad.addColorStop(0.5, '#0a1a0a')
    grad.addColorStop(1, '#050510')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Nebulae
    for (const neb of this.nebulae) {
      const nx = (neb.x - cam.x * 0.05) % (GAME_WIDTH * 1.5)
      const drawX = nx < -neb.r ? nx + GAME_WIDTH * 1.5 : nx
      ctx.save()
      ctx.globalAlpha = 0.4
      const ng = ctx.createRadialGradient(drawX, neb.y, 0, drawX, neb.y, neb.r)
      ng.addColorStop(0, neb.color)
      ng.addColorStop(1, 'transparent')
      ctx.fillStyle = ng
      ctx.fillRect(drawX - neb.r, neb.y - neb.r, neb.r * 2, neb.r * 2)
      ctx.restore()
    }

    // Stars
    for (const star of this.stars) {
      const parallax = 0.02 + star.layer * 0.02
      const sx = (star.x - cam.x * parallax) % GAME_WIDTH
      const drawX = sx < -star.size ? sx + GAME_WIDTH : sx
      const twinkle = 0.5 + 0.5 * Math.sin(this.gameTime * star.twinkleSpeed + star.twinklePhase)
      ctx.save()
      ctx.globalAlpha = star.brightness * twinkle
      ctx.fillStyle = '#88ffaa'
      ctx.beginPath()
      ctx.arc(drawX, star.y, star.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // ───── Code Rain Effect ─────

  _renderCodeRain(ctx, cam) {
    ctx.save()
    for (const cr of this.codeRain) {
      ctx.globalAlpha = cr.opacity
      ctx.fillStyle = '#00e876'
      ctx.font = '8px monospace'
      for (let i = 0; i < cr.chars.length; i++) {
        ctx.fillText(cr.chars[i], cr.drawX, cr.y + i * 10)
      }
    }
    ctx.restore()
  }

  // ───── Platforms ─────

  _renderPlatforms(ctx) {
    for (const plat of this.platforms) {
      const pp = this._getPlatformCurrentPos(plat, this.gameTime)

      if (pp.alpha !== undefined && pp.alpha < 0.05) continue

      ctx.save()
      if (pp.alpha !== undefined) ctx.globalAlpha = pp.alpha

      const x = pp.x, y = pp.y, w = pp.w, h = pp.h
      const r = 4

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      this._roundRect(ctx, x + 2, y + 2, w, h, r)
      ctx.fill()

      // Body gradient by type
      let bodyColor, topColor, borderColor
      if (plat.type === PT.MOVING_H || plat.type === PT.MOVING_V) {
        bodyColor = '#2a5a8a'
        topColor = '#4a9af8'
        borderColor = 'rgba(74, 154, 248, 0.3)'
      } else if (plat.type === PT.DISAPPEARING) {
        bodyColor = '#8a5a2a'
        topColor = '#f8b84a'
        borderColor = 'rgba(248, 184, 74, 0.3)'
      } else if (plat.type === PT.TIMER) {
        bodyColor = '#5a2a8a'
        topColor = '#b87af8'
        borderColor = 'rgba(184, 122, 248, 0.3)'
      } else if (plat.type === PT.SPRING) {
        bodyColor = '#8a2a2a'
        topColor = '#f86a6a'
        borderColor = 'rgba(248, 106, 106, 0.4)'
        // Spring indicator (chevron pattern)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let sx = x + 10; sx < x + w - 10; sx += 14) {
          ctx.moveTo(sx, y + h - 4)
          ctx.lineTo(sx + 5, y + h - 10)
          ctx.lineTo(sx + 10, y + h - 4)
        }
        ctx.stroke()
      } else if (plat.type === PT.CONVEYOR) {
        bodyColor = '#2a4a8a'
        topColor = '#6ab8f8'
        borderColor = 'rgba(106, 184, 248, 0.3)'
        // Conveyor direction arrows
        const dir = plat.conveyorDir || 1
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.font = '8px monospace'
        for (let sx = x + 8; sx < x + w - 8; sx += 16) {
          ctx.fillText(dir > 0 ? '>' : '<', sx, y + h - 4)
        }
      } else {
        bodyColor = '#1a5a3a'
        topColor = '#4ae87a'
        borderColor = 'rgba(74, 232, 122, 0.3)'
      }

      // Body
      ctx.fillStyle = bodyColor
      this._roundRect(ctx, x, y, w, h, r)
      ctx.fill()

      // Border glow
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1
      this._roundRect(ctx, x, y, w, h, r)
      ctx.stroke()

      // Top highlight
      ctx.fillStyle = topColor
      this._roundRect(ctx, x, y, w, 4, 2)
      ctx.fill()

      ctx.restore()
    }
  }

  // ───── Player (Code Character) ─────

  _renderPlayer(ctx) {
    const p = this.player
    const x = p.x, y = p.y, w = p.w, h = p.h

    ctx.save()

    // Glow
    const glowColor = this.isRewinding ? 'rgba(184,122,248,0.2)' : 'rgba(0,232,118,0.2)'
    const glowGrad = ctx.createRadialGradient(
      x + w / 2, y + h / 2, 0,
      x + w / 2, y + h / 2, 30
    )
    glowGrad.addColorStop(0, glowColor)
    glowGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h / 2, 30, 0, Math.PI * 2)
    ctx.fill()

    // Terminal body - a code window rectangle
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
    if (this.isRewinding) {
      bodyGrad.addColorStop(0, '#cc88ff')
      bodyGrad.addColorStop(1, '#8844cc')
    } else {
      bodyGrad.addColorStop(0, '#44ff88')
      bodyGrad.addColorStop(1, '#00aa44')
    }

    // Body (terminal screen shape)
    this._roundRect(ctx, x + 2, y + 12, w - 4, h - 14, 3)
    ctx.fillStyle = bodyGrad
    ctx.fill()

    // Terminal screen inner glow
    ctx.save()
    ctx.globalAlpha = 0.1
    ctx.fillStyle = this.isRewinding ? '#cc88ff' : '#44ff88'
    ctx.fillRect(x + 5, y + 15, w - 10, h - 20)
    ctx.restore()

    // Head - monitor/terminal screen
    ctx.beginPath()
    ctx.arc(x + w / 2, y + 9, 8, 0, Math.PI * 2)
    ctx.fillStyle = this.isRewinding ? '#ddbbff' : '#66ffaa'
    ctx.fill()

    // Head rim
    ctx.strokeStyle = this.isRewinding ? '#aa66ee' : '#00cc55'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x + w / 2, y + 9, 8, 0, Math.PI * 2)
    ctx.stroke()

    // Eyes - "code" binary dots
    const eyeGlow = this.isRewinding ? '#ffffff' : '#ffffff'
    ctx.fillStyle = eyeGlow
    ctx.beginPath()
    ctx.arc(x + w / 2 - 3 + p.facing * 2, y + 7, 2, 0, Math.PI * 2)
    ctx.arc(x + w / 2 + 3 + p.facing * 2, y + 7, 2, 0, Math.PI * 2)
    ctx.fill()

    // Pupils
    ctx.fillStyle = '#0a0a1a'
    ctx.beginPath()
    ctx.arc(x + w / 2 - 3 + p.facing * 3, y + 7, 1, 0, Math.PI * 2)
    ctx.arc(x + w / 2 + 3 + p.facing * 3, y + 7, 1, 0, Math.PI * 2)
    ctx.fill()

    // Code bracket symbols on body </>
    ctx.save()
    if (this.isRewinding) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
    } else {
      ctx.fillStyle = 'rgba(0,30,10,0.3)'
    }
    ctx.font = '6px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('</>', x + w / 2, y + h - 5)
    ctx.restore()

    // Legs - code cursor underscores
    const legOffset = (Math.sin(this.gameTime * 10) * (p.onGround && Math.abs(p.vx) > 0.5 ? 2 : 0))
    ctx.fillStyle = this.isRewinding ? '#aa66dd' : '#008833'
    ctx.fillRect(x + 5, y + h - 5, 6, 5 + legOffset)
    ctx.fillRect(x + w - 11, y + h - 5, 6, 5 - legOffset)

    // Arms - brackets / parentheses
    const armAngle = Math.sin(this.gameTime * 8) * 0.3
    ctx.save()
    ctx.translate(x + 2, y + 18)
    ctx.rotate(-0.3 + armAngle)
    ctx.fillRect(-2, 0, 3, 8)
    ctx.fillStyle = this.isRewinding ? 'rgba(255,255,255,0.3)' : 'rgba(0,30,10,0.3)'
    ctx.font = '5px monospace'
    ctx.fillText('[', 2, 6)
    ctx.restore()
    ctx.save()
    ctx.translate(x + w - 2, y + 18)
    ctx.rotate(0.3 - armAngle)
    ctx.fillRect(-1, 0, 3, 8)
    ctx.fillStyle = this.isRewinding ? 'rgba(255,255,255,0.3)' : 'rgba(0,30,10,0.3)'
    ctx.font = '5px monospace'
    ctx.fillText(']', -4, 6)
    ctx.restore()

    // Code character name tag
    ctx.save()
    ctx.globalAlpha = 0.4
    ctx.fillStyle = this.isRewinding ? '#cc88ff' : '#00e876'
    ctx.font = '6px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('$_', x + w / 2, y - 4)
    ctx.restore()

    ctx.restore()
  }

  // ───── Data Fragments ─────

  _renderFragments(ctx) {
    const size = FRAGMENT_SIZE

    for (const f of this.fragments) {
      if (f.collected) continue

      const floatY = f.y + Math.sin(this.gameTime * f.floatSpeed + f.floatPhase) * f.floatRange
      const cx = f.x + size / 2
      const cy = floatY + size / 2

      ctx.save()

      // Glow
      const glowSize = size * 2 + Math.sin(this.gameTime * 3 + f.floatPhase) * 4
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize)
      const glowColors = ['rgba(0,232,118,0.3)', 'rgba(0,212,255,0.3)', 'rgba(184,122,248,0.3)', 'rgba(255,215,0,0.3)']
      glowGrad.addColorStop(0, glowColors[f.dataType || 0] || 'rgba(0,232,118,0.3)')
      glowGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(cx, cy, glowSize, 0, Math.PI * 2)
      ctx.fill()

      // Draw data fragment based on type
      ctx.save()
      ctx.translate(cx, cy)
      const pulse = 1 + Math.sin(this.gameTime * 2 + f.floatPhase) * 0.05
      ctx.scale(pulse, pulse)

      const dataType = f.dataType !== undefined ? f.dataType : 0

      if (dataType === DATA_TYPE.CODE) {
        // </> Code bracket shape
        this._drawCodeBracket(ctx, size)
      } else if (dataType === DATA_TYPE.DATABASE) {
        // Database cylinder shape
        this._drawDatabaseCylinder(ctx, size)
      } else if (dataType === DATA_TYPE.NETWORK) {
        // Network hexagon node
        this._drawNetworkNode(ctx, size)
      } else if (dataType === DATA_TYPE.CLOUD) {
        // Cloud shape
        this._drawCloudNode(ctx, size)
      }

      ctx.restore()

      // Inner sparkle
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }
  }

  _drawCodeBracket(ctx, size) {
    const hs = size / 2
    ctx.strokeStyle = '#00e876'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-hs * 0.5, -hs)
    ctx.lineTo(-hs, 0)
    ctx.lineTo(-hs * 0.5, hs)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(hs * 0.5, -hs)
    ctx.lineTo(hs, 0)
    ctx.lineTo(hs * 0.5, hs)
    ctx.stroke()

    // Fill gradient
    const dGrad = ctx.createLinearGradient(-hs, 0, hs, 0)
    dGrad.addColorStop(0, '#00e876')
    dGrad.addColorStop(0.5, '#88ffbb')
    dGrad.addColorStop(1, '#00e876')
    // Small slash
    ctx.fillStyle = dGrad
    ctx.font = 'bold 6px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('/', 0, 0)
  }

  _drawDatabaseCylinder(ctx, size) {
    const hs = size / 2
    const w = size * 0.8
    const h = size * 0.9
    const topOval = h * 0.15

    // Body
    const dGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    dGrad.addColorStop(0, '#00aaff')
    dGrad.addColorStop(0.5, '#88ddff')
    dGrad.addColorStop(1, '#00aaff')

    // Cylinder body
    ctx.fillStyle = dGrad
    ctx.beginPath()
    ctx.ellipse(0, -h / 2 + topOval, w / 2, topOval, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(-w / 2, -h / 2 + topOval, w, h - topOval)
    // Bottom curve
    ctx.beginPath()
    ctx.ellipse(0, h / 2, w / 2, topOval, 0, 0, Math.PI * 2)
    ctx.fill()

    // Lines on cylinder
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 3; i++) {
      const ly = -h / 2 + topOval + (h - topOval) * (i + 1) / 4
      ctx.beginPath()
      ctx.ellipse(0, ly, w / 2, topOval * 0.6, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  _drawNetworkNode(ctx, size) {
    const hs = size / 2
    const sides = 6
    const r = hs * 0.9

    const dGrad = ctx.createLinearGradient(-r, 0, r, 0)
    dGrad.addColorStop(0, '#b87af8')
    dGrad.addColorStop(0.5, '#ddbbff')
    dGrad.addColorStop(1, '#b87af8')

    ctx.fillStyle = dGrad
    ctx.beginPath()
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(angle) * r
      const py = Math.sin(angle) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()

    // Connection lines (network pattern)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < sides; i++) {
      const a1 = (i / sides) * Math.PI * 2 - Math.PI / 2
      const a2 = ((i + 2) / sides) * Math.PI * 2 - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r)
      ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r)
      ctx.stroke()
    }
  }

  _drawCloudNode(ctx, size) {
    const hs = size / 2
    const dGrad = ctx.createRadialGradient(-hs * 0.2, -hs * 0.2, 0, 0, 0, hs * 1.2)
    dGrad.addColorStop(0, '#ffdd44')
    dGrad.addColorStop(0.6, '#ffaa00')
    dGrad.addColorStop(1, '#ff8800')

    ctx.fillStyle = dGrad
    // Cloud-like shape with arcs
    ctx.beginPath()
    ctx.arc(-hs * 0.3, hs * 0.1, hs * 0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(hs * 0.3, hs * 0.1, hs * 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, -hs * 0.3, hs * 0.5, 0, Math.PI * 2)
    ctx.fill()

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.beginPath()
    ctx.arc(-hs * 0.2, -hs * 0.2, hs * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }

  // ───── Exit Portal ─────

  _renderExit(ctx) {
    const x = this.exitX
    const y = GAME_HEIGHT - 100
    const pulse = 1 + Math.sin(this.gameTime * 3) * 0.1

    ctx.save()

    // Outer glow (code green)
    const og = ctx.createRadialGradient(x, y, 0, x, y, 40 * pulse)
    og.addColorStop(0, 'rgba(0,232,118,0.15)')
    og.addColorStop(0.5, 'rgba(0,200,255,0.08)')
    og.addColorStop(1, 'transparent')
    ctx.fillStyle = og
    ctx.beginPath()
    ctx.arc(x, y, 40 * pulse, 0, Math.PI * 2)
    ctx.fill()

    // Portal ring - code brackets
    ctx.strokeStyle = `rgba(0,232,118,${0.5 + Math.sin(this.gameTime * 2) * 0.3})`
    ctx.lineWidth = 3
    // Square bracket portal
    const bs = 20 * pulse
    ctx.beginPath()
    ctx.moveTo(x - bs, y - bs)
    ctx.lineTo(x - bs, y + bs)
    ctx.moveTo(x + bs, y - bs)
    ctx.lineTo(x + bs, y + bs)
    ctx.stroke()

    ctx.strokeStyle = `rgba(0,200,255,${0.3 + Math.sin(this.gameTime * 2.5) * 0.2})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x - bs * 1.3, y - bs * 0.7)
    ctx.lineTo(x - bs * 1.3, y + bs * 0.7)
    ctx.moveTo(x + bs * 1.3, y - bs * 0.7)
    ctx.lineTo(x + bs * 1.3, y + bs * 0.7)
    ctx.stroke()

    // Arrow indicator
    ctx.fillStyle = `rgba(255,255,255,${0.7 + Math.sin(this.gameTime * 2) * 0.3})`
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('▼', x, y - 40)

    // "EXIT" text with code style
    ctx.fillStyle = `rgba(0,232,118,${0.6 + Math.sin(this.gameTime * 1.5) * 0.3})`
    ctx.font = 'bold 10px monospace'
    ctx.fillText('> exit();', x, y + 42)

    ctx.restore()
  }

  // ───── Particles ─────

  _renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.save()
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  _renderFloatingTexts(ctx) {
    for (const ft of this.floatingTexts) {
      ctx.save()
      ctx.globalAlpha = ft.life
      ctx.fillStyle = ft.color
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(ft.text, ft.x, ft.y)
      ctx.restore()
    }
  }

  // ───── Rewind Overlay ─────

  _renderRewindOverlay(ctx) {
    // Vignette effect
    const grad = ctx.createRadialGradient(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.2,
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.7
    )
    grad.addColorStop(0, 'transparent')
    grad.addColorStop(1, 'rgba(100, 50, 180, 0.15)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Rewind particles - code snippets flowing backward
    const count = Math.floor(REWIND_DRAIN_RATE * 30)
    for (let i = 0; i < count; i++) {
      const rx = Math.random() * GAME_WIDTH
      const ry = Math.random() * GAME_HEIGHT
      ctx.save()
      ctx.globalAlpha = 0.1 + Math.random() * 0.15
      ctx.fillStyle = '#b87af8'
      ctx.font = '6px monospace'
      ctx.fillText(['<', '>', '/', '0', '1'][Math.floor(Math.random() * 5)], rx, ry)
      ctx.restore()
    }

    // Rewind indicator
    ctx.save()
    ctx.fillStyle = `rgba(184,122,248,${0.6 + Math.sin(this.gameTime * 5) * 0.3})`
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('⟳ git rewind', GAME_WIDTH / 2, 30)
    ctx.restore()
  }

  // ───── Utilities ─────

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  _updateStateRef() {
    if (!this.stateRef) return
    this.stateRef.gameState = this.gameState
    this.stateRef.score = this.score
    this.stateRef.collectedFragments = this.collectedFragments
    this.stateRef.totalFragments = this.totalFragments
    this.stateRef.rewindEnergy = this.rewindEnergy
    this.stateRef.isRewinding = this.isRewinding
    this.stateRef.level = this.level
  }

  // ──── Public API for Vue components ────

  handleKeyDown(key) {
    this.keys[key] = true
  }

  handleKeyUp(key) {
    this.keys[key] = false
  }

  handleResize(w, h) {
    // Canvas is resized by CSS, logical size stays same
  }

  startGame() {
    this.reset(1)
  }

  nextLevel() {
    this.reset(this.level + 1)
  }

  restartLevel() {
    this.reset(this.level)
  }
}

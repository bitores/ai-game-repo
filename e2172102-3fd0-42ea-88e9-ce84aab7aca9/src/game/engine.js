import {
  GAME_WIDTH, GAME_HEIGHT,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, JUMP_FORCE, GRAVITY, MAX_FALL_SPEED,
  MAX_REWIND_FRAMES, MAX_REWIND_ENERGY, REWIND_DRAIN_RATE, REWIND_RECHARGE_RATE,
  PT, FRAGMENT_SIZE, GS, COLORS
} from './constants.js'
import { generateLevel } from './level.js'

/**
 * Main game engine - handles all game logic, physics, and rendering.
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
    this.nebulae = []
    this._initBackground()

    // Level
    this.level = 1

    // Initialize game
    this.reset()
  }

  // ───────── Initialization ─────────

  _initBackground() {
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: 0.5 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        layer: Math.floor(Math.random() * 3)  // 0=far, 1=mid, 2=near
      })
    }
    for (let i = 0; i < 8; i++) {
      this.nebulae.push({
        x: Math.random() * GAME_WIDTH * 1.5,
        y: Math.random() * GAME_HEIGHT,
        r: 80 + Math.random() * 200,
        color: ['rgba(60,20,120,0.12)', 'rgba(20,40,120,0.10)', 'rgba(100,20,80,0.08)',
                'rgba(20,80,100,0.10)', 'rgba(80,30,120,0.10)'][i % 5],
        layer: Math.floor(Math.random() * 2)
      })
    }
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
    this._checkPlatformCollisions()
    this._checkFragmentCollisions()

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
      // Check if player is near the exit
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
      // Variable jump height
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

  _checkPlatformCollisions() {
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
        // Left side
        p.x = pp.x - p.w
      } else if (minOverlap === overlapRight) {
        // Right side
        p.x = pp.x + pp.w
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
        this._spawnParticles(cx, cy, '#ffd700', 15)
        this._spawnFloatingText('+100', cx, cy - 20, '#ffd700')
        this.screenShake = 3
      }
    }

    // Update state ref for HUD
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
      // Platform states for disappearing/timer
      platStates: this.platforms.map(p => ({
        visible: p.visible,
        alpha: p.alpha,
        fadeTimer: p.fadeTimer,
        timer: p.timer
      }))
    })

    // Trim history
    if (this.rewindHistory.length > MAX_REWIND_FRAMES) {
      this.rewindHistory.shift()
    }
    this.rewindIndex = this.rewindHistory.length - 1
  }

  _applyRewind() {
    if (this.rewindHistory.length === 0) return

    // Go back one frame
    this.rewindIndex = Math.max(0, this.rewindIndex - 1)
    const snap = this.rewindHistory[this.rewindIndex]

    // Restore player state
    this.player.x = snap.px
    this.player.y = snap.py
    this.player.vx = snap.pvx
    this.player.vy = snap.pvy
    this.player.onGround = snap.onGround

    // Restore game state
    this.fragmentCollected = [...snap.collected]
    this.collectedFragments = snap.collectedFragments
    this.score = snap.score
    this.gameTime = snap.time

    // Restore platform states
    for (let i = 0; i < this.platforms.length && i < snap.platStates.length; i++) {
      const ps = snap.platStates[i]
      this.platforms[i].visible = ps.visible
      this.platforms[i].alpha = ps.alpha
      this.platforms[i].fadeTimer = ps.fadeTimer
      this.platforms[i].timer = ps.timer
    }

    // Update fragment collected flags
    for (let i = 0; i < this.fragments.length; i++) {
      this.fragments[i].collected = this.fragmentCollected[i] || false
    }

    // Rewind visual particles
    if (Math.random() < 0.3) {
      this._spawnParticles(
        this.player.x + this.player.w / 2,
        this.player.y + this.player.h / 2,
        '#9944ff', 3
      )
    }

    // Trim future history (in case player rewound and now goes forward again)
    this.rewindHistory = this.rewindHistory.slice(0, this.rewindIndex + 1)
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
        this.particles.push({
          x: p.x + p.w / 2 + (Math.random() - 0.5) * 10,
          y: p.y + p.h,
          vx: -p.vx * 0.1 + (Math.random() - 0.5) * 0.5,
          vy: -0.5 + Math.random() * 0.5,
          life: 1,
          decay: 0.03 + Math.random() * 0.02,
          size: 3 + Math.random() * 2,
          color: this.isRewinding ? '#9944ff' : '#00d4ff',
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
        color: '#88ccff',
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
        this._spawnParticles(
          f.x + FRAGMENT_SIZE / 2 + (Math.random() - 0.5) * 16,
          cy + FRAGMENT_SIZE / 2 + (Math.random() - 0.5) * 16,
          '#ffd700', 1
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
    // Base gradient
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    grad.addColorStop(0, '#0a0a2e')
    grad.addColorStop(0.5, '#120838')
    grad.addColorStop(1, '#0d0d3d')
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
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(drawX, star.y, star.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // ───── Platforms ─────

  _renderPlatforms(ctx) {
    for (const plat of this.platforms) {
      const pp = this._getPlatformCurrentPos(plat, this.gameTime)

      if (pp.alpha !== undefined && pp.alpha < 0.05) continue

      ctx.save()
      if (pp.alpha !== undefined) ctx.globalAlpha = pp.alpha

      const x = pp.x, y = pp.y, w = pp.w, h = pp.h
      const r = 4  // corner radius

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      this._roundRect(ctx, x + 2, y + 2, w, h, r)
      ctx.fill()

      // Body gradient
      let grad1, grad2
      if (plat.type === PT.MOVING_H || plat.type === PT.MOVING_V) {
        grad1 = ctx.createLinearGradient(x, y, x, y + h)
        grad1.addColorStop(0, '#5a9aaa')
        grad1.addColorStop(1, '#3a6a7a')
        grad2 = ctx.createLinearGradient(x, y, x + w, y)
        grad2.addColorStop(0, '#6ac8d8')
        grad2.addColorStop(1, '#5ab8c8')
      } else if (plat.type === PT.DISAPPEARING) {
        grad1 = ctx.createLinearGradient(x, y, x, y + h)
        grad1.addColorStop(0, '#aa7a5a')
        grad1.addColorStop(1, '#7a4a3a')
        grad2 = ctx.createLinearGradient(x, y, x + w, y)
        grad2.addColorStop(0, '#d8a86a')
        grad2.addColorStop(1, '#c8985a')
      } else if (plat.type === PT.TIMER) {
        grad1 = ctx.createLinearGradient(x, y, x, y + h)
        grad1.addColorStop(0, '#8a6aaa')
        grad1.addColorStop(1, '#5a3a7a')
        grad2 = ctx.createLinearGradient(x, y, x + w, y)
        grad2.addColorStop(0, '#b88ad8')
        grad2.addColorStop(1, '#a87ac8')
      } else {
        grad1 = ctx.createLinearGradient(x, y, x, y + h)
        grad1.addColorStop(0, '#4a7c8a')
        grad1.addColorStop(1, '#2a5c6a')
        grad2 = ctx.createLinearGradient(x, y, x + w, y)
        grad2.addColorStop(0, '#6ac8d8')
        grad2.addColorStop(1, '#4aa8b8')
      }

      // Body
      ctx.fillStyle = grad1
      this._roundRect(ctx, x, y, w, h, r)
      ctx.fill()

      // Top highlight
      ctx.fillStyle = grad2
      this._roundRect(ctx, x, y, w, 4, 2)
      ctx.fill()

      ctx.restore()
    }
  }

  // ───── Player ─────

  _renderPlayer(ctx) {
    const p = this.player
    const x = p.x, y = p.y, w = p.w, h = p.h

    ctx.save()

    // Glow
    const glowGrad = ctx.createRadialGradient(
      x + w / 2, y + h / 2, 0,
      x + w / 2, y + h / 2, 30
    )
    glowGrad.addColorStop(0, this.isRewinding ? 'rgba(153,68,255,0.2)' : 'rgba(0,212,255,0.2)')
    glowGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h / 2, 30, 0, Math.PI * 2)
    ctx.fill()

    // Body
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + h)
    if (this.isRewinding) {
      bodyGrad.addColorStop(0, '#bb77ff')
      bodyGrad.addColorStop(1, '#8833cc')
    } else {
      bodyGrad.addColorStop(0, '#44ddff')
      bodyGrad.addColorStop(1, '#0088cc')
    }

    // Rounded body
    this._roundRect(ctx, x + 3, y + 12, w - 6, h - 14, 3)
    ctx.fillStyle = bodyGrad
    ctx.fill()

    // Head
    ctx.beginPath()
    ctx.arc(x + w / 2, y + 9, 8, 0, Math.PI * 2)
    ctx.fillStyle = this.isRewinding ? '#cc99ff' : '#66eeff'
    ctx.fill()

    // Eyes
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x + w / 2 - 3 + p.facing * 2, y + 7, 2, 0, Math.PI * 2)
    ctx.arc(x + w / 2 + 3 + p.facing * 2, y + 7, 2, 0, Math.PI * 2)
    ctx.fill()

    // Eyes pupil
    ctx.fillStyle = '#0a0a2e'
    ctx.beginPath()
    ctx.arc(x + w / 2 - 3 + p.facing * 3, y + 7, 1, 0, Math.PI * 2)
    ctx.arc(x + w / 2 + 3 + p.facing * 3, y + 7, 1, 0, Math.PI * 2)
    ctx.fill()

    // Legs
    const legOffset = (Math.sin(this.gameTime * 10) * (p.onGround && Math.abs(p.vx) > 0.5 ? 2 : 0))
    ctx.fillStyle = this.isRewinding ? '#9955dd' : '#0077aa'
    ctx.fillRect(x + 5, y + h - 5, 6, 5 + legOffset)
    ctx.fillRect(x + w - 11, y + h - 5, 6, 5 - legOffset)

    // Arms
    const armAngle = Math.sin(this.gameTime * 8) * 0.3
    ctx.save()
    ctx.translate(x + 3, y + 18)
    ctx.rotate(-0.3 + armAngle)
    ctx.fillRect(-2, 0, 4, 8)
    ctx.restore()
    ctx.save()
    ctx.translate(x + w - 3, y + 18)
    ctx.rotate(0.3 - armAngle)
    ctx.fillRect(-2, 0, 4, 8)
    ctx.restore()

    ctx.restore()
  }

  // ───── Memory Fragments ─────

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
      glowGrad.addColorStop(0, 'rgba(255,215,0,0.3)')
      glowGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(cx, cy, glowSize, 0, Math.PI * 2)
      ctx.fill()

      // Diamond shape
      ctx.save()
      ctx.translate(cx, cy)
      const pulse = 1 + Math.sin(this.gameTime * 2 + f.floatPhase) * 0.05

      ctx.scale(pulse, pulse)
      ctx.beginPath()
      ctx.moveTo(0, -size / 2)
      ctx.lineTo(size / 2, 0)
      ctx.lineTo(0, size / 2)
      ctx.lineTo(-size / 2, 0)
      ctx.closePath()

      // Diamond fill gradient
      const dGrad = ctx.createLinearGradient(-size / 2, 0, size / 2, 0)
      dGrad.addColorStop(0, '#ffd700')
      dGrad.addColorStop(0.5, '#fff4a0')
      dGrad.addColorStop(1, '#ffd700')
      ctx.fillStyle = dGrad
      ctx.fill()

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.restore()

      // Inner sparkle
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }
  }

  // ───── Exit Portal ─────

  _renderExit(ctx) {
    const x = this.exitX
    const y = GAME_HEIGHT - 100
    const pulse = 1 + Math.sin(this.gameTime * 3) * 0.1

    ctx.save()

    // Outer glow
    const og = ctx.createRadialGradient(x, y, 0, x, y, 40 * pulse)
    og.addColorStop(0, 'rgba(0,255,200,0.15)')
    og.addColorStop(0.5, 'rgba(0,200,255,0.08)')
    og.addColorStop(1, 'transparent')
    ctx.fillStyle = og
    ctx.beginPath()
    ctx.arc(x, y, 40 * pulse, 0, Math.PI * 2)
    ctx.fill()

    // Portal ring
    ctx.strokeStyle = `rgba(0,255,200,${0.5 + Math.sin(this.gameTime * 2) * 0.3})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, 20 * pulse, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = `rgba(0,200,255,${0.3 + Math.sin(this.gameTime * 2.5) * 0.2})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, 28 * pulse, 0, Math.PI * 2)
    ctx.stroke()

    // Arrow indicator
    ctx.fillStyle = `rgba(255,255,255,${0.7 + Math.sin(this.gameTime * 2) * 0.3})`
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('▼', x, y - 40)

    // "EXIT" text
    ctx.fillStyle = `rgba(0,255,200,${0.6 + Math.sin(this.gameTime * 1.5) * 0.3})`
    ctx.font = 'bold 12px monospace'
    ctx.fillText('EXIT', x, y + 40)

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
    // Vignette effect for rewind
    const grad = ctx.createRadialGradient(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.2,
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.7
    )
    grad.addColorStop(0, 'transparent')
    grad.addColorStop(1, 'rgba(100, 30, 180, 0.15)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Rewind particles flowing backward
    const count = Math.floor(REWIND_DRAIN_RATE * 30)
    for (let i = 0; i < count; i++) {
      const rx = Math.random() * GAME_WIDTH
      const ry = Math.random() * GAME_HEIGHT
      ctx.save()
      ctx.globalAlpha = 0.1 + Math.random() * 0.15
      ctx.fillStyle = '#9944ff'
      ctx.fillRect(rx, ry, 2, 4 + Math.random() * 6)
      ctx.restore()
    }

    // Rewind indicator text
    ctx.save()
    ctx.fillStyle = `rgba(153,68,255,${0.6 + Math.sin(this.gameTime * 5) * 0.3})`
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('⟳ TIME REWIND', GAME_WIDTH / 2, 30)
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

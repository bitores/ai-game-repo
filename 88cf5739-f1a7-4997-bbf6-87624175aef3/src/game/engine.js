const TAU = Math.PI * 2

import { InputManager } from './input.js'
import { Player, Bullet, Enemy, Particle, createExplosion, ScorePopup } from './entities.js'

export class GameEngine {
  constructor(canvas, state) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.state = state            // reactive Vue ref
    this.input = null

    this.width = 0
    this.height = 0
    this.gameTime = 0

    // ── Game state ──
    this.score = 0
    this.lives = 3
    this.wave = 1
    this.gameOver = false

    // ── Time slow ──
    this.slowActive = false
    this.slowEnergy = 100
    this.slowMaxEnergy = 100
    this.slowDrainRate = 18       // units / s while held
    this.slowRegenRate = 30       // units / s while idle
    this.slowFactor = 0.15        // 0.15 = 85 % slow

    // ── Entities ──
    this.player = null
    this.enemies = []
    this.bullets = []
    this.particles = []
    this.popups = []

    // ── Background ──
    this.bgTime = 0
    this.ambientParticles = []
    this.bgShapes = []

    // ── Spawning / waves ──
    this.spawnTimer = 0
    this.spawnInterval = 2.2
    this.maxEnemies = 5
    this.waveSpawned = 0
    this.enemiesPerWave = 5
    this.waveCooldown = 0

    // ── Wave announcement ──
    this.announcement = null      // { text, timer }

    // ── Timing ──
    this.rafId = null
    this.lastTime = 0
    this.running = false
  }

  // ────────────────────────────────────────────
  //  Lifecycle
  // ────────────────────────────────────────────

  init() {
    this._resize()
    this.input = new InputManager()
    this.player = new Player(this.width / 2, this.height - 60, this.width, this.height)
    this._initBackground()
    window.addEventListener('resize', this._onResize)
    this.start()
  }

  start() {
    this.running = true
    this.lastTime = performance.now()
    this._loop(this.lastTime)
  }

  destroy() {
    this.running = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this._onResize)
    if (this.input) this.input.destroy()
  }

  // ────────────────────────────────────────────
  //  Main loop
  // ────────────────────────────────────────────

  _loop = (now) => {
    if (!this.running) return
    const rawDt = (now - this.lastTime) / 1000
    const dt = Math.min(rawDt, 0.05)          // cap to avoid spiral-of-death
    this.lastTime = now
    this.gameTime += dt

    this._update(dt)
    this._render()
    this._syncState()

    this.rafId = requestAnimationFrame(this._loop)
  }

  // ────────────────────────────────────────────
  //  Update
  // ────────────────────────────────────────────

  _update(dt) {
    this._updateTimeSlow(dt)

    const sf = this.slowActive ? this.slowFactor : 1
    const gdt = dt * sf                       // game-time delta

    if (this.gameOver) {
      this._updateBackground(dt)
      if (this.input.wasJustPressed()) this._restart()
      return
    }

    // Player runs in real-time (responsive aiming)
    this.player.update(this.input, dt)

    // Shoot while left mouse is held
    if (this.input.mouse.down && this.player.canShoot()) {
      const angle = this.player.getShootAngle(this.input)
      const bx = this.player.x + Math.cos(angle) * 16
      const by = this.player.y + Math.sin(angle) * 16
      this.bullets.push(new Bullet(bx, by, angle))
      for (let i = 0; i < 3; i++) {
        this.particles.push(new Particle(bx, by, '#88ddff', 60, 0.18, 2))
      }
    }

    this._updateEnemies(gdt)
    this._updateBullets(gdt)
    this._updateParticles(dt)
    this._updateBackground(dt)
    this._updateSpawning(gdt)
    this._checkCollisions()
    this._updateWave(gdt)
    this._updatePopups(dt)
    this._updateAnnouncement(dt)
  }

  // ────────────────────────────────────────────
  //  Time slow
  // ────────────────────────────────────────────

  _updateTimeSlow(dt) {
    const want = this.input?.isSlowPressed() ?? false

    if (want && this.slowEnergy > 0 && !this.gameOver) {
      this.slowActive = true
      this.slowEnergy -= this.slowDrainRate * dt
      if (this.slowEnergy <= 0) {
        this.slowEnergy = 0
        this.slowActive = false
      }
    } else {
      this.slowActive = false
      this.slowEnergy += this.slowRegenRate * dt
      if (this.slowEnergy > this.slowMaxEnergy) this.slowEnergy = this.slowMaxEnergy
    }
  }

  // ────────────────────────────────────────────
  //  Sub-updates
  // ────────────────────────────────────────────

  _updateEnemies(dt) {
    for (const e of this.enemies) e.update(dt)
    this.enemies = this.enemies.filter(e => e.alive)
  }

  _updateBullets(dt) {
    for (const b of this.bullets) b.update(dt)
    this.bullets = this.bullets.filter(b => b.alive && !b.isOffScreen(this.width, this.height))
  }

  _updateParticles(dt) {
    for (const p of this.particles) p.update(dt)
    this.particles = this.particles.filter(p => p.alive)
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600)
  }

  _updatePopups(dt) {
    for (const p of this.popups) p.update(dt)
    this.popups = this.popups.filter(p => p.alive)
  }

  _updateAnnouncement(dt) {
    if (this.announcement) {
      this.announcement.timer -= dt
      if (this.announcement.timer <= 0) this.announcement = null
    }
  }

  // ────────────────────────────────────────────
  //  Background
  // ────────────────────────────────────────────

  _initBackground() {
    this.bgShapes = []
    for (let i = 0; i < 10; i++) {
      this.bgShapes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 40 + Math.random() * 90,
        sides: 3 + Math.floor(Math.random() * 4),
        rotation: Math.random() * TAU,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        alpha: 0.03 + Math.random() * 0.06,
        hue: 200 + Math.random() * 160,
        phase: Math.random() * TAU,
      })
    }

    this.ambientParticles = []
    for (let i = 0; i < 60; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.6 + Math.random() * 2,
        alpha: 0.15 + Math.random() * 0.5,
        speed: 4 + Math.random() * 14,
        phase: Math.random() * TAU,
      })
    }
  }

  _updateBackground(dt) {
    this.bgTime += dt

    for (const ap of this.ambientParticles) {
      ap.y -= ap.speed * dt
      ap.x += Math.sin(ap.phase + this.bgTime * 0.5) * 8 * dt
      if (ap.y < -10) {
        ap.y = this.height + 10
        ap.x = Math.random() * this.width
      }
    }

    for (const s of this.bgShapes) {
      s.rotation += s.rotSpeed * dt
      s.y += Math.sin(s.phase + this.bgTime * 0.15) * 6 * dt
      s.x += Math.cos(s.phase + this.bgTime * 0.2) * 6 * dt
      if (s.x < -120) s.x = this.width + 120
      if (s.x > this.width + 120) s.x = -120
      if (s.y < -120) s.y = this.height + 120
      if (s.y > this.height + 120) s.y = -120
    }
  }

  _resize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height

    if (this.player) {
      this.player.canvasW = this.width
      this.player.canvasH = this.height
      this.player.y = this.height - 60
    }
    this._initBackground()
  }

  _onResize = () => this._resize()

  // ────────────────────────────────────────────
  //  Spawning & waves
  // ────────────────────────────────────────────

  _updateSpawning(dt) {
    if (this.enemies.length >= this.maxEnemies) return
    if (this.waveSpawned >= this.enemiesPerWave) return

    this.spawnTimer += dt
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0
      this._spawnEnemy()
    }
  }

  _spawnEnemy() {
    const m = 50
    const x = m + Math.random() * (this.width - m * 2)
    const y = m + Math.random() * (this.height * 0.65 - m)
    const e = new Enemy(x, y, this.wave)
    e.setBounds(this.width, this.height)
    this.enemies.push(e)
    this.waveSpawned++
  }

  _updateWave(dt) {
    if (this.waveSpawned >= this.enemiesPerWave && this.enemies.length === 0) {
      if (this.waveCooldown <= 0) {
        this.waveCooldown = 3.5
      }
      this.waveCooldown -= dt
      if (this.waveCooldown <= 0) {
        this.wave++
        this.waveSpawned = 0
        this.enemiesPerWave = 5 + this.wave * 2
        this.maxEnemies = Math.min(5 + this.wave, 14)
        this.spawnInterval = Math.max(1, 2.2 - this.wave * 0.08)
        this.waveCooldown = 0

        // Announcement
        this.announcement = { text: `— 第 ${this.wave} 波 —`, timer: 2.2 }

        // Wave-start particle burst
        for (let i = 0; i < 30; i++) {
          this.particles.push(
            new Particle(
              this.width / 2 + (Math.random() - 0.5) * 200,
              this.height / 2,
              `hsl(${Math.random() * 360}, 80%, 60%)`,
              120,
              1.2,
              3,
            ),
          )
        }
      }
    }
  }

  // ────────────────────────────────────────────
  //  Collisions
  // ────────────────────────────────────────────

  _checkCollisions() {
    // Bullet → Enemy
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue
        const dx = bullet.x - enemy.x
        const dy = bullet.y - enemy.y
        if (dx * dx + dy * dy < (enemy.radius + bullet.radius) ** 2) {
          bullet.alive = false
          const killed = enemy.takeDamage(1)

          if (killed) {
            this.score += enemy.points
            this.particles.push(...createExplosion(enemy.x, enemy.y, enemy.particleColor, 28))
            this.popups.push(new ScorePopup(enemy.x, enemy.y - 10, `+${enemy.points}`, '#ffdd88'))

            // Gold burst
            for (let i = 0; i < 6; i++) {
              this.particles.push(
                new Particle(enemy.x, enemy.y, '#ffff88', 30, 0.5, 2),
              )
            }
          } else {
            // Hit spark
            for (let i = 0; i < 6; i++) {
              this.particles.push(
                new Particle(bullet.x, bullet.y, '#ffffff', 120, 0.25, 2),
              )
            }
          }
          break
        }
      }
    }

    // Enemy → Player
    if (!this.player.getInvincible()) {
      for (const enemy of this.enemies) {
        const dx = this.player.x - enemy.x
        const dy = this.player.y - enemy.y
        if (dx * dx + dy * dy < (enemy.radius + 14) ** 2) {
          if (this.player.hit()) {
            this.lives--
            this.particles.push(...createExplosion(this.player.x, this.player.y, '#ff4488', 30))

            if (this.lives <= 0) {
              this.gameOver = true
              for (let i = 0; i < 50; i++) {
                this.particles.push(
                  new Particle(
                    this.player.x + (Math.random() - 0.5) * 120,
                    this.player.y + (Math.random() - 0.5) * 120,
                    ['#ff4488', '#ffaa44', '#ff66aa', '#8844ff'][Math.floor(Math.random() * 4)],
                    150 + Math.random() * 180,
                    1.2 + Math.random() * 0.8,
                    3 + Math.random() * 3,
                  ),
                )
              }
            }
          }
          break
        }
      }
    }
  }

  // ────────────────────────────────────────────
  //  Restart
  // ────────────────────────────────────────────

  _restart() {
    this.score = 0
    this.lives = 3
    this.wave = 1
    this.gameOver = false
    this.slowEnergy = 100
    this.slowActive = false
    this.enemies = []
    this.bullets = []
    this.particles = []
    this.popups = []
    this.spawnTimer = 0
    this.waveSpawned = 0
    this.enemiesPerWave = 5
    this.maxEnemies = 5
    this.player = new Player(this.width / 2, this.height - 60, this.width, this.height)
    this.gameTime = 0
    this.announcement = { text: '— 第 1 波 —', timer: 2 }
  }

  // ────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────

  _render() {
    const ctx = this.ctx
    const w = this.width
    const h = this.height

    ctx.clearRect(0, 0, w, h)

    this._renderBackground(ctx, w, h)
    this._renderAmbientParticles(ctx)

    // Particles (behind most gameplay)
    for (const p of this.particles) p.render(ctx)

    // Bullets
    for (const b of this.bullets) b.render(ctx)

    // Enemies
    for (const e of this.enemies) e.render(ctx, this.slowActive)

    // Player
    if (!this.gameOver) this.player.render(ctx)

    // Score popups
    for (const p of this.popups) p.render(ctx)

    // Wave announcement
    this._renderAnnouncement(ctx, w, h)

    // Time-slow overlay
    if (this.slowActive) this._renderSlowOverlay(ctx, w, h)

    // Crosshair
    this._renderCrosshair(ctx)

    // Low-energy warning
    if (this.slowEnergy < 15 && !this.slowActive && !this.gameOver) {
      ctx.save()
      ctx.fillStyle = `rgba(255, 100, 100, ${0.3 + Math.sin(this.gameTime * 4) * 0.2})`
      ctx.font = '13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('时缓能量不足', w / 2, h - 68)
      ctx.restore()
    }
  }

  // ── Background layers ──

  _renderBackground(ctx, w, h) {
    const h1 = (this.bgTime * 5 + 240) % 360
    const h2 = (this.bgTime * 3 + 280) % 360
    const h3 = (this.bgTime * 4 + 200) % 360

    const grad = ctx.createRadialGradient(
      w / 2 + Math.sin(this.bgTime * 0.1) * w * 0.2,
      h / 2 + Math.cos(this.bgTime * 0.12) * h * 0.2,
      0,
      w / 2, h / 2, w * 0.85,
    )
    grad.addColorStop(0, `hsl(${h1}, 50%, 14%)`)
    grad.addColorStop(0.5, `hsl(${h2}, 55%, 9%)`)
    grad.addColorStop(1, `hsl(${h3}, 40%, 4%)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Floating geometry
    for (const s of this.bgShapes) {
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(s.rotation)
      ctx.strokeStyle = `hsla(${s.hue}, 55%, 50%, ${s.alpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i <= s.sides; i++) {
        const a = (i / s.sides) * TAU
        const px = Math.cos(a) * s.size
        const py = Math.sin(a) * s.size
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.restore()
    }
  }

  _renderAmbientParticles(ctx) {
    for (const ap of this.ambientParticles) {
      const twinkle = 0.4 + Math.sin(ap.phase + this.bgTime * 2) * 0.6
      ctx.fillStyle = `rgba(200, 220, 255, ${ap.alpha * twinkle})`
      ctx.beginPath()
      ctx.arc(ap.x, ap.y, ap.size, 0, TAU)
      ctx.fill()
    }
  }

  _renderAnnouncement(ctx, w, h) {
    if (!this.announcement) return
    const t = this.announcement.timer
    if (t <= 0) return
    const alpha = Math.min(t, 1) * Math.min(t * 2, 1)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px "Segoe UI", "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#8844ff'
    ctx.shadowBlur = 40
    ctx.fillText(this.announcement.text, w / 2, h / 2 - 40)
    ctx.restore()
  }

  _renderSlowOverlay(ctx, w, h) {
    // Blue vignette
    const g1 = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7)
    g1.addColorStop(0, 'rgba(40, 80, 200, 0)')
    g1.addColorStop(0.5, 'rgba(40, 80, 200, 0)')
    g1.addColorStop(1, 'rgba(30, 50, 160, 0.22)')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, w, h)

    // Edge darkening
    const g2 = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8)
    g2.addColorStop(0, 'rgba(0,0,0,0)')
    g2.addColorStop(1, 'rgba(0,0,30,0.25)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, w, h)

    // Floating motes
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU
      const d = 60 + Math.random() * Math.min(w, h) * 0.35
      ctx.fillStyle = 'rgba(100, 200, 255, 0.08)'
      ctx.beginPath()
      ctx.arc(
        w / 2 + Math.cos(a) * d,
        h / 2 + Math.sin(a) * d,
        1.5 + Math.random() * 2,
        0, TAU,
      )
      ctx.fill()
    }
  }

  _renderCrosshair(ctx) {
    const mx = this.input.mouse.x
    const my = this.input.mouse.y
    const size = 14
    const gap = 5

    ctx.save()
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.5)'
    ctx.lineWidth = 1.5
    ctx.shadowColor = 'rgba(100, 200, 255, 0.25)'
    ctx.shadowBlur = 6

    ctx.beginPath()
    ctx.moveTo(mx - size, my); ctx.lineTo(mx - gap, my)
    ctx.moveTo(mx + gap, my);  ctx.lineTo(mx + size, my)
    ctx.moveTo(mx, my - size); ctx.lineTo(mx, my - gap)
    ctx.moveTo(mx, my + gap);  ctx.lineTo(mx, my + size)
    ctx.stroke()

    ctx.fillStyle = 'rgba(200, 220, 255, 0.35)'
    ctx.beginPath()
    ctx.arc(mx, my, 1.5, 0, TAU)
    ctx.fill()

    ctx.restore()
  }

  // ────────────────────────────────────────────
  //  Sync to Vue
  // ────────────────────────────────────────────

  _syncState() {
    this.state.score = this.score
    this.state.lives = this.lives
    this.state.timeSlowEnergy = this.slowEnergy
    this.state.timeSlowMaxEnergy = this.slowMaxEnergy
    this.state.timeSlowActive = this.slowActive
    this.state.wave = this.wave
    this.state.gameOver = this.gameOver
  }
}

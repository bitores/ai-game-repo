const TAU = Math.PI * 2

import { InputManager } from './input.js'
import {
  Player, Bullet, Enemy, Particle, createExplosion, ScorePopup,
  Asteroid, Boss, XpOrb,
} from './entities.js'

// ── Upgrade definitions ──────────────────────
const UPGRADES = [
  { id: 'fireRate',  name: '攻击速度', desc: '射击间隔缩短 15%',  maxLevel: 5, icon: '⚡', perLevel: 0.85 },
  { id: 'damage',    name: '火力增强', desc: '子弹伤害 +1',       maxLevel: 5, icon: '🔥', perLevel: 1 },
  { id: 'multiShot', name: '多重射击', desc: '额外子弹 +1 发',    maxLevel: 3, icon: '✦',  perLevel: 1 },
  { id: 'moveSpeed', name: '机动强化', desc: '移动速度 +12%',     maxLevel: 5, icon: '➤',  perLevel: 1.12 },
  { id: 'shield',    name: '能量护盾', desc: '额外护盾 +1 层',    maxLevel: 3, icon: '🛡',  perLevel: 1 },
  { id: 'bulletSpeed', name: '弹速提升', desc: '子弹速度 +15%',   maxLevel: 5, icon: '▶',  perLevel: 1.15 },
]

export class GameEngine {
  constructor(canvas, state) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.state = state
    this.input = null

    this.width = 0
    this.height = 0
    this.gameTime = 0

    // ── Core game state ──
    this.score = 0
    this.lives = 3
    this.wave = 1
    this.gameOver = false

    // ── Time slow ──
    this.slowActive = false
    this.slowEnergy = 100
    this.slowMaxEnergy = 100
    this.slowDrainRate = 18
    this.slowRegenRate = 30
    this.slowFactor = 0.15

    // ── Entities ──
    this.player = null
    this.enemies = []
    this.bullets = []
    this.particles = []
    this.popups = []

    // ── Asteroids ──
    this.asteroids = []
    this.asteroidTimer = 0
    this.asteroidInterval = 2.0
    this.asteroidMinInterval = 0.6

    // ── Boss ──
    this.boss = null
    this.bossActive = false
    this.isBossWave = false

    // ── XP / Upgrade system ──
    this.xp = 0
    this.level = 0
    this.xpToNext = 30
    this.xpOrbs = []
    this.isUpgrading = false
    this.upgradeOptions = []
    this.selectedUpgrade = null
    this.playerUpgrades = {
      fireRate: 0,
      damage: 0,
      multiShot: 0,
      moveSpeed: 0,
      shield: 0,
      bulletSpeed: 0,
    }
    this.shieldCharges = 0

    // ── Spawning / waves ──
    this.spawnTimer = 0
    this.spawnInterval = 2.2
    this.maxEnemies = 5
    this.waveSpawned = 0
    this.enemiesPerWave = 5
    this.waveCooldown = 0

    // ── Wave announcement ──
    this.announcement = null

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
    const dt = Math.min(rawDt, 0.05)
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
    const gdt = dt * sf

    if (this.gameOver) {
      this._updateBackground(dt)
      if (this.input.wasJustPressed()) this._restart()
      return
    }

    // If upgrading, pause game but still render background
    if (this.isUpgrading) {
      this._updateBackground(dt)
      this._updateParticles(dt)

      // Check for HUD upgrade selection via state
      if (this.state.selectedUpgradeIndex !== undefined && this.state.selectedUpgradeIndex !== null) {
        const idx = this.state.selectedUpgradeIndex
        this.state.selectedUpgradeIndex = null
        this.selectUpgrade(idx)
      }

      // Check for internal selection
      if (this.selectedUpgrade !== null) {
        this._applyUpgrade(this.selectedUpgrade)
        this.selectedUpgrade = null
        this.isUpgrading = false
      }
      return
    }

    // Player
    this.player.update(this.input, dt)

    // Apply upgrades to player attributes before shooting
    this._applyPlayerUpgrades()

    // Shooting
    if (this.input.mouse.down && this.player.canShoot()) {
      const angle = this.player.getShootAngle(this.input)
      const dmg = 1 + (this.playerUpgrades.damage || 0)
      const bSpeed = 900 * (this.playerUpgrades.bulletSpeed ? Math.pow(1.15, this.playerUpgrades.bulletSpeed) : 1)
      const multi = (this.playerUpgrades.multiShot || 0)

      // Main bullet
      const bx = this.player.x + Math.cos(angle) * 16
      const by = this.player.y + Math.sin(angle) * 16
      this.bullets.push(new Bullet(bx, by, angle, bSpeed, dmg))

      // Multi-shot extra bullets
      for (let i = 1; i <= multi; i++) {
        const spread = i * 0.08
        this.bullets.push(new Bullet(bx, by, angle + spread, bSpeed, dmg))
        this.bullets.push(new Bullet(bx, by, angle - spread, bSpeed, dmg))
      }

      for (let i = 0; i < 3; i++) {
        this.particles.push(new Particle(bx, by, '#88ddff', 60, 0.18, 2))
      }
    }

    // Entities
    this._updateEnemies(gdt)
    this._updateBullets(gdt)
    this._updateParticles(dt)
    this._updateBackground(dt)
    this._updateSpawning(gdt)
    this._updateAsteroids(gdt)
    this._updateBoss(gdt)
    this._updateXpOrbs(gdt)
    this._checkCollisions()
    this._updateWave(gdt)
    this._updatePopups(dt)
    this._updateAnnouncement(dt)
    this._updateXpSystem(dt)
  }

  // ────────────────────────────────────────────
  //  Time slow
  // ────────────────────────────────────────────

  _updateTimeSlow(dt) {
    const want = this.input?.isSlowPressed() ?? false

    if (want && this.slowEnergy > 0 && !this.gameOver && !this.isUpgrading) {
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
  //  Upgrade helpers
  // ────────────────────────────────────────────

  _applyPlayerUpgrades() {
    const msMult = this.playerUpgrades.moveSpeed
      ? Math.pow(1.12, this.playerUpgrades.moveSpeed)
      : 1
    this.player.moveSpeed = 10 * msMult

    const frMult = this.playerUpgrades.fireRate
      ? Math.pow(0.85, this.playerUpgrades.fireRate)
      : 1
    this.player.shootRate = 0.1 * frMult
  }

  _updateXpSystem(dt) {
    if (this.xp >= this.xpToNext && !this.isUpgrading) {
      this._triggerUpgrade()
    }
  }

  _triggerUpgrade() {
    this.isUpgrading = true
    this.upgradeOptions = this._generateUpgradeOptions()
    this.selectedUpgrade = null
  }

  _generateUpgradeOptions() {
    const available = UPGRADES.filter(
      u => (this.playerUpgrades[u.id] || 0) < u.maxLevel
    )
    if (available.length === 0) {
      // All maxed out — just reset XP threshold
      this.xp = 0
      this.isUpgrading = false
      return []
    }
    // Shuffle and pick 3
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3).map(u => ({
      ...u,
      currentLevel: this.playerUpgrades[u.id] || 0,
    }))
  }

  _applyUpgrade(upgradeId) {
    const upg = UPGRADES.find(u => u.id === upgradeId)
    if (!upg) return

    const current = this.playerUpgrades[upgradeId] || 0
    if (current >= upg.maxLevel) return

    this.playerUpgrades[upgradeId] = current + 1

    // Apply shield immediately
    if (upgradeId === 'shield') {
      this.shieldCharges++
    }

    // Consume XP and increment level
    this.xp = 0
    this.level++
    this.xpToNext = Math.floor(30 + this.level * 25)

    // Upgrade particles
    for (let i = 0; i < 40; i++) {
      this.particles.push(
        new Particle(
          this.width / 2 + (Math.random() - 0.5) * 100,
          this.height / 2,
          `hsl(${Math.random() * 360}, 80%, 60%)`,
          150,
          1.0,
          3,
        )
      )
    }
  }

  selectUpgrade(index) {
    if (!this.isUpgrading) return
    const opt = this.upgradeOptions[index]
    if (!opt) return
    this.selectedUpgrade = opt.id
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
    if (this.particles.length > 800) this.particles.splice(0, this.particles.length - 800)
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

  // ── Asteroids ──

  _updateAsteroids(dt) {
    // Spawning
    if (!this.gameOver && !this.isBossWave) {
      this.asteroidTimer += dt
      const interval = Math.max(
        this.asteroidMinInterval,
        this.asteroidInterval - this.wave * 0.08
      )
      if (this.asteroidTimer >= interval) {
        this.asteroidTimer = 0
        this._spawnAsteroid()
      }
    }

    for (const a of this.asteroids) a.update(dt)
    this.asteroids = this.asteroids.filter(
      a => a.alive && !a.isOffScreen(this.width, this.height)
    )

    // Cap asteroids
    if (this.asteroids.length > 15) {
      this.asteroids.splice(0, this.asteroids.length - 15)
    }
  }

  _spawnAsteroid() {
    const x = 20 + Math.random() * (this.width - 40)
    const y = -40 - Math.random() * 20
    const sizeRoll = Math.random()
    let size
    if (sizeRoll < 0.2) size = 'large'
    else if (sizeRoll < 0.55) size = 'medium'
    else size = 'small'

    const a = new Asteroid(x, y, size)
    // Slight horizontal drift
    a.vx += (Math.random() - 0.5) * 15
    this.asteroids.push(a)
  }

  _breakAsteroid(asteroid) {
    if (asteroid.size === 'large') {
      for (let i = 0; i < 3; i++) {
        const a = new Asteroid(
          asteroid.x + (Math.random() - 0.5) * 10,
          asteroid.y + (Math.random() - 0.5) * 10,
          'medium',
          asteroid.vx * 0.3 + (Math.random() - 0.5) * 30,
          asteroid.vy * 0.3 + (Math.random() - 0.5) * 20
        )
        this.asteroids.push(a)
      }
    } else if (asteroid.size === 'medium') {
      for (let i = 0; i < 3; i++) {
        const a = new Asteroid(
          asteroid.x + (Math.random() - 0.5) * 8,
          asteroid.y + (Math.random() - 0.5) * 8,
          'small',
          asteroid.vx * 0.4 + (Math.random() - 0.5) * 40,
          asteroid.vy * 0.4 + (Math.random() - 0.5) * 30
        )
        this.asteroids.push(a)
      }
    }
  }

  // ── Boss ──

  _updateBoss(dt) {
    if (!this.bossActive || !this.boss) return

    this.boss.update(dt, this.player.x, this.player.y)

    // Spawn minions
    if (this.boss.shouldSpawnMinion()) {
      this.boss.resetMinionTimer()
      // Create a minion enemy near boss
      const mx = this.boss.x + (Math.random() - 0.5) * 100
      const my = this.boss.y + 30 + Math.random() * 20
      const minion = new Enemy(mx, my, this.wave)
      minion.radius = 12
      minion.hp = 2
      minion.maxHp = 2
      minion.points = 150
      minion.type = 'small'
      minion.hue = (this.boss.hue + 60) % 360
      minion.color = `hsl(${minion.hue}, 80%, 60%)`
      minion.glowColor = `hsla(${minion.hue}, 80%, 60%, 0.2)`
      minion.particleColor = `hsl(${minion.hue}, 85%, 55%)`
      minion.setBounds(this.width, this.height)
      this.enemies.push(minion)
    }

    if (!this.boss.alive) {
      // Boss defeated!
      this.bossActive = false

      // Big explosion
      for (let i = 0; i < 80; i++) {
        this.particles.push(
          new Particle(
            this.boss.x + (Math.random() - 0.5) * 60,
            this.boss.y + (Math.random() - 0.5) * 60,
            [`hsl(${this.boss.hue}, 80%, 60%)`, '#ffdd88', '#ff4488', '#ffffff'][Math.floor(Math.random() * 4)],
            200 + Math.random() * 300,
            1.5 + Math.random() * 1.5,
            3 + Math.random() * 4,
          )
        )
      }

      // Score
      this.score += this.boss.points
      this.popups.push(new ScorePopup(this.boss.x, this.boss.y - 20, `BOSS击杀 +${this.boss.points}`, '#ffdd88'))

      // Large XP drop
      for (let i = 0; i < 20; i++) {
        const orb = new XpOrb(
          this.boss.x + (Math.random() - 0.5) * 50,
          this.boss.y + (Math.random() - 0.5) * 50,
          15 + Math.floor(Math.random() * 10)
        )
        this.xpOrbs.push(orb)
      }

      this.boss = null

      // Announce boss defeated
      this.announcement = { text: '— BOSS 已击破 —', timer: 2.5 }
    }
  }

  _startBossWave() {
    this.isBossWave = true
    this.bossActive = true

    // Clear existing enemies
    this.enemies = []

    // Clear existing bullets
    this.bullets = []

    // Spawn boss
    const bx = this.width / 2
    const by = 100
    this.boss = new Boss(bx, by, this.wave, this.level)
    this.boss.setBounds(this.width, this.height)

    this.announcement = {
      text: `⚠  BOSS 来袭  —  第 ${this.wave} 波  ⚠`,
      timer: 3.0,
    }

    // Boss entrance particles
    for (let i = 0; i < 40; i++) {
      this.particles.push(
        new Particle(
          bx + (Math.random() - 0.5) * 200,
          by + (Math.random() - 0.5) * 100,
          `hsl(${(i * 20 + 280) % 360}, 80%, 60%)`,
          100,
          1.0,
          3,
        )
      )
    }
  }

  // ── XP Orbs ──

  _updateXpOrbs(dt) {
    const playerX = this.player.x
    const playerY = this.player.y

    // Check if player is close enough to attract
    for (const orb of this.xpOrbs) {
      if (!orb.alive) continue
      const dx = playerX - orb.x
      const dy = playerY - orb.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const attract = dist < 120

      const result = orb.update(dt, playerX, playerY, attract)
      if (result === 'collected') {
        this.xp += orb.value
        // Popup
        this.popups.push(new ScorePopup(orb.x, orb.y - 10, `+${orb.value} XP`, '#66ff88'))
      }
    }
    this.xpOrbs = this.xpOrbs.filter(o => o.alive)
  }

  // ────────────────────────────────────────────
  //  Background
  // ────────────────────────────────────────────

  _initBackground() {
    this.bgTime = 0
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
    if (this.boss) {
      this.boss.setBounds(this.width, this.height)
    }
    this._initBackground()
  }

  _onResize = () => this._resize()

  // ────────────────────────────────────────────
  //  Spawning & waves
  // ────────────────────────────────────────────

  _updateSpawning(dt) {
    // Don't spawn regular enemies during boss wave
    if (this.isBossWave) return

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

    // Give alien-flavored hues (greens, purples, cyans)
    const hue = Math.random() < 0.5
      ? 120 + Math.random() * 80    // green range
      : 240 + Math.random() * 100   // purple/blue range
    e.hue = hue
    e.color = `hsl(${hue}, 80%, 60%)`
    e.glowColor = `hsla(${hue}, 80%, 60%, 0.2)`
    e.particleColor = `hsl(${hue}, 85%, 55%)`

    this.enemies.push(e)
    this.waveSpawned++
  }

  _updateWave(dt) {
    if (this.isBossWave) {
      // Boss wave: check if boss is dead
      if (!this.bossActive || !this.boss) {
        if (this.waveCooldown <= 0) {
          this.waveCooldown = 3.0
        }
        this.waveCooldown -= dt
        if (this.waveCooldown <= 0) {
          this.wave++
          this.waveSpawned = 0
          this.enemiesPerWave = 5 + this.wave * 2
          this.maxEnemies = Math.min(5 + this.wave, 14)
          this.spawnInterval = Math.max(1, 2.2 - this.wave * 0.08)
          this.waveCooldown = 0
          this.isBossWave = false
          this.announcement = { text: `— 第 ${this.wave} 波 —`, timer: 2.2 }
        }
      }
      return
    }

    if (this.waveSpawned >= this.enemiesPerWave && this.enemies.length === 0) {
      if (this.waveCooldown <= 0) {
        this.waveCooldown = 3.5
      }
      this.waveCooldown -= dt
      if (this.waveCooldown <= 0) {
        this.wave++

        // Check if next wave is a boss wave
        if (this.wave % 5 === 0) {
          this.waveSpawned = 0
          this.waveCooldown = 0
          this._startBossWave()
          return
        }

        this.waveSpawned = 0
        this.enemiesPerWave = 5 + this.wave * 2
        this.maxEnemies = Math.min(5 + this.wave, 14)
        this.spawnInterval = Math.max(1, 2.2 - this.wave * 0.08)
        this.waveCooldown = 0

        this.announcement = { text: `— 第 ${this.wave} 波 —`, timer: 2.2 }

        // Wave-start particles
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
    // ── Bullet → Enemy ──
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue
        const dx = bullet.x - enemy.x
        const dy = bullet.y - enemy.y
        if (dx * dx + dy * dy < (enemy.radius + bullet.radius) ** 2) {
          bullet.alive = false
          const killed = enemy.takeDamage(bullet.damage || 1)

          if (killed) {
            this.score += enemy.points
            this.particles.push(...createExplosion(enemy.x, enemy.y, enemy.particleColor, 28))
            this.popups.push(new ScorePopup(enemy.x, enemy.y - 10, `+${enemy.points}`, '#ffdd88'))

            // XP drop
            const xpVal = 5 + Math.floor(Math.random() * 5)
            this.xpOrbs.push(new XpOrb(enemy.x, enemy.y, xpVal))

            // Gold burst
            for (let i = 0; i < 6; i++) {
              this.particles.push(
                new Particle(enemy.x, enemy.y, '#ffff88', 30, 0.5, 2),
              )
            }
          } else {
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

    // ── Bullet → Asteroid ──
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue
      for (const asteroid of this.asteroids) {
        if (!asteroid.alive) continue
        const dx = bullet.x - asteroid.x
        const dy = bullet.y - asteroid.y
        if (dx * dx + dy * dy < (asteroid.radius + bullet.radius) ** 2) {
          bullet.alive = false
          const killed = asteroid.takeDamage(bullet.damage || 1)

          if (killed) {
            this.score += asteroid.points
            this.particles.push(...createExplosion(asteroid.x, asteroid.y, '#aa8866', 20))
            this._breakAsteroid(asteroid)

            // XP drop
            const xpVal = 3 + Math.floor(Math.random() * 4)
            this.xpOrbs.push(new XpOrb(asteroid.x, asteroid.y, xpVal))
          } else {
            for (let i = 0; i < 4; i++) {
              this.particles.push(
                new Particle(bullet.x, bullet.y, '#ccaa88', 60, 0.2, 2),
              )
            }
          }
          break
        }
      }
    }

    // ── Bullet → Boss ──
    if (this.bossActive && this.boss && this.boss.alive) {
      for (const bullet of this.bullets) {
        if (!bullet.alive) continue
        const dx = bullet.x - this.boss.x
        const dy = bullet.y - this.boss.y
        if (dx * dx + dy * dy < (this.boss.radius + bullet.radius) ** 2) {
          bullet.alive = false
          const killed = this.boss.takeDamage(bullet.damage || 1)

          if (killed) {
            // Handled in _updateBoss
          } else {
            for (let i = 0; i < 4; i++) {
              this.particles.push(
                new Particle(bullet.x, bullet.y, `hsl(${this.boss.hue}, 80%, 60%)`, 80, 0.3, 2),
              )
            }
          }
        }
      }
    }

    // ── Enemy → Player ──
    if (!this.player.getInvincible()) {
      for (const enemy of this.enemies) {
        const dx = this.player.x - enemy.x
        const dy = this.player.y - enemy.y
        if (dx * dx + dy * dy < (enemy.radius + 14) ** 2) {
          if (this.player.hit()) {
            this._onPlayerHit()
          }
          break
        }
      }
    }

    // ── Asteroid → Player ──
    if (!this.player.getInvincible()) {
      for (const asteroid of this.asteroids) {
        if (!asteroid.alive) continue
        const dx = this.player.x - asteroid.x
        const dy = this.player.y - asteroid.y
        if (dx * dx + dy * dy < (asteroid.radius + 12) ** 2) {
          if (this.player.hit()) {
            this._onPlayerHit()
            // Break asteroid on collision
            asteroid.alive = false
            this.particles.push(...createExplosion(asteroid.x, asteroid.y, '#aa8866', 15))
            this._breakAsteroid(asteroid)
          }
          break
        }
      }
    }

    // ── Boss Bullet → Player ──
    if (this.bossActive && this.boss && this.boss.alive && !this.player.getInvincible()) {
      for (const bb of this.boss.bossBullets) {
        if (!bb.alive) continue
        const dx = this.player.x - bb.x
        const dy = this.player.y - bb.y
        if (dx * dx + dy * dy < (bb.radius + 12) ** 2) {
          bb.alive = false
          if (this.player.hit()) {
            this._onPlayerHit()
          }
          break
        }
      }
    }
  }

  _onPlayerHit() {
    // Check shield first
    if (this.shieldCharges > 0) {
      this.shieldCharges--
      // Shield spark particles
      for (let i = 0; i < 20; i++) {
        this.particles.push(
          new Particle(this.player.x, this.player.y, '#44ddff', 80, 0.5, 3)
        )
      }
      this.popups.push(new ScorePopup(this.player.x, this.player.y - 20, '护盾抵消！', '#44ddff'))
      return
    }

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
    this.asteroids = []
    this.xpOrbs = []
    this.boss = null
    this.bossActive = false
    this.isBossWave = false

    this.spawnTimer = 0
    this.waveSpawned = 0
    this.enemiesPerWave = 5
    this.maxEnemies = 5

    this.xp = 0
    this.level = 0
    this.xpToNext = 30
    this.isUpgrading = false
    this.upgradeOptions = []
    this.selectedUpgrade = null
    this.shieldCharges = 0
    this.playerUpgrades = {
      fireRate: 0,
      damage: 0,
      multiShot: 0,
      moveSpeed: 0,
      shield: 0,
      bulletSpeed: 0,
    }

    this.player = new Player(this.width / 2, this.height - 60, this.width, this.height)
    this._applyPlayerUpgrades()
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

    // Asteroids
    for (const a of this.asteroids) a.render(ctx)

    // Bullets
    for (const b of this.bullets) b.render(ctx)

    // Enemies
    for (const e of this.enemies) e.render(ctx, this.slowActive)

    // Boss & boss bullets
    if (this.boss && this.boss.alive) {
      this.boss.render(ctx)
      // Boss name tag
      ctx.save()
      ctx.fillStyle = `hsla(${this.boss.hue}, 80%, 60%, 0.5)`
      ctx.font = 'bold 16px "Segoe UI", "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('外星母舰', this.boss.x, this.boss.y - this.boss.radius - 22)
      ctx.restore()
    }

    // XP orbs
    for (const o of this.xpOrbs) o.render(ctx)

    // Player
    if (!this.gameOver) this.player.render(ctx)

    // Score popups
    for (const p of this.popups) p.render(ctx)

    // Wave / boss announcement
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

    // Upgrade menu (rendered on canvas as fallback)
    if (this.isUpgrading) {
      this._renderUpgradeMenu(ctx, w, h)
    }
  }

  // ── Upgrade menu overlay ──
  _renderUpgradeMenu(ctx, w, h) {
    // Dim overlay
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 10, 0.65)'
    ctx.fillRect(0, 0, w, h)

    // Title
    ctx.fillStyle = '#88ddff'
    ctx.font = 'bold 32px "Segoe UI", "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#44aaff'
    ctx.shadowBlur = 30
    ctx.fillText('升级选择', w / 2, h * 0.2)

    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '16px "Segoe UI", "PingFang SC", sans-serif'
    ctx.fillText(`等级 ${this.level}  ·  点击选择一项升级`, w / 2, h * 0.2 + 40)

    // Upgrade cards
    const cardW = 200
    const cardH = 150
    const gap = 30
    const totalW = this.upgradeOptions.length * cardW + (this.upgradeOptions.length - 1) * gap
    const startX = (w - totalW) / 2
    const cardY = h * 0.4

    for (let i = 0; i < this.upgradeOptions.length; i++) {
      const opt = this.upgradeOptions[i]
      const cx = startX + i * (cardW + gap)
      const cy = cardY

      // Card bg
      ctx.shadowBlur = 15
      ctx.shadowColor = 'rgba(100, 200, 255, 0.15)'
      ctx.fillStyle = 'rgba(10, 20, 40, 0.8)'
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)'
      ctx.lineWidth = 1.5

      // Rounded rect
      const r = 12
      ctx.beginPath()
      ctx.moveTo(cx + r, cy)
      ctx.lineTo(cx + cardW - r, cy)
      ctx.quadraticCurveTo(cx + cardW, cy, cx + cardW, cy + r)
      ctx.lineTo(cx + cardW, cy + cardH - r)
      ctx.quadraticCurveTo(cx + cardW, cy + cardH, cx + cardW - r, cy + cardH)
      ctx.lineTo(cx + r, cy + cardH)
      ctx.quadraticCurveTo(cx, cy + cardH, cx, cy + cardH - r)
      ctx.lineTo(cx, cy + r)
      ctx.quadraticCurveTo(cx, cy, cx + r, cy)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Icon
      ctx.shadowBlur = 0
      ctx.fillStyle = '#88ddff'
      ctx.font = '36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(opt.icon, cx + cardW / 2, cy + 40)

      // Name
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px "Segoe UI", "PingFang SC", sans-serif'
      ctx.fillText(opt.name, cx + cardW / 2, cy + 75)

      // Description
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '13px "Segoe UI", "PingFang SC", sans-serif'
      ctx.fillText(opt.desc, cx + cardW / 2, cy + 100)

      // Level
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '12px sans-serif'
      ctx.fillText(`Lv.${opt.currentLevel + 1}/${opt.maxLevel}`, cx + cardW / 2, cy + 125)
    }

    ctx.restore()
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
    const g1 = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7)
    g1.addColorStop(0, 'rgba(40, 80, 200, 0)')
    g1.addColorStop(0.5, 'rgba(40, 80, 200, 0)')
    g1.addColorStop(1, 'rgba(30, 50, 160, 0.22)')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, w, h)

    const g2 = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8)
    g2.addColorStop(0, 'rgba(0,0,0,0)')
    g2.addColorStop(1, 'rgba(0,0,30,0.25)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, w, h)

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

    // Upgrade system
    this.state.xp = this.xp
    this.state.level = this.level
    this.state.xpToNext = this.xpToNext
    this.state.isUpgrading = this.isUpgrading
    this.state.upgradeOptions = this.upgradeOptions
    this.state.playerUpgrades = { ...this.playerUpgrades }
    this.state.shieldCharges = this.shieldCharges

    // Boss
    this.state.bossActive = this.bossActive
    this.state.bossHp = this.boss && this.boss.alive ? this.boss.hp : 0
    this.state.bossMaxHp = this.boss && this.boss.alive ? this.boss.maxHp : 0
    this.state.isBossWave = this.isBossWave
  }
}

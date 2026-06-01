const TAU = Math.PI * 2

// ──────────────────────────────────────────────
//  Player
// ──────────────────────────────────────────────
export class Player {
  constructor(x, y, canvasW, canvasH) {
    this.x = x
    this.y = y
    this.canvasW = canvasW
    this.canvasH = canvasH
    this.size = 20
    this.moveSpeed = 10
    this.shootCooldown = 0
    this.shootRate = 0.1           // seconds between shots
    this.invincibleTimer = 0
    this.trail = []
  }

  update(input, dt) {
    // Smoothly follow mouse X
    const targetX = input.mouse.x
    const diff = targetX - this.x
    const maxMove = this.moveSpeed * 60 * dt
    if (Math.abs(diff) > 2) {
      this.x += Math.sign(diff) * Math.min(Math.abs(diff), maxMove)
    }

    // Clamp to canvas
    const half = this.size * 0.8
    this.x = Math.max(half, Math.min(this.canvasW - half, this.x))

    // Cooldowns
    if (this.shootCooldown > 0) this.shootCooldown -= dt
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt

    // Motion trail
    this.trail.push({ x: this.x, y: this.y, life: 1 })
    if (this.trail.length > 20) this.trail.shift()
    for (const t of this.trail) t.life -= dt * 2.5
    this.trail = this.trail.filter(t => t.life > 0)
  }

  canShoot() { return this.shootCooldown <= 0 }

  getInvincible() { return this.invincibleTimer > 0 }

  /** Call when hit by an enemy. Returns false if already invincible. */
  hit() {
    if (this.getInvincible()) return false
    this.invincibleTimer = 1.5
    return true
  }

  /** Returns the shoot angle toward the mouse, clamped to upward directions. */
  getShootAngle(input) {
    const dx = input.mouse.x - this.x
    const dy = input.mouse.y - this.y
    let angle = Math.atan2(dy, dx)
    // Clamp so the player cannot shoot behind themselves
    if (angle > Math.PI * 0.88) angle = Math.PI * 0.88
    if (angle < -Math.PI * 0.88) angle = -Math.PI * 0.88
    return angle
  }

  render(ctx) {
    // Flash while invincible
    if (this.getInvincible() && Math.floor(this.invincibleTimer * 10) % 2 === 0) return

    ctx.save()
    ctx.translate(this.x, this.y)

    // Glow aura
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.size * 2.2)
    grad.addColorStop(0, 'rgba(100, 200, 255, 0.12)')
    grad.addColorStop(1, 'rgba(100, 200, 255, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, this.size * 2.2, 0, TAU)
    ctx.fill()

    // Ship — sleek crystal dart
    ctx.strokeStyle = '#88ddff'
    ctx.lineWidth = 2
    ctx.shadowColor = '#44aaff'
    ctx.shadowBlur = 16

    ctx.beginPath()
    ctx.moveTo(0, -this.size)                        // nose
    ctx.lineTo(this.size * 0.7, this.size * 0.25)   // right wing
    ctx.lineTo(this.size * 0.3, this.size * 0.75)   // right rear
    ctx.lineTo(-this.size * 0.3, this.size * 0.75)  // left rear
    ctx.lineTo(-this.size * 0.7, this.size * 0.25)  // left wing
    ctx.closePath()
    ctx.stroke()

    // Translucent fill
    ctx.fillStyle = 'rgba(100, 200, 255, 0.12)'
    ctx.fill()

    // Core glow
    ctx.shadowBlur = 22
    ctx.fillStyle = '#66ddff'
    ctx.beginPath()
    ctx.arc(0, -this.size * 0.1, 3, 0, TAU)
    ctx.fill()

    ctx.restore()
  }
}

// ──────────────────────────────────────────────
//  Bullet
// ──────────────────────────────────────────────
export class Bullet {
  constructor(x, y, angle, speed, damage) {
    this.x = x
    this.y = y
    const spd = speed || 900
    this.vx = Math.cos(angle) * spd
    this.vy = Math.sin(angle) * spd
    this.radius = 4
    this.damage = damage || 1
    this.alive = true
    this.trail = []
  }

  update(dt) {
    // Record trail
    this.trail.push({ x: this.x, y: this.y, life: 1 })
    if (this.trail.length > 10) this.trail.shift()

    this.x += this.vx * dt
    this.y += this.vy * dt

    for (const t of this.trail) t.life -= dt * 4
    this.trail = this.trail.filter(t => t.life > 0)
  }

  isOffScreen(w, h) {
    return this.x < -60 || this.x > w + 60 || this.y < -60 || this.y > h + 60
  }

  render(ctx) {
    // Trail
    for (const t of this.trail) {
      ctx.fillStyle = `rgba(100, 220, 255, ${t.life * 0.35})`
      ctx.beginPath()
      ctx.arc(t.x, t.y, this.radius * t.life * 0.6, 0, TAU)
      ctx.fill()
    }
    // Bullet body
    ctx.save()
    ctx.shadowColor = '#66ddff'
    ctx.shadowBlur = 22
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#88eeff'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
}

// ──────────────────────────────────────────────
//  Enemy
// ──────────────────────────────────────────────
export class Enemy {
  constructor(x, y, wave) {
    this.x = x
    this.y = y

    // Size scales with wave number
    const roll = Math.random()
    if (roll < 0.5 || wave < 3) {
      this.type = 'small'
      this.radius = 14
      this.hp = 1
      this.maxHp = 1
      this.points = 100
      this.teleportInterval = 1.8 + Math.random() * 1.2
    } else if (roll < 0.8) {
      this.type = 'medium'
      this.radius = 20
      this.hp = 2
      this.maxHp = 2
      this.points = 250
      this.teleportInterval = 2.2 + Math.random() * 1.8
    } else {
      this.type = 'large'
      this.radius = 28
      this.hp = 3
      this.maxHp = 3
      this.points = 500
      this.teleportInterval = 2.8 + Math.random() * 2.2
    }

    // Visual identity
    this.hue = Math.random() * 360
    this.color = `hsl(${this.hue}, 80%, 60%)`
    this.glowColor = `hsla(${this.hue}, 80%, 60%, 0.25)`
    this.particleColor = `hsl(${this.hue}, 85%, 55%)`

    this.alive = true
    this.teleportTimer = this.teleportInterval
    this.charging = false
    this.chargeTimer = 0
    this.chargeDuration = 0.6
    this.flashTimer = 0
    this.angle = Math.random() * TAU
    this.rotationSpeed = (Math.random() - 0.5) * 2.5
    this.pulsePhase = Math.random() * TAU

    this.canvasW = 0
    this.canvasH = 0
  }

  setBounds(w, h) {
    this.canvasW = w
    this.canvasH = h
  }

  getNewPosition() {
    const m = 50
    return {
      x: m + Math.random() * (this.canvasW - m * 2),
      y: m + Math.random() * (this.canvasH * 0.7 - m),  // upper 70 %
    }
  }

  update(dt) {
    this.angle += this.rotationSpeed * dt
    this.pulsePhase += dt * 3
    if (this.flashTimer > 0) this.flashTimer -= dt

    if (this.charging) {
      this.chargeTimer -= dt
      if (this.chargeTimer <= 0) {
        // Teleport!
        const pos = this.getNewPosition()
        this.x = pos.x
        this.y = pos.y
        this.charging = false
      }
    } else {
      this.teleportTimer -= dt
      if (this.teleportTimer <= 0) {
        this.charging = true
        this.chargeTimer = this.chargeDuration
      }
    }

    // Slight drift while waiting
    this.x += Math.sin(this.angle) * 12 * dt
    this.y += Math.cos(this.angle) * 12 * dt
    const m = 30
    this.x = Math.max(m, Math.min(this.canvasW - m, this.x))
    this.y = Math.max(m, Math.min(this.canvasH - m, this.y))
  }

  /** Apply damage. Returns true if the enemy was killed. */
  takeDamage(amount) {
    this.hp -= amount
    this.flashTimer = 0.1
    if (this.hp <= 0) {
      this.alive = false
      return true
    }
    return false
  }

  render(ctx, timeSlowActive) {
    ctx.save()
    ctx.translate(this.x, this.y)

    const pulse = 1 + Math.sin(this.pulsePhase) * 0.08
    const r = this.radius * pulse

    // Outer glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.8)
    grad.addColorStop(0, this.glowColor)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, r * 2.8, 0, TAU)
    ctx.fill()

    // Charging telegraph
    if (this.charging) {
      const c = 1 + Math.sin(this.chargeTimer * 22) * 0.2
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 2
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 22
      ctx.beginPath()
      ctx.arc(0, 0, r * c * 1.4, 0, TAU)
      ctx.stroke()
    }

    const showFlash = this.flashTimer > 0
    ctx.rotate(this.angle)

    // Polygon: small = diamond(4), medium = hexagon(6), large = octagon(8)
    const sides = this.type === 'small' ? 4 : this.type === 'medium' ? 6 : 8
    ctx.strokeStyle = showFlash ? '#ffffff' : this.color
    ctx.lineWidth = showFlash ? 3 : 2
    ctx.shadowColor = showFlash ? '#ffffff' : this.color
    ctx.shadowBlur = showFlash ? 28 : 14

    ctx.beginPath()
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * TAU - Math.PI / 2
      const px = Math.cos(a) * r
      const py = Math.sin(a) * r
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()

    ctx.fillStyle = showFlash
      ? 'rgba(255,255,255,0.25)'
      : `hsla(${this.hue}, 80%, 55%, 0.12)`
    ctx.fill()

    // HP bar
    if (this.maxHp > 1) {
      ctx.rotate(-this.angle)
      const bw = r * 1.6
      const bh = 3
      const by = -r - 9
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(-bw / 2, by, bw, bh)
      ctx.fillStyle = this.color
      ctx.fillRect(-bw / 2, by, bw * (this.hp / this.maxHp), bh)
    }

    ctx.restore()

    // Time-slow motes
    if (timeSlowActive) {
      ctx.save()
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * TAU
        const d = r * (1.2 + Math.random() * 0.6)
        ctx.fillStyle = 'rgba(100, 220, 255, 0.25)'
        ctx.beginPath()
        ctx.arc(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 1.5, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    }
  }
}

// ──────────────────────────────────────────────
//  Particles
// ──────────────────────────────────────────────
export class Particle {
  constructor(x, y, color, speed, life, size) {
    this.x = x
    this.y = y
    const angle = Math.random() * TAU
    const s = speed || 60 + Math.random() * 200
    this.vx = Math.cos(angle) * s
    this.vy = Math.sin(angle) * s
    this.life = life || 0.4 + Math.random() * 0.8
    this.maxLife = this.life
    this.size = size || 1.5 + Math.random() * 3
    this.color = color || '#ff88aa'
    this.alive = true
  }

  update(dt) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.vx *= 0.96
    this.vy *= 0.96
    this.life -= dt
    if (this.life <= 0) this.alive = false
  }

  render(ctx) {
    const t = Math.max(0, this.life / this.maxLife)
    ctx.save()
    ctx.globalAlpha = t
    ctx.fillStyle = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * t, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
}

/** Spawn an explosion burst of particles. */
export function createExplosion(x, y, color, count = 20) {
  const parts = []
  for (let i = 0; i < count; i++) {
    parts.push(
      new Particle(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        color,
        80 + Math.random() * 320,
        0.4 + Math.random() * 0.9,
        1.5 + Math.random() * 3,
      ),
    )
  }
  return parts
}

// ──────────────────────────────────────────────
//  Asteroid
// ──────────────────────────────────────────────
export class Asteroid {
  constructor(x, y, size, vx, vy) {
    this.x = x
    this.y = y
    this.size = size || 'large'
    this.alive = true
    this.rotation = Math.random() * TAU
    this.rotSpeed = (Math.random() - 0.5) * 1.5
    this.flashTimer = 0
    this.time = 0

    if (size === 'large') {
      this.radius = 28 + Math.random() * 12
      this.hp = 3
      this.maxHp = 3
      this.points = 30
    } else if (size === 'medium') {
      this.radius = 16 + Math.random() * 8
      this.hp = 2
      this.maxHp = 2
      this.points = 60
    } else {
      this.radius = 8 + Math.random() * 5
      this.hp = 1
      this.maxHp = 1
      this.points = 100
    }

    const spd = size === 'large' ? 25 + Math.random() * 35
      : size === 'medium' ? 40 + Math.random() * 35
      : 55 + Math.random() * 35

    this.vx = vx || (Math.random() - 0.5) * spd * 0.6
    this.vy = vy || spd * (0.3 + Math.random() * 0.4) + 20

    // Irregular rocky shape
    this.vertices = []
    const n = 7 + Math.floor(Math.random() * 5)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - (Math.random() * 0.15)
      const r = this.radius * (0.7 + Math.random() * 0.3)
      this.vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
    }
  }

  update(dt) {
    this.time += dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.rotation += this.rotSpeed * dt
    if (this.flashTimer > 0) this.flashTimer -= dt
  }

  isOffScreen(w, h) {
    return this.y > h + 80 || this.x < -80 || this.x > w + 80
  }

  takeDamage(amount) {
    this.hp -= amount
    this.flashTimer = 0.08
    if (this.hp <= 0) {
      this.alive = false
      return true
    }
    return false
  }

  render(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)

    const isHit = this.flashTimer > 0
    ctx.strokeStyle = isHit ? '#ffffff' : '#aa8866'
    ctx.lineWidth = isHit ? 2.5 : 1.5
    ctx.shadowColor = isHit ? '#ffffff' : '#887744'
    ctx.shadowBlur = isHit ? 20 : 6

    ctx.beginPath()
    this.vertices.forEach((v, i) => {
      i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)
    })
    ctx.closePath()
    ctx.stroke()

    ctx.fillStyle = isHit
      ? 'rgba(255,255,255,0.15)'
      : 'rgba(120, 100, 70, 0.08)'
    ctx.fill()

    // Surface cracks
    if (!isHit) {
      ctx.strokeStyle = 'rgba(120, 100, 70, 0.12)'
      ctx.lineWidth = 0.5
      ctx.shadowBlur = 0
      for (let i = 0; i < 2; i++) {
        const vi = Math.floor(Math.random() * this.vertices.length)
        const vj = Math.floor(Math.random() * this.vertices.length)
        if (vi !== vj) {
          ctx.beginPath()
          ctx.moveTo(this.vertices[vi].x, this.vertices[vi].y)
          ctx.lineTo(this.vertices[vj].x, this.vertices[vj].y)
          ctx.stroke()
        }
      }
    }

    ctx.restore()
  }
}

// ──────────────────────────────────────────────
//  Boss Bullet (used by Boss)
// ──────────────────────────────────────────────
export class BossBullet {
  constructor(x, y, angle, speed) {
    this.x = x
    this.y = y
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.radius = 6
    this.alive = true
    this.trail = []
  }

  update(dt) {
    this.trail.push({ x: this.x, y: this.y, life: 1 })
    if (this.trail.length > 8) this.trail.shift()
    this.x += this.vx * dt
    this.y += this.vy * dt
    for (const t of this.trail) t.life -= dt * 5
    this.trail = this.trail.filter(t => t.life > 0)
  }

  isOffScreen(w, h) {
    return this.x < -40 || this.x > w + 40 || this.y < -40 || this.y > h + 40
  }

  render(ctx) {
    for (const t of this.trail) {
      ctx.fillStyle = `rgba(255, 80, 80, ${t.life * 0.3})`
      ctx.beginPath()
      ctx.arc(t.x, t.y, this.radius * t.life * 0.5, 0, TAU)
      ctx.fill()
    }
    ctx.save()
    ctx.shadowColor = '#ff4444'
    ctx.shadowBlur = 18
    ctx.fillStyle = '#ff5555'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#ff9999'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
}

// ──────────────────────────────────────────────
//  Boss
// ──────────────────────────────────────────────
export class Boss {
  constructor(x, y, wave, level) {
    this.x = x
    this.y = y
    this.radius = 45 + Math.min(wave, 10) * 2
    this.maxHp = 15 + wave * 8 + (level || 0) * 3
    this.hp = this.maxHp
    this.alive = true
    this.wave = wave
    this.points = 2000 + wave * 500

    this.phase = 1
    this.attackTimer = 0
    this.attackCooldown = 1.5
    this.moveTimer = 0
    this.baseSpeed = 60 + wave * 3
    this.speed = this.baseSpeed

    this.time = 0
    this.flashTimer = 0
    this.hue = (wave * 37 + 280) % 360
    this.pulsePhase = 0

    this.bossBullets = []
    this.entering = true
    this.startY = -60
    this.entryY = y
    this.glowIntensity = 0

    this.minionTimer = 0
    this.canvasW = 1920
    this.canvasH = 1080
  }

  setBounds(w, h) {
    this.canvasW = w
    this.canvasH = h
  }

  update(dt, playerX, playerY) {
    this.time += dt
    this.pulsePhase += dt * 2
    if (this.flashTimer > 0) this.flashTimer -= dt

    // Entry animation
    if (this.entering) {
      this.startY += (this.entryY - this.startY) * 3 * dt
      if (Math.abs(this.entryY - this.startY) < 2) {
        this.entering = false
        this.y = this.entryY
      }
      this.y = this.startY
      this.glowIntensity = Math.min(1, this.glowIntensity + dt * 2)
      return
    }

    this.glowIntensity = Math.min(1, this.glowIntensity + dt)

    // Phase based on HP %
    const hpPct = this.hp / this.maxHp
    if (hpPct < 0.3) this.phase = 3
    else if (hpPct < 0.6) this.phase = 2
    else this.phase = 1

    // Movement — sinusoidal sway
    this.speed = this.baseSpeed * (1 + (this.phase - 1) * 0.3)
    this.moveTimer += dt
    this.x += Math.sin(this.moveTimer * 0.5) * this.speed * dt * 2
    this.y += Math.sin(this.moveTimer * 0.7) * this.speed * dt * 0.5

    const m = this.radius + 20
    this.x = Math.max(m, Math.min(this.canvasW - m, this.x))
    this.y = Math.max(80, Math.min(this.canvasH * 0.4, this.y))

    // Attack routine
    this.attackTimer += dt
    const cd = Math.max(0.5, this.attackCooldown - (this.phase - 1) * 0.2)
    if (this.attackTimer >= cd) {
      this.attackTimer = 0
      this._fire(playerX, playerY)
    }

    // Minion spawn timer (phase 2+)
    if (this.phase >= 2) {
      this.minionTimer += dt
    }

    // Update boss bullets
    for (const b of this.bossBullets) b.update(dt)
    this.bossBullets = this.bossBullets.filter(
      b => b.alive && !b.isOffScreen(this.canvasW, this.canvasH)
    )
  }

  _fire(px, py) {
    const dx = px - this.x
    const dy = py - this.y
    const angle = Math.atan2(dy, dx)

    if (this.phase === 1) {
      this.bossBullets.push(new BossBullet(this.x, this.y, angle, 300))
    } else if (this.phase === 2) {
      for (let i = -1; i <= 1; i++) {
        this.bossBullets.push(new BossBullet(this.x, this.y, angle + i * 0.25, 320))
      }
    } else {
      for (let i = -2; i <= 2; i++) {
        this.bossBullets.push(new BossBullet(this.x, this.y, angle + i * 0.2, 350))
      }
    }
  }

  takeDamage(amount) {
    this.hp -= amount
    this.flashTimer = 0.08
    if (this.hp <= 0) {
      this.alive = false
      return true
    }
    return false
  }

  render(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)

    const r = this.radius
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.05
    const r2 = r * pulse

    // Outer glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3.5)
    const gColor = `hsla(${this.hue}, 80%, 50%, ${0.12 * this.glowIntensity})`
    grad.addColorStop(0, gColor)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, r * 3.5, 0, TAU)
    ctx.fill()

    // Main hull — star-shape
    const sides = 8
    const showFlash = this.flashTimer > 0
    ctx.strokeStyle = showFlash ? '#ffffff' : `hsl(${this.hue}, 80%, 55%)`
    ctx.lineWidth = showFlash ? 3 : 2.5
    ctx.shadowColor = showFlash ? '#ffffff' : `hsl(${this.hue}, 80%, 50%)`
    ctx.shadowBlur = showFlash ? 30 : 20

    ctx.beginPath()
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * TAU - Math.PI / 2
      const rv = i % 2 === 0 ? r2 : r2 * 0.65
      ctx.lineTo(Math.cos(a) * rv, Math.sin(a) * rv)
    }
    ctx.closePath()
    ctx.stroke()

    ctx.fillStyle = showFlash
      ? 'rgba(255,255,255,0.2)'
      : `hsla(${this.hue}, 70%, 50%, 0.08)`
    ctx.fill()

    // Inner ring
    ctx.strokeStyle = `hsla(${this.hue}, 60%, 60%, 0.25)`
    ctx.lineWidth = 1
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.5, 0, TAU)
    ctx.stroke()

    // Core eye
    ctx.shadowColor = `hsl(${this.hue}, 80%, 60%)`
    ctx.shadowBlur = 25
    ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${0.4 + Math.sin(this.time * 3) * 0.2})`
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.22, 0, TAU)
    ctx.fill()

    ctx.restore()

    // Render boss bullets
    for (const b of this.bossBullets) b.render(ctx)
  }

  shouldSpawnMinion() {
    return this.phase >= 2 && this.minionTimer >= 3
  }

  resetMinionTimer() {
    this.minionTimer = 0
  }
}

// ──────────────────────────────────────────────
//  XP Orb (collectible)
// ──────────────────────────────────────────────
export class XpOrb {
  constructor(x, y, value) {
    this.x = x
    this.y = y
    this.value = value || 10
    this.radius = 5
    this.alive = true
    this.life = 0
    this.phase = Math.random() * TAU
    this.vy = 30 + Math.random() * 20
  }

  update(dt, playerX, playerY, attract) {
    this.life += dt

    if (attract) {
      const dx = playerX - this.x
      const dy = playerY - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 10) {
        this.alive = false
        return 'collected'
      }
      if (dist > 0) {
        this.x += (dx / dist) * 200 * dt
        this.y += (dy / dist) * 200 * dt
      }
    } else {
      this.y += this.vy * dt
      this.x += Math.sin(this.life * 2 + this.phase) * 15 * dt
    }

    if (this.y > 1200) this.alive = false
  }

  render(ctx) {
    const pulse = 0.5 + Math.sin(this.life * 3 + this.phase) * 0.5
    ctx.save()
    ctx.globalAlpha = pulse * 0.9 + 0.1
    ctx.shadowColor = '#66ff88'
    ctx.shadowBlur = 16
    ctx.fillStyle = '#66ff88'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#aaffcc'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
}

// ──────────────────────────────────────────────
//  Floating score popup
// ──────────────────────────────────────────────
export class ScorePopup {
  constructor(x, y, text, color) {
    this.x = x
    this.y = y
    this.text = text
    this.color = color || '#ffdd88'
    this.life = 1
    this.alive = true
  }

  update(dt) {
    this.y -= 40 * dt
    this.life -= dt * 0.7
    if (this.life <= 0) this.alive = false
  }

  render(ctx) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, this.life)
    ctx.fillStyle = this.color
    ctx.font = 'bold 18px "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = this.color
    ctx.shadowBlur = 14
    ctx.fillText(this.text, this.x, this.y)
    ctx.restore()
  }
}

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
  constructor(x, y, angle) {
    this.x = x
    this.y = y
    const speed = 900
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.radius = 4
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

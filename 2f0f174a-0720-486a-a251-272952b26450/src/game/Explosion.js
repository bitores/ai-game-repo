/**
 * Burst of small particles that fly outward when a target is destroyed.
 */
export class Explosion {
  constructor(x, y, hue, saturation, lightness) {
    this.particles = []
    this.done = false
    this.life = 0
    this.maxLife = 500 // ms

    const count = 14 + Math.floor(Math.random() * 12)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
      const speed = (1 + Math.random() * 4) / 1000 // px/ms
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 3.5,
        hue: hue + (Math.random() - 0.5) * 50,
        sat: saturation,
        light: lightness + (Math.random() - 0.5) * 25,
      })
    }
  }

  /** Advance the explosion by dt milliseconds */
  update(dt) {
    this.life += dt
    if (this.life >= this.maxLife) {
      this.done = true
      return
    }

    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.97
      p.vy *= 0.97
    }
  }

  /** Draw the explosion particles */
  draw(ctx) {
    if (this.done) return

    const progress = this.life / this.maxLife
    const alpha = 1 - progress

    ctx.save()
    for (const p of this.particles) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * (1 - progress * 0.3), 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.9})`
      ctx.fill()
    }
    ctx.restore()
  }
}

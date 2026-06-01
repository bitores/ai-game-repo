/**
 * Morphing particle that deforms its polygon shape over time.
 * Each vertex oscillates independently with different frequencies and amplitudes,
 * creating organic, fluid-looking transformations.
 */
export class Particle {
  constructor(canvasW, canvasH, level) {
    this.baseRadius = Math.max(14, 28 - level * 0.8) + Math.random() * 18
    this.numVertices = 5 + Math.floor(Math.random() * 4) + Math.min(Math.floor(level / 3), 4)
    this.hue = Math.random() * 360
    this.saturation = 60 + Math.random() * 30
    this.lightness = 50 + Math.random() * 20
    this.time = Math.random() * Math.PI * 2
    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = (Math.random() - 0.5) * 0.002
    this.alive = true
    this.escaped = false

    // Spawn from one of the four edges
    const margin = 40
    const side = Math.floor(Math.random() * 4)
    const cx = canvasW / 2
    const cy = canvasH / 2
    switch (side) {
      case 0: this.x = -margin;            this.y = Math.random() * canvasH; break
      case 1: this.x = canvasW + margin;    this.y = Math.random() * canvasH; break
      case 2: this.x = Math.random() * canvasW; this.y = -margin;            break
      case 3: this.x = Math.random() * canvasW; this.y = canvasH + margin;   break
    }

    // Movement: head roughly toward center with some randomness
    const speed = (80 + level * 20 + Math.random() * 60) / 1000 // px/ms
    const baseAngle = Math.atan2(cy - this.y, cx - this.x)
    const spread = (Math.random() - 0.5) * 1.4
    const angle = baseAngle + spread
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed

    // Wave oscillation perpendicular to travel direction
    this.useWave = Math.random() < 0.35
    this.waveAmp = 1 + Math.random() * 3
    this.waveFreq = 2 + Math.random() * 4 // rad/s
    this.wavePhase = Math.random() * Math.PI * 2
    this.perpAngle = angle + Math.PI / 2

    // Vertex deformation parameters — each vertex has its own wobble
    this.vertexParams = []
    for (let i = 0; i < this.numVertices; i++) {
      const vAngle = (i / this.numVertices) * Math.PI * 2
      this.vertexParams.push({
        angle: vAngle,
        phase: Math.random() * Math.PI * 2,
        freq: 0.8 + Math.random() * 1.8,  // rad/s
        amp: 0.15 + Math.random() * 0.35,  // fraction of baseRadius
      })
    }

    // Escape bounds (large margin so they disappear off-screen)
    this.bounds = {
      x: -120, y: -120,
      w: canvasW + 240, h: canvasH + 240,
    }
  }

  /** Advance the particle by dt milliseconds */
  update(dt) {
    this.time += dt * 0.001
    this.rotation += this.rotationSpeed * dt

    // Base movement
    this.x += this.vx * dt
    this.y += this.vy * dt

    // Perpendicular wave
    if (this.useWave) {
      const offset = Math.sin(this.time * this.waveFreq + this.wavePhase) * this.waveAmp
      this.x += Math.cos(this.perpAngle) * offset
      this.y += Math.sin(this.perpAngle) * offset
    }

    // Slow colour drift
    this.hue += dt * 0.012
    if (this.hue > 360) this.hue -= 360

    // Escape detection
    const b = this.bounds
    if (this.x < b.x || this.x > b.x + b.w || this.y < b.y || this.y > b.y + b.h) {
      this.alive = false
      this.escaped = true
    }
  }

  /** Compute current deformed vertex positions */
  getVertices() {
    return this.vertexParams.map((v) => {
      const deform = Math.sin(this.time * v.freq + v.phase) * v.amp
      const r = this.baseRadius * (1 + deform)
      return {
        x: this.x + Math.cos(v.angle + this.rotation) * r,
        y: this.y + Math.sin(v.angle + this.rotation) * r,
      }
    })
  }

  /** Ray-casting point-in-polygon test against the deformed shape */
  containsPoint(px, py) {
    const verts = this.getVertices()
    if (verts.length < 3) return false

    // Quick AABB rejection with small tolerance
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (const v of verts) {
      if (v.x < minX) minX = v.x
      if (v.x > maxX) maxX = v.x
      if (v.y < minY) minY = v.y
      if (v.y > maxY) maxY = v.y
    }
    const tol = 5
    if (px < minX - tol || px > maxX + tol || py < minY - tol || py > maxY + tol) {
      return false
    }

    // Ray casting
    let inside = false
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, yi = verts[i].y
      const xj = verts[j].x, yj = verts[j].y
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside
      }
    }
    return inside
  }

  /** Render the particle on the canvas context */
  draw(ctx) {
    const verts = this.getVertices()
    if (verts.length < 3) return

    // --- Outer glow ---
    ctx.save()
    ctx.shadowColor = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, 0.5)`
    ctx.shadowBlur = 18

    // Main filled polygon
    ctx.beginPath()
    ctx.moveTo(verts[0].x, verts[0].y)
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y)
    }
    ctx.closePath()

    ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, 0.50)`
    ctx.fill()
    ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness + 20}%, 0.85)`
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    // --- Inner highlight polygon ---
    ctx.save()
    const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length
    const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length
    const inner = verts.map((v) => ({
      x: cx + (v.x - cx) * 0.4,
      y: cy + (v.y - cy) * 0.4,
    }))
    ctx.beginPath()
    ctx.moveTo(inner[0].x, inner[0].y)
    for (let i = 1; i < inner.length; i++) {
      ctx.lineTo(inner[i].x, inner[i].y)
    }
    ctx.closePath()
    ctx.fillStyle = `hsla(${this.hue}, ${this.saturation - 20}%, ${this.lightness + 30}%, 0.22)`
    ctx.fill()
    ctx.restore()

    // --- Bright centre dot ---
    ctx.beginPath()
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${this.hue}, 100%, 92%, 0.85)`
    ctx.fill()
  }
}

/**
 * Platform - A platform in the game world
 * Supports mouse grab/drag and connected synchronous movement
 */
export class Platform {
  constructor(x, y, width, height, id) {
    this.id = id
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.prevX = x
    this.prevY = y

    // Visual
    const hue = (id * 37 + 200) % 360
    this.color = `hsl(${hue}, 65%, 55%)`
    this.hoverColor = `hsl(${hue}, 80%, 65%)`
    this.borderColor = `hsl(${hue}, 70%, 40%)`
    this.hovered = false
    this.grabbed = false

    // Connection network
    this.connections = [] // [{ platform: Platform, ratio: number }]

    // Drift behavior for dynamic terrain
    this.driftPhase = Math.random() * Math.PI * 2
    this.driftSpeed = 0.15 + Math.random() * 0.25
    this.driftAmplitudeX = 0.4 + Math.random() * 0.6
    this.driftAmplitudeY = 0.1 + Math.random() * 0.3
    this.driftTimer = 0

    // Movement tracking
    this.dx = 0
    this.dy = 0
  }

  /** Connect this platform to another with a movement ratio */
  connectTo(platform, ratio) {
    if (platform.id === this.id) return
    // Don't duplicate
    if (this.connections.some(c => c.platform.id === platform.id)) return
    this.connections.push({ platform, ratio })
  }

  /** Remove connection to a platform */
  disconnectFrom(platform) {
    this.connections = this.connections.filter(c => c.platform.id !== platform.id)
  }

  /** Grab this platform at the given world position */
  grab(worldX, worldY) {
    this.grabbed = true
    this.grabOffsetX = worldX - this.x
    this.grabOffsetY = worldY - this.y
  }

  /** Release this platform */
  release() {
    this.grabbed = false
  }

  /** Drag to new world position, propagating movement to connections */
  drag(worldX, worldY) {
    if (!this.grabbed) return

    const newX = worldX - this.grabOffsetX
    const newY = worldY - this.grabOffsetY
    const deltaX = newX - this.x
    const deltaY = newY - this.y

    this.x = newX
    this.y = newY

    // Propagate to connected platforms (breadth-first with visited set)
    const visited = new Set([this.id])
    const queue = [...this.connections]

    while (queue.length > 0) {
      const conn = queue.shift()
      const target = conn.platform
      if (visited.has(target.id)) continue
      visited.add(target.id)

      const ratio = conn.ratio
      target.x += deltaX * ratio
      target.y += deltaY * ratio

      // Add their connections to the queue
      for (const childConn of target.connections) {
        if (!visited.has(childConn.platform.id)) {
          queue.push({ platform: childConn.platform, ratio: childConn.ratio * ratio })
        }
      }
    }
  }

  /** Apply a direct delta (from connection propagation) */
  applyDelta(dx, dy) {
    this.x += dx
    this.y += dy
  }

  /** Update platform drift (dynamic terrain changes) */
  update(dt) {
    this.dx = this.x - this.prevX
    this.dy = this.y - this.prevY
    this.prevX = this.x
    this.prevY = this.y

    if (!this.grabbed) {
      this.driftTimer += dt
      // Slow sinusoidal drift - creates the "changing terrain" effect
      const driftX = Math.sin(this.driftTimer * this.driftSpeed + this.driftPhase) * this.driftAmplitudeX * dt * 2
      const driftY = Math.cos(this.driftTimer * this.driftSpeed * 0.6 + this.driftPhase * 1.3) * this.driftAmplitudeY * dt * 2
      this.x += driftX
      this.y += driftY
    }
  }

  /** Check if a world point is inside this platform */
  containsPoint(px, py) {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height
  }

  /** Draw connection lines to linked platforms */
  drawConnections(ctx) {
    for (const conn of this.connections) {
      const target = conn.platform
      const ax = this.x + this.width / 2
      const ay = this.y + this.height / 2
      const bx = target.x + target.width / 2
      const by = target.y + target.height / 2

      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + conn.ratio * 0.2})`
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 6])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  /** Draw the platform */
  draw(ctx) {
    const radius = 4
    const x = this.x
    const y = this.y
    const w = this.width
    const h = this.height

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    this.roundRect(ctx, x + 2, y + 3, w, h, radius)
    ctx.fill()

    // Main body
    ctx.fillStyle = this.hovered ? this.hoverColor : this.color
    ctx.beginPath()
    this.roundRect(ctx, x, y, w, h, radius)
    ctx.fill()

    // Border
    ctx.strokeStyle = this.hovered ? 'rgba(255,255,255,0.5)' : this.borderColor
    ctx.lineWidth = this.hovered ? 2.5 : 1.5
    ctx.beginPath()
    this.roundRect(ctx, x, y, w, h, radius)
    ctx.stroke()

    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    this.roundRect(ctx, x + 3, y + 2, w - 6, 5, 2)
    ctx.fill()

    // Grab indicator when hovered
    if (this.hovered && !this.grabbed) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      this.roundRect(ctx, x, y, w, h, radius)
      ctx.fill()
    }

    if (this.grabbed) {
      // Glow effect when grabbed
      ctx.shadowColor = 'rgba(255,255,255,0.4)'
      ctx.shadowBlur = 15
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      this.roundRect(ctx, x, y, w, h, radius)
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }

  /** Draw a rounded rectangle path */
  roundRect(ctx, x, y, w, h, r) {
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
}

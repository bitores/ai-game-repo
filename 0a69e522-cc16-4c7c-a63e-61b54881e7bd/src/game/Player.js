/**
 * Player - The controllable character
 * Moves with arrow keys / WASD, jumps with space / up / W
 */
export class Player {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 26
    this.height = 30
    this.vx = 0
    this.vy = 0
    this.prevY = y
    this.prevX = x

    this.onGround = false
    this.currentPlatform = null
    this.jumpBufferTimer = 0
    this.coyoteTimer = 0

    // Physics constants
    this.gravity = 1350
    this.jumpForce = -530
    this.moveSpeed = 280
    this.maxFallSpeed = 900

    // Animation
    this.walkTimer = 0
    this.facingRight = true
    this.bodyColor = '#64ffda'
    this.outlineColor = '#1de9b6'
    this.eyeColor = '#0f0c29'

    // Jump particles
    this.landEffectTimer = 0
  }

  /** Reset player position */
  reset(x, y) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.onGround = false
    this.currentPlatform = null
    this.jumpBufferTimer = 0
    this.coyoteTimer = 0
  }

  /** Update player logic */
  update(dt, input, platforms) {
    this.prevX = this.x
    this.prevY = this.y

    // Coyote time (brief grace period after leaving a platform)
    if (this.onGround) {
      this.coyoteTimer = 0.08
    } else {
      this.coyoteTimer -= dt
    }

    // Jump buffer (press jump slightly before landing)
    if (input.isJump()) {
      this.jumpBufferTimer = 0.1
    } else {
      this.jumpBufferTimer -= dt
    }

    // Horizontal movement
    let moveDir = 0
    if (input.isLeft()) moveDir = -1
    if (input.isRight()) moveDir = 1

    if (moveDir !== 0) {
      this.vx = moveDir * this.moveSpeed
      this.facingRight = moveDir > 0
    } else {
      // Friction when no input
      this.vx *= 0.75
      if (Math.abs(this.vx) < 5) this.vx = 0
    }

    // Jump
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = this.jumpForce
      this.onGround = false
      this.currentPlatform = null
      this.coyoteTimer = 0
      this.jumpBufferTimer = 0
    }

    // Variable jump height (release jump early to cut it short)
    if (!input.isJump() && this.vy < -200) {
      this.vy *= 0.92
    }

    // Gravity
    this.vy += this.gravity * dt
    if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed

    // Move horizontally
    this.x += this.vx * dt

    // Move vertically
    this.y += this.vy * dt

    // Walk animation
    if (Math.abs(this.vx) > 20 && this.onGround) {
      this.walkTimer += dt * (Math.abs(this.vx) / 100)
    } else if (this.onGround) {
      this.walkTimer += dt * 2
    }

    // Collision detection with platforms
    this.onGround = false
    this.currentPlatform = null

    for (const platform of platforms) {
      if (this.checkPlatformCollision(platform, dt)) {
        break
      }
    }

    // Move with platform if standing on one
    if (this.currentPlatform) {
      const moveX = this.currentPlatform.x - this.currentPlatform.prevX
      const moveY = this.currentPlatform.y - this.currentPlatform.prevY
      this.x += moveX
      this.y += moveY
    }

    // Landing effect
    if (this.onGround && this.landEffectTimer > 0) {
      // Just landed
    }
    if (this.onGround) {
      this.landEffectTimer = 0.2
    } else {
      this.landEffectTimer -= dt
    }
  }

  /** Check collision with a single platform - returns true if collision resolved */
  checkPlatformCollision(platform, dt) {
    const playerBottom = this.y + this.height
    const playerRight = this.x + this.width

    // AABB overlap check
    if (playerRight <= platform.x) return false
    if (this.x >= platform.x + platform.width) return false
    if (playerBottom <= platform.y) return false
    if (this.y >= platform.y + platform.height) return false

    // Only handle landing from above
    // Check we were above the platform previously
    const wasAbove = this.prevY + this.height <= platform.y + 8

    if (this.vy >= 0 && wasAbove) {
      // Land on platform
      this.y = platform.y - this.height
      this.vy = 0
      this.onGround = true
      this.currentPlatform = platform
      return true
    }

    // Side collision (push out horizontally)
    if (this.vy < 0 && this.y + this.height > platform.y + platform.height - 5) {
      // Hit head on bottom of platform
      this.y = platform.y + platform.height
      this.vy = 0
      return false
    }

    return false
  }

  /** Draw the player */
  draw(ctx) {
    ctx.save()

    const x = Math.round(this.x)
    const y = Math.round(this.y)
    const w = this.width
    const h = this.height

    // Shadow
    if (this.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(x + w / 2, y + h + 2, w * 0.5, 3, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Body
    const bodyOffset = this.onGround ? 0 : -2
    const bodyColor = this.onGround ? this.bodyColor : '#80ffbb'

    ctx.fillStyle = bodyColor
    ctx.beginPath()
    this.roundRect(ctx, x, y + bodyOffset, w, h + (bodyOffset === 0 ? 0 : -bodyOffset), 5)
    ctx.fill()

    // Outline
    ctx.strokeStyle = this.outlineColor
    ctx.lineWidth = 2
    ctx.beginPath()
    this.roundRect(ctx, x, y + bodyOffset, w, h + (bodyOffset === 0 ? 0 : -bodyOffset), 5)
    ctx.stroke()

    // Eyes
    const eyeY = y + bodyOffset + 9
    const eyeDir = this.facingRight ? 1 : -1
    ctx.fillStyle = this.eyeColor

    // Left eye
    ctx.fillRect(x + 6 + (eyeDir > 0 ? 1 : 0), eyeY, 5, 5)
    // Right eye
    ctx.fillRect(x + 15 + (eyeDir > 0 ? 1 : 0), eyeY, 5, 5)

    // Eye shine
    ctx.fillStyle = '#fff'
    ctx.fillRect(x + 7 + (eyeDir > 0 ? 1 : 0), eyeY + 1, 2, 2)
    ctx.fillRect(x + 16 + (eyeDir > 0 ? 1 : 0), eyeY + 1, 2, 2)

    // Legs
    if (!this.onGround) {
      // Jumping/freefall legs
      ctx.fillStyle = this.outlineColor
      ctx.fillRect(x + 4, y + h - 2, 8, 10)
      ctx.fillRect(x + 14, y + h - 2, 8, 10)
    } else if (Math.abs(this.vx) > 20) {
      // Walking legs
      const legPhase = Math.sin(this.walkTimer * 8) * 4
      ctx.fillStyle = this.outlineColor
      ctx.fillRect(x + 3, y + h + legPhase * 0.3 - 2, 8, 10 + Math.max(0, legPhase * 0.3))
      ctx.fillRect(x + 15, y + h - legPhase * 0.3 - 2, 8, 10 - Math.min(0, -legPhase * 0.3))
    } else {
      // Idle legs
      ctx.fillStyle = this.outlineColor
      ctx.fillRect(x + 4, y + h - 2, 8, 8)
      ctx.fillRect(x + 14, y + h - 2, 8, 8)
    }

    ctx.restore()
  }

  /** Rounded rectangle helper */
  roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2)
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

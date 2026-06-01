/**
 * GameEngine - Core game logic, rendering, and loop management
 * Manages platform connections, player physics, camera, and scoring
 */
import { Player } from './Player.js'
import { Platform } from './Platform.js'
import { InputManager } from './InputManager.js'

export class GameEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.callbacks = callbacks

    // Dimensions
    this.width = 0
    this.height = 0
    this.dpr = 1

    // Game objects
    this.player = null
    this.platforms = []
    this.input = null

    // Camera
    this.camera = { x: 0, y: 0 }
    this.cameraTarget = { x: 0, y: 0 }

    // State
    this.score = 0
    this.highScore = parseInt(localStorage.getItem('platformBindHighScore') || '0')
    this.gameTime = 0
    this.isGameOver = false
    this.isPlaying = false
    this.grabbedPlatform = null
    this.lastFrameTime = 0
    this.animationId = null
    this.nextPlatformId = 0
    this.worldRightEdge = 0

    // Parallax background config
    this.stars = []
    this.parallaxLayers = []

    // Resize handler
    this._onResize = () => this.handleResize()
  }

  /** Initialize and start the game */
  init() {
    this.handleResize()
    this.createStarfield()
    this.input = new InputManager(this.canvas)
    this.player = new Player(100, 200)
    this.generateTerrain()
    this.placePlayerOnFirstPlatform()
    this.isPlaying = true
    this.isGameOver = false
    this.score = 0
    this.gameTime = 0

    window.addEventListener('resize', this._onResize)

    this.lastFrameTime = performance.now()
    this.loop(this.lastFrameTime)
  }

  /** Handle canvas resize for responsive rendering */
  handleResize() {
    this.dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.width = rect.width
    this.height = rect.height
  }

  /** Create background starfield */
  createStarfield() {
    this.stars = []
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * 3000,
        y: Math.random() * this.height,
        size: 0.5 + Math.random() * 1.5,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2
      })
    }
  }

  /** Generate the initial terrain */
  generateTerrain() {
    this.platforms = []
    this.nextPlatformId = 0
    this.worldRightEdge = 0

    const groundY = this.height * 0.78
    let x = 50
    const count = 30

    for (let i = 0; i < count; i++) {
      const w = 70 + Math.random() * 140
      const h = 16 + Math.random() * 8

      let y
      if (i === 0) {
        y = groundY
      } else {
        const prev = this.platforms[i - 1]
        y = prev.y + (Math.random() - 0.48) * 100
        y = Math.max(this.height * 0.15, Math.min(this.height * 0.8, y))

        // Ensure reachable gaps
        if (y < this.height * 0.2 && prev.y > this.height * 0.5) {
          y = prev.y - 40 + Math.random() * 30
        }
      }

      const platform = new Platform(x, y, w, h, this.nextPlatformId++)
      this.platforms.push(platform)

      x += w + 25 + Math.random() * 60
    }

    this.worldRightEdge = x + 500

    // Create connections: each platform connects to its neighbor
    for (let i = 0; i < this.platforms.length - 1; i++) {
      const ratio = 0.25 + Math.random() * 0.35
      this.platforms[i].connectTo(this.platforms[i + 1], ratio)
    }

    // Some random cross-connections for complex terrain behavior
    for (let i = 0; i < this.platforms.length; i++) {
      if (Math.random() < 0.3) {
        const skip = 2 + Math.floor(Math.random() * 4)
        const target = i + skip
        if (target < this.platforms.length) {
          this.platforms[i].connectTo(this.platforms[target], 0.15 + Math.random() * 0.25)
        }
      }
    }
  }

  /** Place player on the first platform */
  placePlayerOnFirstPlatform() {
    if (this.platforms.length === 0) return
    const first = this.platforms[0]
    this.player.x = first.x + 20
    this.player.y = first.y - this.player.height - 1
    this.player.vx = 0
    this.player.vy = 0
    this.player.onGround = true
    this.player.currentPlatform = first

    this.camera.x = 0
    this.camera.y = 0
    this.cameraTarget.x = 0
    this.cameraTarget.y = 0
  }

  /** Main game loop */
  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.05)
    this.lastFrameTime = currentTime

    if (!this.isGameOver && this.isPlaying) {
      this.update(dt)
    }

    this.render(dt)

    this.animationId = requestAnimationFrame((t) => this.loop(t))
  }

  /** Update game state */
  update(dt) {
    this.gameTime += dt

    // Score
    this.score += dt * 8
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(Math.floor(this.score))
    }

    // Update input
    this.input.update()

    // Handle mouse/platform interaction
    this.handleMouseInput()

    // Update platforms (drift + position tracking)
    for (const platform of this.platforms) {
      platform.update(dt)
    }

    // Update player
    this.player.update(dt, this.input, this.platforms)

    // Extend terrain ahead of the player
    this.extendTerrain()

    // Remove distant platforms behind
    this.cleanupPlatforms()

    // Update camera - follow player smoothly
    const targetX = this.player.x - this.width * 0.3
    const targetY = this.player.y - this.height * 0.45
    this.cameraTarget.x = Math.max(0, targetX)
    this.cameraTarget.y = Math.max(-100, Math.min(this.height * 0.3, targetY))

    this.camera.x += (this.cameraTarget.x - this.camera.x) * 0.06
    this.camera.y += (this.cameraTarget.y - this.camera.y) * 0.06

    // Keep camera within bounds
    this.camera.x = Math.max(0, this.camera.x)

    // Game over: fell too far
    if (this.player.y > this.camera.y + this.height + 300) {
      this.endGame()
    }

    // Game over: fell behind camera
    if (this.player.x + this.player.width < this.camera.x - 200) {
      this.endGame()
    }
  }

  /** Handle mouse/platform interaction - grab, drag, release */
  handleMouseInput() {
    const mouse = this.input.mouse

    // Convert screen coords to world coords
    const worldX = mouse.x + this.camera.x
    const worldY = mouse.y + this.camera.y

    // Check hover for cursor change
    let hoveringPlatform = false

    if (!this.grabbedPlatform) {
      for (const platform of this.platforms) {
        platform.hovered = platform.containsPoint(worldX, worldY)
        if (platform.hovered) hoveringPlatform = true
      }
    }

    this.canvas.style.cursor = hoveringPlatform ? 'grab' :
      this.grabbedPlatform ? 'grabbing' : 'default'

    // Grab: mouse just pressed down
    if (mouse.down && !mouse.prevDown && !this.grabbedPlatform) {
      // Check platforms in reverse order (top-first / last drawn = top)
      for (let i = this.platforms.length - 1; i >= 0; i--) {
        const platform = this.platforms[i]
        if (platform.containsPoint(worldX, worldY)) {
          this.grabbedPlatform = platform
          platform.grab(worldX, worldY)
          break
        }
      }
    }

    // Drag: mouse is down and we have a grabbed platform
    if (this.grabbedPlatform) {
      if (!mouse.down) {
        // Release
        this.grabbedPlatform.release()
        this.grabbedPlatform = null
      } else {
        // Continue dragging
        this.grabbedPlatform.drag(worldX, worldY)
      }
    }
  }

  /** Generate more platforms ahead of the player */
  extendTerrain() {
    const lastPlatform = this.platforms[this.platforms.length - 1]
    const rightEdge = lastPlatform ? lastPlatform.x + lastPlatform.width : this.worldRightEdge

    if (rightEdge < this.camera.x + this.width + 800) {
      const count = 6
      let x = rightEdge + 30 + Math.random() * 40
      let prevPlat = lastPlatform

      for (let i = 0; i < count; i++) {
        const w = 60 + Math.random() * 150
        const h = 16 + Math.random() * 8

        let y
        if (prevPlat) {
          y = prevPlat.y + (Math.random() - 0.45) * 100
          y = Math.max(this.height * 0.12, Math.min(this.height * 0.78, y))
        } else {
          y = this.height * 0.5
        }

        const platform = new Platform(x, y, w, h, this.nextPlatformId++)
        this.platforms.push(platform)

        // Connect to previous platform
        if (prevPlat) {
          const ratio = 0.2 + Math.random() * 0.35
          prevPlat.connectTo(platform, ratio)
        }

        prevPlat = platform
        x += w + 20 + Math.random() * 60
      }

      this.worldRightEdge = x + 500
    }
  }

  /** Remove platforms far behind the player */
  cleanupPlatforms() {
    const removeThreshold = this.camera.x - 600
    this.platforms = this.platforms.filter(p => p.x + p.width > removeThreshold)
  }

  /** End the game */
  endGame() {
    if (this.isGameOver) return
    this.isGameOver = true
    this.isPlaying = false

    const finalScore = Math.floor(this.score)
    if (finalScore > this.highScore) {
      this.highScore = finalScore
      localStorage.setItem('platformBindHighScore', String(this.highScore))
    }

    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(finalScore)
    }
  }

  /** Restart the game */
  restart() {
    // Clear mouse state
    if (this.grabbedPlatform) {
      this.grabbedPlatform.release()
      this.grabbedPlatform = null
    }

    this.isGameOver = false
    this.isPlaying = true
    this.score = 0
    this.gameTime = 0
    this.player = new Player(100, 200)
    this.generateTerrain()
    this.placePlayerOnFirstPlatform()
    this.createStarfield()

    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(0)
    }
    if (this.callbacks.onGameRestart) {
      this.callbacks.onGameRestart()
    }
  }

  /** Render everything */
  render(dt) {
    const ctx = this.ctx
    const w = this.width
    const h = this.height

    // Clear with DPR-aware clearing
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.restore()

    // Apply DPR scaling
    ctx.scale(this.dpr, this.dpr)

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#0f0c29')
    gradient.addColorStop(0.4, '#302b63')
    gradient.addColorStop(0.7, '#24243e')
    gradient.addColorStop(1, '#1a1a3e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    // Stars
    this.drawStars(ctx, dt)

    // Parallax mountains
    this.drawParallaxMountains(ctx)

    // World transform
    ctx.save()
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y))

    // Draw connection lines (behind platforms)
    const drawnConnections = new Set()
    for (const platform of this.platforms) {
      platform.drawConnections(ctx)
    }

    // Draw platforms
    for (const platform of this.platforms) {
      platform.draw(ctx)
    }

    // Draw player
    this.player.draw(ctx)

    // --- Fog / atmospheric effect at world edges ---
    const fogGradient = ctx.createLinearGradient(
      this.camera.x - 100, 0, this.camera.x + 50, 0
    )
    fogGradient.addColorStop(0, 'rgba(15, 12, 41, 0.6)')
    fogGradient.addColorStop(1, 'rgba(15, 12, 41, 0)')
    ctx.fillStyle = fogGradient
    ctx.fillRect(this.camera.x - 100, this.camera.y - 50, 150, h + 100)

    const fogGradient2 = ctx.createLinearGradient(
      this.camera.x + w - 50, 0, this.camera.x + w + 100, 0
    )
    fogGradient2.addColorStop(0, 'rgba(15, 12, 41, 0)')
    fogGradient2.addColorStop(1, 'rgba(15, 12, 41, 0.6)')
    ctx.fillStyle = fogGradient2
    ctx.fillRect(this.camera.x + w - 50, this.camera.y - 50, 150, h + 100)

    ctx.restore()
  }

  /** Draw parallax starfield */
  drawStars(ctx, dt) {
    const w = this.width
    const h = this.height

    for (const star of this.stars) {
      const sx = (star.x - this.camera.x * 0.02) % (w + 100)
      const screenX = sx < 0 ? sx + w + 100 : sx
      const brightness = star.brightness * (0.5 + 0.5 * Math.sin(dt * star.twinkleSpeed + star.twinklePhase))
      const screenY = star.y - this.camera.y * 0.01

      ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.6})`
      ctx.fillRect(screenX, screenY % h, star.size, star.size)
    }
  }

  /** Draw parallax mountain layers */
  drawParallaxMountains(ctx) {
    const w = this.width
    const h = this.height
    const camX = this.camera.x

    // Far layer (very slow parallax)
    ctx.fillStyle = 'rgba(48, 43, 99, 0.3)'
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 4) {
      const wx = x + camX * 0.08
      const y = h * 0.55 +
        Math.sin(wx * 0.004) * 40 +
        Math.sin(wx * 0.007) * 25 +
        Math.sin(wx * 0.012) * 15
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()

    // Mid layer
    ctx.fillStyle = 'rgba(36, 36, 62, 0.4)'
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 4) {
      const wx = x + camX * 0.15
      const y = h * 0.62 +
        Math.sin(wx * 0.005) * 35 +
        Math.sin(wx * 0.01) * 20 +
        Math.sin(wx * 0.018) * 10
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()

    // Near layer
    ctx.fillStyle = 'rgba(26, 26, 62, 0.5)'
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 4) {
      const wx = x + camX * 0.25
      const y = h * 0.72 +
        Math.sin(wx * 0.006) * 25 +
        Math.sin(wx * 0.013) * 15
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
  }

  /** Clean up resources */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    if (this.input) {
      this.input.destroy()
      this.input = null
    }
    window.removeEventListener('resize', this._onResize)
    this.isPlaying = false
  }
}

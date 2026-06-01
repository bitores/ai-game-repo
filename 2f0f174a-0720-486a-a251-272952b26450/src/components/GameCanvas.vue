<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useGameState } from '../composables/useGameState'
import { Particle } from '../game/Particle'
import { Explosion } from '../game/Explosion'
import { FloatingText } from '../game/FloatingText'

const { state, addScore, loseLife, reset } = useGameState()

const canvasRef = ref(null)

// ---- Game entity arrays (not reactive — updated every frame) ----
let particles = []
let explosions = []
let floatingTexts = []

// ---- Background stars ----
let starField = []

// ---- Cursor tracking ----
let mouseX = -100
let mouseY = -100
let mouseTrail = []

// ---- Timing ----
let animFrameId = null
let lastTime = 0
let spawnTimer = 0

// ================================================================
//  STAR FIELD
// ================================================================
function initStarField(w, h) {
  starField = Array.from({ length: 80 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 0.5 + Math.random() * 1.5,
    brightness: 0.3 + Math.random() * 0.7,
    twinkleFreq: 0.5 + Math.random() * 2,
    twinklePhase: Math.random() * Math.PI * 2,
  }))
}

// ================================================================
//  INPUT HANDLING
// ================================================================
function handleClick(event) {
  if (state.gameOver) return
  state.totalClicks++

  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const x = (event.clientX - rect.left) * (canvas.width / rect.width)
  const y = (event.clientY - rect.top) * (canvas.height / rect.height)

  // Check particles from front to back (last drawn = top-most)
  let hit = false
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].containsPoint(x, y)) {
      const p = particles[i]
      const currentCombo = state.combo
      const scoreGain = Math.floor(50 * (1 + currentCombo * 0.15))
      const nextCombo = currentCombo + 1

      // Visual effects
      explosions.push(new Explosion(p.x, p.y, p.hue, p.saturation, p.lightness))

      const popupText = nextCombo > 1 ? `+${scoreGain} x${nextCombo}` : `+${scoreGain}`
      floatingTexts.push(
        new FloatingText(p.x, p.y - 20, popupText, `hsl(${p.hue}, 80%, 70%)`)
      )

      // Scoring
      particles.splice(i, 1)
      state.particlesDestroyed++
      state.combo = nextCombo
      state.maxCombo = Math.max(state.maxCombo, state.combo)
      state.score += scoreGain

      // Level progression
      const newLevel = 1 + Math.floor(state.score / 500)
      if (newLevel !== state.level) {
        state.level = newLevel
        floatingTexts.push(
          new FloatingText(
            canvas.width / 2,
            canvas.height / 2 - 30,
            `LEVEL ${state.level}`,
            '#ffdd44',
            32
          )
        )
      }

      hit = true
      break
    }
  }

  if (!hit) {
    state.combo = 0
    floatingTexts.push(new FloatingText(x, y - 15, 'MISS', '#ff4466', 16))
  }
}

function handleMouseMove(event) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  mouseX = (event.clientX - rect.left) * (canvas.width / rect.width)
  mouseY = (event.clientY - rect.top) * (canvas.height / rect.height)
  mouseTrail.push({ x: mouseX, y: mouseY, time: performance.now() })
  if (mouseTrail.length > 20) mouseTrail.shift()
}

// ================================================================
//  DIFFICULTY PARAMETERS
// ================================================================
function getSpawnInterval() {
  return Math.max(350, 1800 - state.level * 130)
}

function getMaxParticles() {
  return Math.min(100, 25 + state.level * 5)
}

function getSpawnCount() {
  return Math.min(4, 1 + Math.floor(state.level / 3))
}

// ================================================================
//  GAME UPDATE
// ================================================================
function update(dt) {
  if (state.gameOver) return

  const canvas = canvasRef.value
  if (!canvas) return

  // Spawn
  spawnTimer += dt
  if (spawnTimer >= getSpawnInterval()) {
    spawnTimer = 0
    const count = getSpawnCount()
    for (let i = 0; i < count; i++) {
      if (particles.length < getMaxParticles()) {
        particles.push(new Particle(canvas.width, canvas.height, state.level))
      }
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.update(dt)
    if (!p.alive && p.escaped) {
      loseLife()
      particles.splice(i, 1)
    } else if (!p.alive) {
      particles.splice(i, 1)
    }
  }

  // Enforce limit (oldest first)
  while (particles.length > getMaxParticles()) {
    particles.shift()
  }

  // Update explosions
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].update(dt)
    if (explosions[i].done) explosions.splice(i, 1)
  }

  // Update floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].update(dt)
    if (floatingTexts[i].done) floatingTexts.splice(i, 1)
  }

  // Trim mouse trail
  const now = performance.now()
  mouseTrail = mouseTrail.filter((t) => now - t.time < 300)
}

// ================================================================
//  RENDERING
// ================================================================
function drawBackground(ctx, w, h, now) {
  // Radial gradient
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7)
  grad.addColorStop(0, '#101830')
  grad.addColorStop(1, '#080c18')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Scrolling grid
  ctx.strokeStyle = 'rgba(40, 80, 160, 0.10)'
  ctx.lineWidth = 1
  const gridSize = 60
  const offset = (now * 0.02) % gridSize
  ctx.beginPath()
  for (let x = offset; x < w; x += gridSize) {
    ctx.moveTo(Math.round(x) + 0.5, 0)
    ctx.lineTo(Math.round(x) + 0.5, h)
  }
  for (let y = offset; y < h; y += gridSize) {
    ctx.moveTo(0, Math.round(y) + 0.5)
    ctx.lineTo(w, Math.round(y) + 0.5)
  }
  ctx.stroke()

  // Twinkling stars
  for (const star of starField) {
    const twinkle =
      0.5 + 0.5 * Math.sin(now * star.twinkleFreq * 0.001 + star.twinklePhase)
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.r * twinkle, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(180, 210, 255, ${star.brightness * twinkle * 0.45})`
    ctx.fill()
  }
}

function drawCrosshair(ctx, x, y) {
  const size = 14
  ctx.save()
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.35)'
  ctx.lineWidth = 1.5

  // Outer ring
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.stroke()

  // Cross lines
  ctx.beginPath()
  ctx.moveTo(x - size * 1.5, y)
  ctx.lineTo(x + size * 1.5, y)
  ctx.moveTo(x, y - size * 1.5)
  ctx.lineTo(x, y + size * 1.5)
  ctx.stroke()

  // Centre dot
  ctx.beginPath()
  ctx.arc(x, y, 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(180, 220, 255, 0.7)'
  ctx.fill()
  ctx.restore()
}

function drawMouseTrail(ctx, now) {
  for (const t of mouseTrail) {
    const age = now - t.time
    const alpha = Math.max(0, 1 - age / 300)
    ctx.beginPath()
    ctx.arc(t.x, t.y, 2.5 * alpha, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(120, 180, 255, ${alpha * 0.2})`
    ctx.fill()
  }
}

function render(now) {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  drawBackground(ctx, w, h, now)

  // Game entities (order matters for visual layering)
  for (const p of particles) p.draw(ctx)
  for (const e of explosions) e.draw(ctx)
  for (const t of floatingTexts) t.draw(ctx)

  // UI overlays on canvas
  drawMouseTrail(ctx, now)
  drawCrosshair(ctx, mouseX, mouseY)
}

// ================================================================
//  GAME LOOP
// ================================================================
function gameLoop(timestamp) {
  const dt = lastTime ? timestamp - lastTime : 16.667
  lastTime = timestamp

  update(dt)
  render(timestamp)

  animFrameId = requestAnimationFrame(gameLoop)
}

// ================================================================
//  CANVAS SIZING
// ================================================================
function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  initStarField(canvas.width, canvas.height)
}

// ================================================================
//  WATCH GAME OVER → RESTART → CLEAR ENTITIES
// ================================================================
watch(
  () => state.gameOver,
  (isOver) => {
    if (!isOver) {
      // Game was restarted — clear all transient entities
      particles = []
      explosions = []
      floatingTexts = []
      mouseTrail = []
      spawnTimer = 0
      lastTime = 0
    }
  }
)

// ================================================================
//  LIFECYCLE
// ================================================================
onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  resizeCanvas()
  reset()

  window.addEventListener('resize', resizeCanvas)
  canvas.addEventListener('click', handleClick)
  canvas.addEventListener('mousemove', handleMouseMove)

  animFrameId = requestAnimationFrame(gameLoop)
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', resizeCanvas)
  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('click', handleClick)
    canvas.removeEventListener('mousemove', handleMouseMove)
  }
})
</script>

<template>
  <canvas ref="canvasRef" class="game-canvas" />
</template>

<style scoped>
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: none;
}
</style>

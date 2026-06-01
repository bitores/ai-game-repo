<template>
  <div class="game-container">
    <!-- Canvas for background + particles -->
    <canvas
      ref="effectCanvas"
      class="game-canvas"
      :width="WIDTH"
      :height="HEIGHT"
    ></canvas>

    <!-- DOM entities layer — v-for drives component lifecycle -->
    <div class="entities-layer">
      <!-- Player Ship -->
      <PlayerShip :player="player" />

      <!-- Player Bullets (created/destroyed on each shot) -->
      <Bullet
        v-for="b in bulletPool.active"
        :key="b.id"
        :bullet="b"
        type="player"
        @created="onEntityCreated('bullet', b)"
        @destroyed="onEntityDestroyed('bullet', b)"
      />

      <!-- Enemy Bullets (danmaku) -->
      <Bullet
        v-for="b in enemyBulletPool.active"
        :key="b.id"
        :bullet="b"
        type="enemy"
        @created="onEntityCreated('enemyBullet', b)"
        @destroyed="onEntityDestroyed('enemyBullet', b)"
      />

      <!-- Enemies -->
      <Enemy
        v-for="e in enemyPool.active"
        :key="e.id"
        :enemy="e"
        @created="onEntityCreated('enemy', e)"
        @destroyed="onEntityDestroyed('enemy', e)"
      />
    </div>

    <!-- HUD -->
    <HUD
      :score="score"
      :level="level"
      :wave="wave"
      :lives="player.lives"
      :fps="fps"
    />

    <!-- Lifecycle Monitor -->
    <LifecycleMonitor :stats="monitorStats" />

    <!-- Game Over Overlay -->
    <div v-if="gameOver" class="game-over-overlay">
      <div class="game-over-title">GAME OVER</div>
      <div class="game-over-score">FINAL SCORE: {{ score }}</div>
      <div class="game-over-hint">Press R to restart</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useKeyboard } from '../composables/useKeyboard'
import { useObjectPool } from '../composables/useObjectPool'
import PlayerShip from './PlayerShip.vue'
import Bullet from './Bullet.vue'
import Enemy from './Enemy.vue'
import HUD from './HUD.vue'
import LifecycleMonitor from './LifecycleMonitor.vue'

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */
const WIDTH = 800
const HEIGHT = 600
const PLAYER_SPEED = 5.5
const BULLET_SPEED = 9
const FIRE_COOLDOWN = 8 // frames
const PLAYER_W = 32
const PLAYER_H = 40
const BULLET_W = 3
const BULLET_H = 11
const ENEMY_BULLET_SIZE = 6

/* ------------------------------------------------------------------ */
/*  Input                                                             */
/* ------------------------------------------------------------------ */
const keys = useKeyboard()

/* ------------------------------------------------------------------ */
/*  Canvas                                                            */
/* ------------------------------------------------------------------ */
const effectCanvas = ref(null)

/* ------------------------------------------------------------------ */
/*  Player state                                                      */
/* ------------------------------------------------------------------ */
const player = reactive({
  x: WIDTH / 2 - PLAYER_W / 2,
  y: HEIGHT - 85,
  w: PLAYER_W,
  h: PLAYER_H,
  lives: 3,
  invincible: 0,
  fireCooldown: 0,
})

/* ------------------------------------------------------------------ */
/*  Game-global state                                                 */
/* ------------------------------------------------------------------ */
const score = ref(0)
const level = ref(1)
const wave = ref(0)
const gameOver = ref(false)
const totalKills = ref(0)
const fps = ref(60)

/* ------------------------------------------------------------------ */
/*  Object Pools — each drives v-for component lifecycle              */
/* ------------------------------------------------------------------ */
const bulletPool = useObjectPool(40, () => ({
  x: 0, y: 0, vx: 0, vy: 0,
  w: BULLET_W, h: BULLET_H,
  color: '#00ffcc',
  id: 0, active: false,
}))

const enemyBulletPool = useObjectPool(120, () => ({
  x: 0, y: 0, vx: 0, vy: 0,
  w: ENEMY_BULLET_SIZE, h: ENEMY_BULLET_SIZE,
  color: '#ff66ff',
  id: 0, active: false,
}))

const enemyPool = useObjectPool(15, () => ({
  x: 0, y: 0, vx: 0, vy: 0,
  w: 30, h: 30,
  hp: 1, maxHp: 1,
  type: 'basic', color: '#ff4444',
  fireCooldown: 0, fireInterval: 0,
  id: 0, active: false,
}))

/* ------------------------------------------------------------------ */
/*  Particles (canvas-only — no Vue components)                       */
/* ------------------------------------------------------------------ */
const particles = reactive([])

/* ------------------------------------------------------------------ */
/*  Star field                                                        */
/* ------------------------------------------------------------------ */
const stars = []
function initStars() {
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      size: Math.random() * 2 + 0.3,
      speed: Math.random() * 0.8 + 0.1,
      brightness: Math.random() * 0.5 + 0.5,
    })
  }
}
initStars()

/* ------------------------------------------------------------------ */
/*  Spawn state                                                       */
/* ------------------------------------------------------------------ */
let spawnTimer = 0
let spawnedThisWave = 0
let enemiesInWave = 0

/* ------------------------------------------------------------------ */
/*  Lifecycle monitoring                                              */
/* ------------------------------------------------------------------ */
const monitorStats = reactive({
  activeBullets: 0,
  activeEnemyBullets: 0,
  activeEnemies: 0,
  activeParticles: 0,
  created: 0,
  destroyed: 0,
  recentEvents: [],
})

function addLog(type, text) {
  monitorStats.recentEvents.push({ type, text })
  if (monitorStats.recentEvents.length > 6) {
    monitorStats.recentEvents.shift()
  }
}

function onEntityCreated(kind, entity) {
  monitorStats.created++
  if (kind === 'enemy') {
    addLog('created', `Enemy #${entity.id} (${entity.type})`)
  } else if (kind === 'bullet') {
    addLog('created', `Bullet #${entity.id}`)
  }
}

function onEntityDestroyed(kind, entity) {
  monitorStats.destroyed++
  if (kind === 'enemy') {
    addLog('destroyed', `Enemy #${entity.id}`)
  } else if (kind === 'bullet') {
    addLog('destroyed', `Bullet #${entity.id}`)
  }
}

/* ------------------------------------------------------------------ */
/*  Spawn helpers                                                     */
/* ------------------------------------------------------------------ */
function firePlayerBullet() {
  bulletPool.acquire((b) => {
    b.x = player.x + player.w / 2 - BULLET_W / 2
    b.y = player.y - BULLET_H
    b.vx = 0
    b.vy = -BULLET_SPEED
    b.color = '#00ffcc'
    b.w = BULLET_W
    b.h = BULLET_H
  })
}

function createEnemyBullet(x, y, vx, vy, color = '#ff66ff') {
  enemyBulletPool.acquire((b) => {
    b.x = x
    b.y = y
    b.vx = vx
    b.vy = vy
    b.color = color
    b.w = ENEMY_BULLET_SIZE
    b.h = ENEMY_BULLET_SIZE
  })
}

function spawnEnemy() {
  const roll = Math.random()
  let type
  if (level.value >= 3 && roll < 0.2) {
    type = 'tank'
  } else if (level.value >= 2 && roll < 0.45) {
    type = 'shooter'
  } else {
    type = 'basic'
  }

  const configs = {
    basic: { w: 30, h: 30, hp: 1, speed: 1.2 + level.value * 0.15, color: '#ff4444', fireInterval: 0 },
    shooter: { w: 28, h: 28, hp: 2, speed: 1 + level.value * 0.1, color: '#ff8800', fireInterval: 80 - level.value * 5 },
    tank: { w: 42, h: 36, hp: 4 + Math.floor(level.value / 2), speed: 0.7 + level.value * 0.08, color: '#cc2244', fireInterval: 0 },
  }

  const cfg = configs[type]
  enemyPool.acquire((e) => {
    e.x = 30 + Math.random() * (WIDTH - cfg.w - 60)
    e.y = -cfg.h
    e.vx = 0
    e.vy = cfg.speed
    e.w = cfg.w
    e.h = cfg.h
    e.hp = cfg.hp
    e.maxHp = cfg.hp
    e.type = type
    e.color = cfg.color
    e.fireCooldown = 20 + Math.random() * 40
    e.fireInterval = cfg.fireInterval
  })
}

/* ------------------------------------------------------------------ */
/*  Enemy bullet patterns (danmaku)                                   */
/* ------------------------------------------------------------------ */
function enemyFirePattern(enemy) {
  const cx = enemy.x + enemy.w / 2
  const cy = enemy.y + enemy.h
  const px = player.x + player.w / 2
  const py = player.y + player.h / 2
  const dx = px - cx
  const dy = py - cy
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / dist
  const ny = dy / dist

  // Pattern selection by level
  const patterns = ['aimed']
  if (level.value >= 3) patterns.push('spread')
  if (level.value >= 5) patterns.push('circle')
  if (level.value >= 7) patterns.push('spiral')

  const pattern = patterns[Math.floor(Math.random() * patterns.length)]
  const baseSpeed = 2.5 + level.value * 0.25

  switch (pattern) {
    case 'aimed': {
      createEnemyBullet(cx, cy, nx * baseSpeed, ny * baseSpeed, '#ff66ff')
      break
    }
    case 'spread': {
      const count = 3 + Math.min(level.value, 5)
      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(dy, dx) + (i - (count - 1) / 2) * 0.18
        const s = baseSpeed * 0.9
        createEnemyBullet(cx, cy, Math.cos(angle) * s, Math.sin(angle) * s, '#ffff00')
      }
      break
    }
    case 'circle': {
      const count = 12 + level.value * 2
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.1
        const s = 1.8 + Math.random() * 0.5
        createEnemyBullet(
          cx + Math.cos(angle) * 10,
          cy + Math.sin(angle) * 10,
          Math.cos(angle) * s,
          Math.sin(angle) * s,
          '#ff66ff',
        )
      }
      break
    }
    case 'spiral': {
      const count = 16
      // Use a global timer to rotate the spiral
      const offset = (Date.now() / 200) % (Math.PI * 2)
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + offset
        const s = 2
        createEnemyBullet(cx, cy, Math.cos(angle) * s, Math.sin(angle) * s, '#ff00ff')
      }
      break
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Particles                                                         */
/* ------------------------------------------------------------------ */
function createExplosion(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 4 + 1.5
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3 + 1.5,
      life: 25 + Math.random() * 20,
      maxLife: 45,
      color,
    })
  }
}

/* ------------------------------------------------------------------ */
/*  Collision                                                         */
/* ------------------------------------------------------------------ */
function rectCollision(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

/* ------------------------------------------------------------------ */
/*  Wave management                                                   */
/* ------------------------------------------------------------------ */
function startWave() {
  wave.value++
  enemiesInWave = 5 + wave.value * 2
  if (enemiesInWave > 40) enemiesInWave = 40
  spawnedThisWave = 0
  spawnTimer = 0
}

/* ------------------------------------------------------------------ */
/*  Game reset                                                        */
/* ------------------------------------------------------------------ */
function resetGame() {
  player.x = WIDTH / 2 - PLAYER_W / 2
  player.y = HEIGHT - 85
  player.lives = 3
  player.invincible = 0
  player.fireCooldown = 0

  score.value = 0
  level.value = 1
  wave.value = 0
  gameOver.value = false
  totalKills.value = 0

  bulletPool.releaseAll()
  enemyBulletPool.releaseAll()
  enemyPool.releaseAll()
  particles.splice(0)

  monitorStats.created = 0
  monitorStats.destroyed = 0
  monitorStats.recentEvents.splice(0)

  startWave()
}

/* ------------------------------------------------------------------ */
/*  Game Loop — update                                                */
/* ------------------------------------------------------------------ */
let lastTime = 0
let animId = null
let frameCount = 0
let fpsAccum = 0

function update(dt) {
  if (gameOver.value) return

  /* ---------- Player movement ---------- */
  if (keys.left) player.x -= PLAYER_SPEED * dt
  if (keys.right) player.x += PLAYER_SPEED * dt
  if (keys.up) player.y -= PLAYER_SPEED * dt
  if (keys.down) player.y += PLAYER_SPEED * dt
  player.x = Math.max(0, Math.min(WIDTH - player.w, player.x))
  player.y = Math.max(0, Math.min(HEIGHT - player.h, player.y))

  if (player.invincible > 0) player.invincible -= 1

  /* ---------- Player firing ---------- */
  if (player.fireCooldown > 0) player.fireCooldown -= 1
  if (keys.space && player.fireCooldown <= 0) {
    firePlayerBullet()
    player.fireCooldown = FIRE_COOLDOWN
  }

  /* ---------- Move player bullets ---------- */
  for (let i = bulletPool.active.length - 1; i >= 0; i--) {
    const b = bulletPool.active[i]
    b.x += b.vx * dt
    b.y += b.vy * dt
    if (b.y + b.h < 0 || b.y > HEIGHT || b.x + b.w < 0 || b.x > WIDTH) {
      bulletPool.release(b)
    }
  }

  /* ---------- Spawn enemies ---------- */
  if (spawnedThisWave < enemiesInWave && enemyPool.active.length < 25) {
    spawnTimer -= 1
    if (spawnTimer <= 0) {
      spawnEnemy()
      spawnedThisWave++
      const delay = Math.max(12, 55 - wave.value * 3)
      spawnTimer = delay + Math.random() * 20
    }
  }

  /* ---------- Move enemies & fire ---------- */
  for (let i = enemyPool.active.length - 1; i >= 0; i--) {
    const e = enemyPool.active[i]
    e.x += e.vx * dt
    e.y += e.vy * dt

    if (e.y > HEIGHT + 60) {
      enemyPool.release(e)
      continue
    }

    // Enemy fires danmaku
    if (e.fireInterval > 0 && e.y > 10 && e.y < HEIGHT * 0.6) {
      e.fireCooldown -= 1
      if (e.fireCooldown <= 0) {
        enemyFirePattern(e)
        e.fireCooldown = e.fireInterval
      }
    }
  }

  /* ---------- Move enemy bullets ---------- */
  for (let i = enemyBulletPool.active.length - 1; i >= 0; i--) {
    const b = enemyBulletPool.active[i]
    b.x += b.vx * dt
    b.y += b.vy * dt
    if (b.y + b.h < 0 || b.y > HEIGHT || b.x + b.w < 0 || b.x > WIDTH) {
      enemyBulletPool.release(b)
    }
  }

  /* ---------- Collision: player bullets vs enemies ---------- */
  for (let i = bulletPool.active.length - 1; i >= 0; i--) {
    const b = bulletPool.active[i]
    let hit = false

    for (let j = enemyPool.active.length - 1; j >= 0; j--) {
      const e = enemyPool.active[j]
      if (rectCollision(b, e)) {
        e.hp -= 1
        hit = true
        createExplosion(b.x, b.y, '#ffffff', 4)

        if (e.hp <= 0) {
          // Enemy destroyed
          const pts = e.type === 'tank' ? 500 : e.type === 'shooter' ? 200 : 100
          score.value += pts
          totalKills.value++
          level.value = Math.floor(totalKills.value / 5) + 1
          createExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 18)
          enemyPool.release(e)
        }
        break
      }
    }

    if (hit) {
      bulletPool.release(b)
    }
  }

  /* ---------- Collision: enemy bullets vs player ---------- */
  if (player.invincible <= 0) {
    const pHitBox = { x: player.x + 4, y: player.y + 4, w: player.w - 8, h: player.h - 8 }
    for (let i = enemyBulletPool.active.length - 1; i >= 0; i--) {
      const b = enemyBulletPool.active[i]
      if (rectCollision(b, pHitBox)) {
        playerHit()
        enemyBulletPool.release(b)
        break
      }
    }
  }

  /* ---------- Collision: enemies vs player ---------- */
  if (player.invincible <= 0) {
    const pHitBox = { x: player.x + 4, y: player.y + 4, w: player.w - 8, h: player.h - 8 }
    for (let i = enemyPool.active.length - 1; i >= 0; i--) {
      const e = enemyPool.active[i]
      if (rectCollision(e, pHitBox)) {
        playerHit()
        enemyPool.release(e)
        break
      }
    }
  }

  /* ---------- Particles ---------- */
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 0.04 * dt // gravity
    p.vx *= 0.98 // friction
    p.life -= 1
    if (p.life <= 0) particles.splice(i, 1)
  }

  /* ---------- Wave completion ---------- */
  if (spawnedThisWave >= enemiesInWave && enemyPool.active.length === 0 && !gameOver.value) {
    startWave()
  }

  /* ---------- Monitor stats ---------- */
  monitorStats.activeBullets = bulletPool.active.length
  monitorStats.activeEnemyBullets = enemyBulletPool.active.length
  monitorStats.activeEnemies = enemyPool.active.length
  monitorStats.activeParticles = particles.length

  /* ---------- FPS ---------- */
  frameCount++
  fpsAccum += dt
  if (fpsAccum >= 60) {
    fps.value = Math.round(frameCount / (fpsAccum / 60))
    frameCount = 0
    fpsAccum = 0
  }
}

function playerHit() {
  player.lives -= 1
  player.invincible = 60
  createExplosion(player.x + player.w / 2, player.y + player.h / 2, '#ff4444', 25)
  if (player.lives <= 0) {
    gameOver.value = true
  }
}

/* ------------------------------------------------------------------ */
/*  Game Loop — render (canvas background + particles)                */
/* ------------------------------------------------------------------ */
function render() {
  const canvas = effectCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0a0a2e'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Stars (parallax)
  for (const star of stars) {
    star.y += star.speed
    if (star.y > HEIGHT) {
      star.y = 0
      star.x = Math.random() * WIDTH
    }
    ctx.globalAlpha = star.brightness * 0.8
    ctx.fillStyle = '#c0d0ff'
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Particles
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/* ------------------------------------------------------------------ */
/*  Main loop                                                         */
/* ------------------------------------------------------------------ */
function gameLoop(time) {
  const dt = lastTime ? Math.min((time - lastTime) / 16.667, 4) : 1
  lastTime = time
  update(dt)
  render()
  animId = requestAnimationFrame(gameLoop)
}

/* ------------------------------------------------------------------ */
/*  Restart handler                                                   */
/* ------------------------------------------------------------------ */
function onKeyDown(e) {
  if ((e.key === 'r' || e.key === 'R') && gameOver.value) {
    resetGame()
  }
}

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                         */
/* ------------------------------------------------------------------ */
onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  startWave()
  animId = requestAnimationFrame(gameLoop)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (animId) cancelAnimationFrame(animId)
})
</script>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { GameEngine } from '../game/engine.js'
import { GAME_WIDTH, GAME_HEIGHT, GS } from '../game/constants.js'
import HUD from './HUD.vue'

const emit = defineEmits(['stateChange'])

// Canvas ref
const canvasRef = ref(null)

// Reactive game state (shared with HUD)
const gameState = reactive({
  gameState: 'menu',
  score: 0,
  collectedFragments: 0,
  totalFragments: 0,
  rewindEnergy: 100,
  isRewinding: false,
  level: 1
})

let engine = null
let animFrameId = null
let lastTime = 0

// ─── Lifecycle ───

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  // Setup canvas
  canvas.width = GAME_WIDTH
  canvas.height = GAME_HEIGHT

  // Create engine
  engine = new GameEngine(canvas, gameState)

  // Handle resize
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // Input
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // Touch (mobile support via HUD buttons)
  setupTouchControls()

  // Start game loop
  lastTime = performance.now()
  gameLoop(lastTime)
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

// ─── Resize ───

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return

  const container = canvas.parentElement
  if (!container) return

  const cw = container.clientWidth
  const ch = container.clientHeight
  const scale = Math.min(cw / GAME_WIDTH, ch / GAME_HEIGHT)

  canvas.style.width = (GAME_WIDTH * scale) + 'px'
  canvas.style.height = (GAME_HEIGHT * scale) + 'px'
}

// ─── Game Loop ───

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05)
  lastTime = timestamp

  if (engine) {
    engine.update(dt)
    engine.render()
  }

  animFrameId = requestAnimationFrame(gameLoop)
}

// ─── Input ───

const keyMap = {
  'ArrowLeft': 'left',
  'ArrowRight': 'right',
  'ArrowUp': 'jump',
  'a': 'left', 'A': 'left',
  'd': 'right', 'D': 'right',
  'w': 'jump', 'W': 'jump',
  ' ': 'jump',
  'Shift': 'rewind',
  'z': 'rewind', 'Z': 'rewind',
  'Enter': 'enter'
}

function onKeyDown(e) {
  const action = keyMap[e.key]
  if (action) {
    e.preventDefault()
    if (engine) {
      if (action === 'enter') {
        handleEnter()
        return
      }
      engine.handleKeyDown(action)
    }
  }
}

function onKeyUp(e) {
  const action = keyMap[e.key]
  if (action) {
    e.preventDefault()
    if (engine) {
      if (action === 'enter') return
      engine.handleKeyUp(action)
    }
  }
}

function handleEnter() {
  if (!engine) return
  if (engine.gameState === GS.MENU) {
    engine.startGame()
  } else if (engine.gameState === GS.LEVEL_COMPLETE) {
    engine.nextLevel()
  } else if (engine.gameState === GS.DYING) {
    engine.restartLevel()
  }
}

// ─── Touch Controls ───

function setupTouchControls() {
  // Delegate touch events from mobile buttons (handled via event delegation)
  document.addEventListener('touchstart', onTouchStart, { passive: false })
  document.addEventListener('touchend', onTouchEnd, { passive: false })
  document.addEventListener('touchcancel', onTouchEnd, { passive: false })
}

function getActionFromTarget(el) {
  if (!el) return null
  const key = el.getAttribute?.('data-key')
  if (key) return key
  return getActionFromTarget(el.parentElement)
}

function onTouchStart(e) {
  const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)
  const action = getActionFromTarget(el)
  if (action && engine) {
    e.preventDefault()
    if (action === 'enter' || action === 'start') {
      handleEnter()
    } else {
      engine.handleKeyDown(action)
    }
  }
}

function onTouchEnd(e) {
  // Release all keys on touch end
  if (engine) {
    engine.handleKeyUp('left')
    engine.handleKeyUp('right')
    engine.handleKeyUp('jump')
    engine.handleKeyUp('rewind')
  }
}

// ─── Public methods for parent ───

function startGame() {
  if (engine) engine.startGame()
}

function nextLevel() {
  if (engine) engine.nextLevel()
}

defineExpose({ startGame, nextLevel })
</script>

<template>
  <div class="game-board">
    <canvas ref="canvasRef"></canvas>
    <HUD
      :game-state="gameState.gameState"
      :score="gameState.score"
      :collected-fragments="gameState.collectedFragments"
      :total-fragments="gameState.totalFragments"
      :rewind-energy="gameState.rewindEnergy"
      :is-rewinding="gameState.isRewinding"
      :level="gameState.level"
      @start="startGame"
      @next-level="nextLevel"
    />
  </div>
</template>

<style scoped>
.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #05051a;
  overflow: hidden;
}

canvas {
  display: block;
  image-rendering: pixelated;
}
</style>

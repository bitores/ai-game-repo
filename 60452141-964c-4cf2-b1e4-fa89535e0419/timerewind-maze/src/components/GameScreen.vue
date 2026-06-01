<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { GameEngine } from '../game/GameEngine.js'
import { levels } from '../game/LevelData.js'
import { InputManager } from '../game/InputManager.js'

const props = defineProps({
  levelIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['win', 'lose', 'menu'])

const canvasRef = ref(null)
const hudState = reactive({
  timeLeft: 0,
  cratesSecured: 0,
  totalCrates: 0,
  isPaused: false,
  levelName: ''
})

let engine = null
let inputManager = null

// Store handlers as module-level so onUnmounted can reference them
let _handleKey = null
let _resizeHandler = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const levelData = levels[props.levelIndex]
  if (!levelData) {
    emit('menu')
    return
  }

  // Calculate canvas size
  const tileSize = 48
  canvas.width = levelData.grid[0].length * tileSize
  canvas.height = levelData.grid.length * tileSize

  // Scale canvas to fit viewport
  fitCanvas(canvas)

  inputManager = new InputManager()
  engine = new GameEngine(canvas, ctx, levelData, inputManager, {
    hudState,
    onWin: () => emit('win'),
    onLose: (reason) => emit('lose', reason)
  })

  engine.start()

  // Handle Escape key to go back to menu
  _handleKey = (e) => {
    if (e.key === 'Escape') {
      if (engine) engine.stop()
      emit('menu')
    }
  }
  window.addEventListener('keydown', _handleKey)

  // Resize handler
  _resizeHandler = () => fitCanvas(canvas)
  window.addEventListener('resize', _resizeHandler)
})

onUnmounted(() => {
  if (engine) engine.stop()
  if (inputManager) inputManager.destroy()
  if (_handleKey) window.removeEventListener('keydown', _handleKey)
  if (_resizeHandler) window.removeEventListener('resize', _resizeHandler)
})

function fitCanvas(canvas) {
  if (!canvas || !canvas.parentElement) return
  const parent = canvas.parentElement
  const maxW = parent.clientWidth - 32
  const maxH = parent.clientHeight - 80
  const scale = Math.min(1, maxW / canvas.width, maxH / canvas.height)
  canvas.style.width = Math.floor(canvas.width * scale) + 'px'
  canvas.style.height = Math.floor(canvas.height * scale) + 'px'
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="game-screen">
    <!-- HUD -->
    <div class="hud">
      <div class="hud-left">
        <span class="hud-level">{{ hudState.levelName || levels[levelIndex]?.name }}</span>
        <button class="hud-btn" @click="emit('menu')">✕ 退出</button>
      </div>
      <div class="hud-center">
        <div class="hud-timer" :class="{ warning: hudState.timeLeft < 30, critical: hudState.timeLeft < 15 }">
          <span class="timer-icon">⏱</span>
          <span class="timer-value">{{ formatTime(hudState.timeLeft) }}</span>
        </div>
      </div>
      <div class="hud-right">
        <div class="hud-crates">
          <span class="crate-icon">📦</span>
          <span>{{ hudState.cratesSecured }}/{{ hudState.totalCrates }}</span>
        </div>
        <div class="hud-pause-indicator" v-if="hudState.isPaused">
          ⏸ 暂停
        </div>
      </div>
    </div>

    <!-- Canvas -->
    <div class="canvas-wrapper">
      <canvas ref="canvasRef" class="game-canvas"></canvas>
    </div>

    <!-- Controls reminder -->
    <div class="controls-bar">
      <span><kbd>↑↓←→</kbd> 移动</span>
      <span><kbd>空格</kbd> 暂停时间</span>
      <span><kbd>Esc</kbd> 退出</span>
    </div>
  </div>
</template>

<style scoped>
.game-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d0705;
  align-items: center;
  overflow: hidden;
}

.hud {
  width: 100%;
  max-width: 900px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: linear-gradient(180deg, rgba(44, 24, 16, 0.9), rgba(13, 7, 5, 0.9));
  border-bottom: 1px solid rgba(212, 165, 116, 0.1);
  flex-shrink: 0;
}

.hud-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hud-level {
  font-size: 14px;
  color: #d4a574;
  text-shadow: 0 0 8px rgba(212, 165, 116, 0.2);
}

.hud-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-family: inherit;
  color: rgba(212, 165, 116, 0.5);
  background: rgba(212, 165, 116, 0.08);
  border: 1px solid rgba(212, 165, 116, 0.15);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}
.hud-btn:hover {
  color: #d4a574;
  border-color: #d4a574;
  background: rgba(212, 165, 116, 0.15);
}

.hud-center {
  display: flex;
  align-items: center;
}

.hud-timer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 20px;
  font-weight: bold;
  color: #d4a574;
  text-shadow: 0 0 10px rgba(212, 165, 116, 0.2);
  font-variant-numeric: tabular-nums;
}

.hud-timer.warning {
  color: #f39c12;
  text-shadow: 0 0 10px rgba(243, 156, 18, 0.3);
}

.hud-timer.critical {
  color: #e74c3c;
  text-shadow: 0 0 15px rgba(231, 76, 60, 0.4);
  animation: timerPulse 0.5s ease-in-out infinite alternate;
}

@keyframes timerPulse {
  from { opacity: 0.8; }
  to { opacity: 1; }
}

.timer-icon {
  font-size: 16px;
}

.hud-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hud-crates {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #d4a574;
}

.crate-icon {
  font-size: 14px;
}

.hud-pause-indicator {
  font-size: 12px;
  color: #87CEEB;
  text-shadow: 0 0 8px rgba(135, 206, 235, 0.3);
  animation: fadeInOut 1s ease-in-out infinite alternate;
}

@keyframes fadeInOut {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 8px;
}

.game-canvas {
  image-rendering: pixelated;
  border: 1px solid rgba(212, 165, 116, 0.15);
  border-radius: 4px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
}

.controls-bar {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  font-size: 11px;
  color: rgba(212, 165, 116, 0.35);
  border-top: 1px solid rgba(212, 165, 116, 0.08);
  flex-shrink: 0;
}

.controls-bar kbd {
  display: inline-block;
  padding: 1px 5px;
  font-size: 10px;
  font-family: 'Courier New', monospace;
  color: rgba(212, 165, 116, 0.5);
  background: rgba(212, 165, 116, 0.08);
  border: 1px solid rgba(212, 165, 116, 0.15);
  border-radius: 2px;
}
</style>

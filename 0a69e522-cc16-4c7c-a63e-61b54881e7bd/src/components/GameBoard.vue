<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { GameEngine } from '../game/GameEngine.js'

// --- Reactive UI state ---
const canvasRef = ref(null)
const score = ref(0)
const highScore = ref(parseInt(localStorage.getItem('platformBindHighScore') || '0'))
const gameOver = ref(false)
const finalScore = ref(0)
const showHelp = ref(true)

let engine = null

/** Start the game engine */
function startGame() {
  if (!canvasRef.value) return

  showHelp.value = false
  gameOver.value = false

  if (engine) {
    engine.destroy()
  }

  engine = new GameEngine(canvasRef.value, {
    onScoreUpdate: (s) => { score.value = s },
    onGameOver: (s) => {
      finalScore.value = s
      if (s > highScore.value) {
        highScore.value = s
      }
      gameOver.value = true
    },
    onGameRestart: () => {
      gameOver.value = false
      score.value = 0
    }
  })

  engine.init()
}

/** Restart after game over */
function restartGame() {
  if (engine) {
    engine.restart()
    gameOver.value = false
    score.value = 0
  }
}

onMounted(() => {
  nextTick(() => {
    startGame()
  })
})

onUnmounted(() => {
  if (engine) {
    engine.destroy()
    engine = null
  }
})
</script>

<template>
  <div class="game-container">
    <!-- Canvas -->
    <canvas
      ref="canvasRef"
      class="game-canvas"
    ></canvas>

    <!-- UI Overlay -->
    <div class="ui-overlay">
      <!-- Top HUD -->
      <div class="hud">
        <div class="hud-item">
          <span class="hud-label">得分</span>
          <span class="hud-value">{{ score }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">最高</span>
          <span class="hud-value best">{{ highScore }}</span>
        </div>
      </div>

      <!-- Help overlay (first time) -->
      <div v-if="showHelp" class="help-overlay" @click="startGame">
        <div class="help-card">
          <h1>平台绑定</h1>
          <h2>Platform Bind</h2>
          <div class="help-divider"></div>
          <div class="help-section">
            <div class="help-row">
              <kbd>A</kbd><kbd>D</kbd>
              <span>或</span>
              <kbd>&larr;</kbd><kbd>&rarr;</kbd>
              <span>移动</span>
            </div>
            <div class="help-row">
              <kbd>W</kbd><kbd>Space</kbd><kbd>&uarr;</kbd>
              <span>跳跃</span>
            </div>
            <div class="help-row help-mouse">
              <span class="mouse-icon">&#9678;</span>
              <span>点击拖动平台 &mdash; 连接的平台会同步移动</span>
            </div>
          </div>
          <div class="help-divider"></div>
          <p class="help-hint">利用鼠标拖拽改变地形，穿越不断变化的平台世界</p>
          <button class="start-btn" @click.stop="startGame">开始游戏</button>
        </div>
      </div>

      <!-- Game Over overlay -->
      <div v-if="gameOver && !showHelp" class="gameover-overlay">
        <div class="gameover-card">
          <h1>游戏结束</h1>
          <div class="gameover-score">
            <div class="score-final">
              <span class="label">得分</span>
              <span class="value">{{ finalScore }}</span>
            </div>
            <div class="score-best">
              <span class="label">最高纪录</span>
              <span class="value">{{ highScore }}</span>
            </div>
          </div>
          <button class="restart-btn" @click="restartGame">再来一次</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #0f0c29;
}

.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

/* --- HUD --- */
.hud {
  display: flex;
  gap: 20px;
  padding: 16px 20px;
  pointer-events: none;
}

.hud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 6px 16px;
  min-width: 80px;
}

.hud-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hud-value {
  font-size: 22px;
  font-weight: 700;
  color: #64ffda;
  font-variant-numeric: tabular-nums;
}

.hud-value.best {
  color: #ffd54f;
}

/* --- Help Overlay --- */
.help-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 12, 41, 0.85);
  backdrop-filter: blur(8px);
  pointer-events: all;
  z-index: 10;
}

.help-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 36px 40px;
  max-width: 420px;
  width: 90%;
  text-align: center;
}

.help-card h1 {
  font-size: 28px;
  font-weight: 800;
  color: #64ffda;
  margin: 0;
  letter-spacing: 2px;
}

.help-card h2 {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.4);
  margin: 4px 0 0;
  letter-spacing: 3px;
}

.help-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.15), transparent);
  margin: 20px 0;
}

.help-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.help-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.help-row span {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  font-family: inherit;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.help-mouse {
  margin-top: 4px;
}

.mouse-icon {
  font-size: 20px;
  color: #64ffda;
}

.help-hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin: 16px 0 10px;
  line-height: 1.5;
}

.start-btn {
  pointer-events: all;
  background: linear-gradient(135deg, #64ffda, #1de9b6);
  color: #0f0c29;
  border: none;
  border-radius: 12px;
  padding: 12px 36px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  margin-top: 8px;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(100, 255, 218, 0.3);
}

.start-btn:active {
  transform: translateY(0);
}

/* --- Game Over Overlay --- */
.gameover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 12, 41, 0.75);
  backdrop-filter: blur(5px);
  pointer-events: all;
  z-index: 10;
}

.gameover-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 36px 40px;
  max-width: 360px;
  width: 90%;
  text-align: center;
}

.gameover-card h1 {
  font-size: 26px;
  font-weight: 700;
  color: #ff5252;
  margin: 0 0 20px;
}

.gameover-score {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 24px;
}

.score-final,
.score-best {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-final .label,
.score-best .label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.score-final .value {
  font-size: 32px;
  font-weight: 700;
  color: #64ffda;
}

.score-best .value {
  font-size: 28px;
  font-weight: 700;
  color: #ffd54f;
}

.restart-btn {
  pointer-events: all;
  background: linear-gradient(135deg, #64ffda, #1de9b6);
  color: #0f0c29;
  border: none;
  border-radius: 12px;
  padding: 12px 36px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.restart-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(100, 255, 218, 0.3);
}

.restart-btn:active {
  transform: translateY(0);
}

/* Mobile responsiveness */
@media (max-width: 600px) {
  .help-card {
    padding: 24px 20px;
  }

  .help-card h1 {
    font-size: 22px;
  }

  .gameover-card {
    padding: 24px 20px;
  }

  .hud {
    padding: 10px 12px;
    gap: 10px;
  }

  .hud-item {
    min-width: 60px;
    padding: 4px 10px;
  }

  .hud-value {
    font-size: 18px;
  }
}
</style>

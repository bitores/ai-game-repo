<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import MazeGrid from './MazeGrid.vue'
import ControlPanel from './ControlPanel.vue'
import TimerDisplay from './TimerDisplay.vue'
import ScoreBoard from './ScoreBoard.vue'
import { useGameState } from '../composables/useGameState.js'
import { useTimer } from '../composables/useTimer.js'

const {
  cells,
  moveCount,
  score,
  isComplete,
  isLastLevel,
  eventLog,
  selectedCellId,
  currentLevel,
  currentLevelIndex,
  totalLevels,
  tryToggle,
  nextLevel,
  resetLevel,
  selectLevel,
  checkGateCondition,
} = useGameState()

const timer = useTimer()

// 第一次交互时启动计时器
let hasStarted = false

function handleToggle(cellId) {
  if (!hasStarted) {
    timer.start()
    hasStarted = true
  }
  tryToggle(cellId)
}

function handleHover(cellId) {
  // 可将来用于高亮关联
}

function handleReset() {
  resetLevel()
  timer.reset()
  hasStarted = false
}

function handleNextLevel() {
  nextLevel()
  timer.reset()
  hasStarted = false
}

function handleSelectLevel(index) {
  selectLevel(index)
  timer.reset()
  hasStarted = false
}

// 完成时停止计时器
watch(isComplete, (val) => {
  if (val) {
    timer.stop()
  }
})

// 键盘快捷键
function handleKeydown(e) {
  if (e.key === 'r' || e.key === 'R') {
    handleReset()
  }
  if (e.key === 'n' || e.key === 'N') {
    if (!isLastLevel.value) {
      handleNextLevel()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="game-board">
    <!-- 顶部状态栏 -->
    <header class="game-header">
      <div class="game-title-row">
        <h1 class="game-title">响应式迷宫</h1>
        <span class="game-version">Vue 3 响应式解谜</span>
      </div>
      <div class="header-stats">
        <ScoreBoard
          :move-count="moveCount"
          :score="score"
          :level-name="currentLevel?.name || ''"
          :level-subtitle="currentLevel?.subtitle || ''"
        />
        <TimerDisplay
          :formatted="timer.formatted.value"
          :is-running="timer.isRunning.value"
        />
      </div>
      <div class="level-indicator">
        <span
          v-for="(_, i) in totalLevels"
          :key="i"
          class="level-dot"
          :class="{ 'dot-active': i === currentLevelIndex, 'dot-done': i < currentLevelIndex }"
          @click="handleSelectLevel(i)"
        >
          {{ i + 1 }}
        </span>
      </div>
    </header>

    <!-- 主体区域 -->
    <main class="game-main">
      <section class="grid-section">
        <MazeGrid
          :cells="cells"
          :grid-rows="currentLevel?.gridRows || 3"
          :grid-cols="currentLevel?.gridCols || 3"
          :selected-cell-id="selectedCellId"
          :check-gate-condition="checkGateCondition"
          @toggle-cell="handleToggle"
          @hover-cell="handleHover"
        />
      </section>

      <aside class="control-section">
        <ControlPanel
          :cells="cells"
          :event-log="eventLog"
          :current-level="currentLevel"
          :move-count="moveCount"
          @reset="handleReset"
          @next-level="handleNextLevel"
          @select-level="handleSelectLevel"
        />
      </aside>
    </main>

    <!-- 胜利弹窗 -->
    <Transition name="victory-overlay">
      <div v-if="isComplete" class="victory-overlay" @click="handleNextLevel">
        <div class="victory-modal" @click.stop>
          <div class="victory-icon">🎉</div>
          <h2 class="victory-title">恭喜通关！</h2>
          <p class="victory-desc">
            你已解开「{{ currentLevel?.name }}」的逻辑谜题
          </p>
          <div class="victory-stats">
            <div class="v-stat">
              <span class="v-stat-label">用时</span>
              <span class="v-stat-value">{{ timer.formatted.value }}</span>
            </div>
            <div class="v-stat">
              <span class="v-stat-label">步数</span>
              <span class="v-stat-value">{{ moveCount }}</span>
            </div>
            <div class="v-stat">
              <span class="v-stat-label">总分</span>
              <span class="v-stat-value score">{{ score }}</span>
            </div>
          </div>
          <div class="victory-actions">
            <button class="btn btn-ghost" @click="handleReset">
              重玩本关
            </button>
            <button
              v-if="!isLastLevel"
              class="btn btn-primary"
              @click="handleNextLevel"
            >
              下一关 →
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 键盘快捷键提示 -->
    <div class="keyboard-hint">
      <span><kbd>R</kbd> 重置</span>
      <span><kbd>N</kbd> 下一关</span>
    </div>
  </div>
</template>

<style scoped>
.game-board {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

/* ── 头部 ── */
.game-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.game-title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.game-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, #00d4ff, #00ff88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
}
.game-version {
  font-size: 11px;
  color: #445;
}
.header-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ── 关卡指示器 ── */
.level-indicator {
  display: flex;
  gap: 6px;
}
.level-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #2a2a5a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #556;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
}
.level-dot:hover {
  border-color: #4a4a8a;
  color: #8899bb;
}
.dot-active {
  border-color: #00d4ff !important;
  color: #00d4ff !important;
  background: rgba(0, 212, 255, 0.1);
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
}
.dot-done {
  border-color: #00ff88;
  color: #00ff88;
  background: rgba(0, 255, 136, 0.08);
}

/* ── 主体 ── */
.game-main {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex: 1;
}
.grid-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}
.control-section {
  flex-shrink: 0;
  width: 360px;
}

/* ── 胜利弹窗 ── */
.victory-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.victory-modal {
  background: #1a1a3e;
  border: 1px solid #00ff88;
  border-radius: 20px;
  padding: 36px 40px;
  text-align: center;
  max-width: 380px;
  box-shadow: 0 0 60px rgba(0, 255, 136, 0.15);
  animation: modal-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes modal-pop {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.victory-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.victory-title {
  margin: 0 0 8px 0;
  color: #00ff88;
  font-size: 22px;
}
.victory-desc {
  margin: 0 0 20px 0;
  color: #8899bb;
  font-size: 14px;
}
.victory-stats {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
}
.v-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.v-stat-label {
  font-size: 10px;
  color: #667799;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.v-stat-value {
  font-family: 'Courier New', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #e0e0ff;
}
.v-stat-value.score {
  color: #ffaa00;
}
.victory-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.btn {
  padding: 10px 22px;
  border-radius: 8px;
  border: 1px solid #2a2a5a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ghost {
  background: transparent;
  color: #667799;
}
.btn-ghost:hover {
  color: #99aabb;
  border-color: #4a4a8a;
}
.btn-primary {
  background: rgba(0, 255, 136, 0.12);
  border-color: #00ff88;
  color: #00ff88;
}
.btn-primary:hover {
  background: rgba(0, 255, 136, 0.2);
  transform: translateY(-1px);
}

/* ── 过渡动画 ── */
.victory-overlay-enter-active { transition: opacity 0.3s; }
.victory-overlay-leave-active { transition: opacity 0.2s; }
.victory-overlay-enter-from,
.victory-overlay-leave-to { opacity: 0; }

/* ── 键盘提示 ── */
.keyboard-hint {
  display: flex;
  gap: 16px;
  justify-content: center;
  font-size: 11px;
  color: #445;
  padding: 8px 0;
}
.keyboard-hint kbd {
  background: #1a1a3e;
  border: 1px solid #2a2a5a;
  border-radius: 4px;
  padding: 2px 7px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #667799;
}

/* ── 响应式 ── */
@media (max-width: 800px) {
  .game-main {
    flex-direction: column;
    align-items: center;
  }
  .control-section {
    width: 100%;
    max-width: 520px;
  }
  .game-board {
    padding: 12px;
    gap: 14px;
  }
}
</style>

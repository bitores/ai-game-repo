<script setup>
/**
 * App.vue — 游戏主入口
 *
 * 响应式机制演示：
 * - ref()   → currentStage 控制当前视图
 * - computed() → overallProgress 驱动进度条
 * - 通过组件 emit 与父组件通信更新状态
 */
import { computed } from 'vue'
import { useGameState } from './composables/useGameState.js'
import StageOne from './components/StageOne.vue'
import StageTwo from './components/StageTwo.vue'
import StageThree from './components/StageThree.vue'
import StageComplete from './components/StageComplete.vue'

const {
  currentStage,
  stageResults,
  TOTAL_STAGES,
  overallProgress,
  isGameComplete,
  goToStage,
  resetGame
} = useGameState()

// 当前应渲染哪个关卡组件
const stageComponent = computed(() => {
  const map = { 1: StageOne, 2: StageTwo, 3: StageThree }
  return map[currentStage.value]
})

// 处理关卡完成事件
function onStageComplete(payload) {
  // payload: { stage, moves, time }
  // useGameState 中的 completeStage 会自动推进关卡
}

// 完全通关后重新开始
function handleReset() {
  resetGame()
}

/* ---- 格式化用时 ---- */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="app-container">
    <!-- ===== 顶部导航条 ===== -->
    <header class="app-header">
      <div class="header-top">
        <h1 class="game-title">
          <span class="title-icon">✦</span>
          Vue Puzzle Saga
          <span class="title-icon">✦</span>
        </h1>
      </div>

      <!-- 进度条 & 关卡指示器 -->
      <div class="progress-section">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: overallProgress + '%' }"
          ></div>
          <span class="progress-text">{{ overallProgress }}%</span>
        </div>

        <div class="stage-dots">
          <button
            v-for="s in TOTAL_STAGES"
            :key="s"
            class="stage-dot"
            :class="{
              active: currentStage === s,
              completed: stageResults[s - 1].completed
            }"
            @click="goToStage(s)"
            :disabled="s > currentStage && !stageResults[s - 1].completed && s !== currentStage"
          >
            <span class="dot-num">{{ s }}</span>
            <span class="dot-label">{{ stageResults[s - 1].label }}</span>
          </button>
          <div class="stage-connector" v-for="s in (TOTAL_STAGES - 1)" :key="'c' + s"
               :class="{ filled: stageResults[s - 1].completed }">
          </div>
        </div>
      </div>
    </header>

    <!-- ===== 游戏主区域 ===== -->
    <main class="app-main">
      <Transition name="fade" mode="out-in">
        <component
          :is="stageComponent"
          :key="'stage-' + currentStage"
          @complete="onStageComplete"
        />
      </Transition>
    </main>

    <!-- ===== 全部通关 ===== -->
    <Transition name="fade">
      <StageComplete
        v-if="isGameComplete"
        :results="stageResults"
        :total-time="stageResults.reduce((sum, r) => sum + r.time, 0)"
        @reset="handleReset"
      />
    </Transition>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 720px;
  margin: 0 auto;
  padding: 20px 16px;
  width: 100%;
}

/* ---- Header ---- */
.app-header {
  text-align: center;
  margin-bottom: 24px;
}

.game-title {
  font-size: 1.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a78bfa, #60a5fa, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.title-icon {
  display: inline-block;
  -webkit-text-fill-color: initial;
  color: var(--accent-light);
  font-size: 1.2rem;
  margin: 0 8px;
}

/* ---- Progress ---- */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.progress-bar {
  height: 20px;
  background: var(--bg-card);
  border-radius: 99px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(124, 58, 237, 0.15);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--success));
  border-radius: 99px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 20px var(--accent-glow);
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

/* ---- Stage Dots ---- */
.stage-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.stage-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 12px;
  color: var(--text-dim);
  transition: all 0.3s ease;
  position: relative;
  flex: 1;
  max-width: 90px;
}

.stage-dot:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.stage-dot:disabled:hover {
  transform: none;
}

.stage-dot:hover:not(:disabled) {
  transform: translateY(-2px);
}

.dot-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  background: var(--bg-card);
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.35s ease;
}

.stage-dot.active .dot-num {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 20px var(--accent-glow);
  transform: scale(1.1);
}

.stage-dot.completed .dot-num {
  background: var(--success);
  border-color: var(--success);
  box-shadow: 0 0 15px var(--success-glow);
}

.dot-label {
  font-size: 0.65rem;
  white-space: nowrap;
  color: currentColor;
}

.stage-dot.active .dot-label {
  color: var(--accent-light);
  font-weight: 600;
}

.stage-dot.completed .dot-label {
  color: var(--success);
}

/* ---- Main ---- */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>

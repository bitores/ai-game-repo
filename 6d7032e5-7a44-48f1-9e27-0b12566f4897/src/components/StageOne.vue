<script setup>
/**
 * StageOne.vue — 滑动拼图
 *
 * 响应式机制演示：
 * - ref()        → tiles（拼图状态）、moves（步数）、timer（计时）
 * - computed()   → isSolved（胜利判定）、emptyIndex（空格位置）
 * - watch()      → 计时器启停
 * - 模板响应式绑定：class、style、条件渲染
 *
 * 玩法：3×3 网格，将数字 1-8 按顺序排好即为通关。
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGameState } from '../composables/useGameState.js'

const emit = defineEmits(['complete'])
const { completeStage } = useGameState()

/* ============================================
 * 响应式状态
 * ============================================ */
const SIZE = 3
const tiles = ref([])       // 长度为 9 的数组，0 表示空格
const moves = ref(0)
const timer = ref(0)
const isRunning = ref(false)
const isShaking = ref(false)
let timerInterval = null

/* ============================================
 * 计算属性
 * ============================================ */

// 空格索引
const emptyIndex = computed(() => tiles.value.indexOf(0))

// 是否已通关（所有数字 1-8 按序排列，空格在最后）
const isSolved = computed(() => {
  if (tiles.value.length !== SIZE * SIZE) return false
  for (let i = 0; i < SIZE * SIZE - 1; i++) {
    if (tiles.value[i] !== i + 1) return false
  }
  return true
})

// 格式化时间
const formattedTime = computed(() => {
  const m = Math.floor(timer.value / 60)
  const s = timer.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

/* ============================================
 * 监听：通关时自动停止计时并通知父组件
 * ============================================ */
watch(isSolved, (solved) => {
  if (solved) {
    isRunning.value = false
    clearInterval(timerInterval)
    timerInterval = null
    // 延迟一下让玩家看到完成的拼图
    setTimeout(() => {
      completeStage(1, { moves: moves.value, time: timer.value })
      emit('complete', { stage: 1, moves: moves.value, time: timer.value })
    }, 800)
  }
})

/* ============================================
 * 方法
 * ============================================ */

// Fisher-Yates 洗牌
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 计算逆序数（排除空格 0）
function countInversions(arr) {
  let inv = 0
  const nums = arr.filter(x => x !== 0)
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] > nums[j]) inv++
    }
  }
  return inv
}

// 生成可解拼图
function generateSolvablePuzzle() {
  let arr
  let solved
  do {
    arr = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 0])
    // 3×3 拼图：逆序数为偶数即可解
    solved = countInversions(arr) % 2 === 0
  } while (!solved || arr.join('') === '123456780')
  return arr
}

// 初始化 / 重置
function initGame() {
  clearInterval(timerInterval)
  timerInterval = null
  tiles.value = generateSolvablePuzzle()
  moves.value = 0
  timer.value = 0
  isRunning.value = false
}

// 判断某个格子是否可以移动（与空格相邻）
function canMove(index) {
  const empty = emptyIndex.value
  const row = Math.floor(index / SIZE)
  const col = index % SIZE
  const er = Math.floor(empty / SIZE)
  const ec = empty % SIZE
  return (row === er && Math.abs(col - ec) === 1) ||
         (col === ec && Math.abs(row - er) === 1)
}

// 移动格子
function moveTile(index) {
  if (isSolved.value || !canMove(index)) return

  // 首次操作启动计时
  if (!isRunning.value) {
    isRunning.value = true
    timerInterval = setInterval(() => { timer.value++ }, 1000)
  }

  const empty = emptyIndex.value
  const next = [...tiles.value]
  ;[next[index], next[empty]] = [next[empty], next[index]]
  tiles.value = next
  moves.value++
}

/* ============================================
 * 生命周期
 * ============================================ */
onMounted(initGame)
onUnmounted(() => {
  clearInterval(timerInterval)
})
</script>

<template>
  <div class="stage-card">
    <div class="stage-header">
      <span class="stage-badge">第 1 关</span>
      <h2 class="stage-title">滑动拼图</h2>
      <p class="stage-desc">将数字 1 至 8 按顺序排列，空格在右下角</p>
    </div>

    <!-- 统计信息 -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">{{ moves }}</span>
        <span class="stat-label">步数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ formattedTime }}</span>
        <span class="stat-label">用时</span>
      </div>
    </div>

    <!-- 拼图网格 -->
    <div class="puzzle-grid">
      <button
        v-for="(tile, idx) in tiles"
        :key="idx"
        class="puzzle-tile"
        :class="{
          'is-empty': tile === 0,
          'is-movable': canMove(idx) && !isSolved,
          'is-solved': isSolved
        }"
        :style="{
          gridRow: Math.floor(idx / SIZE) + 1,
          gridColumn: (idx % SIZE) + 1,
        }"
        :disabled="tile === 0 || isSolved"
        @click="moveTile(idx)"
      >
        <span v-if="tile !== 0" class="tile-num">{{ tile }}</span>
      </button>
    </div>

    <!-- 通关提示 -->
    <Transition name="fade">
      <div v-if="isSolved" class="solved-banner">
        <span class="solved-icon">🎉</span>
        通关！正在前往下一关...
      </div>
    </Transition>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn btn-outline" @click="initGame">
        ⟳ 重新洗牌
      </button>
    </div>
  </div>
</template>

<style scoped>
.stage-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 28px 24px;
  border: 1px solid rgba(124, 58, 237, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stage-header {
  text-align: center;
  margin-bottom: 20px;
}

.stage-badge {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(124, 58, 237, 0.15);
  color: var(--accent-light);
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.stage-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.stage-desc {
  font-size: 0.85rem;
  color: var(--text-dim);
}

/* ---- Stats ---- */
.stats-row {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-surface);
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  min-width: 80px;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--accent-light);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ---- Puzzle Grid ---- */
.puzzle-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1;
  margin-bottom: 20px;
}

.puzzle-tile {
  aspect-ratio: 1;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1.8rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(145deg, #2a2a4a, #1e1e3a);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.puzzle-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.05), transparent);
  pointer-events: none;
}

.puzzle-tile.is-empty {
  background: transparent;
  box-shadow: none;
  cursor: default;
}

.puzzle-tile.is-movable:not(.is-empty) {
  background: linear-gradient(145deg, #3a2a6a, #2a1a5a);
  border: 2px solid var(--accent);
  box-shadow: 0 0 15px var(--accent-glow);
  transform: scale(1.02);
}

.puzzle-tile.is-movable:hover:not(.is-empty) {
  background: linear-gradient(145deg, #4a3a7a, #3a2a6a);
  transform: scale(1.06);
  box-shadow: 0 0 25px var(--accent-glow);
}

.puzzle-tile.is-movable:active:not(.is-empty) {
  transform: scale(0.96);
}

.puzzle-tile.is-solved {
  background: linear-gradient(145deg, #065f46, #047857);
  box-shadow: 0 0 20px var(--success-glow);
}

.tile-num {
  position: relative;
  z-index: 1;
}

/* ---- Solved Banner ---- */
.solved-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  color: var(--success);
  margin-bottom: 16px;
  animation: pulse-glow 1.5s ease-in-out infinite;
}

.solved-icon {
  font-size: 1.2rem;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px var(--success-glow); }
  50% { box-shadow: 0 0 20px var(--success-glow); }
}

/* ---- Actions ---- */
.actions {
  margin-top: 4px;
}
</style>

<script setup>
/**
 * StageTwo.vue — 记忆翻牌
 *
 * 响应式机制演示：
 * - ref()        → cards（卡牌数组）、flippedIndices（当前翻开）
 * - reactive()   → matchedSet（已匹配集合）
 * - computed()   → isCompleted（全部匹配判定）
 * - watch()      → 检测两张牌翻开后是否匹配
 * - nextTick()   → DOM 更新后执行逻辑
 *
 * 玩法：4×4 网格翻牌，找到 8 对相同的 emoji。
 */

import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useGameState } from '../composables/useGameState.js'

const emit = defineEmits(['complete'])
const { completeStage } = useGameState()

/* ============================================
 * 卡牌数据
 * ============================================ */
const EMOJIS = ['🐶', '🐱', '🐼', '🦊', '🐸', '🦋', '🐙', '🦄']

// 每张卡牌：{ id, emoji, flipped, matched }
const cards = ref([])
const moves = ref(0)
const timer = ref(0)
const flippedIndices = ref([])   // 当前翻开的两张牌的索引
const matchedSet = reactive(new Set())
const isChecking = ref(false)    // 正在检查匹配（防止连点）
const isRunning = ref(false)
let timerInterval = null

/* ============================================
 * 计算属性
 * ============================================ */

// 已完成配对数量
const matchedCount = computed(() => matchedSet.size)

// 总对数
const totalPairs = computed(() => EMOJIS.length)

// 是否全部通关
const isCompleted = computed(() => matchedSet.size === EMOJIS.length)

// 格式化时间
const formattedTime = computed(() => {
  const m = Math.floor(timer.value / 60)
  const s = timer.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

/* ============================================
 * 监听：全部通关
 * ============================================ */
watch(isCompleted, (done) => {
  if (done) {
    isRunning.value = false
    clearInterval(timerInterval)
    timerInterval = null
    setTimeout(() => {
      completeStage(2, { moves: moves.value, time: timer.value })
      emit('complete', { stage: 2, moves: moves.value, time: timer.value })
    }, 1000)
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

// 初始化卡牌
function initGame() {
  clearInterval(timerInterval)
  timerInterval = null

  // 每对 emoji 出现两次
  const pairs = EMOJIS.flatMap((emoji, idx) => [
    { id: idx * 2, emoji, flipped: false, matched: false },
    { id: idx * 2 + 1, emoji, flipped: false, matched: false }
  ])

  cards.value = shuffle(pairs)
  flippedIndices.value = []
  matchedSet.clear()
  moves.value = 0
  timer.value = 0
  isChecking.value = false
  isRunning.value = false
}

// 翻牌
function flipCard(index) {
  const card = cards.value[index]
  // 已匹配 / 已翻开 / 正在检查 / 已通关 → 忽略
  if (!card || card.matched || card.flipped || isChecking.value || isCompleted.value) return

  // 首次操作启动计时
  if (!isRunning.value) {
    isRunning.value = true
    timerInterval = setInterval(() => { timer.value++ }, 1000)
  }

  // 翻开
  card.flipped = true
  flippedIndices.value.push(index)
  moves.value++

  // 翻开两张后检查匹配
  if (flippedIndices.value.length === 2) {
    checkMatch()
  }
}

// 检查两张牌是否匹配
function checkMatch() {
  isChecking.value = true
  const [i1, i2] = flippedIndices.value
  const c1 = cards.value[i1]
  const c2 = cards.value[i2]

  if (c1.emoji === c2.emoji && c1.id !== c2.id) {
    // 匹配成功
    setTimeout(() => {
      c1.matched = true
      c2.matched = true
      matchedSet.add(c1.emoji)
      flippedIndices.value = []
      isChecking.value = false
    }, 400)
  } else {
    // 不匹配 → 翻回
    setTimeout(() => {
      c1.flipped = false
      c2.flipped = false
      flippedIndices.value = []
      isChecking.value = false
    }, 900)
  }
}
</script>

<template>
  <div class="stage-card">
    <div class="stage-header">
      <span class="stage-badge">第 2 关</span>
      <h2 class="stage-title">记忆翻牌</h2>
      <p class="stage-desc">翻开卡牌，找到所有相同的 emoji 配对</p>
    </div>

    <!-- 统计信息 -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">{{ matchedCount }} / {{ totalPairs }}</span>
        <span class="stat-label">配对</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ moves }}</span>
        <span class="stat-label">翻牌</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ formattedTime }}</span>
        <span class="stat-label">用时</span>
      </div>
    </div>

    <!-- 卡牌网格 -->
    <div class="card-grid">
      <button
        v-for="(card, index) in cards"
        :key="card.id"
        class="memory-card"
        :class="{
          'is-flipped': card.flipped || card.matched,
          'is-matched': card.matched
        }"
        :disabled="card.matched || isChecking || isCompleted"
        @click="flipCard(index)"
      >
        <!-- 背面 -->
        <span class="card-back">?</span>
        <!-- 正面 -->
        <span class="card-front">{{ card.emoji }}</span>
      </button>
    </div>

    <!-- 通关提示 -->
    <Transition name="fade">
      <div v-if="isCompleted" class="solved-banner">
        <span class="solved-icon">🎉</span>
        记忆大师！正在前往下一关...
      </div>
    </Transition>

    <!-- 操作 -->
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
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-surface);
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  min-width: 72px;
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--accent-light);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.65rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ---- Card Grid ---- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 360px;
  margin-bottom: 20px;
}

.memory-card {
  aspect-ratio: 1;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1.8rem;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  background: linear-gradient(145deg, #2a2a4a, #1e1e3a);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transform-style: preserve-3d;
  perspective: 600px;
}

.memory-card:disabled {
  cursor: default;
}

.memory-card:not(:disabled):hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
}

.memory-card:not(:disabled):active {
  transform: scale(0.97);
}

/* 卡牌正反面 */
.card-back,
.card-front {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  transition: opacity 0.35s ease;
}

.card-back {
  opacity: 1;
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--accent-light);
}

.card-front {
  opacity: 0;
  font-size: 2.2rem;
  transform: rotateY(180deg);
}

.memory-card.is-flipped .card-back {
  opacity: 0;
}
.memory-card.is-flipped .card-front {
  opacity: 1;
}

.memory-card.is-flipped {
  background: var(--bg-surface);
  border: 2px solid rgba(124, 58, 237, 0.3);
}

.memory-card.is-matched {
  background: linear-gradient(145deg, #065f46, #047857);
  border: 2px solid var(--success);
  box-shadow: 0 0 20px var(--success-glow);
  animation: match-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.memory-card.is-matched .card-front {
  opacity: 1;
  transform: none;
}

@keyframes match-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
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

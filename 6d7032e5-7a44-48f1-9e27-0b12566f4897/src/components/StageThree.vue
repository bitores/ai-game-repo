<script setup>
/**
 * StageThree.vue — 色彩排序
 *
 * 响应式机制演示（重点关卡）：
 * - ref()        → items（待排序列）、selectedIndex（当前选中）
 * - computed()   → isSorted（排序判定）、hintMessage（动态提示）
 * - computed()   → gradientPreview（动态渐变预览样式）
 * - watch()      → 通关检测
 *
 * 玩法：将 5 种颜色按正确顺序排列（红 → 橙 → 黄 → 绿 → 蓝）。
 * 点击两个色块交换位置。这是对 computed 和响应式依赖的深度演示。
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useGameState } from '../composables/useGameState.js'

const emit = defineEmits(['complete'])
const { completeStage } = useGameState()

/* ============================================
 * 颜色配置 — 正确顺序
 * ============================================ */
const COLOR_ORDER = [
  { name: '红', hex: '#ef4444', desc: 'Red' },
  { name: '橙', hex: '#f97316', desc: 'Orange' },
  { name: '黄', hex: '#eab308', desc: 'Yellow' },
  { name: '绿', hex: '#22c55e', desc: 'Green' },
  { name: '蓝', hex: '#3b82f6', desc: 'Blue' }
]

/* ============================================
 * 响应式状态
 * ============================================ */
const items = ref([])          // 每个元素: { id, colorIndex, name, hex, desc }
const selectedIndex = ref(-1)  // -1 表示未选中
const moves = ref(0)
const timer = ref(0)
const isRunning = ref(false)
let timerInterval = null

/* ============================================
 * 计算属性
 * ============================================ */

// 是否已按正确顺序排列
const isSorted = computed(() => {
  return items.value.every((item, idx) => item.colorIndex === idx)
})

// 当前排列中，每个元素离正确位置的距离（用于视觉反馈）
const displacement = computed(() => {
  return items.value.map((item, idx) => Math.abs(item.colorIndex - idx))
})

// 动态提示信息
const hintMessage = computed(() => {
  if (isSorted.value) return '✦ 完美！颜色形成了平滑渐变 ✦'

  // 计算有多少个元素在正确位置
  const correct = items.value.filter((item, idx) => item.colorIndex === idx).length
  if (correct === 0) return '提示：没有一个在正确位置，试试全部重排'
  if (correct === 1) return '提示：有 1 个在正确位置，继续调整'
  if (correct < items.value.length - 1) return `提示：已有 ${correct} 个在正确位置，快完成了！`
  return '提示：非常接近了！仅需再调整一次'
})

// 渐变预览样式（基于当前排列计算的背景渐变）
const gradientPreview = computed(() => {
  if (items.value.length === 0) return {}
  const colors = items.value.map(i => i.hex).join(', ')
  return {
    background: `linear-gradient(90deg, ${colors})`,
    borderRadius: '8px',
    height: '32px',
    width: '100%',
    maxWidth: '320px',
    transition: 'background 0.5s ease',
    boxShadow: '0 0 16px rgba(0,0,0,0.3)'
  }
})

// 当前选中的色块
const selectedItem = computed(() => {
  if (selectedIndex.value === -1) return null
  return items.value[selectedIndex.value] ?? null
})

// 格式化时间
const formattedTime = computed(() => {
  const m = Math.floor(timer.value / 60)
  const s = timer.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

/* ============================================
 * 监听：通关
 * ============================================ */
watch(isSorted, (sorted) => {
  if (sorted) {
    isRunning.value = false
    clearInterval(timerInterval)
    timerInterval = null
    setTimeout(() => {
      completeStage(3, { moves: moves.value, time: timer.value })
      emit('complete', { stage: 3, moves: moves.value, time: timer.value })
    }, 1000)
  }
})

/* ============================================
 * 方法
 * ============================================ */

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function initGame() {
  clearInterval(timerInterval)
  timerInterval = null

  // 生成乱序颜色
  const raw = COLOR_ORDER.map((c, idx) => ({
    id: idx,
    colorIndex: idx,
    name: c.name,
    hex: c.hex,
    desc: c.desc
  }))

  let shuffled
  do {
    shuffled = shuffle(raw)
  } while (shuffled.every((item, idx) => item.colorIndex === idx))

  items.value = shuffled
  selectedIndex.value = -1
  moves.value = 0
  timer.value = 0
  isRunning.value = false
}

// 点击色块
function handleClick(index) {
  if (isSorted.value) return

  if (!isRunning.value) {
    isRunning.value = true
    timerInterval = setInterval(() => { timer.value++ }, 1000)
  }

  if (selectedIndex.value === -1) {
    // 首次选中
    selectedIndex.value = index
  } else if (selectedIndex.value === index) {
    // 取消选中
    selectedIndex.value = -1
  } else {
    // 交换两个位置
    const next = [...items.value]
    ;[next[selectedIndex.value], next[index]] = [next[index], next[selectedIndex.value]]
    items.value = next
    selectedIndex.value = -1
    moves.value++
  }
}
</script>

<template>
  <div class="stage-card">
    <div class="stage-header">
      <span class="stage-badge">第 3 关</span>
      <h2 class="stage-title">色彩排序</h2>
      <p class="stage-desc">点击两个色块交换位置，按红→橙→黄→绿→蓝排列</p>
    </div>

    <!-- 统计 -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">{{ moves }}</span>
        <span class="stat-label">交换</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ formattedTime }}</span>
        <span class="stat-label">用时</span>
      </div>
    </div>

    <!-- 渐变预览（由 computed 驱动） -->
    <div class="preview-section">
      <span class="preview-label">当前排列渐变</span>
      <div class="gradient-preview" :style="gradientPreview"></div>
    </div>

    <!-- 颜色序列 -->
    <div class="color-row">
      <button
        v-for="(item, idx) in items"
        :key="item.id"
        class="color-block"
        :class="{
          'is-selected': selectedIndex === idx,
          'is-correct': item.colorIndex === idx,
          'is-sorted': isSorted
        }"
        :style="{ '--block-color': item.hex }"
        :disabled="isSorted"
        @click="handleClick(idx)"
      >
        <span class="color-label">{{ item.name }}</span>
        <span class="color-tag">{{ item.desc }}</span>

        <!-- 位置指示 -->
        <span
          class="pos-indicator"
          :class="{
            'pos-ok': item.colorIndex === idx,
            'pos-wrong': item.colorIndex !== idx
          }"
        >
          {{ item.colorIndex === idx ? '✓' : (idx + 1) }}
        </span>
      </button>
    </div>

    <!-- 动态提示（由 computed 驱动） -->
    <div class="hint-box" :class="{ 'hint-warm': !isSorted, 'hint-success': isSorted }">
      {{ hintMessage }}
    </div>

    <!-- 通关提示 -->
    <Transition name="fade">
      <div v-if="isSorted" class="solved-banner">
        <span class="solved-icon">🏆</span>
        完美渐变！所有关卡通关！
      </div>
    </Transition>

    <!-- 操作 -->
    <div class="actions">
      <button class="btn btn-outline" @click="initGame">
        ⟳ 重新打乱
      </button>
      <button
        v-if="selectedIndex !== -1"
        class="btn btn-outline"
        @click="selectedIndex = -1"
        style="border-color: var(--text-dim); color: var(--text-dim);"
      >
        ✕ 取消选择
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
  margin-bottom: 20px;
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

/* ---- Preview ---- */
.preview-section {
  width: 100%;
  max-width: 320px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.preview-label {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.gradient-preview {
  width: 100%;
  height: 32px;
  border-radius: 8px;
  transition: background 0.5s ease;
  box-shadow: 0 0 16px rgba(0, 0, 0, 0.3);
}

/* ---- Color Blocks ---- */
.color-row {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 420px;
  margin-bottom: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.color-block {
  position: relative;
  width: 72px;
  height: 90px;
  border: 3px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: var(--block-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow: visible;
}

.color-block:disabled {
  cursor: default;
}

.color-block:hover:not(:disabled) {
  transform: translateY(-6px) scale(1.05);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.color-block:active:not(:disabled) {
  transform: translateY(-2px) scale(0.98);
}

.color-block.is-selected {
  border-color: white;
  transform: translateY(-8px) scale(1.1);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.15), 0 12px 30px rgba(0, 0, 0, 0.4);
  animation: selected-pulse 1s ease-in-out infinite;
}

.color-block.is-correct {
  opacity: 1;
}

.color-block.is-correct::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  pointer-events: none;
}

.color-block.is-sorted {
  border-color: var(--success);
  box-shadow: 0 0 25px var(--success-glow);
}

@keyframes selected-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(255,255,255,0.15), 0 12px 30px rgba(0,0,0,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(255,255,255,0.08), 0 12px 30px rgba(0,0,0,0.4); }
}

.color-label {
  font-size: 1.1rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.color-tag {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.pos-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 800;
  pointer-events: none;
}

.pos-ok {
  background: var(--success);
  color: white;
  box-shadow: 0 0 8px var(--success-glow);
}

.pos-wrong {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  backdrop-filter: blur(4px);
}

/* ---- Hint ---- */
.hint-box {
  font-size: 0.82rem;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  text-align: center;
  max-width: 380px;
  width: 100%;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.hint-warm {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #fbbf24;
}

.hint-success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: var(--success);
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
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
</style>

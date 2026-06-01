<script setup>
/**
 * StageComplete.vue — 全部通关庆祝页面
 *
 * 使用 computed 汇总各关卡成绩，并显示庆祝动画。
 *
 * Props:
 *   results    — 各关卡成绩数组 [{ completed, moves, time, label }]
 *   totalTime  — 总用时（秒）
 *
 * Emits:
 *   reset      — 重新开始游戏
 */

import { computed } from 'vue'

const props = defineProps({
  results: { type: Array, required: true },
  totalTime: { type: Number, default: 0 }
})

const emit = defineEmits(['reset'])

// 格式化总用时
const formattedTotal = computed(() => {
  const m = Math.floor(props.totalTime / 60)
  const s = props.totalTime % 60
  return `${m} 分 ${s.toString().padStart(2, '0')} 秒`
})

// 总步数
const totalMoves = computed(() =>
  props.results.reduce((sum, r) => sum + r.moves, 0)
)

// 平均每关步数
const avgMoves = computed(() =>
  props.results.length > 0
    ? (totalMoves.value / props.results.length).toFixed(1)
    : 0
)
</script>

<template>
  <div class="overlay">
    <div class="celebration-card">
      <!-- 装饰粒子 -->
      <div class="particles">
        <span v-for="i in 20" :key="i" class="particle"
              :style="{
                '--x': Math.random() * 100 + '%',
                '--delay': Math.random() * 2 + 's',
                '--size': (Math.random() * 10 + 4) + 'px',
                '--color': ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6'][Math.floor(Math.random() * 5)]
              }">
        </span>
      </div>

      <!-- 主内容 -->
      <div class="trophy">🏆</div>
      <h2 class="title">恭喜通关！</h2>
      <p class="subtitle">你已解开所有谜题，展现了出色的逻辑与记忆能力</p>

      <!-- 成绩汇总 -->
      <div class="results-grid">
        <div
          v-for="(r, idx) in results"
          :key="idx"
          class="result-item"
        >
          <span class="result-stage">第 {{ idx + 1 }} 关 · {{ r.label }}</span>
          <div class="result-details">
            <span>步数: <strong>{{ r.moves }}</strong></span>
            <span>用时: <strong>{{ Math.floor(r.time / 60) }}:{{ (r.time % 60).toString().padStart(2, '0') }}</strong></span>
          </div>
        </div>
      </div>

      <!-- 总计 -->
      <div class="total-row">
        <div class="total-item">
          <span class="total-value">{{ totalMoves }}</span>
          <span class="total-label">总步数</span>
        </div>
        <div class="total-item">
          <span class="total-value">{{ formattedTotal }}</span>
          <span class="total-label">总用时</span>
        </div>
        <div class="total-item">
          <span class="total-value">{{ avgMoves }}</span>
          <span class="total-label">平均步数/关</span>
        </div>
      </div>

      <!-- 操作 -->
      <button class="btn btn-success btn-large" @click="emit('reset')">
        ⟳ 再来一次
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ---- Overlay ---- */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
  animation: overlay-in 0.5s ease;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ---- Card ---- */
.celebration-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 20px;
  padding: 40px 32px 32px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  overflow: hidden;
  animation: card-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 60px rgba(124, 58, 237, 0.2);
}

@keyframes card-pop {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(40px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* ---- Particles ---- */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  bottom: -10px;
  left: var(--x);
  width: var(--size);
  height: var(--size);
  background: var(--color);
  border-radius: 50%;
  animation: float-up 3s var(--delay) ease-out infinite;
}

@keyframes float-up {
  0% {
    transform: translateY(0) scale(0);
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(-400px) scale(1);
    opacity: 0;
  }
}

/* ---- Content ---- */
.trophy {
  font-size: 4rem;
  margin-bottom: 8px;
  animation: trophy-bounce 1s ease-in-out infinite alternate;
}

@keyframes trophy-bounce {
  from { transform: translateY(0) scale(1); }
  to { transform: translateY(-10px) scale(1.05); }
}

.title {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a78bfa, #60a5fa, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 6px;
}

.subtitle {
  font-size: 0.9rem;
  color: var(--text-dim);
  margin-bottom: 24px;
}

/* ---- Results ---- */
.results-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.result-item {
  background: var(--bg-surface);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-stage {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-light);
}

.result-details {
  display: flex;
  gap: 16px;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.result-details strong {
  color: var(--text);
}

/* ---- Total ---- */
.total-row {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
}

.total-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.total-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--accent-light);
}

.total-label {
  font-size: 0.65rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ---- Button ---- */
.btn-large {
  padding: 14px 40px;
  font-size: 1.05rem;
  width: 100%;
}
</style>

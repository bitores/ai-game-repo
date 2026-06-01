<script setup>
import { inject, computed, ref, watch } from 'vue'
import { useLevel1 } from '../../composables/usePuzzle'
import CodePanel from '../CodePanel.vue'

const game = inject('game')
const puzzle = useLevel1()

const hintsShown = ref(0)
const showSecret = ref(false)

// Code to display
const codeSnippet = computed(() => `// 第1关: 响应式基础
// 目标: 将 value 调整为与 target 相同的值

import { ref, computed } from 'vue'

const value = ref(${puzzle.value.value})
const target = ref(${puzzle.target.value})

// 提示: value 需要等于 target
// 试试点击 +/- 按钮，或在输入框中直接输入数字

// 💡 隐藏线索: 试试将 value 设为 7`)

const targetCodeSnippet = computed(() => `// 目标状态
target = ${puzzle.target.value}

// 当前值
value = ${puzzle.value.value}

// 匹配状态: ${puzzle.isComplete.value ? '✓ 已匹配!' : '✗ 未匹配'}`)

function handleIncrement() {
  puzzle.increment()
}

function handleDecrement() {
  puzzle.decrement()
}

function handleSetValue(e) {
  const val = parseInt(e.target.value)
  if (!isNaN(val)) {
    puzzle.setValue(val)
  }
}

function handleCheck() {
  const result = puzzle.checkComplete()
  if (result.complete) {
    game.completeLevel(0, calcScore(), result.secrets)
  }
}

function calcScore() {
  let base = 100
  base -= hintsShown.value * 20
  return Math.max(10, base)
}

function showHint() {
  hintsShown.value++
  game.useHint(0)
}

// Watch for easter egg
watch(() => puzzle.easterEgg.value, (val) => {
  if (val) showSecret.value = true
})

// Watch for the secret value 99
watch(() => puzzle.secretCheck.value, (val) => {
  if (val) showSecret.value = true
})
</script>

<template>
  <div class="level-container">
    <div class="level-content">
      <div class="puzzle-area">
        <div class="puzzle-description">
          <p class="desc-text">调整 <code>value</code> 的值，使其等于目标值 <code>target</code>。</p>
          <p class="desc-hint">这是响应式系统最基础的操作——修改数据，视图自动更新。</p>
        </div>

        <div class="value-display">
          <div class="target-display">
            <span class="label">目标 target:</span>
            <span class="value-badge target">{{ puzzle.target.value }}</span>
          </div>

          <div class="vs-divider">
            <span class="vs-text">===</span>
          </div>

          <div class="current-display">
            <span class="label">当前 value:</span>
            <span
              class="value-badge current"
              :class="{
                matching: puzzle.isComplete.value,
                close: Math.abs(puzzle.value.value - puzzle.target.value) <= 5 && puzzle.value.value !== puzzle.target.value,
              }"
            >
              {{ puzzle.value.value }}
            </span>
          </div>
        </div>

        <!-- Controls -->
        <div class="controls">
          <div class="adjust-controls">
            <button class="btn btn-danger" @click="handleDecrement" :disabled="puzzle.value.value <= -100">
              <span>-1</span>
            </button>
            <input
              type="number"
              class="value-input"
              :value="puzzle.value.value"
              @input="handleSetValue"
              min="-100"
              max="100"
            />
            <button class="btn btn-success" @click="handleIncrement" :disabled="puzzle.value.value >= 100">
              <span>+1</span>
            </button>
          </div>

          <div class="action-row">
            <button class="btn" @click="puzzle.reset()">重置</button>
            <button class="btn" @click="showHint">提示 ({{ hintsShown > 0 ? '已用' : '可用' }})</button>
            <button
              class="btn btn-success"
              :disabled="!puzzle.isComplete.value"
              @click="handleCheck"
            >
              提交验证
            </button>
          </div>
        </div>

        <!-- Secret reveal -->
        <Transition name="secret">
          <div v-if="showSecret" class="secret-reveal">
            <p class="secret-icon">🔍</p>
            <p class="secret-text">{{ puzzle.easterEgg }}</p>
            <p v-if="puzzle.secretCheck.value" class="secret-text">{{ puzzle.secretCheck.value }}</p>
          </div>
        </Transition>

        <!-- Progress hint -->
        <div v-if="!puzzle.isComplete.value && puzzle.value.value !== 0" class="proximity-hint">
          <div class="proximity-bar">
            <div
              class="proximity-fill"
              :style="{
                width: (100 - Math.abs(puzzle.value.value - puzzle.target.value) * 2) + '%',
              }"
            ></div>
          </div>
          <span class="proximity-text">
            差距: {{ Math.abs(puzzle.value.value - puzzle.target.value) }}
          </span>
        </div>
      </div>

      <!-- Code panel -->
      <div class="code-section">
        <CodePanel
          title="当前代码状态"
          :code="codeSnippet"
          language="javascript"
        />
        <CodePanel
          title="数据面板"
          :code="targetCodeSnippet"
          language="javascript"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.level-container {
  animation: fadeIn 0.5s ease;
}

.level-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 900px) {
  .level-content {
    grid-template-columns: 1fr;
  }
}

.puzzle-area {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.puzzle-description {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem;
}

.desc-text {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.desc-text code {
  background: var(--bg-code);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: var(--text-code);
  font-size: 0.9em;
}

.desc-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Value display */
.value-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.target-display,
.current-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.value-badge {
  font-size: 3rem;
  font-weight: 800;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
}

.value-badge.target {
  color: var(--accent);
  text-shadow: 0 0 20px var(--accent-glow);
}

.value-badge.current {
  color: var(--text-primary);
}
.value-badge.current.matching {
  color: var(--success);
  text-shadow: 0 0 20px var(--success-glow);
  animation: pulse 1s ease-in-out infinite;
}
.value-badge.current.close {
  color: var(--warning);
}

.vs-divider {
  display: flex;
  align-items: center;
}

.vs-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-secondary);
  opacity: 0.5;
}

/* Controls */
.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.adjust-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
}

.value-input {
  width: 100px;
  padding: 0.6rem;
  text-align: center;
  font-size: 1.2rem;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  background: var(--bg-code);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-code);
  outline: none;
  transition: border-color 0.2s;
}
.value-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

.action-row {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

/* Secret reveal */
.secret-reveal {
  text-align: center;
  padding: 1.2rem;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1));
  border: 1px solid var(--purple);
  border-radius: 12px;
  animation: secret-reveal 0.6s ease forwards;
}

.secret-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.secret-text {
  color: var(--purple);
  font-size: 0.9rem;
  line-height: 1.6;
}

.secret-enter-active,
.secret-leave-active {
  transition: all 0.4s ease;
}
.secret-enter-from,
.secret-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Proximity */
.proximity-hint {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.proximity-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-card);
  border-radius: 3px;
  overflow: hidden;
}

.proximity-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--danger), var(--warning), var(--success));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.proximity-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.code-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

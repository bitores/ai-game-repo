<script setup>
import { inject, computed, ref } from 'vue'
import { useLevel2 } from '../../composables/usePuzzle'
import CodePanel from '../CodePanel.vue'

const game = inject('game')
const puzzle = useLevel2()

const hintsShown = ref(0)

const codeSnippet = computed(() => `// 第2关: 计算属性之谜
// 通过计算属性链生成目标消息: "${puzzle.targetMessage}"

import { ref, computed } from 'vue'

const a = ref(${puzzle.a.value})  // → charCode: ${65 + puzzle.a.value}
const b = ref(${puzzle.b.value})  // → charCode: ${86 - puzzle.b.value}
const c = ref(${puzzle.c.value})  // → charCode: ${69 + Math.max(0, puzzle.c.value - 1)}
const d = ref(${puzzle.d.value})  // → charCode: ${84 + puzzle.d.value}

const step1 = computed(() => String.fromCharCode(65 + a.value))  // '${String.fromCharCode(65 + puzzle.a.value)}'
const step2 = computed(() => String.fromCharCode(86 - b.value))  // '${String.fromCharCode(86 - puzzle.b.value)}'
const step3 = computed(() => String.fromCharCode(69 + c.value - 1))  // '${puzzle.c.value > 0 ? String.fromCharCode(69 + puzzle.c.value - 1) : ''}'
const step4 = computed(() => String.fromCharCode(84 + d.value))  // '${String.fromCharCode(84 + puzzle.d.value)}'`)

const messageCode = computed(() => `// 计算属性链结果
step1 → '${String.fromCharCode(65 + puzzle.a.value)}'  (a=${puzzle.a.value})
step2 → '${String.fromCharCode(86 - puzzle.b.value)}'  (b=${puzzle.b.value})
step3 → '${puzzle.c.value > 0 ? String.fromCharCode(69 + puzzle.c.value - 1) : '(等待c>0)'}'  (c=${puzzle.c.value})
step4 → '${String.fromCharCode(84 + puzzle.d.value)}'  (d=${puzzle.d.value})
─────────────────────────────
消息: "${puzzle.currentMessage.value}"
目标: "${puzzle.targetMessage}"
${puzzle.isComplete.value ? '✓ 匹配成功！' : '✗ 继续调整...'}`)

function handleCheck() {
  const result = puzzle.checkComplete()
  if (result.complete) {
    game.completeLevel(1, calcScore(), result.secrets)
  }
}

function calcScore() {
  let base = 100
  base -= hintsShown.value * 20
  return Math.max(10, base)
}

function showHint() {
  hintsShown.value++
  game.useHint(1)
}
</script>

<template>
  <div class="level-container">
    <div class="level-content">
      <!-- Left: Puzzle -->
      <div class="puzzle-area">
        <div class="puzzle-description">
          <p class="desc-text">调整四个响应式数据源 <code>a</code>, <code>b</code>, <code>c</code>, <code>d</code>，</p>
          <p class="desc-text">让计算属性链生成目标消息 <strong>"{{ puzzle.targetMessage }}"</strong></p>
          <p class="desc-hint">每个计算属性根据输入值转换出一个字符，组合起来就是最终消息。</p>
        </div>

        <!-- Chain visualization -->
        <div class="chain-visualization">
          <div class="chain-flow">
            <div
              v-for="(item, idx) in puzzle.charDisplay.value"
              :key="idx"
              class="chain-node"
              :class="{ active: item.char && item.char !== ' ' }"
            >
              <div class="node-header">
                <span class="node-name">{{ ['a', 'b', 'c', 'd'][idx] }}</span>
                <span class="node-value">{{ item.value }}</span>
              </div>
              <div class="node-arrow">→</div>
              <div class="node-char">
                <span class="char-display" :class="{ 'char-found': item.char && item.char !== ' ' }">
                  {{ item.char || '?' }}
                </span>
              </div>
              <div class="node-target">
                目标: {{ item.letter }}
              </div>
            </div>
          </div>
        </div>

        <!-- Controls per variable -->
        <div class="variable-controls">
          <div
            v-for="(item, idx) in puzzle.charDisplay.value"
            :key="idx"
            class="var-row"
            :class="{ 'var-done': item.char === item.letter }"
          >
            <span class="var-name">{{ ['a', 'b', 'c', 'd'][idx] }}</span>
            <div class="var-adjust">
              <button class="btn btn-small" @click="puzzle.adjust(idx, -1)" :disabled="item.value <= 0">−</button>
              <span class="var-value">{{ item.value }}</span>
              <button class="btn btn-small" @click="puzzle.adjust(idx, 1)" :disabled="item.value >= 25">+</button>
            </div>
            <span class="var-target">→ {{ item.letter }}</span>
          </div>
        </div>

        <!-- Message display -->
        <div class="message-display">
          <div class="message-label">当前组合:</div>
          <div class="message-text">
            <span
              v-for="(ch, idx) in puzzle.currentMessage.value"
              :key="idx"
              class="message-char"
              :class="{ correct: puzzle.targetMessage[idx] === ch }"
            >{{ ch }}</span>
            <span v-if="!puzzle.currentMessage.value" class="message-empty">等待输入...</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="action-row">
          <button class="btn" @click="puzzle.reset()">重置</button>
          <button class="btn" @click="showHint">提示 ({{ hintsShown }})</button>
          <button
            class="btn btn-success"
            :disabled="!puzzle.isComplete.value"
            @click="handleCheck"
          >
            提交验证
          </button>
        </div>
      </div>

      <!-- Right: Code -->
      <div class="code-section">
        <CodePanel title="计算属性源代码" :code="codeSnippet" language="javascript" />
        <CodePanel title="实时数据面板" :code="messageCode" language="javascript" />
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
  gap: 1.2rem;
}

.puzzle-description {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem;
}
.desc-text {
  color: var(--text-primary);
  font-size: 0.95rem;
  margin-bottom: 0.3rem;
}
.desc-text code {
  background: var(--bg-code);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  color: var(--text-code);
  font-family: 'Courier New', monospace;
}
.desc-text strong {
  color: var(--accent);
}
.desc-hint {
  color: var(--text-secondary);
  font-size: 0.82rem;
  margin-top: 0.5rem;
}

/* Chain visualization */
.chain-visualization {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem;
}

.chain-flow {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chain-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.8rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  min-width: 80px;
  transition: all 0.3s ease;
}
.chain-node.active {
  border-color: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
}

.node-header {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.node-name {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: var(--accent);
  font-size: 0.9rem;
}
.node-value {
  font-family: 'Courier New', monospace;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.node-arrow {
  color: var(--text-secondary);
  font-size: 1.2rem;
}

.char-display {
  font-size: 1.6rem;
  font-weight: 800;
  font-family: 'Courier New', monospace;
  color: var(--text-secondary);
}
.char-display.char-found {
  color: var(--success);
  text-shadow: 0 0 10px var(--success-glow);
}

.node-target {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* Variable controls */
.variable-controls {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
}

.var-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.8rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: all 0.3s;
}
.var-row.var-done {
  border-color: var(--success);
  background: rgba(34, 197, 94, 0.08);
}

.var-name {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: var(--accent);
  min-width: 30px;
}

.var-adjust {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.var-value {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 1.1rem;
  min-width: 30px;
  text-align: center;
  color: var(--text-primary);
}

.var-target {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.btn-small {
  padding: 0.2rem 0.6rem;
  font-size: 0.9rem;
  min-width: 32px;
  justify-content: center;
}

/* Message display */
.message-display {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem;
  text-align: center;
}

.message-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.message-text {
  font-size: 2rem;
  font-weight: 800;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.3em;
}

.message-char {
  color: var(--text-secondary);
  transition: all 0.3s;
}
.message-char.correct {
  color: var(--success);
  text-shadow: 0 0 15px var(--success-glow);
}

.message-empty {
  color: var(--text-secondary);
  font-size: 1rem;
}

.action-row {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.code-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

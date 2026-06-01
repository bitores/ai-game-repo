<script setup>
import { inject, computed, ref, watch } from 'vue'
import { useLevel3 } from '../../composables/usePuzzle'
import CodePanel from '../CodePanel.vue'

const game = inject('game')
const puzzle = useLevel3()

const hintsShown = ref(0)

// Force triggering computed watchers by reading them in the template
const triggerAlpha = computed(() => puzzle.alphaTrigger.value)
const triggerBeta = computed(() => puzzle.betaTrigger.value)
const triggerGamma = computed(() => puzzle.gammaTrigger.value)
const triggerDelta = computed(() => puzzle.deltaTrigger.value)

const codeSnippet = computed(() => `// 第3关: 侦听器追踪
// 按正确顺序触发所有 watcher

const signal = ref(${puzzle.signal.value})

// Watcher 链: alpha(${puzzle.activeWatchers.alpha ? '✓' : '○'})
//           → beta(${puzzle.activeWatchers.beta ? '✓' : '○'})
//           → gamma(${puzzle.activeWatchers.gamma ? '✓' : '○'})
//           → delta(${puzzle.activeWatchers.delta ? '✓' : '○'})

// 提示: signal=1 触发 alpha
//       signal=2 触发 beta (需要先触发 alpha)
//       signal=3 触发 gamma (需要先触发 beta)
//       signal=4 触发 delta (需要先触发 gamma)`)

const watcherLogCode = computed(() => {
  if (puzzle.watcherLog.value.length === 0) {
    return '// 侦听器日志 (暂无记录)\n// 尝试修改 signal 的值来触发侦听器链...'
  }
  return puzzle.watcherLog.value.map(w => `[${w.id}] ${w.msg}`).join('\n')
})

function handleSignal(val) {
  puzzle.setSignal(val)
}

function handleCheck() {
  const result = puzzle.checkComplete()
  if (result.complete) {
    game.completeLevel(2, calcScore(), result.secrets)
  }
}

function calcScore() {
  let base = 100
  base -= hintsShown.value * 20
  return Math.max(10, base)
}

function showHint() {
  hintsShown.value++
  game.useHint(2)
}
</script>

<template>
  <div class="level-container">
    <div class="level-content">
      <div class="puzzle-area">
        <div class="puzzle-description">
          <p class="desc-text">按顺序触发 <code>alpha → beta → gamma → delta</code> 四个侦听器。</p>
          <p class="desc-hint">每个侦听器只有在前面一个被触发后才能激活。通过设置 signal 的值来控制触发顺序。</p>
        </div>

        <!-- Watcher status display -->
        <div class="watcher-status">
          <div
            class="watcher-node"
            v-for="(active, name) in puzzle.activeWatchers"
            :key="name"
            :class="{
              triggered: active,
              next: !active && (name === 'alpha' || puzzle.activeWatchers[['', 'alpha', 'beta', 'gamma'][['alpha', 'beta', 'gamma', 'delta'].indexOf(name)]]),
            }"
          >
            <div class="watcher-icon">
              {{ active ? '✓' : '○' }}
            </div>
            <div class="watcher-name">{{ name }}</div>
            <div class="watcher-status-text">
              {{ active ? '已触发' : '等待中' }}
            </div>
          </div>
        </div>

        <!-- Signal controls -->
        <div class="signal-controls">
          <div class="signal-label">控制信号 signal:</div>
          <div class="signal-value">{{ puzzle.signal.value }}</div>
          <div class="signal-buttons">
            <button class="btn" @click="handleSignal(1)">signal = 1</button>
            <button class="btn" @click="handleSignal(2)">signal = 2</button>
            <button class="btn" @click="handleSignal(3)">signal = 3</button>
            <button class="btn" @click="handleSignal(4)">signal = 4</button>
          </div>
          <button class="btn" @click="puzzle.reset()" style="margin-top:0.5rem">重置</button>
        </div>

        <!-- Watcher log -->
        <div class="watcher-log">
          <div class="log-header">侦听器日志</div>
          <div v-if="puzzle.watcherLog.value.length === 0" class="log-empty">
            尚未触发任何侦听器...
          </div>
          <TransitionGroup v-else name="log" tag="div" class="log-entries">
            <div
              v-for="(entry, idx) in puzzle.watcherLog.value"
              :key="entry.id + idx"
              class="log-entry"
            >
              <span class="entry-icon">
                {{ entry.id === 'alpha' ? '🔵' : entry.id === 'beta' ? '🟢' : entry.id === 'gamma' ? '🟡' : '🔴' }}
              </span>
              <span class="entry-text">{{ entry.msg }}</span>
            </div>
          </TransitionGroup>
        </div>

        <!-- Action -->
        <div class="action-row">
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

      <!-- Code panel -->
      <div class="code-section">
        <CodePanel title="侦听器配置" :code="codeSnippet" language="javascript" />
        <CodePanel title="运行时日志" :code="watcherLogCode" language="javascript" />
      </div>
    </div>

    <!-- Hidden triggers to force computed evaluation -->
    <div style="display:none">{{ triggerAlpha }}{{ triggerBeta }}{{ triggerGamma }}{{ triggerDelta }}</div>
  </div>
</template>

<style scoped>
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
  animation: fadeIn 0.5s ease;
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
.desc-hint {
  color: var(--text-secondary);
  font-size: 0.82rem;
  margin-top: 0.5rem;
}

/* Watcher status */
.watcher-status {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.watcher-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 1rem 1.2rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: 12px;
  min-width: 100px;
  transition: all 0.4s ease;
}
.watcher-node.triggered {
  border-color: var(--success);
  background: rgba(34, 197, 94, 0.1);
  box-shadow: 0 0 15px var(--success-glow);
  animation: pulse 2s ease-in-out;
}
.watcher-node.next {
  border-color: var(--accent);
  animation: glow 1.5s ease-in-out infinite;
}

.watcher-icon {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-secondary);
  transition: color 0.3s;
}
.watcher-node.triggered .watcher-icon {
  color: var(--success);
}

.watcher-name {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  font-size: 0.9rem;
}

.watcher-status-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
.watcher-node.triggered .watcher-status-text {
  color: var(--success);
}

/* Signal controls */
.signal-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  padding: 1.2rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.signal-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.signal-value {
  font-size: 3rem;
  font-weight: 800;
  font-family: 'Courier New', monospace;
  color: var(--accent);
  text-shadow: 0 0 20px var(--accent-glow);
  transition: all 0.3s;
}

.signal-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

/* Watcher log */
.watcher-log {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.log-header {
  padding: 0.7rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.log-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.log-entries {
  padding: 0.5rem;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  background: var(--bg-card);
  margin-bottom: 0.4rem;
  animation: slideIn 0.3s ease;
  font-size: 0.85rem;
}

.log-enter-active {
  transition: all 0.4s ease;
}
.log-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.entry-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.entry-text {
  color: var(--text-primary);
  line-height: 1.5;
}

.action-row {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
}

.code-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

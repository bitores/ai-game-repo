<script setup>
import { inject, computed, ref } from 'vue'
import { useLevel5 } from '../../composables/usePuzzle'
import CodePanel from '../CodePanel.vue'

const game = inject('game')
const puzzle = useLevel5()

const hintsShown = ref(0)

const codeSnippet = computed(() => `// 第5关: 代码深处的秘密
// 按顺序激活四大响应式支柱

const system = {
  ref: ${puzzle.pillars.ref.value === 1 ? '✓ 已激活' : '○ 待激活'},
  computed: ${puzzle.pillars.computed.value === 1 ? '✓ 已激活' : '○ 待激活'},
  watch: ${puzzle.pillars.watch.value === 1 ? '✓ 已激活' : '○ 待激活'},
  effect: ${puzzle.pillars.effect.value === 1 ? '✓ 已激活' : '○ 待激活'},
}

// 激活顺序至关重要:
// ref → computed → watch → effect
// 每个环节都依赖于前一个环节

// 当前进度: ${puzzle.activationOrder.value.length}/4`)

function handleActivate(name) {
  puzzle.activatePillar(name)
}

function handleCheck() {
  const result = puzzle.checkComplete()
  if (result.complete) {
    game.completeLevel(4, calcScore(), result.secrets)
  }
}

function calcScore() {
  let base = 100
  base -= hintsShown.value * 20
  return Math.max(10, base)
}

function showHint() {
  hintsShown.value++
  game.useHint(4)
}
</script>

<template>
  <div class="level-container">
    <div class="level-header">
      <div class="header-glow"></div>
      <h2 class="final-title">⚡ 最终试炼 ⚡</h2>
      <p class="final-subtitle">激活四大响应式支柱，揭开代码深处的最终秘密</p>
    </div>

    <div class="level-content">
      <div class="puzzle-area">
        <!-- Pillar activation -->
        <div class="pillars-container">
          <div
            v-for="(display, idx) in puzzle.chainDisplay.value"
            :key="display.name"
            class="pillar-wrapper"
          >
            <div
              class="pillar-card"
              :class="{
                'pillar-active': display.active,
                'pillar-next': !display.active && (idx === 0 || puzzle.chainDisplay.value[idx - 1].active),
              }"
              @click="handleActivate(['ref', 'computed', 'watch', 'effect'][idx])"
            >
              <div class="pillar-icon">{{ display.icon }}</div>
              <div class="pillar-name">{{ display.name }}</div>
              <div class="pillar-status">
                {{ display.active ? '已激活' : '点击激活' }}
              </div>
            </div>
            <div v-if="idx < 3" class="pillar-connector">
              <span class="connector-arrow">→</span>
            </div>
          </div>
        </div>

        <!-- Progress -->
        <div class="final-progress">
          <div class="progress-label">解锁进度</div>
          <div class="progress-main-bar">
            <div class="progress-main-fill" :style="{ width: puzzle.progress.value + '%' }"></div>
          </div>
          <div class="progress-text">{{ puzzle.activationOrder.value.length }} / 4</div>
        </div>

        <!-- Secret revelation -->
        <Transition name="revelation">
          <div v-if="puzzle.finalUnlocked.value" class="revelation-container">
            <div class="revelation-glow"></div>
            <div class="revelation-content">
              <div class="revelation-icon">👑</div>
              <h3 class="revelation-title">终极秘密已解锁！</h3>
              <p class="revelation-quote">
                "响应式系统的本质，是发布-订阅模式的优雅实现——<br/>
                数据的变化如同涟漪般扩散，<br/>
                所有依赖它的计算都会自动更新。"
              </p>
              <div class="revelation-code">
                <pre>const secret = '你已掌握 Vue 3 响应式的全部精髓！'</pre>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Actions -->
        <div class="action-row">
          <button class="btn" @click="puzzle.reset()">重置</button>
          <button class="btn" @click="showHint">提示 ({{ hintsShown }})</button>
          <button
            class="btn btn-success btn-submit"
            :disabled="!puzzle.isComplete.value"
            @click="handleCheck"
          >
            {{ puzzle.isComplete.value ? '揭开最终秘密' : '继续激活...' }}
          </button>
        </div>
      </div>

      <div class="code-section">
        <CodePanel title="最终仪式代码" :code="codeSnippet" language="javascript" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.level-container {
  animation: fadeIn 0.5s ease;
}

.level-header {
  text-align: center;
  padding: 1.5rem 1.5rem 0.5rem;
  position: relative;
}

.header-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 100px;
  background: radial-gradient(ellipse, var(--accent-glow), transparent);
  opacity: 0.5;
}

.final-title {
  font-size: 1.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--gold), var(--pink), var(--purple));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: rainbow 3s ease infinite;
  position: relative;
}

.final-subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 0.3rem;
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

/* Pillars */
.pillars-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.pillar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pillar-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.2rem 1rem;
  min-width: 110px;
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.pillar-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 15px var(--accent-glow);
  transform: translateY(-2px);
}

.pillar-card:active {
  transform: scale(0.96);
}

.pillar-card.pillar-active {
  border-color: var(--success);
  background: rgba(34, 197, 94, 0.1);
  box-shadow: 0 0 20px var(--success-glow);
  cursor: default;
}

.pillar-card.pillar-next {
  border-color: var(--accent);
  animation: glow 1.5s ease-in-out infinite;
}

.pillar-icon {
  font-size: 2rem;
  transition: transform 0.3s;
}
.pillar-active .pillar-icon {
  animation: float 2s ease-in-out infinite;
}

.pillar-name {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.pillar-status {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
.pillar-active .pillar-status {
  color: var(--success);
}

.pillar-connector {
  display: flex;
  align-items: center;
}

.connector-arrow {
  color: var(--text-secondary);
  font-size: 1.3rem;
  opacity: 0.5;
}

/* Progress */
.final-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.progress-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.progress-main-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-card);
  border-radius: 4px;
  overflow: hidden;
}

.progress-main-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--purple), var(--pink));
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-text {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: var(--accent);
  font-size: 0.9rem;
  min-width: 40px;
  text-align: right;
}

/* Revelation */
.revelation-container {
  position: relative;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(236, 72, 153, 0.12), rgba(245, 158, 11, 0.12));
  border: 2px solid var(--gold);
  border-radius: 20px;
  text-align: center;
  overflow: hidden;
  animation: secret-reveal 0.8s ease forwards;
}

.revelation-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.08), transparent 60%);
  animation: float 4s ease-in-out infinite;
  pointer-events: none;
}

.revelation-content {
  position: relative;
  z-index: 1;
}

.revelation-icon {
  font-size: 3rem;
  margin-bottom: 0.8rem;
  animation: float 2s ease-in-out infinite;
}

.revelation-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--gold);
  margin-bottom: 1rem;
}

.revelation-quote {
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.8;
  margin-bottom: 1rem;
  font-style: italic;
}

.revelation-code {
  background: var(--bg-code);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  display: inline-block;
}

.revelation-code pre {
  font-family: 'Courier New', monospace;
  color: var(--text-code);
  font-size: 0.9rem;
}

.revelation-enter-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.revelation-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

/* Actions */
.action-row {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.btn-submit {
  padding: 0.8rem 2rem;
  font-size: 1rem;
}

.code-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

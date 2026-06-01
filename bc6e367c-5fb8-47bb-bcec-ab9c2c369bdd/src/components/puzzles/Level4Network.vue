<script setup>
import { inject, computed, ref } from 'vue'
import { useLevel4 } from '../../composables/usePuzzle'
import CodePanel from '../CodePanel.vue'

const game = inject('game')
const puzzle = useLevel4()

const hintsShown = ref(0)

const codeSnippet = computed(() => `// 第4关: 依赖网络
// 在依赖图中找到关键路径 A → B → D → F

const graph = {
  A: { deps: ['B', 'C'], visited: ${puzzle.nodes.A.visited} },
  B: { deps: ['D'],       visited: ${puzzle.nodes.B.visited} },
  C: { deps: ['D', 'E'],  visited: ${puzzle.nodes.C.visited} },
  D: { deps: ['F'],       visited: ${puzzle.nodes.D.visited} },
  E: { deps: ['F'],       visited: ${puzzle.nodes.E.visited} },
  F: { deps: [],          visited: ${puzzle.nodes.F.visited} },
}

// 当前位置: ${puzzle.currentNode.value}
// 访问路径: [${puzzle.path.value.join(' → ') || '空'}]
// 关键路径进度: ${puzzle.criticalProgress.value}/4`)

const graphViz = computed(() => {
  const edges = [
    ['A', 'B'], ['A', 'C'],
    ['B', 'D'], ['C', 'D'], ['C', 'E'],
    ['D', 'F'], ['E', 'F'],
  ]
  return edges
})

function handleVisit(nodeId) {
  puzzle.visitNode(nodeId)
}

function handleCheck() {
  const result = puzzle.checkComplete()
  if (result.complete) {
    game.completeLevel(3, calcScore(), result.secrets)
  }
}

function calcScore() {
  let base = 100
  base -= hintsShown.value * 20
  return Math.max(10, base)
}

function showHint() {
  hintsShown.value++
  game.useHint(3)
}
</script>

<template>
  <div class="level-container">
    <div class="level-content">
      <div class="puzzle-area">
        <div class="puzzle-description">
          <p class="desc-text">探索依赖网络，找到从 <code>A</code> 到 <code>F</code> 的<strong>关键路径</strong>。</p>
          <p class="desc-hint">每个节点只能通过相连的边访问。找到 A → B → D → F 即可解锁秘密。</p>
        </div>

        <!-- Graph visualization -->
        <div class="graph-container">
          <svg class="graph-svg" viewBox="0 0 400 300">
            <!-- Edges -->
            <line v-for="(edge, idx) in graphViz" :key="'e'+idx"
              :x1="getNodeX(edge[0])" :y1="getNodeY(edge[0])"
              :x2="getNodeX(edge[1])" :y2="getNodeY(edge[1])"
              :class="{
                'edge-visited': puzzle.path.value.includes(edge[0]) && puzzle.path.value.includes(edge[1]),
                'edge-active': puzzle.currentNode.value === edge[0] && !puzzle.nodes[edge[1]].visited,
              }"
            />
            <!-- Nodes -->
            <g v-for="nodeId in ['A','B','C','D','E','F']" :key="nodeId"
              @click="handleVisit(nodeId)"
              class="graph-node-group"
              :class="{
                'node-current': puzzle.currentNode.value === nodeId,
                'node-visited': puzzle.nodes[nodeId].visited,
                'node-connectable': puzzle.isConnected(nodeId),
                'node-critical': puzzle.criticalPath.includes(nodeId),
              }"
            >
              <circle :cx="getNodeX(nodeId)" :cy="getNodeY(nodeId)" r="22" />
              <text :x="getNodeX(nodeId)" :y="getNodeY(nodeId)" text-anchor="middle" dominant-baseline="central">
                {{ nodeId }}
              </text>
            </g>
          </svg>
        </div>

        <!-- Node info & controls -->
        <div class="node-controls">
          <div class="current-node-info">
            <span class="info-label">当前位置:</span>
            <span class="info-value current-node">{{ puzzle.currentNode.value }}</span>
            <span class="info-label">可访问:</span>
            <span class="info-value">
              {{ puzzle.nodes[puzzle.currentNode.value]?.connected.join(', ') || '无' }}
            </span>
          </div>

          <div class="quick-buttons">
            <span class="quick-label">快速跳转:</span>
            <div class="quick-grid">
              <button
                v-for="nodeId in ['A','B','C','D','E','F']"
                :key="nodeId"
                class="btn btn-node"
                :class="{
                  'btn-current': puzzle.currentNode.value === nodeId,
                  'btn-visited': puzzle.nodes[nodeId].visited,
                  'btn-disabled': !puzzle.isConnected(nodeId) && puzzle.currentNode.value !== nodeId,
                }"
                :disabled="!puzzle.isConnected(nodeId) && puzzle.currentNode.value !== nodeId"
                @click="handleVisit(nodeId)"
              >
                {{ nodeId }}
              </button>
            </div>
          </div>

          <!-- Path display -->
          <div class="path-display">
            <span class="info-label">访问路径:</span>
            <div class="path-trace">
              <span v-if="puzzle.path.value.length === 0" class="path-empty">尚未开始</span>
              <template v-else>
                <span
                  v-for="(nodeId, idx) in puzzle.path.value"
                  :key="idx"
                  class="path-node"
                  :class="{ 'path-critical': puzzle.criticalPath.includes(nodeId) }"
                >
                  <span v-if="idx > 0" class="path-arrow">→</span>
                  {{ nodeId }}
                </span>
              </template>
            </div>
          </div>
        </div>

        <!-- Secret fragment -->
        <Transition name="secret">
          <div v-if="puzzle.codeFragment.value" class="secret-fragment">
            <p class="fragment-text">{{ puzzle.codeFragment.value }}</p>
          </div>
        </Transition>

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

      <!-- Code panel -->
      <div class="code-section">
        <CodePanel title="依赖图状态" :code="codeSnippet" language="javascript" />
      </div>
    </div>
  </div>
</template>

<script>
// Helper functions for graph layout
function getNodePositions() {
  return {
    A: { x: 200, y: 30 },
    B: { x: 100, y: 110 },
    C: { x: 300, y: 110 },
    D: { x: 100, y: 200 },
    E: { x: 300, y: 200 },
    F: { x: 200, y: 270 },
  }
}

export default {
  methods: {
    getNodeX(id) { return getNodePositions()[id].x },
    getNodeY(id) { return getNodePositions()[id].y },
  }
}
</script>

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

/* Graph visualization */
.graph-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.5rem;
  display: flex;
  justify-content: center;
}

.graph-svg {
  width: 100%;
  max-width: 400px;
  height: auto;
}

.graph-svg line {
  stroke: var(--border);
  stroke-width: 2;
  transition: all 0.3s;
}
.graph-svg line.edge-visited {
  stroke: var(--accent);
  stroke-width: 3;
  stroke-dasharray: none;
}
.graph-svg line.edge-active {
  stroke: var(--success);
  stroke-width: 3;
  animation: pulse 1s infinite;
}

.graph-node-group {
  cursor: pointer;
}
.graph-node-group circle {
  fill: var(--bg-card);
  stroke: var(--border);
  stroke-width: 2;
  transition: all 0.3s;
}
.graph-node-group text {
  fill: var(--text-secondary);
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 14px;
  pointer-events: none;
  transition: fill 0.3s;
}

.graph-node-group:hover circle {
  stroke: var(--accent);
  filter: drop-shadow(0 0 6px var(--accent-glow));
}

.graph-node-group.node-current circle {
  fill: var(--accent);
  stroke: var(--accent);
  filter: drop-shadow(0 0 10px var(--accent-glow));
}
.graph-node-group.node-current text {
  fill: #fff;
}

.graph-node-group.node-visited circle {
  stroke: var(--accent);
  fill: rgba(56, 189, 248, 0.15);
}
.graph-node-group.node-visited text {
  fill: var(--accent);
}

.graph-node-group.node-connectable circle {
  animation: glow 1.5s ease-in-out infinite;
  stroke: var(--success);
}

.graph-node-group.node-critical.node-visited circle {
  stroke: var(--gold);
  fill: rgba(245, 158, 11, 0.15);
}
.graph-node-group.node-critical.node-visited text {
  fill: var(--gold);
}

/* Node controls */
.node-controls {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.current-node-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.info-label {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.info-value {
  color: var(--text-primary);
  font-weight: 600;
  margin-right: 0.5rem;
}
.info-value.current-node {
  color: var(--accent);
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
}

.quick-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.quick-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.quick-grid {
  display: flex;
  gap: 0.3rem;
}

.btn-node {
  min-width: 40px;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-weight: 700;
}

.btn-current {
  background: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
}

.btn-visited {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

.btn-disabled {
  opacity: 0.3 !important;
  cursor: not-allowed !important;
}

/* Path display */
.path-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.path-trace {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem;
}

.path-node {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.95rem;
}
.path-node.path-critical {
  color: var(--gold);
}

.path-arrow {
  color: var(--text-secondary);
  margin: 0 0.2rem;
  font-size: 0.8rem;
}

.path-empty {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
}

/* Secret fragment */
.secret-fragment {
  padding: 1rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 179, 8, 0.1));
  border: 1px solid var(--gold);
  border-radius: 12px;
  text-align: center;
}

.fragment-text {
  color: var(--gold);
  font-size: 0.9rem;
  font-weight: 500;
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

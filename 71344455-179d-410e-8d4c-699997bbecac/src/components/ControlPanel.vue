<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  cells: { type: Array, required: true },
  eventLog: { type: Array, required: true },
  currentLevel: { type: Object, default: null },
  moveCount: { type: Number, default: 0 },
})

const emit = defineEmits(['reset', 'next-level', 'select-level'])

const logContainer = ref(null)
const activeTab = ref('log') // 'log' | 'data' | 'help'

// 自动滚动日志到底部
watch(
  () => props.eventLog.length,
  async () => {
    await nextTick()
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  }
)

// 日志条目样式
function logClass(item) {
  if (item.type === 'toggle') return 'log-toggle'
  if (item.type === 'watcher') return 'log-watcher'
  if (item.type === 'victory') return 'log-victory'
  if (item.type === 'error') return 'log-error'
  if (item.type === 'info') return 'log-info'
  return ''
}

function logMessage(item) {
  if (item.type === 'toggle') {
    return `${item.targetLabel || item.targetId} → ${item.newValue ? '开' : '关'}`
  }
  if (item.type === 'watcher') {
    const modeMap = {
      follow: '跟随', toggle: '翻转', and: '与门',
      or: '或门', xor: '异或门', nor: '或非门', nand: '与非门',
    }
    return `${item.targetLabel || item.targetId} [${modeMap[item.mode] || item.mode}] ← ${item.sourceLabel || item.sourceId} → ${item.newValue ? '开' : '关'}`
  }
  if (item.type === 'victory' || item.type === 'error' || item.type === 'info') {
    return item.message
  }
  return ''
}

// 响应式数据树
const reactiveDataTree = computed(() => {
  return props.cells.map((cell) => ({
    id: cell.id,
    label: cell.label,
    value: cell.value,
    type: cell.type,
    watches:
      cell.type === 'watcher' && cell.watches?.length > 0
        ? cell.watches
        : [],
    watcherMode: cell.watcherMode || '',
    isActive: cell.value === true,
  }))
})

// 活跃/不活跃统计
const activeStats = computed(() => {
  const total = props.cells.length
  const active = props.cells.filter((c) => c.value === true).length
  return { total, active, inactive: total - active }
})
</script>

<template>
  <div class="control-panel">
    <!-- 关卡描述 -->
    <div v-if="currentLevel" class="level-description">
      <p class="desc-text">{{ currentLevel.description }}</p>
    </div>

    <!-- 进度 -->
    <div class="progress-bar-container">
      <div class="progress-label">
        <span>激活进度</span>
        <span class="progress-numbers">{{ activeStats.active }} / {{ activeStats.total }}</span>
      </div>
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: `${(activeStats.active / activeStats.total) * 100}%` }"
        />
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'log' }"
        @click="activeTab = 'log'"
      >
        事件日志
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'data' }"
        @click="activeTab = 'data'"
      >
        响应式数据
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'help' }"
        @click="activeTab = 'help'"
      >
        帮助
      </button>
    </div>

    <!-- 事件日志 -->
    <div v-show="activeTab === 'log'" ref="logContainer" class="log-container">
      <div
        v-for="item in eventLog"
        :key="item.id"
        class="log-entry"
        :class="logClass(item)"
      >
        <span class="log-icon">
          {{ item.type === 'toggle' ? '🔘' : item.type === 'watcher' ? '👁' : item.type === 'victory' ? '🎉' : item.type === 'error' ? '⚠' : item.type === 'info' ? 'ℹ' : '·' }}
        </span>
        <span class="log-msg">{{ logMessage(item) }}</span>
      </div>
      <div v-if="eventLog.length === 0" class="log-empty">
        暂无事件...
      </div>
    </div>

    <!-- 响应式数据树 -->
    <div v-show="activeTab === 'data'" class="data-tree">
      <div class="data-section-label">单元格响应式状态 (ref / reactive)</div>
      <div
        v-for="cell in reactiveDataTree"
        :key="cell.id"
        class="data-row"
        :class="{ 'data-active': cell.isActive }"
      >
        <span class="data-id">{{ cell.id }}</span>
        <span class="data-label">{{ cell.label }}</span>
        <span class="data-type-badge" :class="'badge-' + cell.type">
          {{ cell.type }}
        </span>
        <span class="data-value" :class="{ 'val-true': cell.isActive, 'val-false': !cell.isActive }">
          {{ cell.isActive ? 'true' : 'false' }}
        </span>
        <span v-if="cell.watches.length > 0" class="data-watches">
          watch({{ cell.watches.join(', ') }})
        </span>
      </div>
      <div class="data-note">
        <span class="note-icon">💡</span>
        <span>所有数据通过 Vue ref / reactive 驱动，UI 自动响应变化</span>
      </div>
    </div>

    <!-- 帮助 -->
    <div v-show="activeTab === 'help'" class="help-panel">
      <div class="help-section">
        <h4>🎮 玩法</h4>
        <p>点击 <strong>普通</strong> 单元格切换其状态（开/关）。</p>
        <p><strong>侦听器</strong> 单元格通过 Vue watch API 自动响应其他单元格的变化。</p>
        <p><strong>条件门</strong> 需要特定条件才能打开。</p>
      </div>
      <div class="help-section">
        <h4>👁 侦听器模式</h4>
        <ul>
          <li><code>⚡ follow</code> — 跟随被侦听单元格的值</li>
          <li><code>↺ toggle</code> — 每次被侦听单元格变化时翻转</li>
          <li><code>&amp; and</code> — 所有被侦听都为开时才开</li>
          <li><code>≥1 or</code> — 任一被侦听为开时即开</li>
          <li><code>⊕ xor</code> — 奇数个被侦听为开时才开</li>
        </ul>
      </div>
      <div class="help-section">
        <h4>🔬 Vue 响应式原理</h4>
        <p>每个单元格的值由 <code>ref()</code> 或 <code>reactive()</code> 管理。</p>
        <p>侦听器使用 <code>watch()</code> 观察其他单元格的值变化。</p>
        <p>UI 通过 Vue 的响应式系统自动更新。</p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn btn-reset" @click="$emit('reset')">
        ⟳ 重置
      </button>
      <button class="btn btn-next" @click="$emit('next-level')">
        下一关 →
      </button>
    </div>

    <!-- 关卡选择 -->
    <div class="level-selector">
      <span class="ls-label">选关：</span>
      <button
        v-for="(_, i) in currentLevel ? 1 : []"
        :key="i"
        class="ls-btn"
        :class="{ 'ls-active': false }"
        disabled
      >
        {{ i + 1 }}
      </button>
      <div class="ls-hint">使用底部按钮切换关卡</div>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 400px;
  background: rgba(12, 12, 35, 0.9);
  border: 1px solid #2a2a5a;
  border-radius: 14px;
  padding: 16px;
  color: #c0c0e0;
  font-size: 13px;
  max-height: 600px;
  overflow-y: auto;
}

/* ── 关卡描述 ── */
.level-description {
  background: rgba(0, 212, 255, 0.06);
  border: 1px solid rgba(0, 212, 255, 0.15);
  border-radius: 8px;
  padding: 10px 12px;
}
.desc-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #99aabb;
  white-space: pre-line;
}

/* ── 进度条 ── */
.progress-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #667799;
}
.progress-numbers {
  font-weight: 700;
  color: #00d4ff;
}
.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── 标签页 ── */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #2a2a5a;
  padding-bottom: 8px;
}
.tab-btn {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: #667799;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}
.tab-btn:hover {
  color: #99aabb;
  background: rgba(255,255,255,0.03);
}
.tab-btn.active {
  color: #00d4ff;
  border-color: #2a2a5a;
  border-bottom-color: rgba(12, 12, 35, 0.9);
  background: rgba(0, 212, 255, 0.05);
}

/* ── 事件日志 ── */
.log-container {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 200px;
  overflow-y: auto;
  padding: 6px 4px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
}
.log-container::-webkit-scrollbar {
  width: 4px;
}
.log-container::-webkit-scrollbar-track {
  background: transparent;
}
.log-container::-webkit-scrollbar-thumb {
  background: #2a2a5a;
  border-radius: 2px;
}
.log-entry {
  display: flex;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 4px;
  line-height: 1.4;
  animation: log-fade-in 0.2s ease;
}
@keyframes log-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.log-toggle { color: #00d4ff; }
.log-watcher { color: #ffaa00; background: rgba(255, 170, 0, 0.06); }
.log-victory { color: #00ff88; background: rgba(0, 255, 136, 0.1); font-weight: 700; }
.log-error { color: #ff6b6b; background: rgba(255, 107, 107, 0.08); }
.log-info { color: #667799; font-style: italic; }
.log-icon { flex-shrink: 0; }
.log-msg { word-break: break-all; }
.log-empty {
  color: #445;
  padding: 20px;
  text-align: center;
  font-style: italic;
}

/* ── 响应式数据树 ── */
.data-tree {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}
.data-section-label {
  font-size: 10px;
  color: #556;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 0;
}
.data-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  transition: all 0.2s;
}
.data-row:hover {
  background: rgba(255,255,255,0.03);
}
.data-active {
  background: rgba(0, 255, 136, 0.04);
}
.data-id {
  color: #556;
  min-width: 28px;
}
.data-label {
  min-width: 20px;
  font-weight: 600;
}
.data-type-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
}
.badge-normal { background: rgba(100,100,150,0.15); color: #7788aa; }
.badge-watcher { background: rgba(255,170,0,0.15); color: #ffaa00; }
.badge-gate { background: rgba(255,107,107,0.15); color: #ff6b6b; }
.data-value {
  margin-left: auto;
  font-weight: 700;
  font-size: 12px;
}
.val-true { color: #00ff88; }
.val-false { color: #445; }
.data-watches {
  font-size: 9px;
  color: #ffaa00;
  margin-left: 4px;
}
.data-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 212, 255, 0.05);
  border-radius: 6px;
  font-size: 11px;
  color: #667799;
  line-height: 1.4;
}
.note-icon {
  flex-shrink: 0;
}

/* ── 帮助 ── */
.help-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 240px;
  overflow-y: auto;
}
.help-section h4 {
  margin: 0 0 4px 0;
  color: #99aabb;
  font-size: 13px;
}
.help-section p {
  margin: 2px 0;
  font-size: 11px;
  line-height: 1.5;
  color: #7788aa;
}
.help-section ul {
  margin: 4px 0;
  padding-left: 16px;
}
.help-section li {
  font-size: 11px;
  line-height: 1.6;
  color: #7788aa;
}
.help-section code {
  background: rgba(255,255,255,0.06);
  padding: 1px 5px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #ffaa00;
}

/* ── 操作按钮 ── */
.actions {
  display: flex;
  gap: 8px;
}
.btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #2a2a5a;
  border-radius: 8px;
  background: rgba(20, 20, 50, 0.8);
  color: #99aabb;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn:hover {
  border-color: #4a4a8a;
  background: rgba(30, 30, 70, 0.8);
  transform: translateY(-1px);
}
.btn-reset:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
}
.btn-next {
  background: rgba(0, 212, 255, 0.08);
  color: #00d4ff;
}
.btn-next:hover {
  background: rgba(0, 212, 255, 0.15);
  border-color: #00d4ff;
}

/* ── 关卡选择 ── */
.level-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #2a2a5a;
}
.ls-label {
  font-size: 11px;
  color: #667799;
}
.ls-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #2a2a5a;
  border-radius: 6px;
  background: transparent;
  color: #556;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}
.ls-btn.ls-active {
  border-color: #00d4ff;
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.1);
}
.ls-hint {
  font-size: 10px;
  color: #445;
  margin-left: auto;
}
</style>

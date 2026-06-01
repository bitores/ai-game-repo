<script setup>
import { computed } from 'vue'

const props = defineProps({
  cell: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  canToggle: { type: Boolean, default: true },
  gateOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle', 'hover'])

const isActive = computed(() => props.cell.value === true)
const typeIcon = computed(() => {
  if (props.cell.type === 'watcher') return 'W'
  if (props.cell.type === 'gate') return props.gateOpen ? '🔓' : '🔒'
  return ''
})
const modeLabel = computed(() => {
  if (props.cell.type !== 'watcher') return ''
  switch (props.cell.watcherMode) {
    case 'follow': return '⚡'
    case 'toggle': return '↺'
    case 'and': return '&'
    case 'or': return '≥1'
    case 'xor': return '⊕'
    case 'nor': return '↓'
    case 'nand': return '↑'
    default: return ''
  }
})

function handleClick() {
  if (props.cell.type === 'watcher' && props.cell.watches?.length > 0) {
    emit('toggle', props.cell.id)
    return
  }
  if (props.cell.type === 'gate' && !props.gateOpen) {
    emit('toggle', props.cell.id)
    return
  }
  emit('toggle', props.cell.id)
}

function handleMouseEnter() {
  emit('hover', props.cell.id)
}

function handleMouseLeave() {
  emit('hover', null)
}
</script>

<template>
  <button
    class="puzzle-cell"
    :class="{
      'cell-active': isActive,
      'cell-inactive': !isActive,
      'cell-watcher': cell.type === 'watcher',
      'cell-gate': cell.type === 'gate',
      'cell-normal': cell.type === 'normal',
      'cell-selected': selected,
      'cell-clickable': canToggle && !(cell.type === 'watcher' && cell.watches?.length > 0),
      'cell-blocked': cell.type === 'gate' && !gateOpen,
    }"
    :disabled="false"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <span class="cell-label">{{ cell.label }}</span>
    <span v-if="typeIcon" class="cell-type-icon">{{ typeIcon }}</span>
    <span v-if="modeLabel && cell.type === 'watcher'" class="cell-mode">{{ modeLabel }}</span>
    <span class="cell-indicator" :class="{ 'indicator-on': isActive, 'indicator-off': !isActive }">
      {{ isActive ? '开' : '关' }}
    </span>
  </button>
</template>

<style scoped>
.puzzle-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  height: 100%;
  border: 2px solid #2a2a5a;
  border-radius: 10px;
  background: #16163a;
  color: #8899bb;
  font-family: 'Courier New', monospace;
  cursor: default;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 4px;
  min-height: 60px;
  user-select: none;
  outline: none;
}

.puzzle-cell:focus-visible {
  box-shadow: 0 0 0 2px #00d4ff;
}

/* ── 类型样式 ── */
.cell-normal {
  border-color: #2a2a5a;
}
.cell-watcher {
  border-color: #b8860b;
  background: linear-gradient(135deg, #1a1a3e 0%, #1e1a30 100%);
}
.cell-gate {
  border-color: #c0392b;
  background: linear-gradient(135deg, #1a1a3e 0%, #2a1a1a 100%);
}

/* ── 激活状态 ── */
.cell-active {
  border-color: #00ff88 !important;
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.3), inset 0 0 8px rgba(0, 255, 136, 0.1);
}
.cell-active.cell-normal {
  background: linear-gradient(135deg, #0a2a1a 0%, #0f3a2a 100%);
}
.cell-active.cell-watcher {
  background: linear-gradient(135deg, #2a2a0a 0%, #3a2a10 100%);
  box-shadow: 0 0 12px rgba(255, 170, 0, 0.3), inset 0 0 8px rgba(255, 170, 0, 0.1);
  border-color: #ffaa00 !important;
}
.cell-active.cell-gate {
  background: linear-gradient(135deg, #2a0a0a 0%, #3a1a1a 100%);
  box-shadow: 0 0 12px rgba(255, 107, 107, 0.3), inset 0 0 8px rgba(255, 107, 107, 0.1);
  border-color: #ff6b6b !important;
}

/* ── 可点击样式 ── */
.cell-clickable {
  cursor: pointer;
}
.cell-clickable:hover:not(.cell-active) {
  border-color: #4a4a8a;
  background: #1e1e4e;
  transform: translateY(-1px);
}
.cell-clickable:hover.cell-active {
  transform: translateY(-1px);
}

/* ── 阻塞状态 ── */
.cell-blocked {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── 选择状态 ── */
.cell-selected {
  border-color: #00d4ff !important;
  box-shadow: 0 0 16px rgba(0, 212, 255, 0.5);
}

/* ── 内部元素 ── */
.cell-label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.cell-type-icon {
  font-size: 12px;
  line-height: 1;
}
.cell-mode {
  font-size: 10px;
  opacity: 0.7;
  background: rgba(255,255,255,0.08);
  padding: 0 4px;
  border-radius: 3px;
}
.cell-indicator {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}
.indicator-on {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}
.indicator-off {
  background: rgba(100, 100, 150, 0.15);
  color: #556;
}

/* ── 动画 ── */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(0, 255, 136, 0.2); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 136, 0.5); }
}
.cell-active {
  animation: pulse-glow 2s ease-in-out infinite;
}
</style>

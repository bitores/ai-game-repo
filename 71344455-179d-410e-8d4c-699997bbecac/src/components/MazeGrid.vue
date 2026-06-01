<script setup>
import { computed } from 'vue'
import PuzzleCell from './PuzzleCell.vue'

const props = defineProps({
  cells: { type: Array, required: true },
  gridRows: { type: Number, required: true },
  gridCols: { type: Number, required: true },
  selectedCellId: { type: [String, null], default: null },
  checkGateCondition: { type: Function, default: null },
})

const emit = defineEmits(['toggle-cell', 'hover-cell'])

// 将单元格按行分组
const grid = computed(() => {
  const rows = []
  for (let r = 0; r < props.gridRows; r++) {
    const rowCells = props.cells
      .filter((c) => c.row === r)
      .sort((a, b) => a.col - b.col)
    rows.push(rowCells)
  }
  return rows
})

function isGateOpen(cell) {
  if (cell.type !== 'gate' || !cell.gateCondition) return true
  if (props.checkGateCondition) {
    return props.checkGateCondition(cell)
  }
  return false
}

function canToggleCell(cell) {
  if (cell.type === 'watcher' && cell.watches?.length > 0) return false
  if (cell.type === 'gate' && cell.gateCondition) {
    return isGateOpen(cell)
  }
  return true
}

function handleToggle(cellId) {
  emit('toggle-cell', cellId)
}

function handleHover(cellId) {
  emit('hover-cell', cellId)
}
</script>

<template>
  <div
    class="maze-grid"
    :style="{
      gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
      gridTemplateRows: `repeat(${gridRows}, 1fr)`,
    }"
  >
    <template v-for="(row, ri) in grid" :key="ri">
      <PuzzleCell
        v-for="cell in row"
        :key="cell.id"
        :cell="cell"
        :selected="cell.id === selectedCellId"
        :can-toggle="canToggleCell(cell)"
        :gate-open="isGateOpen(cell)"
        @toggle="handleToggle"
        @hover="handleHover"
      />
    </template>
  </div>
</template>

<style scoped>
.maze-grid {
  display: grid;
  gap: 8px;
  padding: 16px;
  background: rgba(10, 10, 30, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  width: 100%;
  max-width: 520px;
  aspect-ratio: v-bind('gridCols') / v-bind('gridRows');
  min-height: 240px;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .maze-grid {
    gap: 5px;
    padding: 10px;
    min-height: 180px;
  }
}
</style>

<script setup>
defineProps({
  moveCount: { type: Number, required: true },
  score: { type: Number, required: true },
  levelName: { type: String, default: '' },
  levelSubtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="score-board">
    <div class="level-info">
      <span class="level-name">{{ levelName }}</span>
      <span class="level-subtitle">{{ levelSubtitle }}</span>
    </div>
    <div class="stats">
      <div class="stat-item">
        <span class="stat-label">步数</span>
        <span class="stat-value move-count">{{ moveCount }}</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <span class="stat-label">得分</span>
        <span class="stat-value score-value">{{ score }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.score-board {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 18px;
  background: rgba(10, 10, 30, 0.8);
  border: 1px solid #2a2a5a;
  border-radius: 10px;
}
.level-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.level-name {
  font-size: 14px;
  font-weight: 700;
  color: #e0e0ff;
  letter-spacing: 0.5px;
}
.level-subtitle {
  font-size: 11px;
  color: #667799;
}
.stats {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat-label {
  font-size: 10px;
  color: #667799;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.stat-value {
  font-family: 'Courier New', monospace;
  font-size: 18px;
  font-weight: 700;
}
.move-count {
  color: #00d4ff;
}
.score-value {
  color: #ffaa00;
}
.stat-divider {
  width: 1px;
  height: 30px;
  background: #2a2a5a;
}
</style>

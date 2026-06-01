<script setup>
defineProps({
  formatted: { type: String, required: true },
  isRunning: { type: Boolean, default: false },
})
</script>

<template>
  <div class="timer-display" :class="{ 'timer-running': isRunning }">
    <span class="timer-icon">⏱</span>
    <span class="timer-value">{{ formatted }}</span>
  </div>
</template>

<style scoped>
.timer-display {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(10, 10, 30, 0.8);
  border: 1px solid #2a2a5a;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  color: #8899bb;
  transition: all 0.3s;
}
.timer-running {
  border-color: #00d4ff;
  color: #00d4ff;
}
.timer-icon {
  font-size: 14px;
}
.timer-value {
  font-weight: 700;
  letter-spacing: 1px;
}
</style>

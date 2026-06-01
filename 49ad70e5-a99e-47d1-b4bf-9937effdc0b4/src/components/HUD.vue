<template>
  <div class="hud">
    <div class="hud-left">
      <span class="hud-score">SCORE {{ score }}</span>
      <span class="hud-level">LV {{ level }}</span>
    </div>
    <div class="hud-center">
      <span class="hud-wave">WAVE {{ wave }}</span>
    </div>
    <div class="hud-right">
      <span class="hud-lives">
        <span v-for="i in lives" :key="i" class="life-icon">&#9829;</span>
      </span>
      <span class="hud-fps">{{ fps }} FPS</span>
    </div>
    <div class="hud-hint">
      Arrow/WASD 移动 | Space 射击
    </div>
  </div>
</template>

<script setup>
defineProps({
  score: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  wave: { type: Number, default: 0 },
  lives: { type: Number, default: 3 },
  fps: { type: Number, default: 60 },
})
</script>

<style scoped>
.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px;
  z-index: 10;
  pointer-events: none;
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 13px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, transparent 100%);
  user-select: none;
}

.hud-left,
.hud-center,
.hud-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hud-score {
  color: #00ff88;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
  letter-spacing: 1px;
}

.hud-level {
  color: #ffcc00;
  text-shadow: 0 0 8px rgba(255, 204, 0, 0.3);
}

.hud-wave {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.hud-lives {
  color: #ff4444;
  font-size: 16px;
  text-shadow: 0 0 8px rgba(255, 68, 68, 0.4);
  letter-spacing: 2px;
}

.hud-fps {
  color: rgba(255, 255, 255, 0.25);
  font-size: 11px;
}

.hud-hint {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.15);
  font-size: 10px;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.life-icon {
  display: inline-block;
}
</style>

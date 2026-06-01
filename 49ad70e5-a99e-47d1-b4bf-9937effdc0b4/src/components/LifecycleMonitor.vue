<template>
  <div class="lifecycle-monitor">
    <div class="monitor-title">COMPONENT LIFECYCLE</div>

    <div class="monitor-grid">
      <div class="stat-item">
        <span class="stat-label">Player Bullets</span>
        <span class="stat-value pb">{{ stats.activeBullets }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Enemy Bullets</span>
        <span class="stat-value eb">{{ stats.activeEnemyBullets }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Enemies</span>
        <span class="stat-value en">{{ stats.activeEnemies }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Particles (canvas)</span>
        <span class="stat-value pt">{{ stats.activeParticles }}</span>
      </div>
    </div>

    <div class="divider"></div>

    <div class="cumulative">
      <span class="created-badge">+{{ stats.created }}</span>
      <span class="destroyed-badge">&minus;{{ stats.destroyed }}</span>
    </div>

    <div class="event-log" ref="logRef">
      <div
        v-for="(evt, i) in stats.recentEvents"
        :key="i"
        class="log-entry"
        :class="evt.type"
      >
        {{ evt.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: { type: Object, required: true },
})
</script>

<style scoped>
.lifecycle-monitor {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 255, 136, 0.15);
  border-radius: 4px;
  padding: 7px 9px;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  min-width: 175px;
  pointer-events: none;
  user-select: none;
}

.monitor-title {
  color: rgba(0, 255, 136, 0.5);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 5px;
  border-bottom: 1px solid rgba(0, 255, 136, 0.08);
  padding-bottom: 3px;
}

.monitor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px 10px;
  margin-bottom: 4px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  gap: 4px;
}

.stat-label {
  color: rgba(255, 255, 255, 0.35);
}

.stat-value {
  font-weight: bold;
  font-size: 11px;
}

.stat-value.pb { color: #00ffcc; }
.stat-value.eb { color: #ff66ff; }
.stat-value.en { color: #ff4444; }
.stat-value.pt { color: #ffaa00; }

.divider {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin: 3px 0;
}

.cumulative {
  display: flex;
  gap: 8px;
  margin-bottom: 3px;
}

.created-badge {
  color: #00ff88;
  font-size: 10px;
}

.destroyed-badge {
  color: #ff4444;
  font-size: 10px;
}

.event-log {
  max-height: 44px;
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 2px;
}

.log-entry {
  font-size: 8px;
  line-height: 1.5;
  opacity: 0.65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-entry.created { color: #00ff88; }
.log-entry.destroyed { color: #ff6666; }
</style>

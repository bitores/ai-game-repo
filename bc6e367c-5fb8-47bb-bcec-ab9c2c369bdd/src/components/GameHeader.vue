<script setup>
import { inject, computed } from 'vue'

const game = inject('game')

const currentLevelData = computed(() => ({
  name: game.levelNames[game.currentLevel.value],
  desc: game.levelDescriptions[game.currentLevel.value],
}))

const score = computed(() => game.totalScore.value)
const progress = computed(() => game.levelProgress.value)
const secretCount = computed(() => game.foundSecretsCount.value)
const totalSecrets = computed(() => game.totalSecrets.value)
</script>

<template>
  <header class="game-header">
    <div class="header-left">
      <button class="btn-back" @click="game.goToMenu()" title="返回主菜单">
        <span class="back-icon">←</span>
      </button>
      <div class="level-info">
        <div class="level-badge">
          <span class="badge badge-accent">第 {{ game.currentLevel.value + 1 }} 关</span>
        </div>
        <h2 class="level-name">{{ currentLevelData.name }}</h2>
      </div>
    </div>

    <div class="header-center">
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="progress-dots">
          <span
            v-for="i in game.totalLevels"
            :key="i"
            class="dot"
            :class="{
              active: i - 1 === game.currentLevel.value,
              completed: game.levelScores[i - 1] !== undefined,
            }"
            @click="game.goToLevel(i - 1)"
          ></span>
        </div>
      </div>
    </div>

    <div class="header-right">
      <div class="stat-item">
        <span class="stat-icon">★</span>
        <span class="stat-value">{{ score }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🔍</span>
        <span class="stat-value">{{ secretCount }}/{{ totalSecrets }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-shrink: 0;
}

.btn-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.1rem;
}
.btn-back:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.level-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.level-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.header-center {
  flex: 1;
  max-width: 300px;
  margin: 0 auto;
}

.progress-bar-container {
  position: relative;
}

.progress-bar {
  height: 4px;
  background: var(--bg-card);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--purple));
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.3s;
}
.dot.active {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}
.dot.completed {
  background: var(--success);
  border-color: var(--success);
}
.dot:hover {
  transform: scale(1.3);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.7rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
}

.stat-icon {
  font-size: 0.9rem;
}

.stat-value {
  font-weight: 600;
  color: var(--text-primary);
}
</style>

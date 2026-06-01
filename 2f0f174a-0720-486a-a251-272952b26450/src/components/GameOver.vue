<script setup>
import { useGameState } from '../composables/useGameState'

const { state, accuracy, reset } = useGameState()

function restart() {
  reset()
}
</script>

<template>
  <div class="overlay">
    <div class="panel">
      <h1>GAME OVER</h1>

      <div class="stats">
        <div class="stat">
          <div class="stat-value">{{ state.score.toLocaleString() }}</div>
          <div class="stat-label">SCORE</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ state.maxCombo }}</div>
          <div class="stat-label">BEST COMBO</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ state.particlesDestroyed }}</div>
          <div class="stat-label">DESTROYED</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ accuracy }}%</div>
          <div class="stat-label">ACCURACY</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ state.level }}</div>
          <div class="stat-label">LEVEL REACHED</div>
        </div>
      </div>

      <div v-if="state.score >= state.highScore && state.score > 0" class="high-score-msg">
        NEW HIGH SCORE!
      </div>

      <button class="restart-btn" @click="restart">PLAY AGAIN</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(5, 8, 20, 0.82);
  backdrop-filter: blur(5px);
  z-index: 10;
  animation: fadeIn 0.4s ease-out;
}

.panel {
  text-align: center;
  padding: 40px 48px;
  background: rgba(12, 20, 42, 0.92);
  border: 1px solid rgba(80, 130, 255, 0.18);
  border-radius: 14px;
  box-shadow: 0 0 80px rgba(40, 80, 200, 0.12);
}

h1 {
  font-family: 'Courier New', monospace;
  font-size: 34px;
  color: #ff4466;
  text-shadow: 0 0 32px rgba(255, 68, 102, 0.45);
  margin-bottom: 28px;
  letter-spacing: 8px;
}

.stats {
  display: flex;
  gap: 22px;
  margin-bottom: 22px;
}

.stat {
  text-align: center;
}

.stat-value {
  font-family: 'Courier New', monospace;
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  min-width: 60px;
}

.stat-label {
  font-family: 'Courier New', monospace;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 2px;
  margin-top: 5px;
}

.high-score-msg {
  font-family: 'Courier New', monospace;
  color: #ffdd44;
  font-size: 16px;
  margin-bottom: 18px;
  text-shadow: 0 0 20px rgba(255, 221, 68, 0.4);
  letter-spacing: 2px;
}

.restart-btn {
  font-family: 'Courier New', monospace;
  font-size: 15px;
  padding: 12px 40px;
  border: 1px solid rgba(80, 130, 255, 0.35);
  border-radius: 8px;
  background: rgba(25, 50, 100, 0.5);
  color: #7aaaff;
  cursor: pointer;
  letter-spacing: 3px;
  transition: all 0.2s ease;
}

.restart-btn:hover {
  background: rgba(40, 80, 160, 0.55);
  border-color: rgba(80, 130, 255, 0.7);
  color: #aac8ff;
  box-shadow: 0 0 24px rgba(40, 80, 200, 0.25);
}

.restart-btn:active {
  transform: scale(0.96);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

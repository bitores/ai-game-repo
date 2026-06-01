<script setup>
import { useGameState } from '../composables/useGameState'

const { state, accuracy } = useGameState()
</script>

<template>
  <div class="hud">
    <!-- LEFT: Score -->
    <div class="hud-section hud-left">
      <div class="score-value">{{ state.score.toLocaleString() }}</div>
      <div class="score-label">SCORE</div>
      <div class="high-score-label">HI {{ state.highScore.toLocaleString() }}</div>
    </div>

    <!-- CENTRE: Combo + Level -->
    <div class="hud-section hud-centre">
      <div
        class="combo-value"
        :class="{ 'combo-active': state.combo >= 3, 'combo-hot': state.combo >= 8 }"
      >
        COMBO ×{{ state.combo }}
      </div>
      <div class="level-label">LEVEL {{ state.level }}</div>
    </div>

    <!-- RIGHT: Lives + Accuracy -->
    <div class="hud-section hud-right">
      <div class="lives-row">
        <span
          v-for="i in state.maxLives"
          :key="i"
          class="life-dot"
          :class="{ lost: i > state.lives }"
        >
          ●
        </span>
      </div>
      <div v-if="state.totalClicks > 0" class="accuracy-label">
        ACC {{ accuracy }}%
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 18px 28px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
  font-family: 'Courier New', monospace;
  user-select: none;
}

.hud-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

/* --- Score --- */
.score-value {
  font-size: 30px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 24px rgba(80, 140, 255, 0.45);
  letter-spacing: 1px;
}

.score-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 3px;
}

.high-score-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.2);
  letter-spacing: 2px;
  margin-top: 2px;
}

/* --- Combo --- */
.combo-value {
  font-size: 20px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.25);
  text-shadow: none;
  transition: all 0.15s ease;
}

.combo-active {
  color: #ffdd44;
  text-shadow: 0 0 18px rgba(255, 221, 68, 0.55);
  animation: comboPop 0.2s ease-out;
}

.combo-hot {
  color: #ff8844;
  text-shadow: 0 0 24px rgba(255, 136, 68, 0.7);
  font-size: 22px;
}

.level-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 2px;
  margin-top: 2px;
}

/* --- Lives --- */
.lives-row {
  display: flex;
  gap: 5px;
  justify-content: center;
}

.life-dot {
  font-size: 18px;
  color: #ff4466;
  text-shadow: 0 0 10px rgba(255, 68, 102, 0.55);
  transition: all 0.3s ease;
}

.life-dot.lost {
  color: rgba(255, 68, 102, 0.15);
  text-shadow: none;
}

.accuracy-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 2px;
  margin-top: 2px;
}

/* --- Animations --- */
@keyframes comboPop {
  0% {
    transform: scale(1.35);
  }
  100% {
    transform: scale(1);
  }
}
</style>

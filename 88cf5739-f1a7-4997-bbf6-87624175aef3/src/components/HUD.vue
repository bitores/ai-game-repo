<template>
  <div class="hud" v-if="gameState">
    <!-- Score -->
    <div class="score">✦ {{ gameState.score.toLocaleString() }}</div>

    <!-- Wave -->
    <div class="wave">第 {{ gameState.wave }} 波</div>

    <!-- Lives -->
    <div class="lives">
      <span v-for="i in gameState.lives" :key="i" class="life">◆</span>
    </div>

    <!-- Time Slow Energy Bar -->
    <div class="time-slow-bar">
      <div class="slow-icon">⟐</div>
      <div class="bar-bg">
        <div
          class="bar-fill"
          :class="{ active: gameState.timeSlowActive }"
          :style="{ width: pctEnergy + '%' }"
        ></div>
      </div>
    </div>

    <!-- Slow active indicator -->
    <transition name="fade">
      <div v-if="gameState.timeSlowActive" class="slow-indicator">
        时缓 · 激活
      </div>
    </transition>

    <!-- Controls hint -->
    <div class="controls-hint">
      <span>鼠标移动 · 瞄准</span>
      <span class="sep">|</span>
      <span>左键 · 射击</span>
      <span class="sep">|</span>
      <span><kbd>右键</kbd> / <kbd>Space</kbd> · 时缓</span>
    </div>

    <!-- Game Over -->
    <transition name="fade">
      <div v-if="gameState.gameOver" class="game-over-overlay" @click="handleRestart">
        <div class="game-over-box">
          <div class="go-title">幻境终结</div>
          <div class="go-score">最终分数<br /><span class="go-num">{{ gameState.score.toLocaleString() }}</span></div>
          <div class="go-wave">存活至 第 {{ gameState.wave }} 波</div>
          <div class="go-hint">点击重新挑战</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { inject, computed } from 'vue'
import { GameEngine } from '../game/engine.js'

const gameState = inject('gameState')

const pctEnergy = computed(() =>
  (gameState.timeSlowEnergy / gameState.timeSlowMaxEnergy) * 100
)

function handleRestart() {
  // restart is handled by the engine through click detection on canvas
}
</script>

<style scoped>
.hud {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
  color: #eef;
  user-select: none;
}

.score {
  position: absolute;
  top: 22px;
  left: 24px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 1px;
  text-shadow: 0 0 12px rgba(100, 200, 255, 0.4);
}

.wave {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 15px;
  opacity: 0.7;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(180, 100, 255, 0.4);
}

.lives {
  position: absolute;
  top: 22px;
  right: 24px;
  font-size: 20px;
  color: #ff5588;
  letter-spacing: 4px;
  text-shadow: 0 0 12px rgba(255, 68, 136, 0.5);
}

.life { display: inline-block; }

/* ---- Time Slow Bar ---- */
.time-slow-bar {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
}

.slow-icon {
  font-size: 18px;
  color: #55bbff;
  text-shadow: 0 0 8px rgba(80, 180, 255, 0.5);
}

.bar-bg {
  width: 220px;
  height: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(100, 180, 255, 0.2);
  border-radius: 5px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #3377ff, #55ccff, #88ddff);
  border-radius: 5px;
  transition: width 0.08s linear;
  box-shadow: 0 0 12px rgba(80, 180, 255, 0.25);
}

.bar-fill.active {
  box-shadow: 0 0 20px rgba(80, 220, 255, 0.5);
}

/* ---- Slow Indicator ---- */
.slow-indicator {
  position: absolute;
  top: 58px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 3px;
  color: #66ddff;
  text-shadow: 0 0 20px rgba(80, 220, 255, 0.6), 0 0 40px rgba(50, 100, 255, 0.3);
  animation: slowPulse 1.2s ease-in-out infinite;
}

@keyframes slowPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ---- Controls hint ---- */
.controls-hint {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  opacity: 0.35;
  letter-spacing: 0.5px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.controls-hint kbd {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 3px;
  padding: 1px 6px;
  font-family: inherit;
  font-size: 11px;
}

.sep { opacity: 0.4; }

/* ---- Game Over ---- */
.game-over-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 10, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  cursor: pointer;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.game-over-box {
  text-align: center;
  animation: goIn 0.6s ease-out;
}

@keyframes goIn {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.go-title {
  font-size: 52px;
  font-weight: 700;
  letter-spacing: 8px;
  color: #ff66aa;
  text-shadow: 0 0 40px rgba(255, 100, 170, 0.4), 0 0 80px rgba(255, 50, 150, 0.2);
  margin-bottom: 18px;
}

.go-score {
  font-size: 18px;
  color: #aaccff;
  margin-bottom: 10px;
  line-height: 1.8;
}

.go-num {
  font-size: 40px;
  font-weight: 700;
  color: #ffdd88;
  text-shadow: 0 0 20px rgba(255, 220, 100, 0.3);
}

.go-wave {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 32px;
}

.go-hint {
  font-size: 16px;
  color: rgba(255,255,255,0.5);
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.9; }
}

/* Transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <div class="hud" v-if="gameState">
    <!-- Score -->
    <div class="score">✦ {{ gameState.score.toLocaleString() }}</div>

    <!-- Wave -->
    <div class="wave" :class="{ 'boss-wave': gameState.isBossWave }">
      {{ gameState.isBossWave ? 'BOSS 战' : `第 ${gameState.wave} 波` }}
    </div>

    <!-- Lives -->
    <div class="lives">
      <span v-for="i in gameState.lives" :key="i" class="life">◆</span>
    </div>

    <!-- Shield charges -->
    <div class="shield" v-if="gameState.shieldCharges > 0">
      <span v-for="i in gameState.shieldCharges" :key="i" class="shield-charge">◈</span>
    </div>

    <!-- Level & XP Bar -->
    <div class="xp-section">
      <span class="level-badge">Lv.{{ gameState.level }}</span>
      <div class="xp-bar-bg">
        <div
          class="xp-bar-fill"
          :style="{ width: xpPercent + '%' }"
        ></div>
      </div>
      <span class="xp-text">{{ gameState.xp }}/{{ gameState.xpToNext }}</span>
    </div>

    <!-- Player Upgrades Summary -->
    <div class="upgrades-summary" v-if="hasUpgrades">
      <span
        v-for="u in activeUpgrades"
        :key="u.id"
        class="upgrade-tag"
        :title="u.name + ' Lv.' + u.level"
      >
        {{ u.icon }}{{ u.level }}
      </span>
    </div>

    <!-- Boss HP Bar -->
    <transition name="fade">
      <div v-if="gameState.bossActive && gameState.bossMaxHp > 0" class="boss-hp-section">
        <div class="boss-hp-label">BOSS</div>
        <div class="boss-hp-bg">
          <div
            class="boss-hp-fill"
            :class="bossHpClass"
            :style="{ width: bossHpPercent + '%' }"
          ></div>
        </div>
        <div class="boss-hp-text">{{ Math.ceil(gameState.bossHp) }}/{{ gameState.bossMaxHp }}</div>
      </div>
    </transition>

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

    <!-- Upgrade Menu -->
    <transition name="fade">
      <div v-if="gameState.isUpgrading" class="upgrade-overlay">
        <div class="upgrade-box">
          <div class="upgrade-title">升级选择</div>
          <div class="upgrade-subtitle">
            等级 {{ gameState.level }} — 点击选择一项升级
          </div>
          <div class="upgrade-cards">
            <div
              v-for="(opt, i) in gameState.upgradeOptions"
              :key="opt.id"
              class="upgrade-card"
              @click="handleUpgrade(i)"
            >
              <div class="card-icon">{{ opt.icon }}</div>
              <div class="card-name">{{ opt.name }}</div>
              <div class="card-desc">{{ opt.desc }}</div>
              <div class="card-level">Lv.{{ opt.currentLevel + 1 }}/{{ opt.maxLevel }}</div>
            </div>
          </div>
          <div class="upgrade-hint">点击卡片选择升级</div>
        </div>
      </div>
    </transition>

    <!-- Game Over -->
    <transition name="fade">
      <div v-if="gameState.gameOver" class="game-over-overlay" @click="handleRestart">
        <div class="game-over-box">
          <div class="go-title">幻境终结</div>
          <div class="go-score">最终分数<br /><span class="go-num">{{ gameState.score.toLocaleString() }}</span></div>
          <div class="go-wave">存活至 第 {{ gameState.wave }} 波 · 等级 {{ gameState.level }}</div>
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

const xpPercent = computed(() =>
  gameState.xpToNext > 0 ? (gameState.xp / gameState.xpToNext) * 100 : 0
)

const bossHpPercent = computed(() =>
  gameState.bossMaxHp > 0 ? (gameState.bossHp / gameState.bossMaxHp) * 100 : 0
)

const bossHpClass = computed(() => {
  const pct = bossHpPercent.value
  if (pct > 60) return 'hp-high'
  if (pct > 30) return 'hp-mid'
  return 'hp-low'
})

const hasUpgrades = computed(() =>
  Object.values(gameState.playerUpgrades).some(v => v > 0)
)

const activeUpgrades = computed(() => {
  const map = {
    fireRate: { icon: '⚡', name: '攻击速度' },
    damage: { icon: '🔥', name: '火力增强' },
    multiShot: { icon: '✦', name: '多重射击' },
    moveSpeed: { icon: '➤', name: '机动强化' },
    shield: { icon: '🛡', name: '能量护盾' },
    bulletSpeed: { icon: '▶', name: '弹速提升' },
  }
  return Object.entries(gameState.playerUpgrades)
    .filter(([, v]) => v > 0)
    .map(([id, level]) => ({ id, level, ...map[id] }))
})

function handleUpgrade(index) {
  // We need to communicate the selection back to the engine
  // via a small hack: set a property on gameState that engine checks
  gameState.selectedUpgradeIndex = index
}

function handleRestart() {
  // handled by engine
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

.wave.boss-wave {
  color: #ff6666;
  opacity: 1;
  font-weight: 700;
  text-shadow: 0 0 20px rgba(255, 50, 50, 0.6);
  animation: bossWavePulse 1.5s ease-in-out infinite;
}

@keyframes bossWavePulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
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

/* Shield */
.shield {
  position: absolute;
  top: 46px;
  right: 24px;
  font-size: 18px;
  color: #44ddff;
  letter-spacing: 4px;
  text-shadow: 0 0 12px rgba(68, 200, 255, 0.5);
}
.shield-charge { display: inline-block; }

/* XP Section */
.xp-section {
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 28px;
}

.level-badge {
  font-size: 12px;
  font-weight: 700;
  background: rgba(100, 200, 255, 0.15);
  border: 1px solid rgba(100, 200, 255, 0.25);
  border-radius: 4px;
  padding: 1px 7px;
  color: #88ddff;
}

.xp-bar-bg {
  width: 120px;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(100, 255, 150, 0.15);
  border-radius: 3px;
  overflow: hidden;
}

.xp-bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #44cc66, #66ff88);
  border-radius: 3px;
  transition: width 0.1s linear;
  box-shadow: 0 0 8px rgba(100, 255, 150, 0.25);
}

.xp-text {
  font-size: 11px;
  opacity: 0.5;
  min-width: 40px;
}

/* Upgrades Summary */
.upgrades-summary {
  position: absolute;
  top: 50px;
  left: 24px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 300px;
}

.upgrade-tag {
  font-size: 11px;
  background: rgba(100, 200, 255, 0.08);
  border: 1px solid rgba(100, 200, 255, 0.15);
  border-radius: 4px;
  padding: 1px 6px;
  opacity: 0.6;
  cursor: default;
}

/* Boss HP Bar */
.boss-hp-section {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
}

.boss-hp-label {
  font-size: 13px;
  font-weight: 700;
  color: #ff6666;
  text-shadow: 0 0 10px rgba(255, 50, 50, 0.4);
  letter-spacing: 2px;
}

.boss-hp-bg {
  width: 280px;
  height: 12px;
  background: rgba(255, 0, 0, 0.08);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 6px;
  overflow: hidden;
}

.boss-hp-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.08s linear;
}

.boss-hp-fill.hp-high {
  background: linear-gradient(90deg, #66cc44, #88ff66);
  box-shadow: 0 0 12px rgba(100, 255, 100, 0.3);
}

.boss-hp-fill.hp-mid {
  background: linear-gradient(90deg, #ddaa44, #ffcc66);
  box-shadow: 0 0 12px rgba(255, 200, 80, 0.3);
}

.boss-hp-fill.hp-low {
  background: linear-gradient(90deg, #dd4444, #ff6666);
  box-shadow: 0 0 16px rgba(255, 50, 50, 0.4);
}

.boss-hp-text {
  font-size: 12px;
  opacity: 0.6;
  min-width: 60px;
  text-align: right;
}

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

/* ---- Upgrade Overlay ---- */
.upgrade-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 10, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 10;
}

.upgrade-box {
  text-align: center;
  animation: goIn 0.5s ease-out;
}

.upgrade-title {
  font-size: 42px;
  font-weight: 700;
  letter-spacing: 6px;
  color: #88ddff;
  text-shadow: 0 0 40px rgba(100, 200, 255, 0.3);
  margin-bottom: 8px;
}

.upgrade-subtitle {
  font-size: 16px;
  color: rgba(255,255,255,0.4);
  margin-bottom: 40px;
}

.upgrade-cards {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-bottom: 30px;
}

.upgrade-card {
  width: 190px;
  height: 170px;
  background: rgba(10, 20, 40, 0.85);
  border: 1.5px solid rgba(100, 200, 255, 0.25);
  border-radius: 14px;
  cursor: pointer;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 0 20px rgba(100, 200, 255, 0.05);
}

.upgrade-card:hover {
  border-color: rgba(100, 200, 255, 0.6);
  background: rgba(20, 40, 80, 0.9);
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(100, 200, 255, 0.15);
}

.card-icon {
  font-size: 40px;
  line-height: 1;
}

.card-name {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
}

.card-desc {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
}

.card-level {
  font-size: 12px;
  color: rgba(255,255,255,0.25);
}

.upgrade-hint {
  font-size: 14px;
  color: rgba(255,255,255,0.3);
  animation: pulse 1.6s ease-in-out infinite;
}

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

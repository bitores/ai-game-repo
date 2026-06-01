<script setup>
import { computed } from 'vue'
import { MAX_REWIND_ENERGY } from '../game/constants.js'

const props = defineProps({
  gameState: String,
  score: Number,
  collectedFragments: Number,
  totalFragments: Number,
  rewindEnergy: Number,
  isRewinding: Boolean,
  level: Number
})

const rewindPct = computed(() => (props.rewindEnergy / MAX_REWIND_ENERGY) * 100)
const showControls = computed(() => props.gameState === 'playing' || props.gameState === 'rewinding')
</script>

<template>
  <div class="hud">
    <!-- Top bar -->
    <div class="hud-top">
      <div class="hud-level">
        <span class="hud-label">STAGE</span>
        <span class="hud-value">L{{ level }}</span>
      </div>

      <div class="hud-fragments">
        <span class="hud-label">DATA FRAGMENTS</span>
        <span class="hud-value" :class="{ complete: collectedFragments >= totalFragments && totalFragments > 0 }">
          ${{ collectedFragments }} / {{ totalFragments }}
        </span>
        <span v-if="collectedFragments >= totalFragments && totalFragments > 0" class="hud-exit-hint">
          &gt; find_exit_portal();
        </span>
      </div>

      <div class="hud-score">
        <span class="hud-label">SCORE</span>
        <span class="hud-value">{{ score }}</span>
      </div>
    </div>

    <!-- Rewind energy bar (git rewind) -->
    <div class="hud-rewind-bar" v-if="showControls">
      <div class="rewind-bar-container">
        <div
          class="rewind-bar-fill"
          :class="{ active: isRewinding, low: rewindPct < 20 }"
          :style="{ width: rewindPct + '%' }"
        ></div>
      </div>
      <span class="rewind-label">
        {{ isRewinding ? '⟳ git rewind...' : '⟳ git rewind' }}
      </span>
    </div>

    <!-- Mobile controls -->
    <div class="mobile-controls" v-if="showControls">
      <div class="mobile-dpad">
        <button class="mbtn mbtn-left" data-key="left">&lt;</button>
        <button class="mbtn mbtn-right" data-key="right">&gt;</button>
      </div>
      <div class="mobile-actions">
        <button class="mbtn mbtn-jump" data-key="jump">^</button>
        <button class="mbtn mbtn-rewind" data-key="rewind">⟳</button>
      </div>
    </div>

    <!-- Start overlay -->
    <div class="hud-overlay menu-overlay" v-if="gameState === 'menu'">
      <div class="overlay-content">
        <h1 class="game-title">代码秘境</h1>
        <p class="game-subtitle">CODE REALM</p>
        <div class="game-desc">
          <p>操控代码角色在数据世界中冒险</p>
          <p>在响应式平台间跳跃穿梭</p>
          <p>收集数据碎片以完成关卡</p>
        </div>
        <div class="game-controls-hint">
          <p><kbd>A</kbd><kbd>D</kbd> or <kbd>←</kbd><kbd>→</kbd> Move</p>
          <p><kbd>W</kbd><kbd>Space</kbd> Jump</p>
          <p><kbd>Shift</kbd><kbd>Z</kbd> Git Rewind</p>
        </div>
        <button class="start-btn" @click="$emit('start')">
          $ npm start
        </button>
        <p class="press-hint">Press ENTER to start</p>
      </div>
    </div>

    <!-- Level complete overlay -->
    <div class="hud-overlay" v-if="gameState === 'levelComplete'">
      <div class="overlay-content">
        <h1 class="complete-title">STAGE CLEARED!</h1>
        <div class="complete-stats">
          <p>Score: <strong class="score-val">{{ score }}</strong></p>
          <p>Data: {{ collectedFragments }} / {{ totalFragments }} fragments</p>
        </div>
        <button class="start-btn" @click="$emit('nextLevel')">
          $ deploy_next_stage
        </button>
      </div>
    </div>

    <!-- Dying overlay -->
    <div class="hud-overlay dying-overlay" v-if="gameState === 'dying'">
      <div class="overlay-content">
        <h1 class="dying-title">SEGFAULT</h1>
        <p class="dying-hint">git checkout -- .</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-family: 'Courier New', 'Consolas', monospace;
  color: #fff;
  user-select: none;
}

.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 20px;
  pointer-events: auto;
}

.hud-label {
  display: block;
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(0, 232, 118, 0.5);
  margin-bottom: 2px;
}

.hud-value {
  font-size: 20px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0,232,118,0.3);
}

.hud-value.complete {
  color: #00ffc8;
  text-shadow: 0 0 15px rgba(0,255,200,0.5);
  animation: pulse-glow 1s ease-in-out infinite;
}

.hud-exit-hint {
  display: block;
  font-size: 11px;
  color: #00e876;
  margin-top: 4px;
  animation: pulse-glow 1.5s ease-in-out infinite;
}

.hud-rewind-bar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}

.rewind-bar-container {
  width: 200px;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(184,122,248,0.3);
  border-radius: 4px;
  overflow: hidden;
}

.rewind-bar-fill {
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, #8844cc, #b87af8, #cc88ff);
  border-radius: 4px;
  transition: width 0.1s ease;
}

.rewind-bar-fill.active {
  background: linear-gradient(90deg, #b87af8, #cc88ff, #ff88ff);
  box-shadow: 0 0 10px rgba(184,122,248,0.5);
}

.rewind-bar-fill.low {
  background: #ff4444;
}

.rewind-label {
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(184,122,248,0.8);
  min-width: 90px;
}

/* Mobile controls */
.mobile-controls {
  display: none;
  position: absolute;
  bottom: 60px;
  left: 0;
  right: 0;
  padding: 0 20px;
  justify-content: space-between;
  align-items: flex-end;
  pointer-events: none;
}

.mobile-dpad, .mobile-actions {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.mbtn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid rgba(0,232,118,0.3);
  background: rgba(0,232,118,0.05);
  color: rgba(0,232,118,0.7);
  font-size: 20px;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  touch-action: none;
}

.mbtn:active {
  background: rgba(0,232,118,0.15);
  border-color: rgba(0,232,118,0.5);
}

.mbtn-rewind {
  border-color: rgba(184,122,248,0.4);
  background: rgba(184,122,248,0.1);
}

.mbtn-jump {
  border-color: rgba(0,212,255,0.4);
  background: rgba(0,212,255,0.1);
}

/* Overlays */
.hud-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 5, 20, 0.88);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: auto;
}

.overlay-content {
  text-align: center;
  max-width: 400px;
  padding: 20px;
}

.game-title {
  font-size: 48px;
  font-weight: bold;
  background: linear-gradient(135deg, #00e876, #00d4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
  letter-spacing: 8px;
}

.game-subtitle {
  font-size: 16px;
  letter-spacing: 8px;
  color: rgba(0,232,118,0.4);
  margin-bottom: 30px;
}

.game-desc {
  margin-bottom: 24px;
  line-height: 1.8;
  color: rgba(0,232,118,0.5);
  font-size: 14px;
}

.game-controls-hint {
  margin-bottom: 30px;
  line-height: 2;
  font-size: 13px;
  color: rgba(0,232,118,0.4);
}

kbd {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 2px;
  background: rgba(0,232,118,0.08);
  border: 1px solid rgba(0,232,118,0.2);
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
  color: rgba(0,232,118,0.7);
}

.start-btn {
  display: inline-block;
  padding: 14px 40px;
  font-family: inherit;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
  color: #fff;
  background: linear-gradient(135deg, #00aa44, #0088cc);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.2s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,170,68,0.4);
}

.start-btn:active {
  transform: translateY(0);
}

.press-hint {
  margin-top: 16px;
  font-size: 12px;
  color: rgba(0,232,118,0.3);
  animation: pulse 2s ease-in-out infinite;
}

.complete-title {
  font-size: 36px;
  color: #00e876;
  text-shadow: 0 0 20px rgba(0,232,118,0.3);
  margin-bottom: 20px;
  letter-spacing: 4px;
}

.complete-stats {
  font-size: 16px;
  color: rgba(0,232,118,0.5);
  line-height: 2;
  margin-bottom: 30px;
}

.score-val {
  color: #00d4ff;
}

.dying-title {
  font-size: 36px;
  color: #ff4444;
  text-shadow: 0 0 20px rgba(255,68,68,0.3);
  margin-bottom: 10px;
}

.dying-hint {
  color: rgba(184,122,248,0.5);
  font-size: 14px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; text-shadow: 0 0 20px rgba(0,232,118,0.6); }
}

/* Responsive: show mobile controls on touch devices */
@media (hover: none) and (pointer: coarse) {
  .mobile-controls {
    display: flex !important;
  }
  .game-controls-hint {
    display: none;
  }
}

@media (max-width: 500px) {
  .game-title {
    font-size: 32px;
    letter-spacing: 4px;
  }
  .hud-value {
    font-size: 16px;
  }
  .hud-top {
    padding: 8px 12px;
  }
  .complete-title {
    font-size: 28px;
  }
}
</style>

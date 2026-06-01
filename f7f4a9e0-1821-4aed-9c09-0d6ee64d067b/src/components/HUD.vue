<script setup>
import { computed } from 'vue'

const props = defineProps({
  gameState: { type: String, default: 'menu' },
  gold: { type: Number, default: 200 },
  lives: { type: Number, default: 10 },
  maxLives: { type: Number, default: 10 },
  score: { type: Number, default: 0 },
  wave: { type: Number, default: 0 },
  totalWaves: { type: Number, default: 10 },
  waveActive: { type: Boolean, default: false },
  selectedTowerType: { type: String, default: 'BASIC' },
  selectedTower: { type: Object, default: null },
  remaining: { type: Number, default: 0 },
  killCount: { type: Number, default: 0 }
})

const emit = defineEmits(['start', 'restart', 'selectTower', 'nextWave', 'upgradeTower', 'fusionTower'])

const towerTypes = [
  { key: 'BASIC', name: '基本晶石', cost: 50, color: '#00ffff', icon: '◆' },
  { key: 'ICE', name: '寒冰晶石', cost: 80, color: '#88ccff', icon: '❄' },
  { key: 'FIRE', name: '烈焰晶石', cost: 100, color: '#ff6600', icon: '🔥' },
  { key: 'LIGHTNING', name: '闪电晶石', cost: 120, color: '#ffdd00', icon: '⚡' }
]

const canAfford = computed(() => {
  const type = towerTypes.find(t => t.key === props.selectedTowerType)
  return type ? props.gold >= type.cost : false
})

const nextWaveLabel = computed(() => {
  if (props.waveActive) return `波次进行中... (剩余${props.remaining})`
  if (props.wave === 0) return '开始第一波 (空格)'
  if (props.wave >= props.totalWaves) return '所有波次已完成!'
  return `开始第 ${props.wave + 1} 波 (空格)`
})
</script>

<template>
  <div class="hud">
    <!-- Top bar -->
    <div class="top-bar">
      <div class="top-left">
        <span class="stat gold">💰 {{ gold }}</span>
        <span class="stat score">⭐ {{ score }}</span>
        <span class="stat kills">💀 {{ killCount }}</span>
      </div>
      <div class="top-center">
        <span class="wave-info">
          波次 {{ wave }}/{{ totalWaves }}
          <span v-if="waveActive" class="wave-badge active">进行中</span>
          <span v-else-if="wave > 0 && wave <= totalWaves" class="wave-badge ready">准备</span>
        </span>
      </div>
      <div class="top-right">
        <span class="stat lives">
          <span v-for="i in maxLives" :key="i" class="heart" :class="{ lost: i > lives }">♥</span>
        </span>
      </div>
    </div>

    <!-- Tower selection bar (bottom) -->
    <div class="bottom-bar">
      <div class="tower-buttons">
        <button
          v-for="t in towerTypes"
          :key="t.key"
          class="tower-btn"
          :class="{ active: selectedTowerType === t.key, unaffordable: gold < t.cost }"
          :style="{ borderColor: selectedTowerType === t.key ? t.color : 'transparent' }"
          @click="emit('selectTower', t.key)"
        >
          <span class="tower-icon" :style="{ color: t.color }">{{ t.icon }}</span>
          <span class="tower-name">{{ t.name }}</span>
          <span class="tower-cost" :class="{ expensive: gold < t.cost }">💰{{ t.cost }}</span>
        </button>
      </div>

      <div class="action-buttons">
        <button
          class="btn btn-wave"
          :class="{ disabled: waveActive || wave >= totalWaves }"
          @click="emit('nextWave')"
        >
          {{ nextWaveLabel }}
        </button>
      </div>
    </div>

    <!-- Selected tower info panel -->
    <div v-if="selectedTower && gameState === 'playing'" class="info-panel">
      <div class="info-header">
        <span class="info-name">{{ selectedTower.name }}</span>
      </div>
      <div class="info-stats">
        <div>伤害: {{ selectedTower.damage }}</div>
        <div>范围: {{ selectedTower.range }}</div>
      </div>
      <div class="info-actions">
        <button
          v-if="selectedTower.canUpgrade"
          class="btn btn-sm"
          @click="emit('upgradeTower')"
        >
          升级 💰{{ selectedTower.upgradeCost }}
        </button>
        <button
          v-if="selectedTower.level < 3"
          class="btn btn-sm btn-fusion"
          @click="emit('fusionTower')"
        >
          融合 💰50
        </button>
      </div>
    </div>

    <!-- Menu overlay -->
    <div v-if="gameState === 'menu'" class="overlay">
      <div class="panel">
        <h1>💎 晶石塔防</h1>
        <p class="subtitle">Crystal Tower Defense</p>
        <div class="desc">
          <p>在网格棋盘上布置晶石塔</p>
          <p>抵御波次怪物的进攻</p>
          <p>合成升级塔防，策略布阵保卫核心</p>
        </div>
        <button class="btn btn-start" @click="emit('start')">开始游戏</button>
        <div class="tips">
          <p>点击网格放置晶石塔</p>
          <p>1-4 选择塔类型 | 空格 开始波次</p>
          <p>点击已有晶石塔查看升级/融合</p>
          <p>F 融合相邻同型同级的晶石塔</p>
        </div>
      </div>
    </div>

    <!-- Game over overlay -->
    <div v-if="gameState === 'gameover'" class="overlay">
      <div class="panel">
        <h1>💀 核心被摧毁!</h1>
        <p class="final-score">得分: {{ score }}</p>
        <p class="final-stat">击杀: {{ killCount }} | 到达波次: {{ wave }}/{{ totalWaves }}</p>
        <button class="btn btn-start" @click="emit('restart')">重新开始</button>
      </div>
    </div>

    <!-- Victory overlay -->
    <div v-if="gameState === 'complete' || gameState === 'won'" class="overlay">
      <div class="panel victory">
        <h1>🎉 胜利!</h1>
        <p class="final-score">得分: {{ score }}</p>
        <p class="final-stat">击杀: {{ killCount }} | 通关波次: {{ wave }}/{{ totalWaves }}</p>
        <button class="btn btn-start" @click="emit('restart')">再来一局</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  font-family: 'Courier New', monospace;
}

/* Top bar */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%);
  pointer-events: auto;
  z-index: 20;
}

.top-left, .top-center, .top-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat {
  color: #ccc;
  font-size: 14px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
}

.gold { color: #ffd700; }
.score { color: #aaaaff; }
.kills { color: #ff8888; }

.wave-info {
  color: #aaccff;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
}

.wave-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
}
.wave-badge.active {
  background: #ff4444;
  color: #fff;
}
.wave-badge.ready {
  background: #44aa44;
  color: #fff;
}

.heart { color: #ff4757; margin-left: 1px; font-size: 14px; }
.heart.lost { color: #444; }

/* Bottom bar */
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%);
  pointer-events: auto;
  z-index: 20;
  flex-wrap: wrap;
}

.tower-buttons {
  display: flex;
  gap: 6px;
  flex: 1;
}

.tower-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  background: rgba(20, 20, 50, 0.9);
  border: 2px solid transparent;
  border-radius: 8px;
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 70px;
}

.tower-btn:hover {
  background: rgba(40, 40, 80, 0.9);
}

.tower-btn.active {
  background: rgba(0, 50, 80, 0.9);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.tower-btn.unaffordable {
  opacity: 0.5;
}

.tower-icon {
  font-size: 20px;
}

.tower-name {
  font-size: 10px;
  color: #aaa;
}

.tower-cost {
  font-size: 10px;
  color: #ffd700;
}

.tower-cost.expensive {
  color: #ff4444;
}

/* Action buttons */
.action-buttons {
  display: flex;
  gap: 6px;
}

.btn {
  padding: 8px 16px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  pointer-events: auto;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-wave {
  background: #2a5a2a;
  color: #88ff88;
  border: 1px solid #44aa44;
}

.btn-wave:hover {
  background: #3a7a3a;
}

.btn-wave.disabled {
  background: #333;
  color: #666;
  border-color: #444;
  cursor: default;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 11px;
  background: #2a3a5a;
  color: #88aaff;
  border: 1px solid #4466aa;
  margin-right: 4px;
}

.btn-sm:hover {
  background: #3a4a7a;
}

.btn-fusion {
  background: #3a2a5a;
  color: #cc88ff;
  border-color: #8844cc;
}

.btn-fusion:hover {
  background: #4a3a7a;
}

/* Info panel */
.info-panel {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(10, 10, 40, 0.9);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  padding: 12px;
  min-width: 130px;
  pointer-events: auto;
  z-index: 15;
}

.info-header {
  margin-bottom: 8px;
}

.info-name {
  color: #00ffff;
  font-size: 13px;
  font-weight: bold;
}

.info-stats {
  font-size: 11px;
  color: #aaa;
  margin-bottom: 8px;
  line-height: 1.6;
}

.info-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Overlays */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.65);
  pointer-events: auto;
  z-index: 30;
}

.panel {
  text-align: center;
  color: #fff;
  padding: 36px 48px;
  background: rgba(10, 10, 40, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(100, 100, 200, 0.2);
  backdrop-filter: blur(10px);
  max-width: 420px;
}

.panel h1 {
  font-size: 28px;
  margin-bottom: 8px;
  color: #00ffff;
}

.subtitle {
  color: #8888cc;
  font-size: 14px;
  margin-bottom: 20px;
}

.desc {
  font-size: 13px;
  color: #aaa;
  line-height: 1.8;
  margin-bottom: 20px;
}

.final-score {
  font-size: 22px;
  margin: 12px 0;
  color: #ffd700;
}

.final-stat {
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
}

.btn-start {
  padding: 12px 48px;
  font-size: 18px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #6c5ce7, #a855f7);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Courier New', monospace;
}

.btn-start:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(108, 92, 231, 0.5);
}

.tips {
  margin-top: 20px;
  font-size: 11px;
  color: #555;
  line-height: 1.8;
}

.panel.victory h1 {
  color: #ffd700;
}
</style>

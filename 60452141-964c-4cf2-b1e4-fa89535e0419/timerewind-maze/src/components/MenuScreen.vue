<script setup>
import { onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['start'])

const levels = [
  { id: 1, name: '齿轮回廊', desc: '学习推箱与时间回溯的基础操作' },
  { id: 2, name: '蒸汽长廊', desc: '利用时间暂停穿越复杂地形' },
  { id: 3, name: '时空枢纽', desc: '在大型迷宫中规划最优路线' }
]

let _enterHandler = null

onMounted(() => {
  _enterHandler = (e) => {
    if (e.key === 'Enter') {
      emit('start', 0)
    }
  }
  window.addEventListener('keydown', _enterHandler)
})

onUnmounted(() => {
  if (_enterHandler) window.removeEventListener('keydown', _enterHandler)
})
</script>

<template>
  <div class="menu-screen">
    <!-- Background decoration -->
    <div class="menu-bg">
      <div class="gear gear-1"></div>
      <div class="gear gear-2"></div>
      <div class="gear gear-3"></div>
    </div>

    <div class="menu-content">
      <!-- Title -->
      <div class="title-block">
        <div class="title-decoration">⚙ ⚙ ⚙</div>
        <h1 class="game-title">时光回溯迷宫</h1>
        <p class="subtitle">Time Rewind Maze</p>
        <div class="title-line"></div>
      </div>

      <!-- Description -->
      <div class="description">
        <p>在蒸汽朋克风格的钟表迷宫中，将齿轮箱推到对应的能量基座上。</p>
        <p>每个箱子都会记录过去的位置并自动回溯，利用<span class="highlight">空格键</span>暂停时间流动，让箱子在回溯中恰好落入目标。</p>
      </div>

      <!-- Level select -->
      <div class="level-select">
        <button
          v-for="level in levels"
          :key="level.id"
          class="level-btn"
          @click="emit('start', level.id - 1)"
        >
          <span class="level-num">第{{ level.id }}关</span>
          <span class="level-name">{{ level.name }}</span>
          <span class="level-desc">{{ level.desc }}</span>
        </button>
      </div>

      <!-- Controls info -->
      <div class="controls-info">
        <div class="control-row">
          <span class="key-group">
            <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>
          </span>
          <span class="control-label">移动角色</span>
        </div>
        <div class="control-row">
          <span class="key-group"><kbd>空格</kbd></span>
          <span class="control-label">暂停 / 恢复时间</span>
        </div>
      </div>

      <div class="start-hint">按 Enter 快速开始第一关</div>
    </div>
  </div>
</template>

<style scoped>
.menu-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #0d0705 0%, #1a0f0a 50%, #0d0705 100%);
}

.menu-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.gear {
  position: absolute;
  border: 2px solid rgba(212, 165, 116, 0.08);
  border-radius: 50%;
  animation: spin linear infinite;
}
.gear::before,
.gear::after {
  content: '';
  position: absolute;
  background: rgba(212, 165, 116, 0.05);
}

.gear-1 {
  width: 300px;
  height: 300px;
  top: -50px;
  left: -80px;
  animation-duration: 30s;
}
.gear-2 {
  width: 200px;
  height: 200px;
  bottom: 60px;
  right: -40px;
  animation-duration: 20s;
  animation-direction: reverse;
}
.gear-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  right: 15%;
  animation-duration: 25s;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.menu-content {
  text-align: center;
  z-index: 1;
  max-width: 520px;
  padding: 20px;
}

.title-block {
  margin-bottom: 24px;
}

.title-decoration {
  font-size: 20px;
  color: rgba(212, 165, 116, 0.4);
  letter-spacing: 12px;
  margin-bottom: 8px;
}

.game-title {
  font-size: 36px;
  font-weight: bold;
  color: #d4a574;
  text-shadow: 0 0 20px rgba(212, 165, 116, 0.3), 0 2px 4px rgba(0,0,0,0.5);
  letter-spacing: 6px;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 14px;
  color: rgba(212, 165, 116, 0.5);
  letter-spacing: 3px;
  text-transform: uppercase;
}

.title-line {
  width: 120px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #d4a574, transparent);
  margin: 16px auto 0;
}

.description {
  font-size: 13px;
  color: rgba(212, 165, 116, 0.7);
  line-height: 1.8;
  margin-bottom: 28px;
  padding: 0 10px;
}

.highlight {
  color: #ffd54f;
  font-weight: bold;
}

.level-select {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}

.level-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(212, 165, 116, 0.06);
  border: 1px solid rgba(212, 165, 116, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-family: inherit;
  color: #d4a574;
}

.level-btn:hover {
  background: rgba(212, 165, 116, 0.12);
  border-color: #d4a574;
  transform: translateX(4px);
}

.level-num {
  font-size: 14px;
  font-weight: bold;
  color: rgba(212, 165, 116, 0.6);
  min-width: 50px;
}

.level-name {
  font-size: 15px;
  font-weight: bold;
  color: #d4a574;
  min-width: 80px;
}

.level-desc {
  font-size: 12px;
  color: rgba(212, 165, 116, 0.5);
}

.controls-info {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(212, 165, 116, 0.6);
}

.key-group {
  display: flex;
  gap: 3px;
}

kbd {
  display: inline-block;
  padding: 2px 7px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: #d4a574;
  background: rgba(212, 165, 116, 0.1);
  border: 1px solid rgba(212, 165, 116, 0.25);
  border-radius: 3px;
  line-height: 1.4;
}

.start-hint {
  font-size: 12px;
  color: rgba(212, 165, 116, 0.35);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.7; }
}
</style>

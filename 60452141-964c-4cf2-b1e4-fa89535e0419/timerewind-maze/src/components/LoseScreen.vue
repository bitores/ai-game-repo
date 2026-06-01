<script setup>
const props = defineProps({
  reason: { type: String, default: 'time' }
})

const emit = defineEmits(['retry', 'menu'])

const messages = {
  time: {
    title: '时间耗尽',
    subtitle: "Time's Up",
    desc: '时空能量已经枯竭，\n你的身影在时间裂缝中消散...'
  },
  fissure: {
    title: '被时间裂缝吞噬',
    subtitle: 'Devoured by Time Fissure',
    desc: '你触碰了不稳定的时空裂隙，\n被卷入永恒的混沌之流...'
  },
  player_fissure: {
    title: '被时间裂缝吞噬',
    subtitle: 'Devoured by Time Fissure',
    desc: '你的脚踏入了时间裂缝，\n被卷入永恒的混沌之流...'
  },
  crate_fissure: {
    title: '齿轮箱坠入裂缝',
    subtitle: 'Crate Lost to the Void',
    desc: '齿轮箱跌入了时间裂缝，\n能量失衡，迷宫崩塌在即...'
  }
}

const msg = messages[props.reason] || messages.fissure
</script>

<template>
  <div class="lose-screen">
    <div class="fissure-bg"></div>
    <div class="lose-content">
      <div class="lose-icon">✧</div>
      <h1 class="lose-title">{{ msg.title }}</h1>
      <p class="lose-subtitle">{{ msg.subtitle }}</p>
      <div class="lose-line"></div>
      <p class="lose-desc">{{ msg.desc }}</p>

      <div class="lose-buttons">
        <button class="btn btn-primary" @click="emit('retry')">
          ↻ 重新挑战
        </button>
        <button class="btn btn-secondary" @click="emit('menu')">
          ⌂ 返回菜单
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lose-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0d0705 0%, #1a0a0a 30%, #2d0a0a 60%, #0d0705 100%);
  position: relative;
  overflow: hidden;
}

.fissure-bg {
  position: absolute;
  width: 350px;
  height: 350px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(156, 39, 176, 0.12) 0%, rgba(231, 76, 60, 0.06) 30%, transparent 60%);
  border-radius: 50%;
  animation: fissurePulse 2s ease-in-out infinite;
}

@keyframes fissurePulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
  50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
}

.lose-content {
  text-align: center;
  z-index: 1;
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.lose-icon {
  font-size: 42px;
  color: #e74c3c;
  text-shadow: 0 0 30px rgba(231, 76, 60, 0.4);
  margin-bottom: 16px;
  animation: iconShake 0.5s ease-in-out infinite alternate;
}

@keyframes iconShake {
  from { transform: rotate(-5deg); }
  to { transform: rotate(5deg); }
}

.lose-title {
  font-size: 30px;
  color: #e74c3c;
  text-shadow: 0 0 20px rgba(231, 76, 60, 0.3);
  margin-bottom: 4px;
  letter-spacing: 4px;
}

.lose-subtitle {
  font-size: 13px;
  color: rgba(212, 165, 116, 0.4);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.lose-line {
  width: 80px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e74c3c, transparent);
  margin: 0 auto 20px;
}

.lose-desc {
  font-size: 14px;
  color: rgba(212, 165, 116, 0.6);
  line-height: 2;
  margin-bottom: 32px;
  white-space: pre-line;
}

.lose-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 12px 28px;
  font-size: 14px;
  font-family: inherit;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
}

.btn-primary {
  color: #0d0705;
  background: #d4a574;
  border-color: #d4a574;
}
.btn-primary:hover {
  background: #e0b888;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3);
}

.btn-secondary {
  color: #d4a574;
  background: transparent;
  border-color: rgba(212, 165, 116, 0.3);
}
.btn-secondary:hover {
  border-color: #d4a574;
  background: rgba(212, 165, 116, 0.1);
  transform: translateY(-2px);
}
</style>

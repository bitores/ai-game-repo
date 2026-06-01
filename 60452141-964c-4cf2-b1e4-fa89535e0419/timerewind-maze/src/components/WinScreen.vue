<script setup>
const emit = defineEmits(['menu', 'restart'])
</script>

<template>
  <div class="win-screen">
    <div class="portal-bg"></div>

    <div class="win-content">
      <div class="win-icon">✦</div>
      <h1 class="win-title">传送门已激活！</h1>
      <p class="win-subtitle">Portal Activated</p>
      <div class="win-line"></div>
      <p class="win-desc">
        所有齿轮箱已就位，<br>
        时间能量涌入传送门，<br>
        时空通道已稳定开启！
      </p>

      <div class="win-buttons">
        <button class="btn btn-primary" @click="emit('restart')">
          🔄 重新开始
        </button>
        <button class="btn btn-secondary" @click="emit('menu')">
          ⌂ 返回菜单
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.win-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0d0705 0%, #1a2e1a 30%, #0d3515 60%, #0d0705 100%);
  position: relative;
  overflow: hidden;
}

.portal-bg {
  position: absolute;
  width: 400px;
  height: 400px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, rgba(255, 213, 79, 0.05) 30%, transparent 60%);
  border-radius: 50%;
  animation: portalPulse 3s ease-in-out infinite;
}

@keyframes portalPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
}

.win-content {
  text-align: center;
  z-index: 1;
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.win-icon {
  font-size: 48px;
  color: #ffd54f;
  text-shadow: 0 0 30px rgba(255, 213, 79, 0.5);
  margin-bottom: 16px;
  animation: iconSpin 4s linear infinite;
}

@keyframes iconSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.win-title {
  font-size: 32px;
  color: #4caf50;
  text-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
  margin-bottom: 4px;
  letter-spacing: 4px;
}

.win-subtitle {
  font-size: 14px;
  color: rgba(212, 165, 116, 0.5);
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.win-line {
  width: 80px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #4caf50, transparent);
  margin: 0 auto 20px;
}

.win-desc {
  font-size: 14px;
  color: rgba(212, 165, 116, 0.7);
  line-height: 2;
  margin-bottom: 32px;
}

.win-buttons {
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
  background: #4caf50;
  border-color: #4caf50;
}
.btn-primary:hover {
  background: #66bb6a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
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

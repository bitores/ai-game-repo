<template>
  <div class="start-screen" @click="startGame" @keydown.enter="startGame" tabindex="0">
    <canvas ref="bgCanvas"></canvas>
    <div class="content">
      <div class="title-block">
        <h1 class="title">时光回溯迷宫</h1>
        <p class="subtitle">Time Rewind Maze</p>
        <div class="ornament">◈ ◈ ◈</div>
      </div>
      <div class="instructions">
        <div class="instr-row">
          <span class="key">↑↓←→</span>
          <span class="desc">移动角色</span>
        </div>
        <div class="instr-row">
          <span class="key">空格</span>
          <span class="desc">暂停 / 恢复时间流动</span>
        </div>
        <div class="instr-row">
          <span class="key">R</span>
          <span class="desc">重新开始当前关卡</span>
        </div>
      </div>
      <div class="story">
        <p>在蒸汽与齿轮的钟表迷宫中，<br>
        将齿轮箱推到对应的能量基座上。<br>
        每个箱子都会记录过去的位置并自动回溯。<br>
        利用时间暂停，让箱子恰好落入目标！</p>
      </div>
      <button class="start-btn" @click="startGame">— 进入迷宫 —</button>
      <p class="hint">按 Enter 或点击开始</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['start'])
const bgCanvas = ref(null)
let animId = null
let resizeHandler = null

onMounted(() => {
  const canvas = bgCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  resizeHandler = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resizeHandler()
  window.addEventListener('resize', resizeHandler)

  let angle = 0
  const draw = () => {
    const w = canvas.width
    const h = canvas.height
    angle += 0.01

    // Background
    ctx.fillStyle = '#0f0804'
    ctx.fillRect(0, 0, w, h)

    // Steampunk decorative border
    ctx.strokeStyle = '#5c3a1e'
    ctx.lineWidth = 2
    ctx.strokeRect(20, 20, w - 40, h - 40)
    ctx.strokeStyle = '#8b6914'
    ctx.lineWidth = 1
    ctx.strokeRect(30, 30, w - 60, h - 60)

    // Corner gears
    const gearSize = 30
    const corners = [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]
    for (const [gx, gy] of corners) {
      ctx.save()
      ctx.translate(gx, gy)
      ctx.rotate(angle * (((gx + gy) / 80 | 0) % 2 === 0 ? 1 : -1))
      ctx.strokeStyle = '#b8860b'
      ctx.lineWidth = 2
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        ctx.fillStyle = '#8b6914'
        ctx.fillRect(Math.cos(a) * gearSize - 2, Math.sin(a) * gearSize - 3, 4, 6)
      }
      ctx.beginPath()
      ctx.arc(0, 0, gearSize - 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#5c3a1e'
      ctx.beginPath()
      ctx.arc(0, 0, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Horizontal pipes
    for (let y of [h * 0.15, h * 0.85]) {
      ctx.fillStyle = '#3a2210'
      ctx.fillRect(0, y, w, 6)
      ctx.fillStyle = '#5c3a1e'
      ctx.fillRect(0, y + 1, w, 3)
    }

    // Steam particles
    for (let i = 0; i < 20; i++) {
      const x = (i * 137 + angle * 60) % w
      const y = h * 0.3 + Math.sin(i * 2.7 + angle * 2) * h * 0.3
      const r = 3 + Math.sin(i * 1.3 + angle * 3) * 2
      ctx.fillStyle = `rgba(200,180,150,${0.05 + Math.sin(i + angle) * 0.03})`
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    animId = requestAnimationFrame(draw)
  }
  draw()
})

onUnmounted(() => {
  if (animId) { cancelAnimationFrame(animId); animId = null }
  if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null }
})

const startGame = () => {
  emit('start')
}
</script>

<style scoped>
.start-screen {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
}

canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #f0e8d0;
  max-width: 520px;
  padding: 40px;
}

.title {
  font-family: 'Georgia', serif;
  font-size: 42px;
  color: #d4a017;
  text-shadow: 0 0 30px rgba(212, 160, 23, 0.3);
  margin-bottom: 4px;
  letter-spacing: 6px;
}

.subtitle {
  font-family: 'Georgia', serif;
  font-size: 16px;
  color: #8b6914;
  letter-spacing: 4px;
  margin-bottom: 12px;
}

.ornament {
  color: #b8860b;
  font-size: 18px;
  letter-spacing: 12px;
  margin: 12px 0 28px;
}

.instructions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(10, 6, 4, 0.6);
  border: 1px solid #5c3a1e;
  border-radius: 4px;
}

.instr-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
}

.key {
  display: inline-block;
  background: #3a2210;
  color: #d4a017;
  padding: 2px 10px;
  border: 1px solid #8b6914;
  border-radius: 3px;
  font-family: monospace;
  font-size: 13px;
  min-width: 60px;
}

.desc {
  color: #c0b090;
  font-family: sans-serif;
}

.story {
  margin-bottom: 28px;
  line-height: 1.8;
  color: #a09070;
  font-size: 13px;
  font-family: sans-serif;
}

.start-btn {
  background: transparent;
  border: 2px solid #d4a017;
  color: #d4a017;
  padding: 12px 36px;
  font-size: 18px;
  font-family: 'Georgia', serif;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 2px;
}

.start-btn:hover {
  background: rgba(212, 160, 23, 0.15);
  box-shadow: 0 0 20px rgba(212, 160, 23, 0.3);
}

.hint {
  margin-top: 12px;
  color: #6a5a40;
  font-size: 12px;
  font-family: monospace;
}
</style>

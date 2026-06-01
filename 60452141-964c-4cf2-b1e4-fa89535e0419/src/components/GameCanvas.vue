<template>
  <div class="game-container" ref="container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { GameEngine } from '../game/GameEngine.js'

const props = defineProps({
  levelIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['state-change'])
const container = ref(null)
const canvasRef = ref(null)

let engine = null
let resizeHandler = null

onMounted(() => {
  const canvas = canvasRef.value
  const parent = container.value
  if (!canvas || !parent) return

  // Logical canvas size (960 × 624)
  const logicalW = 20 * 48
  const logicalH = 13 * 48

  // Scale to fit container while maintaining aspect ratio
  resizeHandler = () => {
    const pw = parent.clientWidth
    const ph = parent.clientHeight
    const scale = Math.min(pw / logicalW, ph / logicalH, 1.5)
    const w = Math.floor(logicalW * scale)
    const h = Math.floor(logicalH * scale)
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    canvas.style.imageRendering = 'pixelated'
  }

  resizeHandler()
  window.addEventListener('resize', resizeHandler)

  // Init engine
  engine = new GameEngine()
  engine.onStateChange = (state) => {
    emit('state-change', state)
  }
  engine.init(canvas, props.levelIndex)
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  if (engine) {
    engine.destroy()
    engine = null
  }
})
</script>

<style scoped>
.game-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0604;
  overflow: hidden;
}

canvas {
  display: block;
  border: 2px solid #5c3a1e;
  box-shadow: 0 0 40px rgba(92, 58, 30, 0.3);
}
</style>

<template>
  <canvas ref="canvasRef"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue'
import { GameEngine } from '../game/engine.js'

const canvasRef = ref(null)
const gameState = inject('gameState')
let engine = null

onMounted(() => {
  if (!canvasRef.value) return
  engine = new GameEngine(canvasRef.value, gameState)
  engine.init()
})

onUnmounted(() => {
  if (engine) engine.destroy()
})
</script>

<style scoped>
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

<template>
  <div class="game-wrapper">
    <GameCanvas />
    <HUD />
  </div>
</template>

<script setup>
import { provide, reactive } from 'vue'
import GameCanvas from './components/GameCanvas.vue'
import HUD from './components/HUD.vue'

const gameState = reactive({
  score: 0,
  lives: 3,
  timeSlowEnergy: 100,
  timeSlowMaxEnergy: 100,
  timeSlowActive: false,
  wave: 1,
  gameOver: false,
})

provide('gameState', gameState)
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
#app, .game-wrapper { width: 100%; height: 100%; position: relative; }
.game-wrapper { cursor: crosshair; }
</style>

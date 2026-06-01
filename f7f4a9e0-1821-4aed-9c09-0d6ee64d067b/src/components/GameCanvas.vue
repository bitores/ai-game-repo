<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { GameApp } from '../game/GameApp.js'
import { GS } from '../game/constants.js'
import HUD from './HUD.vue'

const canvasContainer = ref(null)

const gameState = reactive({
  gameState: GS.MENU,
  gold: 200,
  lives: 10,
  maxLives: 10,
  score: 0,
  wave: 0,
  totalWaves: 10,
  waveActive: false,
  selectedTowerType: 'BASIC',
  selectedTower: null,
  remaining: 0,
  killCount: 0
})

let game = null

function onStateChange(state) {
  gameState.gameState = state.gameState
  gameState.gold = state.gold
  gameState.lives = state.lives
  gameState.maxLives = state.maxLives
  gameState.score = state.score
  gameState.wave = state.wave
  gameState.totalWaves = state.totalWaves
  gameState.waveActive = state.waveActive
  gameState.selectedTowerType = state.selectedTowerType
  gameState.selectedTower = state.selectedTower
  gameState.remaining = state.remaining
  gameState.killCount = state.killCount
}

onMounted(() => {
  if (canvasContainer.value) {
    game = new GameApp(canvasContainer.value, onStateChange)
  }
})

onUnmounted(() => {
  if (game) {
    game.destroy()
    game = null
  }
})

function startGame() {
  if (game) game.startGame()
}

function restartGame() {
  if (game) game.startGame()
}

function selectTower(typeKey) {
  if (game) {
    game.selectTowerType(typeKey)
    gameState.selectedTowerType = typeKey
  }
}

function nextWave() {
  if (game && !gameState.waveActive) {
    game.startNextWave()
  }
}

function upgradeTower() {
  if (game) {
    game.tryUpgradeTower()
  }
}

function fusionTower() {
  if (game) {
    game.tryFusion()
  }
}
</script>

<template>
  <div class="game-wrapper">
    <div ref="canvasContainer" class="canvas-container"></div>
    <HUD
      :game-state="gameState.gameState"
      :gold="gameState.gold"
      :lives="gameState.lives"
      :max-lives="gameState.maxLives"
      :score="gameState.score"
      :wave="gameState.wave"
      :total-waves="gameState.totalWaves"
      :wave-active="gameState.waveActive"
      :selected-tower-type="gameState.selectedTowerType"
      :selected-tower="gameState.selectedTower"
      :remaining="gameState.remaining"
      :kill-count="gameState.killCount"
      @start="startGame"
      @restart="restartGame"
      @select-tower="selectTower"
      @next-wave="nextWave"
      @upgrade-tower="upgradeTower"
      @fusion-tower="fusionTower"
    />
  </div>
</template>

<style scoped>
.game-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #05051a;
  overflow: hidden;
}

.canvas-container {
  position: relative;
  width: 800px;
  height: 600px;
  max-width: 100%;
  max-height: 100%;
}

.canvas-container :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>

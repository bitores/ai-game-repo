<script setup>
import { ref } from 'vue'
import MenuScreen from './components/MenuScreen.vue'
import GameScreen from './components/GameScreen.vue'
import WinScreen from './components/WinScreen.vue'
import LoseScreen from './components/LoseScreen.vue'

const screen = ref('menu')
const currentLevel = ref(0)
const finalLevel = ref(3)
const gameId = ref(0)
const loseReason = ref('')

function startGame(level = 0) {
  currentLevel.value = level
  gameId.value++
  screen.value = 'playing'
}

function onWin() {
  if (currentLevel.value < finalLevel.value - 1) {
    currentLevel.value++
    gameId.value++
    screen.value = 'playing'
  } else {
    screen.value = 'win'
  }
}

function onLose(reason) {
  loseReason.value = reason || 'time'
  screen.value = 'lose'
}

function backToMenu() {
  screen.value = 'menu'
}

function restartLevel() {
  gameId.value++
  screen.value = 'playing'
}
</script>

<template>
  <div class="app-wrapper">
    <MenuScreen v-if="screen === 'menu'" @start="startGame" />
    <GameScreen
      v-else-if="screen === 'playing'"
      :key="'game-' + gameId"
      :level-index="currentLevel"
      @win="onWin"
      @lose="onLose"
      @menu="backToMenu"
    />
    <WinScreen v-else-if="screen === 'win'" @menu="backToMenu" @restart="startGame(0)" />
    <LoseScreen v-else-if="screen === 'lose'" :reason="loseReason" @retry="restartLevel" @menu="backToMenu" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0d0705;
}
#app {
  width: 100%;
  height: 100%;
}
.app-wrapper {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', 'Consolas', monospace;
  color: #d4a574;
  overflow: hidden;
}
</style>

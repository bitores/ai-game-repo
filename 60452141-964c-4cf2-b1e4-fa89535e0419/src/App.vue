<template>
  <div class="app">
    <!-- Start Screen -->
    <StartScreen v-if="screen === 'start'" @start="startGame" />

    <!-- Game Screen — engine handles win/lose/restart internally -->
    <GameCanvas
      v-if="screen === 'game'"
      :key="gameKey"
      :levelIndex="currentLevel"
      @state-change="onGameStateChange"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import StartScreen from './components/StartScreen.vue'
import GameCanvas from './components/GameCanvas.vue'

const screen = ref('start')
const currentLevel = ref(0)
const gameKey = ref(0)

const startGame = () => {
  currentLevel.value = 0
  gameKey.value++
  screen.value = 'game'
}

const onGameStateChange = (state) => {
  // Engine handles win/lose overlays and restart/next-level internally
  // If all levels completed, we could show a "congratulations" screen
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0604; }
#app { width: 100%; height: 100%; }
</style>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>

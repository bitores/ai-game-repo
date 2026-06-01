<script setup>
import GameCanvas from './components/GameCanvas.vue'
import HUD from './components/HUD.vue'
import GameOver from './components/GameOver.vue'
import { useGameState } from './composables/useGameState'

const { state } = useGameState()
</script>

<template>
  <div class="game-container">
    <GameCanvas />
    <HUD />
    <Transition name="overlay">
      <GameOver v-if="state.gameOver" />
    </Transition>
  </div>
</template>

<style scoped>
.game-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #080c18;
}

.overlay-enter-active {
  transition: opacity 0.35s ease-out;
}
.overlay-leave-active {
  transition: opacity 0.2s ease-in;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>

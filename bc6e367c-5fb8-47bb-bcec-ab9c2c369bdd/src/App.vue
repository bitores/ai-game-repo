<script setup>
import { provide } from 'vue'
import { useGameState } from './composables/useGameState'
import GameMenu from './components/GameMenu.vue'
import GameBoard from './components/GameBoard.vue'
import VictoryScreen from './components/VictoryScreen.vue'

const game = useGameState()

provide('game', game)
</script>

<template>
  <div class="app-container">
    <Transition name="scene" mode="out-in">
      <GameMenu v-if="game.gameState.value === 'menu'" :key="'menu'" />
      <GameBoard v-else-if="game.gameState.value === 'playing'" :key="'board'" />
      <VictoryScreen v-else-if="game.gameState.value === 'victory'" :key="'victory'" />
    </Transition>

    <!-- Ambient background decoration -->
    <div class="bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

/* Scene transitions */
.scene-enter-active,
.scene-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.scene-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.96);
}
.scene-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(0.96);
}

/* Background decorations */
.bg-decoration {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.08;
  filter: blur(60px);
}

.bg-circle-1 {
  width: 600px;
  height: 600px;
  background: var(--accent);
  top: -200px;
  right: -200px;
  animation: float 8s ease-in-out infinite;
}

.bg-circle-2 {
  width: 400px;
  height: 400px;
  background: var(--purple);
  bottom: -100px;
  left: -100px;
  animation: float 6s ease-in-out infinite reverse;
}

.bg-circle-3 {
  width: 300px;
  height: 300px;
  background: var(--pink);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float 10s ease-in-out infinite;
}
</style>

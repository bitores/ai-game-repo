<script setup>
import { inject, computed } from 'vue'
import GameHeader from './GameHeader.vue'
import Level1Basics from './puzzles/Level1Basics.vue'
import Level2Computed from './puzzles/Level2Computed.vue'
import Level3Watcher from './puzzles/Level3Watcher.vue'
import Level4Network from './puzzles/Level4Network.vue'
import Level5Final from './puzzles/Level5Final.vue'

const game = inject('game')

const currentLevel = computed(() => game.currentLevel.value)

const levelComponents = [
  Level1Basics,
  Level2Computed,
  Level3Watcher,
  Level4Network,
  Level5Final,
]

const CurrentLevelComponent = computed(() => levelComponents[currentLevel.value])
</script>

<template>
  <div class="game-board">
    <GameHeader />

    <main class="game-main">
      <Transition name="level" mode="out-in">
        <component :is="CurrentLevelComponent" :key="currentLevel" />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.game-board {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.game-main {
  flex: 1;
  overflow-y: auto;
}

/* Level transitions */
.level-enter-active {
  animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.level-leave-active {
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse;
}
</style>

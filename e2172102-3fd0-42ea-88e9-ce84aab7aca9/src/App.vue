<script setup>
</script>

<template>
  <GameBoard />
</template>

<script>
import GameBoard from './components/GameBoard.vue'

export default {
  components: { GameBoard }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #05051a;
  font-family: 'Courier New', monospace;
}
</style>

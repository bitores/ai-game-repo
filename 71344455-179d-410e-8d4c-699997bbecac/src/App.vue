<script setup>
import GameBoard from './components/GameBoard.vue'
</script>

<template>
  <div class="app-root">
    <GameBoard />
  </div>
</template>

<style>
/* ── 全局重置 ── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  background: #0a0a1a;
  color: #c0c0e0;
  line-height: 1.5;
  overflow-x: hidden;
}

/* 背景装饰 */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(0, 212, 255, 0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(0, 255, 136, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(255, 170, 0, 0.02) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
}

/* 滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #2a2a5a;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3a3a6a;
}

.app-root {
  min-height: 100vh;
}
</style>

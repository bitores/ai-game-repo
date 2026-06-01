<template>
  <div
    class="player-ship"
    :style="{
      transform: `translate(${player.x}px, ${player.y}px)`,
      width: player.w + 'px',
      height: player.h + 'px',
      opacity: player.invincible > 0 ? (Math.floor(player.invincible / 3) % 2 ? 0.25 : 1) : 1,
    }"
  >
    <div class="ship-body"></div>
    <div class="ship-glow"></div>
    <div class="engine-flame"></div>
  </div>
</template>

<script setup>
defineProps({
  player: { type: Object, required: true },
})
</script>

<style scoped>
.player-ship {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 2;
  transition: opacity 0.05s;
}

.ship-body {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #00ff88 0%, #00cc66 60%, #009944 100%);
  clip-path: polygon(
    50% 0%,
    85% 25%,
    70% 45%,
    100% 95%,
    60% 75%,
    50% 85%,
    40% 75%,
    0% 95%,
    30% 45%,
    15% 25%
  );
  filter: drop-shadow(0 0 12px rgba(0, 255, 136, 0.7))
    drop-shadow(0 0 25px rgba(0, 255, 136, 0.3));
}

.ship-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70%;
  height: 70%;
  background: radial-gradient(circle, rgba(0, 255, 136, 0.15), transparent 70%);
  border-radius: 50%;
  filter: blur(5px);
}

.engine-flame {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 14px;
  background: linear-gradient(180deg, #ff8800, #ff4400, transparent);
  border-radius: 0 0 5px 5px;
  filter: blur(2px);
  animation: flicker 0.1s ease-in-out infinite alternate;
}

@keyframes flicker {
  0% { height: 12px; opacity: 0.8; }
  100% { height: 16px; opacity: 1; }
}
</style>

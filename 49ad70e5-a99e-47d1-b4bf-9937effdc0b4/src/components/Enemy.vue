<template>
  <div
    class="enemy"
    :class="[enemy.type]"
    :style="{
      transform: `translate(${enemy.x}px, ${enemy.y}px)`,
      width: enemy.w + 'px',
      height: enemy.h + 'px',
    }"
    :title="`#${enemy.id} (${enemy.type}) HP:${enemy.hp}/${enemy.maxHp}`"
  >
    <div class="enemy-body" :style="{ background: enemy.color }"></div>
    <div class="health-bar" v-if="enemy.maxHp > 1">
      <div
        class="health-fill"
        :style="{ width: (enemy.hp / enemy.maxHp) * 100 + '%' }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  enemy: { type: Object, required: true },
})

const emit = defineEmits(['created', 'destroyed'])

onMounted(() => {
  emit('created', props.enemy)
})

onUnmounted(() => {
  emit('destroyed', props.enemy)
})
</script>

<style scoped>
.enemy {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 1;
}

.enemy-body {
  width: 100%;
  height: 85%;
  border-radius: 4px;
  filter: drop-shadow(0 0 8px currentColor);
}

/* Basic - hexagonal shape */
.enemy.basic .enemy-body {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}

/* Shooter - diamond shape */
.enemy.shooter .enemy-body {
  clip-path: polygon(50% 5%, 95% 50%, 50% 95%, 5% 50%);
}

/* Tank - wide shield shape */
.enemy.tank .enemy-body {
  clip-path: polygon(10% 10%, 90% 10%, 100% 50%, 90% 90%, 10% 90%, 0% 50%);
  border-radius: 6px;
}

.health-bar {
  position: absolute;
  bottom: -5px;
  left: 4px;
  right: 4px;
  height: 3px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  overflow: hidden;
}

.health-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4444, #ff8800);
  transition: width 0.08s;
  border-radius: 2px;
}
</style>

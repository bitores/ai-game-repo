<template>
  <div
    class="bullet"
    :class="[type]"
    :style="{
      transform: `translate(${bullet.x}px, ${bullet.y}px)`,
      width: bullet.w + 'px',
      height: bullet.h + 'px',
      backgroundColor: bullet.color,
      boxShadow: `0 0 ${type === 'enemy' ? 8 : 5}px ${bullet.color},
                 0 0 ${type === 'enemy' ? 16 : 10}px ${bullet.color}40`,
    }"
    :title="`#${bullet.id}`"
  ></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  bullet: { type: Object, required: true },
  type: { type: String, default: 'player' },
})

const emit = defineEmits(['created', 'destroyed'])

onMounted(() => {
  emit('created', props.bullet)
})

onUnmounted(() => {
  emit('destroyed', props.bullet)
})
</script>

<style scoped>
.bullet {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 1;
}

.bullet.player {
  border-radius: 0 0 4px 4px;
}

.bullet.enemy {
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
</style>

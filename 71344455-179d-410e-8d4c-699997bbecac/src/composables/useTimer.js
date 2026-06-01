import { ref, computed, onUnmounted } from 'vue'

export function useTimer() {
  const elapsed = ref(0)
  const isRunning = ref(false)
  let intervalId = null

  function start() {
    if (isRunning.value) return
    isRunning.value = true
    intervalId = setInterval(() => {
      elapsed.value++
    }, 1000)
  }

  function stop() {
    isRunning.value = false
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function reset() {
    stop()
    elapsed.value = 0
  }

  const formatted = computed(() => {
    const mins = Math.floor(elapsed.value / 60)
    const secs = elapsed.value % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  })

  onUnmounted(() => stop())

  return { elapsed, formatted, isRunning, start, stop, reset }
}

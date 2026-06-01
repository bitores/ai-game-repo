import { reactive, onMounted, onUnmounted } from 'vue'

/**
 * Reactive keyboard input composable.
 * Tracks arrow keys, WASD, and Space.
 * Must be called within a component's setup().
 */
export function useKeyboard() {
  const keys = reactive({
    up: false,
    down: false,
    left: false,
    right: false,
    space: false,
  })

  const keyMap = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ' ': 'space',
  }

  function handleKeyDown(e) {
    const action = keyMap[e.key]
    if (action) {
      e.preventDefault()
      keys[action] = true
    }
  }

  function handleKeyUp(e) {
    const action = keyMap[e.key]
    if (action) {
      e.preventDefault()
      keys[action] = false
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })

  return keys
}

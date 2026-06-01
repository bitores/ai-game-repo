import { reactive, computed } from 'vue'

const STORAGE_KEY = 'danmakuHighScore'

const state = reactive({
  score: 0,
  combo: 0,
  maxCombo: 0,
  lives: 5,
  maxLives: 5,
  level: 1,
  gameOver: false,
  gameStarted: false,
  particlesDestroyed: 0,
  totalClicks: 0,
  highScore: parseInt(localStorage.getItem(STORAGE_KEY) || '0'),
})

export function useGameState() {
  const accuracy = computed(() => {
    if (state.totalClicks === 0) return 100
    return Math.round((state.particlesDestroyed / state.totalClicks) * 100)
  })

  function addScore(points) {
    state.score += points
  }

  function incrementCombo() {
    state.combo++
    if (state.combo > state.maxCombo) {
      state.maxCombo = state.combo
    }
  }

  function resetCombo() {
    state.combo = 0
  }

  function loseLife() {
    state.lives = Math.max(0, state.lives - 1)
    state.combo = 0
    if (state.lives <= 0) {
      state.gameOver = true
      if (state.score > state.highScore) {
        state.highScore = state.score
        localStorage.setItem(STORAGE_KEY, String(state.score))
      }
    }
  }

  function reset() {
    state.score = 0
    state.combo = 0
    state.maxCombo = 0
    state.lives = state.maxLives
    state.level = 1
    state.gameOver = false
    state.gameStarted = true
    state.particlesDestroyed = 0
    state.totalClicks = 0
  }

  return {
    state,
    accuracy,
    addScore,
    incrementCombo,
    resetCombo,
    loseLife,
    reset,
  }
}

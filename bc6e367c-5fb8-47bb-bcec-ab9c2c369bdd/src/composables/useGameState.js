import { ref, computed, reactive, watch } from 'vue'

// Secret messages discovered throughout the game
const discoveredSecrets = reactive(new Set())

// The global game state
const gameState = ref('menu') // 'menu' | 'playing' | 'victory'
const currentLevel = ref(0)
const totalLevels = 5
const levelScores = reactive({})
const totalScore = ref(0)
const levelProgress = ref(0)
const lastUnlockedLevel = ref(0)
const hintsUsed = reactive({})

const levelNames = [
  '响应式基础 - Reactive Basics',
  '计算属性之谜 - Computed Mystery',
  '侦听器追踪 - Watcher Trail',
  '依赖网络 - Dependency Network',
  '代码深处的秘密 - The Final Secret',
]

const levelDescriptions = [
  '修改变量的值来匹配目标，掌握 ref 与 reactive 的基础用法',
  '通过计算属性链解开层层加密的信息',
  '触发正确的侦听器序列，追踪代码中的隐藏线索',
  '在复杂的依赖网络中寻找关键路径',
  '综合运用所有响应式知识，揭开代码深处的最终秘密',
]

// Secret lore fragments scattered across levels
const secretLore = {
  1: [
    { id: 's1', text: 'Vue 的响应式系统源自于 getter 和 setter 的巧妙组合...', found: false },
  ],
  2: [
    { id: 's2', text: 'computed 属性会惰性求值，只有依赖变化时才重新计算...', found: false },
  ],
  3: [
    { id: 's3', text: 'watch 可以深度观察对象，但要注意性能开销...', found: false },
    { id: 's4', text: 'flush: "post" 会在 DOM 更新后执行回调...', found: false },
  ],
  4: [
    { id: 's5', text: '响应式图的每一个节点都可能成为突破口...', found: false },
  ],
  5: [
    { id: 's6', text: '所有秘密都藏在代码的依赖关系之中...', found: false },
    { id: 's7', text: '你已掌握了 Vue 响应式的精髓！', found: false },
  ],
}

// The final hidden messages (decoded by solving all levels)
const finalMessage = ref('')
const allSecretsFound = ref(false)

export function useGameState() {
  const totalSecrets = computed(() => {
    let count = 0
    for (const level in secretLore) {
      count += secretLore[level].length
    }
    return count
  })

  const foundSecretsCount = computed(() => discoveredSecrets.size)

  const allSecretsDiscovered = computed(() => foundSecretsCount.value === totalSecrets.value)

  function startGame() {
    gameState.value = 'playing'
    currentLevel.value = 0
    levelProgress.value = 0
    lastUnlockedLevel.value = 0
    totalScore.value = 0
    // Clear all level data
    for (const key in levelScores) {
      delete levelScores[key]
    }
    for (const key in hintsUsed) {
      delete hintsUsed[key]
    }
    discoveredSecrets.clear()
    finalMessage.value = ''
    allSecretsFound.value = false
    // Reset lore found status
    for (const level in secretLore) {
      secretLore[level].forEach(s => { s.found = false })
    }
  }

  function completeLevel(levelIndex, score, secrets) {
    levelScores[levelIndex] = score
    totalScore.value = Object.values(levelScores).reduce((a, b) => a + b, 0)
    levelProgress.value = ((levelIndex + 1) / totalLevels) * 100
    lastUnlockedLevel.value = Math.max(lastUnlockedLevel.value, levelIndex + 1)

    // Mark secrets as found
    if (secrets && secrets.length) {
      secrets.forEach(secretId => {
        discoveredSecrets.add(secretId)
        // Update the lore flag
        for (const lvl in secretLore) {
          secretLore[lvl].forEach(s => {
            if (s.id === secretId) s.found = true
          })
        }
      })
    }

    if (levelIndex >= totalLevels - 1) {
      // Check if all secrets found
      if (allSecretsDiscovered.value) {
        allSecretsFound.value = true
        finalMessage.value = decodeFinalSecret()
      }
      gameState.value = 'victory'
    }
  }

  function nextLevel() {
    if (currentLevel.value < totalLevels - 1) {
      currentLevel.value++
    }
  }

  function goToLevel(index) {
    if (index <= lastUnlockedLevel.value) {
      currentLevel.value = index
    }
  }

  function useHint(levelIndex) {
    if (!hintsUsed[levelIndex]) hintsUsed[levelIndex] = 0
    hintsUsed[levelIndex]++
    // Using hints reduces score
    if (levelScores[levelIndex]) {
      levelScores[levelIndex] = Math.max(0, levelScores[levelIndex] - 20)
      totalScore.value = Object.values(levelScores).reduce((a, b) => a + b, 0)
    }
    return hintsUsed[levelIndex]
  }

  function goToMenu() {
    gameState.value = 'menu'
  }

  return {
    // State
    gameState,
    currentLevel,
    totalLevels,
    levelNames,
    levelDescriptions,
    levelScores,
    totalScore,
    levelProgress,
    lastUnlockedLevel,
    hintsUsed,
    discoveredSecrets,
    foundSecretsCount,
    totalSecrets,
    secretLore,
    allSecretsDiscovered,
    allSecretsFound,
    finalMessage,

    // Actions
    startGame,
    completeLevel,
    nextLevel,
    goToLevel,
    useHint,
    goToMenu,
  }
}

function decodeFinalSecret() {
  // The ultimate message revealed when all secrets are found
  const parts = [
    '响应式系统',
    '本质是',
    '发布-订阅',
    '模式的优雅实现',
  ]
  return parts.join(' ')
}

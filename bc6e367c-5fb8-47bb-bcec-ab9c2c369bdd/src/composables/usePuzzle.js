import { ref, computed, watch, reactive, shallowRef, triggerRef } from 'vue'

/**
 * Level 1 - Reactive Basics
 * Manipulate a ref value to match a target, understanding ref() and reactive()
 */
export function useLevel1() {
  const value = ref(0)
  const target = ref(42)
  const targetHint = ref('目标值是 42，调整你的值来匹配它')
  const secretRevealed = ref(false)
  const locked = ref(true)

  // A hidden computed that checks for a secret value
  const secretCheck = computed(() => {
    if (value.value === 99) {
      return '🌟 你发现了隐藏彩蛋！值 99 触发了特殊响应！'
    }
    return ''
  })

  // Watch for exact match
  const isComplete = computed(() => value.value === target.value)

  // Secret: set value to 7 to find a hidden message
  const easterEgg = computed(() => {
    if (value.value === 7) {
      secretRevealed.value = true
      return '🔍 秘密 #1: "响应式数据就像蝴蝶效应——改变一个值，整个系统都会感知到"'
    }
    return ''
  })

  // Validation function
  function checkComplete() {
    const secrets = []
    if (value.value === 7) secrets.push('s1')
    return { complete: isComplete.value, secrets }
  }

  function increment() {
    if (value.value < 100) value.value++
  }

  function decrement() {
    if (value.value > -100) value.value--
  }

  function setValue(val) {
    value.value = val
  }

  function reset() {
    value.value = 0
    secretRevealed.value = false
  }

  return {
    value,
    target,
    targetHint,
    isComplete,
    secretRevealed,
    secretCheck,
    easterEgg,
    locked,
    increment,
    decrement,
    setValue,
    reset,
    checkComplete,
  }
}

/**
 * Level 2 - Computed Mystery
 * Chain computed properties to decode a hidden message
 */
export function useLevel2() {
  // Source values that form a chain
  const a = ref(0)
  const b = ref(0)
  const c = ref(0)
  const d = ref(0)

  const targetMessage = 'VUE'

  // Computed chain that transforms values to characters
  const step1 = computed(() => String.fromCharCode(65 + a.value))
  const step2 = computed(() => String.fromCharCode(86 - b.value))
  const step3 = computed(() => {
    if (c.value === 0) return ''
    return String.fromCharCode(69 + c.value - 1)
  })
  const step4 = computed(() => {
    if (d.value === 0) return ''
    return String.fromCharCode(84 + d.value)
  })

  const currentMessage = computed(() => step1.value + step2.value + step3.value + step4.value)

  // Each step has hints
  const hints = computed(() => [
    a.value === 20 ? '✓ a = 20 → letter V' : `a = ${a.value} (need 20 for 'V')`,
    b.value === 5 ? '✓ b = 5 → letter U' : `b = ${b.value} (need 5 for 'U')`,
    c.value === 1 ? '✓ c = 1 → letter E' : `c = ${c.value} (need 1 for 'E')`,
    d.value === 0 ? '✓ d = 0 → letter (space)' : `d = ${d.value} (need 0)`,
  ])

  const charDisplay = computed(() => [
    { value: a.value, char: step1.value, target: 20, letter: 'V' },
    { value: b.value, char: step2.value, target: 5, letter: 'U' },
    { value: c.value, char: step3.value, target: 1, letter: 'E' },
    { value: d.value, char: step4.value, target: 0, letter: ' ' },
  ])

  const isComplete = computed(() => currentMessage.value === targetMessage)

  function setSource(index, val) {
    switch (index) {
      case 0: a.value = Math.max(0, Math.min(25, val)); break
      case 1: b.value = Math.max(0, Math.min(25, val)); break
      case 2: c.value = Math.max(0, Math.min(25, val)); break
      case 3: d.value = Math.max(0, Math.min(25, val)); break
    }
  }

  function adjust(index, delta) {
    switch (index) {
      case 0: a.value = Math.max(0, Math.min(25, a.value + delta)); break
      case 1: b.value = Math.max(0, Math.min(25, b.value + delta)); break
      case 2: c.value = Math.max(0, Math.min(25, c.value + delta)); break
      case 3: d.value = Math.max(0, Math.min(25, d.value + delta)); break
    }
  }

  function checkComplete() {
    const secrets = []
    if (isComplete.value) secrets.push('s2')
    return { complete: isComplete.value, secrets }
  }

  function reset() {
    a.value = 0; b.value = 0; c.value = 0; d.value = 0
  }

  return {
    a, b, c, d,
    isComplete,
    currentMessage,
    targetMessage,
    charDisplay,
    hints,
    setSource,
    adjust,
    checkComplete,
    reset,
  }
}

/**
 * Level 3 - Watcher Trail
 * Trigger watchers in the right order to reveal clues
 */
export function useLevel3() {
  const signal = ref(0)
  const sequence = ref([])
  const correctSequence = ['alpha', 'beta', 'gamma', 'delta']
  const currentStep = ref(0)
  const watcherLog = ref([])
  const secretFound = ref(false)
  const activeWatchers = reactive({
    alpha: false,
    beta: false,
    gamma: false,
    delta: false,
  })

  // Simulated watcher effects (we track them through computed/effects)
  const chain = ref('init')
  const lockpick = ref(0)

  // Alpha: triggers on signal 1
  const alphaTrigger = computed(() => {
    if (signal.value === 1 && !activeWatchers.alpha) {
      activeWatchers.alpha = true
      watcherLog.value.push({ id: 'alpha', msg: 'Alpha 侦听器触发! 🔵 "第一个线索在数据源头..."' })
    }
    return signal.value
  })

  // Beta: triggers on signal 2, but only after alpha
  const betaTrigger = computed(() => {
    if (signal.value === 2 && activeWatchers.alpha && !activeWatchers.beta) {
      activeWatchers.beta = true
      watcherLog.value.push({ id: 'beta', msg: 'Beta 侦听器触发! 🟢 "顺着依赖链往下找..."' })
    }
    return signal.value * 2
  })

  // Gamma: triggers on signal 3, but only after beta
  const gammaTrigger = computed(() => {
    if (signal.value === 3 && activeWatchers.beta && !activeWatchers.gamma) {
      activeWatchers.gamma = true
      watcherLog.value.push({ id: 'gamma', msg: 'Gamma 侦听器触发! 🟡 "第三个秘密藏在计算属性中..."' })
    }
    return signal.value * 3
  })

  // Delta: triggers on signal 4, but only after gamma
  const deltaTrigger = computed(() => {
    if (signal.value === 4 && activeWatchers.gamma && !activeWatchers.delta) {
      activeWatchers.delta = true
      watcherLog.value.push({ id: 'delta', msg: 'Delta 侦听器触发! 🔴 "最终线索：watch 的 deep 选项可以穿透对象！"' })
      secretFound.value = true
    }
    return signal.value * 4
  })

  // Derive progress
  const activatedCount = computed(() => {
    return Object.values(activeWatchers).filter(Boolean).length
  })

  const isComplete = computed(() => secretFound.value)

  function setSignal(val) {
    signal.value = val
  }

  function reset() {
    signal.value = 0
    watcherLog.value.splice(0)
    secretFound.value = false
    activeWatchers.alpha = false
    activeWatchers.beta = false
    activeWatchers.gamma = false
    activeWatchers.delta = false
  }

  function checkComplete() {
    const secrets = []
    if (isComplete.value) {
      secrets.push('s3', 's4')
    }
    return { complete: isComplete.value, secrets }
  }

  return {
    signal,
    currentStep,
    watcherLog,
    activatedCount,
    activeWatchers,
    isComplete,
    secretFound,
    chain,
    lockpick,
    alphaTrigger,
    betaTrigger,
    gammaTrigger,
    deltaTrigger,
    setSignal,
    reset,
    checkComplete,
  }
}

/**
 * Level 4 - Dependency Network
 * Navigate a complex reactive dependency graph
 */
export function useLevel4() {
  // A network of interconnected refs
  const nodes = reactive({
    A: { value: 0, connected: ['B', 'C'], visited: false },
    B: { value: 0, connected: ['D'], visited: false },
    C: { value: 0, connected: ['D', 'E'], visited: false },
    D: { value: 0, connected: ['F'], visited: false },
    E: { value: 0, connected: ['F'], visited: false },
    F: { value: 0, connected: [], visited: false },
  })

  const currentNode = ref('A')
  const path = ref([])
  const visitedCount = ref(0)
  const graphUnlocked = ref(false)
  const codeFragment = ref('')

  // Computed that traces the dependency graph
  const dependencyGraph = computed(() => {
    const result = {}
    for (const [key, node] of Object.entries(nodes)) {
      result[key] = {
        value: node.value,
        deps: node.connected,
        visited: node.visited,
      }
    }
    return result
  })

  // The critical path: A → B → D → F
  const criticalPath = ['A', 'B', 'D', 'F']
  const currentCriticalStep = ref(0)

  const isOnCriticalPath = computed(() => criticalPath.includes(currentNode.value))

  const criticalProgress = computed(() => {
    if (path.value.length === 0) return 0
    let score = 0
    for (let i = 0; i < path.value.length; i++) {
      if (i < criticalPath.length && path.value[i] === criticalPath[i]) {
        score++
      }
    }
    return score
  })

  function visitNode(nodeId) {
    const node = nodes[nodeId]
    if (!node) return false

    // Check if connected to current node
    if (currentNode.value !== nodeId && !nodes[currentNode.value]?.connected.includes(nodeId)) {
      return false
    }

    node.visited = true
    if (!path.value.includes(nodeId)) {
      path.value.push(nodeId)
    }
    currentNode.value = nodeId
    visitedCount.value = path.value.length

    // Check if A→B→D→F path is found
    if (path.value.length >= 4) {
      const last4 = path.value.slice(-4)
      if (last4[0] === 'A' && last4[1] === 'B' && last4[2] === 'D' && last4[3] === 'F') {
        graphUnlocked.value = true
        codeFragment.value = '🔓 依赖网络解锁！秘密 #5: "深度优先搜索是遍历依赖树的关键策略"'
      }
    }

    // Secret: visit all nodes
    const allVisited = Object.values(nodes).every(n => n.visited)
    if (allVisited && graphUnlocked.value) {
      codeFragment.value = '🌟 全节点访问！"你已探索了整个响应式依赖图！"'
    }

    return true
  }

  function isConnected(nodeId) {
    return nodes[currentNode.value]?.connected.includes(nodeId) || false
  }

  const isComplete = computed(() => graphUnlocked.value)

  function reset() {
    for (const key in nodes) {
      nodes[key].visited = false
      nodes[key].value = 0
    }
    currentNode.value = 'A'
    path.value.splice(0)
    visitedCount.value = 0
    graphUnlocked.value = false
    codeFragment.value = ''
  }

  function checkComplete() {
    const secrets = []
    if (isComplete.value) secrets.push('s5')
    return { complete: isComplete.value, secrets }
  }

  return {
    nodes,
    currentNode,
    path,
    visitedCount,
    graphUnlocked,
    codeFragment,
    dependencyGraph,
    criticalPath,
    isOnCriticalPath,
    criticalProgress,
    visitNode,
    isConnected,
    isComplete,
    reset,
    checkComplete,
  }
}

/**
 * Level 5 - The Final Secret
 * Combine all concepts to unlock the ultimate message
 */
export function useLevel5() {
  // Four pillars that must be aligned
  const pillars = reactive({
    ref: { value: 0, target: 1, name: '响应式数据', hint: 'ref 和 reactive 是响应式的基础' },
    computed: { value: 0, target: 1, name: '计算属性', hint: 'computed 自动追踪依赖' },
    watch: { value: 0, target: 1, name: '侦听器', hint: 'watch 能响应数据变化' },
    effect: { value: 0, target: 1, name: '响应式效应', hint: '副作用是响应式的灵魂' },
  })

  const activationOrder = ref([])
  const finalUnlocked = ref(false)
  const revelation = ref('')
  const progress = ref(0)

  // Chain of computed values that must be activated in order
  const chain1 = computed(() => {
    if (pillars.ref.value === 1) return '⚡'
    return '○'
  })

  const chain2 = computed(() => {
    if (chain1.value === '⚡' && pillars.computed.value === 1) return '🔮'
    return '○'
  })

  const chain3 = computed(() => {
    if (chain2.value === '🔮' && pillars.watch.value === 1) return '🔑'
    return '○'
  })

  const chain4 = computed(() => {
    if (chain3.value === '🔑' && pillars.effect.value === 1) {
      finalUnlocked.value = true
      return '👑'
    }
    return '○'
  })

  const chainDisplay = computed(() => [
    { icon: chain1.value, name: 'Ref/Reactive', active: pillars.ref.value === 1 },
    { icon: chain2.value, name: 'Computed', active: pillars.computed.value === 1 },
    { icon: chain3.value, name: 'Watch', active: pillars.watch.value === 1 },
    { icon: chain4.value, name: 'Effect', active: pillars.effect.value === 1 },
  ])

  const isComplete = computed(() => finalUnlocked.value)

  function activatePillar(name) {
    if (!pillars[name]) return
    if (pillars[name].value === 1) return

    // Must activate in order
    const order = ['ref', 'computed', 'watch', 'effect']
    const idx = order.indexOf(name)
    if (idx === 0 || pillars[order[idx - 1]].value === 1) {
      pillars[name].value = 1
      activationOrder.value.push(name)
      progress.value = (activationOrder.value.length / 4) * 100

      if (activationOrder.value.length === 4) {
        // Trigger final computed
        const _ = chain4.value
      }
    }
  }

  function reset() {
    pillars.ref.value = 0
    pillars.computed.value = 0
    pillars.watch.value = 0
    pillars.effect.value = 0
    activationOrder.value.splice(0)
    finalUnlocked.value = false
    revelation.value = ''
    progress.value = 0
  }

  function checkComplete() {
    const secrets = []
    if (isComplete.value) {
      secrets.push('s6', 's7')
    }
    return { complete: isComplete.value, secrets }
  }

  return {
    pillars,
    chainDisplay,
    activationOrder,
    finalUnlocked,
    revelation,
    progress,
    isComplete,
    activatePillar,
    reset,
    checkComplete,
  }
}

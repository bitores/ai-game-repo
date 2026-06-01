import { ref, reactive, computed, watch, shallowRef } from 'vue'
import { levels } from '../data/levels.js'

/**
 * 应用侦听器逻辑
 * @param {string} mode - watcherMode: follow | toggle | and | or | xor | nor | nand
 * @param {boolean[]} watchedValues - 当前被侦听单元格的值数组
 * @param {boolean} currentValue - 侦听器自身的当前值（toggle 模式需要）
 * @returns {boolean} 侦听器的新值
 */
function applyWatcherLogic(mode, watchedValues, currentValue) {
  switch (mode) {
    case 'follow':
      return watchedValues[0]
    case 'toggle':
      return !currentValue
    case 'and':
      return watchedValues.every((v) => v === true)
    case 'or':
      return watchedValues.some((v) => v === true)
    case 'xor':
      return watchedValues.filter((v) => v === true).length % 2 === 1
    case 'nor':
      return !watchedValues.some((v) => v === true)
    case 'nand':
      return !watchedValues.every((v) => v === true)
    default:
      return watchedValues[0]
  }
}

export function useGameState() {
  // ── 核心状态 ──────────────────────────────────────────────
  const currentLevelIndex = ref(0)
  const cells = ref([])
  const moveCount = ref(0)
  const score = ref(0)
  const isComplete = ref(false)
  const eventLog = ref([])
  const selectedCellId = ref(null)
  const propagationDepth = ref(0)

  // ── 计算属性 ──────────────────────────────────────────────
  const currentLevel = computed(() => levels[currentLevelIndex.value])
  const totalLevels = computed(() => levels.length)
  const isLastLevel = computed(
    () => currentLevelIndex.value >= levels.length - 1
  )

  // 被侦听关系图：{ cellId -> Set<watcherId> }
  const watchGraph = computed(() => {
    const graph = {}
    cells.value.forEach((cell) => {
      if (cell.type === 'watcher' && cell.watches && cell.watches.length > 0) {
        cell.watches.forEach((watchedId) => {
          if (!graph[watchedId]) graph[watchedId] = new Set()
          graph[watchedId].add(cell.id)
        })
      }
    })
    return graph
  })

  // 获取某个侦听器当前被侦听的值列表
  function getWatchedValues(cell) {
    if (!cell.watches || cell.watches.length === 0) return []
    return cell.watches.map((wid) => {
      const wc = cells.value.find((c) => c.id === wid)
      return wc ? wc.value : false
    })
  }

  // ── 侦听器管理 ────────────────────────────────────────────
  let watcherCleanups = []

  function clearWatchers() {
    watcherCleanups.forEach((fn) => fn())
    watcherCleanups = []
  }

  function setupWatchers() {
    clearWatchers()

    cells.value.forEach((cell) => {
      if (cell.type !== 'watcher' || !cell.watches || cell.watches.length === 0)
        return

      const cellId = cell.id

      cell.watches.forEach((watchedId) => {
        const stop = watch(
          () => {
            const wc = cells.value.find((c) => c.id === watchedId)
            return wc ? wc.value : undefined
          },
          (newVal, oldVal) => {
            // 跳过初始化时的首次触发
            if (oldVal === undefined) return

            const currentCell = cells.value.find((c) => c.id === cellId)
            if (!currentCell || currentCell.type !== 'watcher') return

            // 安全检查：防止无限循环
            if (propagationDepth.value > 50) return

            propagationDepth.value++

            const watchedValues = getWatchedValues(currentCell)
            const newValue = applyWatcherLogic(
              currentCell.watcherMode || 'follow',
              watchedValues,
              currentCell.value
            )

            if (currentCell.value !== newValue) {
              currentCell.value = newValue

              eventLog.value.push({
                id: Date.now() + Math.random(),
                time: Date.now(),
                type: 'watcher',
                targetId: cellId,
                targetLabel: currentCell.label,
                sourceId: watchedId,
                sourceLabel: cells.value.find((c) => c.id === watchedId)?.label || watchedId,
                mode: currentCell.watcherMode,
                newValue,
                depth: propagationDepth.value,
              })

              // 限制日志长度
              if (eventLog.value.length > 200) {
                eventLog.value.splice(0, 50)
              }

              // 递归地触发下一级侦听器（通过 Vue reactivity 自动完成）
            }

            propagationDepth.value--
          },
          { flush: 'sync' }
        )

        watcherCleanups.push(stop)
      })
    })
  }

  // ── 条件门检查 ────────────────────────────────────────────
  function checkGateCondition(cell) {
    if (!cell.gateCondition) return true

    const { type, targets, expected } = cell.gateCondition
    const targetCells = targets
      ? targets.map((tid) => cells.value.find((c) => c.id === tid))
      : []

    switch (type) {
      case 'all_active':
        return targetCells.every((c) => c && c.value === true)
      case 'any_active':
        return targetCells.some((c) => c && c.value === true)
      case 'none_active':
        return targetCells.every((c) => c && c.value === false)
      case 'exactly_one':
        return (
          targetCells.filter((c) => c && c.value === true).length === 1
        )
      case 'specific':
        if (!expected) return false
        return Object.entries(expected).every(([tid, val]) => {
          const c = cells.value.find((cl) => cl.id === tid)
          return c && c.value === val
        })
      default:
        return true
    }
  }

  // ── 胜利条件检查 ──────────────────────────────────────────
  function checkWinCondition() {
    if (isComplete.value) return true

    const allActive = cells.value.every((c) => c.value === true)
    if (allActive) {
      isComplete.value = true
      // 计算得分：步数越少分越高
      const baseScore = 100
      const movePenalty = Math.max(0, moveCount.value - cells.value.length)
      const levelScore = Math.max(10, baseScore - movePenalty * 2)
      score.value += levelScore

      eventLog.value.push({
        id: Date.now() + Math.random(),
        time: Date.now(),
        type: 'victory',
        message: `恭喜通关！步数: ${moveCount.value}，得分: +${levelScore}`,
      })
      return true
    }
    return false
  }

  // ── 单元格交互 ────────────────────────────────────────────
  function tryToggle(cellId) {
    if (isComplete.value) return false

    const cell = cells.value.find((c) => c.id === cellId)
    if (!cell) return false

    // 侦听器单元格不能被直接点击
    if (cell.type === 'watcher' && cell.watches && cell.watches.length > 0) {
      eventLog.value.push({
        id: Date.now() + Math.random(),
        time: Date.now(),
        type: 'error',
        targetId: cellId,
        message: `侦听器「${cell.label}」不能被直接点击，请触发其侦听的单元格`,
      })
      return false
    }

    // 条件门检查
    if (cell.type === 'gate' && cell.gateCondition) {
      const gateMet = checkGateCondition(cell)
      if (!gateMet) {
        const msg =
          cell.gateCondition.failMessage || '条件未满足，门无法打开'
        eventLog.value.push({
          id: Date.now() + Math.random(),
          time: Date.now(),
          type: 'error',
          targetId: cellId,
          message: msg,
        })
        return false
      }
    }

    // ── 执行切换 ──
    propagationDepth.value = 0
    cell.value = !cell.value
    moveCount.value++

    eventLog.value.push({
      id: Date.now() + Math.random(),
      time: Date.now(),
      type: 'toggle',
      targetId: cellId,
      targetLabel: cell.label,
      newValue: cell.value,
    })

    // 限制日志长度
    if (eventLog.value.length > 200) {
      eventLog.value.splice(0, 50)
    }

    // 检查胜利（此时同步侦听器已完成所有传播）
    checkWinCondition()
    return true
  }

  // ── 关卡管理 ──────────────────────────────────────────────
  function initLevel() {
    clearWatchers()
    propagationDepth.value = 0

    const level = currentLevel.value
    if (!level) return

    // 创建响应式单元格
    const cellList = level.cells.map((cfg) =>
      reactive({
        id: cfg.id,
        row: cfg.row,
        col: cfg.col,
        type: cfg.type || 'normal',
        value: cfg.initialValue ?? false,
        watches: cfg.watches || [],
        watcherMode: cfg.watcherMode || 'follow',
        gateCondition: cfg.gateCondition || null,
        label: cfg.label || cfg.id,
      })
    )
    cells.value = cellList
    moveCount.value = 0
    isComplete.value = false
    eventLog.value = []
    selectedCellId.value = null

    // 设置侦听器
    setupWatchers()

    // 初始化事件
    eventLog.value.push({
      id: Date.now() + Math.random(),
      time: Date.now(),
      type: 'info',
      message: `进入关卡：${level.name}`,
    })

    // 列出侦听器
    const watcherCells = level.cells.filter(
      (c) => c.type === 'watcher' && c.watches && c.watches.length > 0
    )
    if (watcherCells.length > 0) {
      eventLog.value.push({
        id: Date.now() + Math.random() + 1,
        time: Date.now(),
        type: 'info',
        message: `本关有 ${watcherCells.length} 个侦听器单元格，${level.cells.filter((c) => c.type === 'gate').length} 个条件门`,
      })
    }
  }

  function nextLevel() {
    if (currentLevelIndex.value < levels.length - 1) {
      currentLevelIndex.value++
      initLevel()
    }
  }

  function resetLevel() {
    initLevel()
  }

  function selectLevel(index) {
    if (index >= 0 && index < levels.length) {
      currentLevelIndex.value = index
      initLevel()
    }
  }

  // ── 初始化第一关 ──────────────────────────────────────────
  initLevel()

  return {
    // 状态
    cells,
    moveCount,
    score,
    isComplete,
    isLastLevel,
    eventLog,
    selectedCellId,
    currentLevel,
    currentLevelIndex,
    totalLevels,
    watchGraph,
    // 方法
    tryToggle,
    nextLevel,
    resetLevel,
    selectLevel,
    initLevel,
    // 工具
    checkGateCondition,
  }
}

import { ref, computed, reactive } from 'vue'

/* ======================================================
 * useGameState — Singleton composable
 *
 * Module-level reactive state so every component shares
 * the same game session.  Uses:
 *   ref()       → currentStage, timer references
 *   reactive()  → per-stage results
 *   computed()  → overallProgress, isGameComplete
 * ====================================================== */

const currentStage = ref(1)

const stageResults = reactive([
  { completed: false, moves: 0, time: 0, label: '滑动拼图' },
  { completed: false, moves: 0, time: 0, label: '记忆翻牌' },
  { completed: false, moves: 0, time: 0, label: '色彩排序' }
])

export function useGameState() {
  const TOTAL_STAGES = 3

  /* ---- computed: 整体进度百分比 ---- */
  const overallProgress = computed(() => {
    const done = stageResults.filter(r => r.completed).length
    return Math.round((done / TOTAL_STAGES) * 100)
  })

  /* ---- computed: 是否全部通关 ---- */
  const isGameComplete = computed(() =>
    stageResults.every(r => r.completed)
  )

  /* ---- computed: 当前关卡信息 ---- */
  const currentStageInfo = computed(() => ({
    number: currentStage.value,
    label: stageResults[currentStage.value - 1]?.label ?? ''
  }))

  /* ---- 切换到指定关卡 ---- */
  function goToStage(n) {
    if (n >= 1 && n <= TOTAL_STAGES) {
      currentStage.value = n
    }
  }

  /* ---- 标记关卡完成 ---- */
  function completeStage(stage, { moves = 0, time = 0 } = {}) {
    stageResults[stage - 1].completed = true
    stageResults[stage - 1].moves = moves
    stageResults[stage - 1].time = time

    // 自动跳转到下一关（或保持当前）
    if (stage < TOTAL_STAGES) {
      currentStage.value = stage + 1
    }
  }

  /* ---- 重置游戏 ---- */
  function resetGame() {
    currentStage.value = 1
    stageResults.forEach(r => {
      r.completed = false
      r.moves = 0
      r.time = 0
    })
  }

  return {
    currentStage,
    stageResults,
    TOTAL_STAGES,
    overallProgress,
    isGameComplete,
    currentStageInfo,
    goToStage,
    completeStage,
    resetGame
  }
}

/**
 * 响应式迷宫 - 关卡定义
 *
 * 单元格类型：
 *   normal  - 普通单元格，点击切换开/关
 *   watcher - 侦听器单元格，自动响应被侦听单元格的变化
 *   gate    - 条件门单元格，满足特定条件后才能点击切换
 *
 * 侦听器模式：
 *   follow - 跟随模式，复制被侦听单元格的值
 *   toggle - 翻转模式，每次被侦听单元格变化时翻转自身
 *   and    - 与模式，所有被侦听单元格都为 true 时自身才为 true
 *   or     - 或模式，任一被侦听单元格为 true 时自身为 true
 *   xor    - 异或模式，被侦听单元格中奇数个为 true 时自身为 true
 */

export const levels = [
  // ============================================================
  // 第1关：点亮所有 - 初识响应式
  // 目标：点击所有单元格将它们全部激活
  // 核心概念：Vue ref / reactive 数据绑定
  // ============================================================
  {
    id: 1,
    name: '点亮所有',
    subtitle: '初识响应式',
    description:
      '每个单元格都是一个响应式数据。\n点击切换它的值，观察 UI 如何实时响应数据变化。\n\n目标：激活所有 9 个单元格。',
    gridRows: 3,
    gridCols: 3,
    cells: [
      { id: 'c00', row: 0, col: 0, type: 'normal', initialValue: false, label: '1' },
      { id: 'c01', row: 0, col: 1, type: 'normal', initialValue: false, label: '2' },
      { id: 'c02', row: 0, col: 2, type: 'normal', initialValue: false, label: '3' },
      { id: 'c10', row: 1, col: 0, type: 'normal', initialValue: true, label: '4' },
      { id: 'c11', row: 1, col: 1, type: 'normal', initialValue: false, label: '5' },
      { id: 'c12', row: 1, col: 2, type: 'normal', initialValue: false, label: '6' },
      { id: 'c20', row: 2, col: 0, type: 'normal', initialValue: false, label: '7' },
      { id: 'c21', row: 2, col: 1, type: 'normal', initialValue: false, label: '8' },
      { id: 'c22', row: 2, col: 2, type: 'normal', initialValue: false, label: '9' },
    ],
  },

  // ============================================================
  // 第2关：连锁反应 - 侦听器链
  // 目标：利用侦听器链传播激活状态
  // 核心概念：Vue watch 侦听器
  // ============================================================
  {
    id: 2,
    name: '连锁反应',
    subtitle: '侦听器链',
    description:
      '「侦听器」(W)单元格通过 Vue 的 watch API 侦听其他单元格的变化。\n\n' +
      '• W⚡ 跟随模式：复制被侦听单元格的值\n' +
      '• W↺ 翻转模式：每次被侦听单元格变化时翻转自身\n' +
      '• AND 与模式：所有被侦听单元格都为开时自身才开\n\n' +
      '目标：激活所有 12 个单元格。',
    gridRows: 3,
    gridCols: 4,
    cells: [
      // Row 0: 跟随链
      { id: 'c00', row: 0, col: 0, type: 'normal',  initialValue: false, label: '触发' },
      { id: 'c01', row: 0, col: 1, type: 'watcher', initialValue: false, label: 'W⚡', watches: ['c00'], watcherMode: 'follow' },
      { id: 'c02', row: 0, col: 2, type: 'watcher', initialValue: false, label: 'W⚡', watches: ['c01'], watcherMode: 'follow' },
      { id: 'c03', row: 0, col: 3, type: 'watcher', initialValue: false, label: 'W⚡', watches: ['c02'], watcherMode: 'follow' },
      // Row 1: 翻转链
      { id: 'c10', row: 1, col: 0, type: 'normal',  initialValue: false, label: '触发' },
      { id: 'c11', row: 1, col: 1, type: 'watcher', initialValue: false, label: 'W↺', watches: ['c10'], watcherMode: 'toggle' },
      { id: 'c12', row: 1, col: 2, type: 'watcher', initialValue: false, label: 'W↺', watches: ['c11'], watcherMode: 'toggle' },
      { id: 'c13', row: 1, col: 3, type: 'normal',  initialValue: false, label: '直连' },
      // Row 2: 与门
      { id: 'c20', row: 2, col: 0, type: 'normal',  initialValue: false, label: '输入A' },
      { id: 'c21', row: 2, col: 1, type: 'normal',  initialValue: false, label: '输入B' },
      { id: 'c22', row: 2, col: 2, type: 'watcher', initialValue: false, label: 'AND', watches: ['c20', 'c21'], watcherMode: 'and' },
      { id: 'c23', row: 2, col: 3, type: 'watcher', initialValue: false, label: 'W⚡', watches: ['c22'], watcherMode: 'follow' },
    ],
  },

  // ============================================================
  // 第3关：响应式迷宫 - 综合挑战
  // 目标：结合侦听器和条件门，找到正确的激活顺序
  // 核心概念：watch + computed + 条件逻辑
  // ============================================================
  {
    id: 3,
    name: '响应式迷宫',
    subtitle: '综合挑战',
    description:
      '「条件门」(🔒)需要特定的单元格状态才能打开。\n结合侦听器链和逻辑门，找到正确的激活路径！\n\n' +
      '提示：从点击 A 和 C 开始，观察侦听器如何传播状态。\n\n' +
      '目标：激活所有 16 个单元格。',
    gridRows: 4,
    gridCols: 4,
    cells: [
      // Row 0
      { id: 'c00', row: 0, col: 0, type: 'normal',  initialValue: false, label: 'A' },
      { id: 'c01', row: 0, col: 1, type: 'watcher', initialValue: false, label: 'W⚡', watches: ['c00'], watcherMode: 'follow' },
      { id: 'c02', row: 0, col: 2, type: 'normal',  initialValue: false, label: 'B' },
      { id: 'c03', row: 0, col: 3, type: 'gate',    initialValue: false, label: '🔒1',
        gateCondition: { type: 'all_active', targets: ['c00', 'c10'], failMessage: '需要 A 和 C 同时激活' } },
      // Row 1
      { id: 'c10', row: 1, col: 0, type: 'normal',  initialValue: false, label: 'C' },
      { id: 'c11', row: 1, col: 1, type: 'watcher', initialValue: false, label: 'AND', watches: ['c00', 'c10'], watcherMode: 'and' },
      { id: 'c12', row: 1, col: 2, type: 'normal',  initialValue: false, label: 'D' },
      { id: 'c13', row: 1, col: 3, type: 'normal',  initialValue: false, label: 'E' },
      // Row 2
      { id: 'c20', row: 2, col: 0, type: 'watcher', initialValue: false, label: 'W⚡', watches: ['c10'], watcherMode: 'follow' },
      { id: 'c21', row: 2, col: 1, type: 'watcher', initialValue: false, label: 'W↺', watches: ['c02'], watcherMode: 'toggle' },
      { id: 'c22', row: 2, col: 2, type: 'gate',    initialValue: false, label: '🔒2',
        gateCondition: { type: 'all_active', targets: ['c11', 'c20'], failMessage: '需要 AND 和 W⚡(C) 同时激活' } },
      { id: 'c23', row: 2, col: 3, type: 'normal',  initialValue: false, label: 'F' },
      // Row 3
      { id: 'c30', row: 3, col: 0, type: 'normal',  initialValue: false, label: 'G' },
      { id: 'c31', row: 3, col: 1, type: 'gate',    initialValue: false, label: '🔒3',
        gateCondition: { type: 'all_active', targets: ['c22', 'c21'], failMessage: '需要 🔒2 和 W↺(B) 同时激活' } },
      { id: 'c32', row: 3, col: 2, type: 'watcher', initialValue: false, label: 'W⚡', watches: ['c31'], watcherMode: 'follow' },
      { id: 'c33', row: 3, col: 3, type: 'normal',  initialValue: false, label: 'H' },
    ],
  },
]

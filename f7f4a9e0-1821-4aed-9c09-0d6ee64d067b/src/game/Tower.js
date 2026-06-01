import { TOWER_TYPES, MAX_TOWER_LEVEL, gridToPixel, CELL_SIZE, FUSION_COST } from './constants.js'

export class Tower {
  constructor(row, col, type, level = 1) {
    this.row = row
    this.col = col
    this.typeKey = type
    this.level = level
    this.config = TOWER_TYPES[type]
    this.alive = true

    const pos = gridToPixel(row, col)
    this.x = pos.x
    this.y = pos.y

    // Attack stats (from config + level bonuses)
    this._recalculateStats()

    // Attack state
    this.fireCooldown = 0
    this.target = null

    // Visual
    this.sprite = null
    this.rangeIndicator = null
  }

  _recalculateStats() {
    const base = this.config
    this.range = base.range
    this.damage = base.damage
    this.fireRate = base.fireRate
    this.splashRadius = base.splashRadius || 0
    this.slowAmount = base.slowAmount || 0
    this.slowDuration = base.slowDuration || 0
    this.chainCount = base.chainCount || 0

    // Apply level upgrades (level 1 = base, level 2 = first upgrade, level 3 = second)
    if (this.level > 1 && base.upgrades) {
      const upgrade = base.upgrades[this.level - 2]
      if (upgrade) {
        if (upgrade.range) this.range = upgrade.range
        if (upgrade.damage) this.damage = upgrade.damage
        if (upgrade.fireRate) this.fireRate = upgrade.fireRate
        if (upgrade.splashRadius) this.splashRadius = upgrade.splashRadius
        if (upgrade.slowAmount !== undefined) this.slowAmount = upgrade.slowAmount
        if (upgrade.slowDuration) this.slowDuration = upgrade.slowDuration
        if (upgrade.chainCount) this.chainCount = upgrade.chainCount
      }
    }
  }

  canUpgrade() {
    return this.level < MAX_TOWER_LEVEL
  }

  getUpgradeCost() {
    if (!this.canUpgrade()) return Infinity
    const base = this.config
    if (base.upgrades && base.upgrades[this.level - 1]) {
      return base.upgrades[this.level - 1].cost
    }
    return Infinity
  }

  upgrade() {
    if (!this.canUpgrade()) return false
    this.level++
    this._recalculateStats()
    return true
  }

  getFusionCost() {
    return FUSION_COST
  }

  update(enemies) {
    if (!this.alive) return

    // Cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown--
    }

    // Find target
    this.target = this._findTarget(enemies)

    // Attack if ready
    if (this.target && this.fireCooldown <= 0) {
      this.fireCooldown = this.fireRate
      return this._createProjectile(this.target)
    }

    return null
  }

  _findTarget(enemies) {
    let closestEnemy = null
    let closestDist = Infinity

    for (const enemy of enemies) {
      if (!enemy.alive) continue
      const dx = enemy.x - this.x
      const dy = enemy.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= this.range && dist < closestDist) {
        // Prefer enemy with more progress (closer to core)
        closestDist = dist
        closestEnemy = enemy
      }
    }

    return closestEnemy
  }

  _createProjectile(target) {
    return {
      x: this.x,
      y: this.y,
      target: target,
      speed: 300,
      damage: this.damage,
      splashRadius: this.splashRadius,
      slowAmount: this.slowAmount,
      slowDuration: this.slowDuration,
      chainCount: this.chainCount,
      color: this.config.color,
      type: this.typeKey
    }
  }

  isInCell(row, col) {
    return this.row === row && this.col === col
  }

  getDisplayName() {
    return `${this.config.name} Lv.${this.level}`
  }
}

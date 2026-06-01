import { ENEMY_TYPES, PATH_WAYPOINTS, gridToPixel } from './constants.js'

export class Enemy {
  constructor(type, hpMultiplier = 1.0) {
    const config = ENEMY_TYPES[type]
    this.type = type
    this.maxHp = Math.floor(config.hp * hpMultiplier)
    this.hp = this.maxHp
    this.baseSpeed = config.speed
    this.speed = config.speed
    this.reward = config.reward
    this.color = config.color
    this.size = config.size
    this.alive = true
    this.reachedEnd = false

    // Path following
    this.waypointIndex = 0
    this.nextWaypointIndex = 1

    // Position (pixel coords)
    const startWp = PATH_WAYPOINTS[0]
    const startPixel = gridToPixel(startWp.row, startWp.col)
    this.x = startPixel.x
    this.y = startPixel.y

    // For path cells with col=-1, position at left edge
    if (startWp.col < 0) {
      this.x = -20
    }

    // Slow effect
    this.slowTimer = 0
    this.slowAmount = 1.0

    // Visual
    this.sprite = null
  }

  setSpeedMultiplier(amount, duration) {
    this.slowAmount = amount
    this.slowTimer = duration
  }

  update() {
    if (!this.alive) return

    // Handle slow
    if (this.slowTimer > 0) {
      this.slowTimer--
      this.speed = this.baseSpeed * this.slowAmount
    } else {
      this.speed = this.baseSpeed
    }

    // Move toward next waypoint
    if (this.nextWaypointIndex < PATH_WAYPOINTS.length) {
      const targetWp = PATH_WAYPOINTS[this.nextWaypointIndex]
      const target = gridToPixel(targetWp.row, targetWp.col)

      // For entry waypoint with col=-1, set target x to left edge
      let tx = target.x
      let ty = target.y
      if (targetWp.col < 0) tx = -20

      const dx = tx - this.x
      const dy = ty - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 2) {
        this.waypointIndex = this.nextWaypointIndex
        this.nextWaypointIndex++
        // Snap to waypoint
        this.x = tx
        this.y = ty
      } else {
        const step = this.speed * (1 / 60)  // per-frame movement
        this.x += (dx / dist) * step
        this.y += (dy / dist) * step
      }
    } else {
      // Reached the end (core)
      this.alive = false
      this.reachedEnd = true
    }
  }

  takeDamage(damage) {
    this.hp -= damage
    if (this.hp <= 0) {
      this.hp = 0
      this.alive = false
    }
  }

  getPixelPos() {
    return { x: this.x, y: this.y }
  }

  getProgress() {
    return this.waypointIndex / (PATH_WAYPOINTS.length - 1)
  }
}

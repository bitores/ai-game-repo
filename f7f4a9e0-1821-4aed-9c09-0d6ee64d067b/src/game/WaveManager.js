import { WAVES, ENEMY_TYPES } from './constants.js'
import { Enemy } from './Enemy.js'

export class WaveManager {
  constructor() {
    this.currentWave = 0
    this.totalWaves = WAVES.length
    this.waveInProgress = false
    this.allWavesComplete = false

    // Spawn queue
    this.spawnQueue = []
    this.spawnTimer = 0
    this.currentSpawnIndex = 0

    // Wave scaling
    this.hpMultiplier = 1.0
  }

  startNextWave() {
    if (this.currentWave >= this.totalWaves) {
      this.allWavesComplete = true
      return []
    }

    const waveDef = WAVES[this.currentWave]
    this.currentWave++
    this.waveInProgress = true
    this.currentSpawnIndex = 0

    // Build spawn queue
    this.spawnQueue = []
    for (const group of waveDef.enemies) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          type: group.type,
          interval: group.interval
        })
      }
    }

    // Shuffle the queue slightly to mix enemy types
    this._shuffleQueue()

    this.spawnTimer = 0

    return []
  }

  _shuffleQueue() {
    // Fisher-Yates shuffle
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]]
    }
  }

  update() {
    const newEnemies = []

    if (!this.waveInProgress) return newEnemies

    if (this.spawnTimer > 0) {
      this.spawnTimer--
      return newEnemies
    }

    if (this.currentSpawnIndex < this.spawnQueue.length) {
      const spawn = this.spawnQueue[this.currentSpawnIndex]
      const enemy = new Enemy(spawn.type, this.hpMultiplier)
      newEnemies.push(enemy)
      this.spawnTimer = spawn.interval
      this.currentSpawnIndex++
    }

    return newEnemies
  }

  isWaveComplete(activeEnemies) {
    if (!this.waveInProgress) return false
    if (this.currentSpawnIndex < this.spawnQueue.length) return false
    return activeEnemies.length === 0
  }

  finishWave() {
    this.waveInProgress = false
    // Increase difficulty for next wave
    this.hpMultiplier += 0.1
  }

  getWaveNumber() {
    return this.currentWave
  }

  getTotalWaves() {
    return this.totalWaves
  }

  getRemainingEnemies() {
    if (!this.waveInProgress) return 0
    return this.spawnQueue.length - this.currentSpawnIndex
  }

  isAllWavesDone() {
    return this.currentWave >= this.totalWaves && !this.waveInProgress
  }
}

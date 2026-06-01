<script setup>
import { inject, ref, computed, onMounted, onUnmounted } from 'vue'

const game = inject('game')

const showContent = ref(false)
const confettiPieces = ref([])
const secretMessages = ref([])
const typingMessage = ref('')
const fullMessage = ref('')
const showRestart = ref(false)

const score = computed(() => game.totalScore.value)
const secretsFound = computed(() => game.foundSecretsCount.value)
const totalSecrets = computed(() => game.totalSecrets.value)
const allSecrets = computed(() => game.allSecretsFound.value)

// Collect all found secret lore
onMounted(() => {
  const messages = []
  for (const lvl in game.secretLore) {
    game.secretLore[lvl].forEach(s => {
      if (s.found) messages.push(s.text)
    })
  }
  secretMessages.value = messages

  // Generate confetti
  const colors = ['#38bdf8', '#a855f7', '#ec4899', '#22c55e', '#eab308', '#f59e0b', '#ef4444']
  for (let i = 0; i < 80; i++) {
    confettiPieces.value.push({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    })
  }

  // Animate in
  setTimeout(() => { showContent.value = true }, 300)

  // Type out the final message
  const msg = allSecrets.value
    ? '恭喜你！你不仅通关了所有关卡，还找到了所有隐藏秘密！\n\n' + game.finalMessage.value
    : '恭喜通关！但还有隐藏秘密等待你去发现...\n\n回头再探索一下各个关卡吧！'

  fullMessage.value = msg
  let idx = 0
  const interval = setInterval(() => {
    if (idx < msg.length) {
      typingMessage.value += msg[idx]
      idx++
    } else {
      clearInterval(interval)
      setTimeout(() => { showRestart.value = true }, 500)
    }
  }, 30)

  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <div class="victory-container">
    <!-- Confetti -->
    <div class="confetti-layer">
      <div
        v-for="piece in confettiPieces"
        :key="piece.id"
        class="confetti-piece"
        :style="{
          left: piece.left + '%',
          animationDelay: piece.delay + 's',
          animationDuration: piece.duration + 's',
          background: piece.color,
          width: piece.size + 'px',
          height: piece.size * 0.6 + 'px',
          transform: 'rotate(' + piece.rotation + 'deg)',
        }"
      ></div>
    </div>

    <div class="victory-content" :class="{ visible: showContent }">
      <!-- Trophy -->
      <div class="trophy-section">
        <div class="trophy">
          <div class="trophy-icon">🏆</div>
        </div>
        <h1 class="victory-title">探索完成！</h1>
        <p class="victory-subtitle">你已揭开 Vue 响应式系统的深层奥秘</p>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ score }}</div>
          <div class="stat-label">总分</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ secretsFound }}/{{ totalSecrets }}</div>
          <div class="stat-label">秘密发现</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ game.totalLevels }}</div>
          <div class="stat-label">关卡完成</div>
        </div>
      </div>

      <!-- Secret messages -->
      <div v-if="secretMessages.length > 0" class="secrets-collection">
        <h3 class="secrets-title">🔍 收集的秘密知识</h3>
        <div class="secrets-list">
          <div v-for="(msg, idx) in secretMessages" :key="idx" class="secret-item">
            <span class="secret-bulb">💡</span>
            <span class="secret-text">{{ msg }}</span>
          </div>
        </div>
      </div>

      <!-- Typing message -->
      <div class="message-box">
        <div class="message-content">
          <p class="typing-text">{{ typingMessage }}<span class="cursor">|</span></p>
        </div>
      </div>

      <!-- Actions -->
      <div class="victory-actions" :class="{ visible: showRestart }">
        <button class="btn-restart" @click="game.startGame()">
          再玩一次
        </button>
        <button class="btn-menu" @click="game.goToMenu()">
          返回主菜单
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.victory-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

/* Confetti */
.confetti-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.confetti-piece {
  position: absolute;
  top: -20px;
  border-radius: 2px;
  animation: confetti-fall linear infinite;
}

.victory-content {
  text-align: center;
  max-width: 600px;
  z-index: 1;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.victory-content.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Trophy */
.trophy-section {
  margin-bottom: 2rem;
}

.trophy {
  display: inline-block;
  margin-bottom: 1rem;
}

.trophy-icon {
  font-size: 4rem;
  animation: float 2s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.5));
}

.victory-title {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--gold), var(--pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.victory-subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
}

/* Stats */
.stats-grid {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem 1.5rem;
  min-width: 100px;
  transition: all 0.3s;
}
.stat-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 15px var(--accent-glow);
}

.stat-number {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--accent);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Secrets collection */
.secrets-collection {
  margin-bottom: 1.5rem;
  text-align: left;
}

.secrets-title {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.8rem;
}

.secrets-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.secret-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
  animation: slideIn 0.3s ease;
}

.secret-bulb {
  flex-shrink: 0;
  margin-top: 1px;
}

.secret-text {
  color: var(--text-primary);
  line-height: 1.5;
}

/* Message */
.message-box {
  margin-bottom: 2rem;
}

.message-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.typing-text {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  text-align: left;
  font-family: 'Courier New', monospace;
}

.cursor {
  animation: blink-caret 0.8s step-end infinite;
  color: var(--accent);
}

/* Actions */
.victory-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.5s ease;
}
.victory-actions.visible {
  opacity: 1;
  transform: translateY(0);
}

.btn-restart,
.btn-menu {
  padding: 0.8rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-restart {
  background: linear-gradient(135deg, var(--accent), var(--purple));
  color: #fff;
  border: none;
  box-shadow: 0 4px 20px var(--accent-glow);
}
.btn-restart:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px var(--accent-glow);
}

.btn-menu {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
.btn-menu:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>

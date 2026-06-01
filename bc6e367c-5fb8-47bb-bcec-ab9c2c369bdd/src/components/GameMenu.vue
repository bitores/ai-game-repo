<script setup>
import { inject, ref, onMounted } from 'vue'

const game = inject('game')

const showLore = ref(false)
const titleVisible = ref(false)
const subtitleVisible = ref(false)
const buttonVisible = ref(false)
const particles = ref([])

onMounted(() => {
  setTimeout(() => { titleVisible.value = true }, 300)
  setTimeout(() => { subtitleVisible.value = true }, 800)
  setTimeout(() => { buttonVisible.value = true }, 1300)

  // Generate ambient particles
  for (let i = 0; i < 20; i++) {
    particles.value.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.5,
    })
  }
})
</script>

<template>
  <div class="menu-container">
    <!-- Floating code particles -->
    <div class="code-particles">
      <div
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :style="{
          left: p.x + '%',
          top: p.y + '%',
          width: p.size + 'px',
          height: p.size + 'px',
          animationDelay: p.delay + 's',
          animationDuration: p.duration + 's',
          opacity: p.opacity,
        }"
      ></div>
    </div>

    <div class="menu-content">
      <!-- Logo / Title -->
      <div class="title-section" :class="{ visible: titleVisible }">
        <div class="logo">
          <span class="vue-logo">&lt;/&gt;</span>
        </div>
        <h1 class="game-title">
          <span class="title-line">Vue 响应式之谜</span>
          <span class="title-sub">Reactive Puzzle</span>
        </h1>
        <div class="title-accent">
          <span class="accent-bar"></span>
        </div>
      </div>

      <!-- Subtitle -->
      <div class="subtitle-section" :class="{ visible: subtitleVisible }">
        <p class="tagline">
          利用 Vue 3 响应式系统，通过修改数据依赖解开层层谜题，
        </p>
        <p class="tagline highlight">探索代码深处的秘密。</p>
      </div>

      <!-- Start button -->
      <div class="actions" :class="{ visible: buttonVisible }">
        <button class="btn-start" @click="game.startGame()">
          <span class="btn-icon">▶</span>
          <span class="btn-text">开始探索</span>
        </button>

        <div class="menu-info">
          <div class="info-chip">
            <span class="chip-dot"></span>
            5 个关卡
          </div>
          <div class="info-chip">
            <span class="chip-dot purple"></span>
            7 个隐藏秘密
          </div>
          <div class="info-chip">
            <span class="chip-dot gold"></span>
            Vue 3 Composition API
          </div>
        </div>

        <button class="btn-lore" @click="showLore = !showLore">
          {{ showLore ? '收起' : '背景故事' }}
        </button>

        <Transition name="lore">
          <div v-if="showLore" class="lore-panel">
            <div class="lore-content">
              <p class="lore-text">
                你是一名 Vue 开发者，某天你在维护一个老旧项目时，
                发现了隐藏在代码深处的异常依赖关系...
              </p>
              <p class="lore-text">
                响应式数据流中似乎藏着某个秘密信息。
                只有深入理解 Vue 的响应式系统——从 ref 到 computed，
                从 watch 到依赖追踪——才能解开这个谜题。
              </p>
              <p class="lore-text accent">
                准备好深入代码的深渊了吗？
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 2rem;
  min-height: 100vh;
}

.code-particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  background: var(--accent);
  border-radius: 50%;
  animation: float linear infinite;
}

.menu-content {
  text-align: center;
  max-width: 600px;
  z-index: 1;
}

.title-section {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.title-section.visible {
  opacity: 1;
  transform: translateY(0);
}

.logo {
  margin-bottom: 1.5rem;
}

.vue-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  border-radius: 20px;
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  font-family: 'Courier New', monospace;
  box-shadow: 0 0 40px var(--accent-glow);
}

.game-title {
  margin-bottom: 1rem;
}

.title-line {
  display: block;
  font-size: 2.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), var(--purple), var(--pink));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: rainbow 4s ease infinite;
  letter-spacing: 0.02em;
}

.title-sub {
  display: block;
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-weight: 400;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  margin-top: 0.3rem;
}

.title-accent {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.accent-bar {
  display: block;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), var(--purple));
  border-radius: 2px;
}

.subtitle-section {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.5s;
}
.subtitle-section.visible {
  opacity: 1;
  transform: translateY(0);
}

.tagline {
  font-size: 1.05rem;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
}
.tagline.highlight {
  color: var(--accent);
  font-weight: 500;
}

.actions {
  margin-top: 2.5rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 1s;
}
.actions.visible {
  opacity: 1;
  transform: translateY(0);
}

.btn-start {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1rem 2.5rem;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px var(--accent-glow);
  letter-spacing: 0.05em;
}

.btn-start:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 30px var(--accent-glow);
}

.btn-start:active {
  transform: translateY(0) scale(0.98);
}

.btn-icon {
  font-size: 1.1rem;
}

.menu-info {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.info-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}
.chip-dot.purple { background: var(--purple); }
.chip-dot.gold { background: var(--gold); }

.btn-lore {
  display: inline-block;
  margin-top: 1.2rem;
  padding: 0.5rem 1.2rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-lore:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.lore-panel {
  margin-top: 1.2rem;
  text-align: left;
}

.lore-enter-active,
.lore-leave-active {
  transition: all 0.4s ease;
}
.lore-enter-from,
.lore-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.lore-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.lore-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.8;
  margin-bottom: 0.8rem;
}
.lore-text:last-child {
  margin-bottom: 0;
}
.lore-text.accent {
  color: var(--accent);
  font-weight: 500;
}
</style>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, default: '代码面板' },
  code: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
})

const collapsed = ref(false)
</script>

<template>
  <div class="code-panel" :class="{ collapsed }">
    <div class="panel-header" @click="collapsed = !collapsed">
      <div class="panel-title-row">
        <span class="panel-icon">&lt;/&gt;</span>
        <span class="panel-title">{{ title }}</span>
      </div>
      <span class="panel-toggle">{{ collapsed ? '▸' : '▾' }}</span>
    </div>
    <Transition name="panel">
      <div v-show="!collapsed" class="panel-body">
        <pre :class="'language-' + language"><code>{{ code }}</code></pre>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.code-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.code-panel:hover {
  border-color: var(--accent);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 1rem;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.panel-header:hover {
  background: rgba(56, 189, 248, 0.08);
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-icon {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: var(--accent);
  font-size: 0.85rem;
}

.panel-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-toggle {
  color: var(--text-secondary);
  font-size: 0.85rem;
  transition: transform 0.2s;
}

.panel-body {
  padding: 0;
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  max-height: 0;
  opacity: 0;
}

pre {
  margin: 0;
  padding: 1rem;
  background: var(--bg-code);
  overflow-x: auto;
  font-family: 'Courier New', 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-code);
  tab-size: 2;
}

code {
  white-space: pre;
}
</style>

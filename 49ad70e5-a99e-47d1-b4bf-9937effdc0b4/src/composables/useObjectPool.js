import { reactive } from 'vue'

/**
 * Object Pool composable — reuses entity data objects
 * to avoid GC pressure during rapid-fire gameplay.
 *
 * - `active`: reactive array for v-for binding (drives component lifecycle)
 * - `acquire(setupFn)`: get a pooled object (or create new), apply setup
 * - `release(obj)`: return to pool for reuse
 * - `releaseAll()`: recycle all active objects
 *
 * Each acquired object gets a globally-unique `id` for :key tracking.
 */
let globalId = 0

export function useObjectPool(initialSize = 30, factory) {
  const active = reactive([])
  const pool = []

  // Pre-populate the pool with recycled blanks
  for (let i = 0; i < initialSize; i++) {
    pool.push(factory())
  }

  /**
   * Acquire an object from the pool (or create fresh).
   * @param {(obj: Object) => void} setup  called with the object so caller can set fields
   * @returns {Object}
   */
  function acquire(setup) {
    let obj
    if (pool.length > 0) {
      obj = pool.pop()
    } else {
      obj = factory()
    }
    obj.id = ++globalId
    obj.active = true
    if (setup) setup(obj)
    active.push(obj)
    return obj
  }

  /**
   * Return an object to the pool for later reuse.
   */
  function release(obj) {
    if (!obj || !obj.active) return
    obj.active = false
    const idx = active.indexOf(obj)
    if (idx !== -1) active.splice(idx, 1)
    pool.push(obj)
  }

  /**
   * Release every active object at once (e.g. game reset).
   */
  function releaseAll() {
    for (let i = active.length - 1; i >= 0; i--) {
      release(active[i])
    }
  }

  return { active, acquire, release, releaseAll }
}

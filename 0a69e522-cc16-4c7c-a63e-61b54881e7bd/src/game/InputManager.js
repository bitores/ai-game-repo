/**
 * InputManager - Tracks keyboard and mouse/touch input
 */
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas
    this.keys = {}
    this.mouse = { x: 0, y: 0, down: false, prevDown: false }
    this.touch = { active: false, x: 0, y: 0, startX: 0, startY: 0 }

    this._onKeyDown = (e) => {
      this.keys[e.key.toLowerCase()] = true
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
    }

    this._onKeyUp = (e) => {
      this.keys[e.key.toLowerCase()] = false
    }

    this._onMouseDown = (e) => {
      const rect = this.canvas.getBoundingClientRect()
      this.mouse.x = (e.clientX - rect.left)
      this.mouse.y = (e.clientY - rect.top)
      this.mouse.down = true
    }

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect()
      this.mouse.x = (e.clientX - rect.left)
      this.mouse.y = (e.clientY - rect.top)
    }

    this._onMouseUp = () => {
      this.mouse.down = false
    }

    this._onTouchStart = (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      this.touch.active = true
      this.touch.x = touch.clientX - rect.left
      this.touch.y = touch.clientY - rect.top
      this.touch.startX = this.touch.x
      this.touch.startY = this.touch.y
      // Map touch to mouse
      this.mouse.x = this.touch.x
      this.mouse.y = this.touch.y
      this.mouse.down = true
    }

    this._onTouchMove = (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      this.touch.x = touch.clientX - rect.left
      this.touch.y = touch.clientY - rect.top
      this.mouse.x = this.touch.x
      this.mouse.y = this.touch.y
    }

    this._onTouchEnd = (e) => {
      e.preventDefault()
      this.touch.active = false
      this.mouse.down = false
    }

    // Keyboard
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)

    // Mouse
    canvas.addEventListener('mousedown', this._onMouseDown)
    window.addEventListener('mousemove', this._onMouseMove)
    window.addEventListener('mouseup', this._onMouseUp)

    // Touch
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false })
    canvas.addEventListener('touchend', this._onTouchEnd, { passive: false })
    canvas.addEventListener('touchcancel', this._onTouchEnd, { passive: false })
  }

  update() {
    this.mouse.prevDown = this.mouse.down
  }

  isKeyDown(key) {
    return !!this.keys[key]
  }

  isLeft() {
    return this.isKeyDown('arrowleft') || this.isKeyDown('a')
  }

  isRight() {
    return this.isKeyDown('arrowright') || this.isKeyDown('d')
  }

  isJump() {
    return this.isKeyDown('arrowup') || this.isKeyDown('w') || this.isKeyDown(' ')
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('mousemove', this._onMouseMove)
    window.removeEventListener('mouseup', this._onMouseUp)

    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this._onMouseDown)
      this.canvas.removeEventListener('touchstart', this._onTouchStart)
      this.canvas.removeEventListener('touchmove', this._onTouchMove)
      this.canvas.removeEventListener('touchend', this._onTouchEnd)
      this.canvas.removeEventListener('touchcancel', this._onTouchEnd)
    }
  }
}

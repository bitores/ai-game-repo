export class InputManager {
  constructor() {
    this.keys = {}
    this.keysJustPressed = {}
    this._onKeyDown = (e) => this._handleKeyDown(e)
    this._onKeyUp = (e) => this._handleKeyUp(e)
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
  }

  _handleKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault()
    }
    if (!this.keys[e.key]) {
      this.keysJustPressed[e.key] = true
    }
    this.keys[e.key] = true
  }

  _handleKeyUp(e) {
    this.keys[e.key] = false
  }

  isKeyDown(key) {
    return !!this.keys[key]
  }

  isKeyPressed(key) {
    return !!this.keysJustPressed[key]
  }

  clearFrame() {
    this.keysJustPressed = {}
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
  }
}

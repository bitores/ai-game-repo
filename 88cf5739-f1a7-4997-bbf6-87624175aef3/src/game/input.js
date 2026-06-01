/**
 * InputManager — handles keyboard and mouse input.
 */
export class InputManager {
  constructor() {
    this.keys = {}
    this.mouse = { x: 0, y: 0, down: false }
    this.slowActive = false
    this._prevMouseDown = false

    this._onKeyDown = (e) => {
      this.keys[e.code] = true
      if (e.code === 'Space') e.preventDefault()
    }

    this._onKeyUp = (e) => {
      this.keys[e.code] = false
    }

    this._onMouseMove = (e) => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    }

    this._onMouseDown = (e) => {
      if (e.button === 0) this.mouse.down = true
      if (e.button === 2) {
        this.slowActive = true
        e.preventDefault()
      }
    }

    this._onMouseUp = (e) => {
      if (e.button === 0) this.mouse.down = false
      if (e.button === 2) {
        this.slowActive = false
        e.preventDefault()
      }
    }

    this._onContextMenu = (e) => e.preventDefault()

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('mousemove', this._onMouseMove)
    window.addEventListener('mousedown', this._onMouseDown)
    window.addEventListener('mouseup', this._onMouseUp)
    window.addEventListener('contextmenu', this._onContextMenu)
  }

  /** Returns true when the time-slow button is being held. */
  isSlowPressed() {
    return this.slowActive || !!this.keys['Space']
  }

  /** Returns true only on the frame the left button was first pressed (edge detect). */
  wasJustPressed() {
    const justPressed = this.mouse.down && !this._prevMouseDown
    this._prevMouseDown = this.mouse.down
    return justPressed
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('mousemove', this._onMouseMove)
    window.removeEventListener('mousedown', this._onMouseDown)
    window.removeEventListener('mouseup', this._onMouseUp)
    window.removeEventListener('contextmenu', this._onContextMenu)
  }
}

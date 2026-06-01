/**
 * A short-lived text label that floats upward and fades out.
 * Used for score popups, combo announcements, and level-up messages.
 */
export class FloatingText {
  constructor(x, y, text, color = '#ffffff', size = 18) {
    this.x = x
    this.y = y
    this.text = text
    this.color = color
    this.size = size
    this.life = 0
    this.maxLife = 800 // ms
    this.done = false
  }

  /** Advance by dt milliseconds */
  update(dt) {
    this.life += dt
    this.y -= dt * 0.06
    if (this.life >= this.maxLife) {
      this.done = true
    }
  }

  /** Draw the text */
  draw(ctx) {
    if (this.done) return

    const progress = this.life / this.maxLife
    const alpha = 1 - progress

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.font = `bold ${this.size}px "Courier New", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = 6
    ctx.fillStyle = this.color
    ctx.fillText(this.text, this.x, this.y)
    ctx.restore()
  }
}

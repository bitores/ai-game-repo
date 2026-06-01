// Canvas logical size
export const GAME_WIDTH = 800
export const GAME_HEIGHT = 600

// Player
export const PLAYER_WIDTH = 26
export const PLAYER_HEIGHT = 34
export const PLAYER_SPEED = 4.5
export const JUMP_FORCE = -9.8
export const GRAVITY = 0.55
export const MAX_FALL_SPEED = 15

// Time rewind
export const MAX_REWIND_FRAMES = 360   // ~6 seconds at 60fps
export const MAX_REWIND_ENERGY = 100
export const REWIND_DRAIN_RATE = 0.6
export const REWIND_RECHARGE_RATE = 0.12

// Platform types
export const PT = {
  STATIC: 0,
  MOVING_H: 1,
  MOVING_V: 2,
  DISAPPEARING: 3,
  TIMER: 4
}

// Memory fragment
export const FRAGMENT_SIZE = 14

// Game states
export const GS = {
  MENU: 'menu',
  PLAYING: 'playing',
  REWINDING: 'rewinding',
  PAUSED: 'paused',
  LEVEL_COMPLETE: 'levelComplete',
  GAME_OVER: 'gameOver',
  DYING: 'dying'
}

// Colors (themed)
export const COLORS = {
  space: ['#0a0a2e', '#1a0a3e', '#0d0d3d'],
  platform: '#4a7c8a',
  platformTop: '#6ac8d8',
  player: '#00d4ff',
  playerGlow: 'rgba(0, 212, 255, 0.4)',
  fragment: '#ffd700',
  fragmentGlow: 'rgba(255, 215, 0, 0.5)',
  rewind: '#9944ff',
  rewindGlow: 'rgba(153, 68, 255, 0.3)',
  text: '#ffffff',
  textDim: 'rgba(255, 255, 255, 0.6)'
}

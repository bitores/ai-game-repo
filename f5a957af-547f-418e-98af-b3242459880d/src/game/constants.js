// Canvas logical size
export const GAME_WIDTH = 800
export const GAME_HEIGHT = 600

// Player
export const PLAYER_WIDTH = 26
export const PLAYER_HEIGHT = 34
export const PLAYER_SPEED = 4.5
export const JUMP_FORCE = -14
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
  TIMER: 4,
  SPRING: 5,        // Bouncy platform
  CONVEYOR: 6       // Moving belt platform
}

// Data fragment
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

// Colors (code/data theme)
export const COLORS = {
  space: ['#0a0a1a', '#0a1a0a', '#0d0d1a'],
  platform: '#2a5a3a',
  platformTop: '#4ae87a',
  platformMoving: '#3a8ac8',
  platformMovingTop: '#6ac8f8',
  platformDisappear: '#c87a3a',
  platformDisappearTop: '#f8b84a',
  platformTimer: '#7a4ac8',
  platformTimerTop: '#b87af8',
  platformSpring: '#e84a4a',
  platformSpringTop: '#f87a7a',
  platformConveyor: '#4a7ac8',
  platformConveyorTop: '#7ab8f8',
  player: '#00e876',
  playerGlow: 'rgba(0, 232, 118, 0.4)',
  playerRewind: '#b87af8',
  playerRewindGlow: 'rgba(184, 122, 248, 0.4)',
  fragment: '#00d4ff',
  fragmentGlow: 'rgba(0, 212, 255, 0.5)',
  fragmentData: '#00e876',
  fragmentDataGlow: 'rgba(0, 232, 118, 0.5)',
  rewind: '#b87af8',
  rewindGlow: 'rgba(184, 122, 248, 0.3)',
  text: '#ffffff',
  textDim: 'rgba(255, 255, 255, 0.6)',
  codeBg: 'rgba(0, 40, 20, 0.15)',
  codeLine: 'rgba(0, 232, 118, 0.08)'
}

// Data fragment types for visual variety
export const DATA_TYPE = {
  CODE: 0,      // </> bracket symbol
  DATABASE: 1,  // Database cylinder
  NETWORK: 2,   // Network node
  CLOUD: 3      // Cloud computing
}

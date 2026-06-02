extends Node
## Global game state manager (autoload).

signal game_started()
signal game_over(reason: String)  # "lose" or "win"
signal gems_changed(count: int)
signal lives_changed(count: int)
signal energy_changed(value: float)
signal flash_cooldown_changed(ready: bool)

enum GameState { MENU, PLAYING, PAUSED, GAME_OVER, VICTORY }

var state: GameState = GameState.MENU

# Player stats
var lives: int = 3
var gems_collected: int = 0
var total_gems: int = 5
var energy: float = 0.0
var max_energy: float = 100.0
var flash_ready: bool = true
var flash_cooldown: float = 0.0
var flash_cooldown_max: float = 5.0
var passive_regen_rate: float = 2.0  # Energy per second from passive regen

# Timing
var game_time: float = 0.0
var start_time: float = 0.0

func reset_game() -> void:
	lives = 3
	gems_collected = 0
	energy = 0.0
	flash_ready = true
	flash_cooldown = 0.0
	game_time = 0.0
	state = GameState.PLAYING
	emit_signal("lives_changed", lives)
	emit_signal("gems_changed", gems_collected)
	emit_signal("energy_changed", energy)
	emit_signal("flash_cooldown_changed", true)
	emit_signal("game_started")

func collect_gem() -> void:
	gems_collected += 1
	energy += max_energy / total_gems
	if energy > max_energy:
		energy = max_energy
	emit_signal("gems_changed", gems_collected)
	emit_signal("energy_changed", energy)

func take_damage() -> void:
	lives -= 1
	emit_signal("lives_changed", lives)
	if lives <= 0:
		state = GameState.GAME_OVER
		emit_signal("game_over", "lose")

func use_flash() -> bool:
	if not flash_ready:
		return false
	flash_ready = false
	flash_cooldown = flash_cooldown_max
	energy = 0.0
	emit_signal("flash_cooldown_changed", false)
	emit_signal("energy_changed", energy)
	return true

func _process(delta: float) -> void:
	if state == GameState.PLAYING:
		game_time += delta

		# Passive energy regeneration
		if energy < max_energy:
			energy = min(energy + passive_regen_rate * delta, max_energy)
			energy_changed.emit(energy)

		# Flash cooldown
		if not flash_ready:
			flash_cooldown -= delta
			if flash_cooldown <= 0.0:
				flash_ready = true
				flash_cooldown = 0.0
				flash_cooldown_changed.emit(true)

func win_game() -> void:
	state = GameState.VICTORY
	emit_signal("game_over", "win")

func get_elapsed_time() -> float:
	return game_time

func get_rating() -> String:
	var t := game_time
	if t < 60.0:
		return "S"
	elif t < 120.0:
		return "A"
	elif t < 180.0:
		return "B"
	elif t < 300.0:
		return "C"
	else:
		return "D"

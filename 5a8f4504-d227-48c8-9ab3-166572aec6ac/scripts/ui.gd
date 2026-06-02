extends CanvasLayer
## HUD overlay - shows lives, gems, energy, timer, flash cooldown.

@onready var lives_label: Label = $%LivesLabel
@onready var gems_label: Label = $%GemsLabel
@onready var energy_bar: TextureProgressBar = $%EnergyBar
@onready var timer_label: Label = $%TimerLabel
@onready var flash_icon: TextureRect = $%FlashIcon
@onready var flash_cooldown_bar: TextureProgressBar = $%FlashCooldownBar
@onready var message_label: Label = $%MessageLabel

func _ready() -> void:
	Global.lives_changed.connect(_on_lives_changed)
	Global.gems_changed.connect(_on_gems_changed)
	Global.energy_changed.connect(_on_energy_changed)
	Global.flash_cooldown_changed.connect(_on_flash_cooldown_changed)
	# Generate simple textures for progress bars
	_generate_bar_textures()

func _generate_bar_textures() -> void:
	var img := Image.create(2, 2, false, Image.FORMAT_RGBA8)
	img.fill(Color.WHITE)
	var tex := ImageTexture.create_from_image(img)
	var bg_img := Image.create(2, 2, false, Image.FORMAT_RGBA8)
	bg_img.fill(Color(0.5, 0.5, 0.5, 0.5))
	var bg_tex := ImageTexture.create_from_image(bg_img)
	energy_bar.texture_progress = tex
	energy_bar.texture_under = bg_tex
	flash_cooldown_bar.texture_progress = tex
	flash_cooldown_bar.texture_under = bg_tex

func _process(delta: float) -> void:
	if Global.state == Global.GameState.PLAYING:
		var t := Global.get_elapsed_time()
		var mins := int(t) / 60
		var secs := int(t) % 60
		timer_label.text = "%02d:%02d" % [mins, secs]
		# Update flash cooldown bar
		if not Global.flash_ready:
			var cooldown_pct := (Global.flash_cooldown / Global.flash_cooldown_max) * 100.0
			flash_cooldown_bar.value = cooldown_pct

func _on_lives_changed(count: int) -> void:
	lives_label.text = "♥ " + str(count)
	# Flash red if low
	if count <= 1:
		lives_label.modulate = Color(1, 0.3, 0.3)
	else:
		lives_label.modulate = Color(1, 1, 1)

func _on_gems_changed(count: int) -> void:
	gems_label.text = "💎 %d/%d" % [count, Global.total_gems]

func _on_energy_changed(value: float) -> void:
	energy_bar.value = value

func _on_flash_cooldown_changed(ready: bool) -> void:
	flash_icon.modulate = Color(1, 1, 1, 1.0 if ready else 0.3)
	flash_cooldown_bar.visible = not ready

func show_message(text: String, duration: float = 2.0) -> void:
	message_label.text = text
	message_label.modulate = Color(1, 1, 1, 1)
	var tween := create_tween()
	tween.tween_property(message_label, "modulate", Color(1, 1, 1, 0), duration).set_delay(0.5)

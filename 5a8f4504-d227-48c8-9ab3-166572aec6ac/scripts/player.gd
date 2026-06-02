extends CharacterBody2D
## Player-controlled light orb.

const SPEED: float = 180.0

var move_direction: Vector2 = Vector2.ZERO
var is_flashing: bool = false
var flash_timer: float = 0.0
var flash_duration: float = 0.5
var invincible: bool = false
var invincible_timer: float = 0.0
var invincible_duration: float = 1.5

@onready var sprite: Sprite2D = $Sprite2D
@onready var glow_sprite: Sprite2D = $GlowSprite
@onready var trail_particles: GPUParticles2D = $TrailParticles
@onready var flash_particles: GPUParticles2D = $FlashParticles
@onready var hurt_sound: AudioStreamPlayer2D = $HurtSound
@onready var gem_sound: AudioStreamPlayer2D = $GemSound
@onready var flash_sound: AudioStreamPlayer2D = $FlashSound
@onready var collision: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	# Generate sprite textures procedurally
	_generate_sprites()
	_generate_sounds()
	trail_particles.emitting = true

func _generate_sounds() -> void:
	# Generate simple audio streams procedurally
	# Hurt sound - low buzz
	var hurt_stream := _create_tone_stream(150.0, 0.15, 0.5)
	hurt_sound.stream = hurt_stream
	# Gem sound - bright chime
	var gem_stream := _create_tone_stream(880.0, 0.1, 0.3)
	gem_sound.stream = gem_stream
	# Flash sound - whoosh
	var flash_stream := _create_tone_stream(440.0, 0.2, 0.4)
	flash_sound.stream = flash_stream

func _create_tone_stream(freq: float, duration: float, volume: float) -> AudioStreamWAV:
	var sample_rate := 22050
	var num_samples := int(sample_rate * duration)
	var data := PackedByteArray()
	data.resize(num_samples * 2)  # 16-bit mono

	for i in range(num_samples):
		var t := float(i) / sample_rate
		var envelope := 1.0 - float(i) / num_samples
		var value := sin(2.0 * PI * freq * t) * envelope * volume * 0.5
		var sample := clampi(int(value * 32767.0), -32768, 32767)
		data.encode_s16(i * 2, sample)

	var wav := AudioStreamWAV.new()
	wav.data = data
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	return wav

func _generate_sprites() -> void:
	# --- Player body (white/yellow circle) ---
	var img := Image.create(32, 32, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var center := Vector2(16, 16)
	for y in range(32):
		for x in range(32):
			var d := Vector2(x, y).distance_to(center)
			if d < 12.0:
				var alpha := 1.0
				if d > 8.0:
					alpha = 1.0 - (d - 8.0) / 4.0
				var c := Color(1.0, 0.95, 0.7, alpha)
				img.set_pixel(x, y, c)
	var tex := ImageTexture.create_from_image(img)
	sprite.texture = tex

	# --- Glow (larger, transparent yellow) ---
	var glow_img := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	glow_img.fill(Color(0, 0, 0, 0))
	var glow_center := Vector2(32, 32)
	for y in range(64):
		for x in range(64):
			var d := Vector2(x, y).distance_to(glow_center)
			if d < 28.0:
				var alpha := 0.3 * (1.0 - d / 28.0)
				var c := Color(1.0, 0.85, 0.3, alpha)
				glow_img.set_pixel(x, y, c)
	var glow_tex := ImageTexture.create_from_image(glow_img)
	glow_sprite.texture = glow_tex

func _process(delta: float) -> void:
	# Handle flash visual
	if is_flashing:
		flash_timer -= delta
		if flash_timer <= 0.0:
			is_flashing = false
			modulate = Color(1, 1, 1, 1)
			sprite.visible = true
			glow_sprite.visible = true

	# Handle invincibility blink
	if invincible:
		invincible_timer -= delta
		sprite.visible = fmod(invincible_timer, 0.1) < 0.05
		if invincible_timer <= 0.0:
			invincible = false
			sprite.visible = true
			modulate = Color(1, 1, 1, 1)

	# Pulse glow
	if not is_flashing:
		var pulse := 0.85 + 0.15 * sin(Time.get_ticks_msec() * 0.004)
		glow_sprite.modulate = Color(1, 1, 1, pulse * 0.6)

func _physics_process(delta: float) -> void:
	if Global.state != Global.GameState.PLAYING:
		velocity = Vector2.ZERO
		move_and_slide()
		return

	# Keyboard input
	var input_dir := Input.get_vector(&"move_left", &"move_right", &"move_up", &"move_down")
	if move_direction.length_squared() > 0.01:
		# Touch input overrides
		input_dir = move_direction

	if input_dir.length_squared() > 0.01:
		velocity = input_dir.normalized() * SPEED
	else:
		velocity = Vector2.ZERO

	move_and_slide()

	# Check flash input
	if Input.is_action_just_pressed(&"flash"):
		_do_flash()

func _do_flash() -> void:
	if Global.use_flash():
		is_flashing = true
		flash_timer = flash_duration
		modulate = Color(1, 1, 1, 1.5)
		flash_particles.emitting = true
		flash_sound.play()
		# Broadcast to monsters
		get_tree().call_group(&"monsters", &"on_flash")

func activate_flash() -> void:
	_do_flash()

func on_hit() -> void:
	if invincible or Global.state != Global.GameState.PLAYING:
		return
	Global.take_damage()
	invincible = true
	invincible_timer = invincible_duration
	modulate = Color(1, 1, 1, 0.5)
	hurt_sound.play()

func on_gem_collected() -> void:
	gem_sound.play()
	Global.collect_gem()

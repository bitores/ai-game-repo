extends Area2D
## Glowing gem pickup - grants energy to the player.

@export var gem_color: Color = Color(0.2, 0.8, 1.0)

@onready var sprite: Sprite2D = $Sprite2D
@onready var glow_sprite: Sprite2D = $GlowSprite
@onready var glow_particles: GPUParticles2D = $GlowParticles
@onready var collect_sound: AudioStreamPlayer2D = $CollectSound
@onready var collision: CollisionShape2D = $CollisionShape2D

var collected: bool = false
var initial_position: Vector2

# Predefined colors
const GEM_COLORS: Array[Color] = [
	Color(0.2, 0.8, 1.0),  # Cyan
	Color(1.0, 0.3, 0.5),  # Pink
	Color(0.3, 1.0, 0.4),  # Green
	Color(1.0, 0.8, 0.1),  # Gold
	Color(0.7, 0.3, 1.0),  # Purple
]

func _ready() -> void:
	# Assign a color based on index in group
	var idx := get_index()
	if idx < GEM_COLORS.size():
		gem_color = GEM_COLORS[idx]

	initial_position = position
	_generate_sprites()
	_generate_sound()
	body_entered.connect(_on_body_entered)

func _generate_sound() -> void:
	# Create a bright chime sound
	var sample_rate := 22050
	var duration := 0.2
	var num_samples := int(sample_rate * duration)
	var data := PackedByteArray()
	data.resize(num_samples * 2)

	for i in range(num_samples):
		var t := float(i) / sample_rate
		var envelope := 1.0 - float(i) / num_samples
		# Two tones for a chime effect
		var value := (sin(2.0 * PI * 880.0 * t) * 0.4 + sin(2.0 * PI * 1320.0 * t) * 0.3) * envelope * 0.3
		var sample := clampi(int(value * 32767.0), -32768, 32767)
		data.encode_s16(i * 2, sample)

	var wav := AudioStreamWAV.new()
	wav.data = data
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	collect_sound.stream = wav

	# Set particle color
	var process_mat := glow_particles.process_material as ParticleProcessMaterial
	if process_mat:
		process_mat.color = gem_color

func _generate_sprites() -> void:
	# Diamond shape gem
	var img := Image.create(24, 24, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var center := Vector2(12, 12)
	for y in range(24):
		for x in range(24):
			var dx := x - center.x
			var dy := y - center.y
			# Diamond shape using manhattan distance
			var half_w := 10.0
			var half_h := 10.0
			var nx := dx / half_w
			var ny := (abs(dy) / half_h) * 1.5
			if abs(nx) + ny <= 1.0:
				var alpha := 1.0 - (abs(dx) / half_w) * 0.3
				var c := gem_color
				c.a = alpha * 0.9
				img.set_pixel(x, y, c)
			elif abs(nx) + ny <= 1.2:
				var c := gem_color
				c.a = 0.2
				img.set_pixel(x, y, c)
	var tex := ImageTexture.create_from_image(img)
	sprite.texture = tex
	sprite.centered = true

	# Glow
	var glow_img := Image.create(40, 40, false, Image.FORMAT_RGBA8)
	glow_img.fill(Color(0, 0, 0, 0))
	var gc := Vector2(20, 20)
	for y in range(40):
		for x in range(40):
			var d := Vector2(x, y).distance_to(gc)
			if d < 18.0:
				var alpha := 0.25 * (1.0 - d / 18.0)
				var c := gem_color
				c.a = alpha
				glow_img.set_pixel(x, y, c)
	var glow_tex := ImageTexture.create_from_image(glow_img)
	glow_sprite.texture = glow_tex

func _process(delta: float) -> void:
	if collected:
		return

	# Float animation (relative to initial position to prevent drift)
	position.y = initial_position.y + sin(Time.get_ticks_msec() * 0.003) * 3.0

	# Rotate
	sprite.rotation += delta * 1.5

	# Pulse glow
	var pulse := 0.7 + 0.3 * sin(Time.get_ticks_msec() * 0.005)
	glow_sprite.modulate = Color(1, 1, 1, pulse * 0.7)

func _on_body_entered(body: Node2D) -> void:
	if collected:
		return
	if body.is_in_group(&"player"):
		collected = true
		sprite.visible = false
		glow_sprite.visible = false
		glow_particles.emitting = true
		collision.set_deferred(&"disabled", true)
		collect_sound.play()
		body.on_gem_collected()
		# Queue free after sound plays
		await get_tree().create_timer(0.8).timeout
		queue_free()

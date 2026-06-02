extends Area2D
## Exit portal - win condition. Only activates when all gems collected.

@onready var sprite: Sprite2D = $Sprite2D
@onready var glow_sprite: Sprite2D = $GlowSprite
@onready var portal_particles: GPUParticles2D = $PortalParticles
@onready var locked_label: Label = $LockedLabel
@onready var collision_shape: CollisionShape2D = $CollisionShape2D

var active: bool = false

func _ready() -> void:
	_generate_sprites()
	_update_state()
	body_entered.connect(_on_body_entered)

func _generate_sprites() -> void:
	# Portal ring
	var img := Image.create(48, 48, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var center := Vector2(24, 24)
	for y in range(48):
		for x in range(48):
			var d := Vector2(x, y).distance_to(center)
			if d > 14.0 and d < 22.0:
				var alpha := 1.0 - abs(d - 18.0) / 4.0
				var c := Color(0.3, 0.8, 1.0, alpha * 0.8)
				img.set_pixel(x, y, c)
			elif d <= 14.0:
				var alpha := 0.3 * (1.0 - d / 14.0)
				var c := Color(0.5, 0.9, 1.0, alpha)
				img.set_pixel(x, y, c)
	var tex := ImageTexture.create_from_image(img)
	sprite.texture = tex

	# Glow
	var glow_img := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	glow_img.fill(Color(0, 0, 0, 0))
	var gc := Vector2(32, 32)
	for y in range(64):
		for x in range(64):
			var d := Vector2(x, y).distance_to(gc)
			if d < 30.0:
				var alpha := 0.2 * (1.0 - d / 30.0)
				var c := Color(0.3, 0.7, 1.0, alpha)
				glow_img.set_pixel(x, y, c)
	var glow_tex := ImageTexture.create_from_image(glow_img)
	glow_sprite.texture = glow_tex

func _process(delta: float) -> void:
	var should_be_active := Global.gems_collected >= Global.total_gems
	if should_be_active != active:
		active = should_be_active
		_update_state()

	# Animate portal
	var pulse := 0.8 + 0.2 * sin(Time.get_ticks_msec() * 0.003)
	sprite.modulate = Color(1, 1, 1, pulse * (0.5 if not active else 1.0))
	glow_sprite.modulate = Color(1, 1, 1, pulse * (0.3 if not active else 0.7))
	sprite.rotation += delta * 0.5

func _update_state() -> void:
	locked_label.visible = not active
	portal_particles.emitting = active
	if active:
		portal_particles.emitting = true

func _on_body_entered(body: Node2D) -> void:
	if not active:
		return
	if body.is_in_group(&"player"):
		Global.win_game()

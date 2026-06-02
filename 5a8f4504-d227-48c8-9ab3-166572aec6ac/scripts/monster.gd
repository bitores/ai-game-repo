extends CharacterBody2D
## Shadow monster - patrols the maze and chases the player.

enum State { PATROL, CHASE, STUNNED }

const PATROL_SPEED: float = 60.0
const CHASE_SPEED: float = 90.0
const STUN_DURATION: float = 3.0

var state: State = State.PATROL
var stun_timer: float = 0.0
var patrol_target: Vector2 = Vector2.ZERO
var patrol_wait_time: float = 0.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var eye_sprite: Sprite2D = $EyeSprite
@onready var detection_area: Area2D = $DetectionArea

func _ready() -> void:
	add_to_group(&"monsters")
	_generate_sprites()
	_pick_new_patrol_target()
	# Randomize start
	patrol_wait_time = randf_range(0.5, 2.0)
	# Create hitbox Area2D for player damage detection
	# (CharacterBody2D does not emit body_entered, so we use an Area2D child)
	var hitbox := Area2D.new()
	hitbox.name = "Hitbox"
	hitbox.collision_layer = 0  # Don't add to any physics layer (avoids movement interference)
	hitbox.collision_mask = 2   # Detect player (layer 2)
	var hitbox_shape := CollisionShape2D.new()
	hitbox_shape.shape = CircleShape2D.new()
	hitbox_shape.shape.radius = 12.0
	hitbox.add_child(hitbox_shape)
	add_child(hitbox)
	hitbox.body_entered.connect(_on_hitbox_body_entered)
	# Connect detection area signals
	detection_area.body_entered.connect(_on_detection_area_body_entered)
	detection_area.body_exited.connect(_on_detection_area_body_exited)

func _generate_sprites() -> void:
	# Monster body - dark semi-transparent blob
	var img := Image.create(40, 40, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var center := Vector2(20, 20)
	for y in range(40):
		for x in range(40):
			var d := Vector2(x, y).distance_to(center)
			# Irregular blob shape
			var angle := atan2(float(y) - center.y, float(x) - center.x)
			var radius := 14.0 + 4.0 * sin(angle * 3.0)
			if d < radius:
				var alpha := 0.5 * (1.0 - d / radius * 0.5)
				var c := Color(0.05, 0.02, 0.1, alpha)
				if d > radius * 0.7:
					c = Color(0.1, 0.05, 0.15, alpha * 0.6)
				img.set_pixel(x, y, c)
	var tex := ImageTexture.create_from_image(img)
	sprite.texture = tex
	sprite.centered = true

	# Glowing eyes
	var eye_img := Image.create(12, 8, false, Image.FORMAT_RGBA8)
	eye_img.fill(Color(0, 0, 0, 0))
	for y in range(8):
		for x in range(12):
			var dx := (x - 3)
			var dy := (y - 4)
			if dx * dx + dy * dy < 6:
				var c := Color(1.0, 0.15, 0.1, 0.9)
				eye_img.set_pixel(x, y, c)
			dx = (x - 9)
			dy = (y - 4)
			if dx * dx + dy * dy < 6:
				var c := Color(1.0, 0.15, 0.1, 0.9)
				eye_img.set_pixel(x, y, c)
	var eye_tex := ImageTexture.create_from_image(eye_img)
	eye_sprite.texture = eye_tex

func _physics_process(delta: float) -> void:
	if Global.state != Global.GameState.PLAYING:
		velocity = Vector2.ZERO
		move_and_slide()
		return

	match state:
		State.PATROL:
			_process_patrol(delta)
		State.CHASE:
			_process_chase(delta)
		State.STUNNED:
			_process_stunned(delta)

	# Body pulse animation
	var pulse := 0.85 + 0.15 * sin(Time.get_ticks_msec() * 0.003 + position.length() * 0.01)
	sprite.modulate = Color(1, 1, 1, pulse * 0.7)
	eye_sprite.modulate = Color(1, 0.2 + 0.8 * pulse, 0.1, 1.0)

func _process_patrol(delta: float) -> void:
	if patrol_wait_time > 0.0:
		patrol_wait_time -= delta
		velocity = Vector2.ZERO
		move_and_slide()
		return

	var dir := global_position.direction_to(patrol_target)
	velocity = dir * PATROL_SPEED
	move_and_slide()

	if global_position.distance_to(patrol_target) < 8.0:
		_pick_new_patrol_target()
		patrol_wait_time = randf_range(1.0, 3.0)

func _process_chase(delta: float) -> void:
	var player := get_tree().get_first_node_in_group(&"player")
	if not player:
		state = State.PATROL
		return

	var dir := global_position.direction_to(player.global_position)
	velocity = dir * CHASE_SPEED
	move_and_slide()

	# If player is far, go back to patrol
	if global_position.distance_to(player.global_position) > 250.0:
		state = State.PATROL
		_pick_new_patrol_target()

func _process_stunned(delta: float) -> void:
	stun_timer -= delta
	velocity = Vector2.ZERO
	sprite.modulate = Color(1, 1, 1, 0.2 + 0.2 * sin(Time.get_ticks_msec() * 0.01))
	eye_sprite.visible = false

	if stun_timer <= 0.0:
		state = State.PATROL
		eye_sprite.visible = true
		_pick_new_patrol_target()

func _pick_new_patrol_target() -> void:
	var cell := MazeData.get_random_open_cell()
	patrol_target = MazeData.cell_to_world(cell)

func _on_detection_area_body_entered(body: Node2D) -> void:
	if body.is_in_group(&"player") and state != State.STUNNED:
		state = State.CHASE

func _on_detection_area_body_exited(body: Node2D) -> void:
	if body.is_in_group(&"player") and state == State.CHASE:
		state = State.PATROL
		_pick_new_patrol_target()

func on_flash() -> void:
	if state == State.STUNNED:
		return
	state = State.STUNNED
	stun_timer = STUN_DURATION

func _on_hitbox_body_entered(body: Node2D) -> void:
	if body.is_in_group(&"player") and state != State.STUNNED:
		body.on_hit()

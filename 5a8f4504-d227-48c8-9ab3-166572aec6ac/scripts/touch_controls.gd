extends Control
## Virtual joystick (left) and flash button (right) for touch input.

signal joystick_moved(direction: Vector2)
signal flash_pressed()

@onready var joystick_base: TextureRect = $%JoystickBase
@onready var joystick_handle: TextureRect = $%JoystickHandle
@onready var flash_button: TextureRect = $%FlashButton
@onready var flash_cooldown_overlay: TextureRect = $%FlashCooldownOverlay

var joystick_radius: float = 50.0
var handle_radius: float = 20.0
var joystick_active: bool = false
var joystick_touch_id: int = -1
var joystick_center: Vector2 = Vector2.ZERO
var joystick_value: Vector2 = Vector2.ZERO
var flash_touch_id: int = -1

func _ready() -> void:
	joystick_center = joystick_base.position + joystick_base.size / 2
	Global.flash_cooldown_changed.connect(_on_flash_cooldown)

func _input(event: InputEvent) -> void:
	if Global.state != Global.GameState.PLAYING:
		return

	if event is InputEventScreenTouch:
		_handle_touch_event(event)

	if event is InputEventScreenDrag:
		_handle_drag_event(event)

func _handle_touch_event(event: InputEventScreenTouch) -> void:
	if event.pressed:
		# Check joystick area
		if joystick_touch_id == -1:
			var dist := event.position.distance_to(joystick_center)
			if dist < joystick_radius * 2.0:
				joystick_touch_id = event.index
				joystick_active = true
				_update_joystick(event.position)
				return

		# Check flash button area
		if flash_touch_id == -1:
			var fb_center := flash_button.position + flash_button.size / 2
			var fb_dist := event.position.distance_to(fb_center)
			if fb_dist < 40.0:
				flash_touch_id = event.index
				flash_button.modulate = Color(1, 1, 1, 0.8)
				if Global.flash_ready:
					_on_flash_button_pressed()
				return
	else:
		# Release
		if event.index == joystick_touch_id:
			joystick_touch_id = -1
			joystick_active = false
			joystick_value = Vector2.ZERO
			joystick_handle.position = joystick_base.position
			joystick_moved.emit(Vector2.ZERO)

		if event.index == flash_touch_id:
			flash_touch_id = -1
			flash_button.modulate = Color(1, 1, 1, 0.5)

func _handle_drag_event(event: InputEventScreenDrag) -> void:
	if event.index == joystick_touch_id:
		_update_joystick(event.position)

	if event.index == flash_touch_id:
		# Check if finger slid too far off button
		var fb_center := flash_button.position + flash_button.size / 2
		if event.position.distance_to(fb_center) > 60.0:
			flash_touch_id = -1
			flash_button.modulate = Color(1, 1, 1, 0.5)

func _update_joystick(touch_pos: Vector2) -> void:
	var offset := touch_pos - joystick_center
	var dist := min(offset.length(), joystick_radius)

	if dist > 0:
		var dir := offset.normalized()
		joystick_value = dir * (dist / joystick_radius)
		joystick_handle.position = joystick_base.position + dir * dist - Vector2(handle_radius, handle_radius)
	else:
		joystick_value = Vector2.ZERO
		joystick_handle.position = joystick_base.position

	joystick_moved.emit(joystick_value)

func _on_flash_button_pressed() -> void:
	flash_pressed.emit()

func _on_flash_cooldown(ready: bool) -> void:
	flash_cooldown_overlay.visible = not ready

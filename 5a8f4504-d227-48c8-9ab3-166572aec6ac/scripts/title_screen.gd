extends CanvasLayer
## Title screen - main menu.

@onready var start_button: Button = $%StartButton
@onready var title_label: Label = $%TitleLabel
@onready var instructions_label: Label = $%InstructionsLabel
@onready var bg_particles: GPUParticles2D = $%BGParticles

func _ready() -> void:
	Global.state = Global.GameState.MENU
	start_button.pressed.connect(_on_start_pressed)

func _process(delta: float) -> void:
	# Animate title
	var pulse := 0.9 + 0.1 * sin(Time.get_ticks_msec() * 0.002)
	title_label.modulate = Color(1, 1, 1, pulse)

func _on_start_pressed() -> void:
	Global.reset_game()
	get_tree().change_scene_to_file("res://scenes/main.tscn")

extends CanvasLayer
## Game over screen - shown when player loses all lives.

@onready var retry_button: Button = $%RetryButton
@onready var menu_button: Button = $%MenuButton

func _ready() -> void:
	Global.state = Global.GameState.GAME_OVER
	retry_button.pressed.connect(_on_retry)
	menu_button.pressed.connect(_on_menu)

func _on_retry() -> void:
	Global.reset_game()
	get_tree().change_scene_to_file("res://scenes/main.tscn")

func _on_menu() -> void:
	Global.state = Global.GameState.MENU
	get_tree().change_scene_to_file("res://scenes/title_screen.tscn")

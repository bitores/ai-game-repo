extends CanvasLayer
## Victory screen - shown when player collects all gems and reaches exit.

@onready var time_label: Label = $%TimeLabel
@onready var rating_label: Label = $%RatingLabel
@onready var gems_label: Label = $%GemsLabel
@onready var lives_label: Label = $%LivesLabel
@onready var retry_button: Button = $%RetryButton
@onready var menu_button: Button = $%MenuButton
@onready var victory_label: Label = $%VictoryLabel
@onready var bg_particles: GPUParticles2D = $%BGParticles

func _ready() -> void:
	Global.state = Global.GameState.VICTORY

	var elapsed := Global.get_elapsed_time()
	var mins := int(elapsed) / 60
	var secs := int(elapsed) % 60
	var millis := int(fmod(elapsed, 1.0) * 100)

	time_label.text = "通关时间: %02d:%02d.%02d" % [mins, secs, millis]

	var rating := Global.get_rating()
	var rating_text := ""
	var rating_color := Color(1, 1, 1)
	match rating:
		"S":
			rating_text = "S - 完美通关！传奇光辉！"
			rating_color = Color(1, 0.8, 0.1)
		"A":
			rating_text = "A - 非常出色！流光溢彩！"
			rating_color = Color(0.3, 1.0, 0.4)
		"B":
			rating_text = "B - 表现良好，继续加油！"
			rating_color = Color(0.3, 0.8, 1.0)
		"C":
			rating_text = "C - 还需更多练习！"
			rating_color = Color(1.0, 0.6, 0.2)
		"D":
			rating_text = "D - 慢慢来，不着急~"
			rating_color = Color(1.0, 0.3, 0.3)

	rating_label.text = rating_text
	rating_label.modulate = rating_color

	var remaining_lives := Global.lives
	lives_label.text = "剩余生命: %d" % remaining_lives

	gems_label.text = "宝石收集: %d/%d" % [Global.total_gems, Global.total_gems]

	retry_button.pressed.connect(_on_retry)
	menu_button.pressed.connect(_on_menu)

func _process(delta: float) -> void:
	# Animate victory text
	var pulse := 0.9 + 0.1 * sin(Time.get_ticks_msec() * 0.003)
	victory_label.modulate = Color(1, 1, 1, pulse)

func _on_retry() -> void:
	Global.reset_game()
	get_tree().change_scene_to_file("res://scenes/main.tscn")

func _on_menu() -> void:
	Global.state = Global.GameState.MENU
	get_tree().change_scene_to_file("res://scenes/title_screen.tscn")

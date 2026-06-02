extends Node2D
## Main game scene - manages maze, player, monsters, gems, and exit.

@onready var maze_layer: TileMapLayer = $MazeLayer
@onready var player: CharacterBody2D = $Player
@onready var monsters: Node2D = $Monsters
@onready var gems: Node2D = $Gems
@onready var exit_gate: Area2D = $ExitGate
@onready var ambient_particles: GPUParticles2D = $AmbientParticles
@onready var ui: CanvasLayer = $UI
@onready var touch_controls: Control = $TouchControls

# Monster scene to instance
var monster_scene: PackedScene

func _ready() -> void:
	Global.game_started.connect(_on_game_started)
	Global.game_over.connect(_on_game_over)
	# Connect touch controls signals
	touch_controls.flash_pressed.connect(_on_touch_flash_pressed)
	touch_controls.joystick_moved.connect(_on_joystick_moved)
	_build_maze()

func _build_maze() -> void:
	# Create wall tiles
	_generate_wall_tiles()

	# Position player
	player.position = MazeData.cell_to_world(MazeData.player_start)

	# Place exit gate
	exit_gate.position = MazeData.cell_to_world(MazeData.exit_pos)

	# Place gems
	for i in range(MazeData.gem_positions.size()):
		var pos := MazeData.gem_positions[i]
		var gem_scene := preload("res://scenes/gem.tscn")
		var gem := gem_scene.instantiate()
		gem.position = MazeData.cell_to_world(pos)
		gems.add_child(gem)

	# Create monsters
	for spawn_pos in MazeData.monster_spawns:
		var mon := _create_monster()
		mon.position = MazeData.cell_to_world(spawn_pos)
		monsters.add_child(mon)

	# Configure ambient particles
	var process_mat := ambient_particles.process_material as ParticleProcessMaterial
	if process_mat:
		process_mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
		process_mat.emission_box_extents = Vector3(640, 360, 0)

	# Hide touch controls on non-touch devices
	var is_touch := DisplayServer.is_touchscreen_available()
	touch_controls.visible = is_touch

func _generate_wall_tiles() -> void:
	# Create a simple wall texture procedurally
	var wall_img := Image.create(MazeData.TILE_SIZE, MazeData.TILE_SIZE, false, Image.FORMAT_RGBA8)
	var dark_color := Color(0.08, 0.08, 0.14)
	var border_color := Color(0.12, 0.12, 0.2)
	var accent_color := Color(0.15, 0.12, 0.25)

	for y in range(MazeData.TILE_SIZE):
		for x in range(MazeData.TILE_SIZE):
			var c := dark_color
			# Border
			if x < 2 or x >= MazeData.TILE_SIZE - 2 or y < 2 or y >= MazeData.TILE_SIZE - 2:
				c = border_color
			# Random stone pattern
			elif (x + y) % 16 < 2 or (x - y + MazeData.TILE_SIZE) % 16 < 2:
				c = accent_color
			wall_img.set_pixel(x, y, c)

	var wall_tex := ImageTexture.create_from_image(wall_img)

	# Create tileset and set tiles
	var tileset := TileSet.new()
	var source := TileSetAtlasSource.new()
	source.texture = wall_tex
	source.margins = Vector2i(0, 0)
	source.texture_region_size = Vector2i(MazeData.TILE_SIZE, MazeData.TILE_SIZE)
	var source_id := tileset.add_source(source)
	var atlas_coords := Vector2i(0, 0)
	source.create_tile(atlas_coords)

	# Add physics collision to the wall tile
	var tile_data := source.get_tile_data(atlas_coords, 0)
	if tile_data:
		var poly := PackedVector2Array([
			Vector2(0, 0),
			Vector2(MazeData.TILE_SIZE, 0),
			Vector2(MazeData.TILE_SIZE, MazeData.TILE_SIZE),
			Vector2(0, MazeData.TILE_SIZE)
		])
		tile_data.add_collision_polygon(0)
		tile_data.set_collision_polygon_points(0, 0, poly)

	maze_layer.tile_set = tileset

	# Build the maze
	for r in range(MazeData.ROWS):
		for c in range(MazeData.COLS):
			if MazeData.grid[r][c] == MazeData.CellType.WALL:
				maze_layer.set_cell(Vector2i(c, r), source_id, atlas_coords)

func _create_monster() -> Node2D:
	var mon_scene := preload("res://scenes/monster.tscn")
	var mon := mon_scene.instantiate()
	return mon

func _on_game_started() -> void:
	# Reset player position
	player.position = MazeData.cell_to_world(MazeData.player_start)

func _on_game_over(reason: String) -> void:
	if reason == "win":
		get_tree().change_scene_to_file("res://scenes/victory.tscn")
	else:
		get_tree().change_scene_to_file("res://scenes/game_over.tscn")

func _on_touch_flash_pressed() -> void:
	if player and is_instance_valid(player):
		player.activate_flash()

func _on_joystick_moved(direction: Vector2) -> void:
	if player and is_instance_valid(player):
		player.move_direction = direction

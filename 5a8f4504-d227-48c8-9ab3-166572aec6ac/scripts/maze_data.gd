extends Node
## Maze layout data and utility functions.
## TILE_SIZE = 48 pixels. Grid 24 columns x 14 rows.

const TILE_SIZE: int = 48
const COLS: int = 24
const ROWS: int = 14

enum CellType { EMPTY, WALL }

# 0 = empty/path, 1 = wall
var grid: Array[Array] = []

# Predefined positions
var player_start: Vector2i = Vector2i(1, 1)
var exit_pos: Vector2i = Vector2i(22, 12)
var gem_positions: Array[Vector2i] = []
var monster_spawns: Array[Vector2i] = []

func _ready() -> void:
	_build_maze()

func _build_maze() -> void:
	# Initialize empty grid
	grid = []
	for r in range(ROWS):
		var row: Array[int] = []
		for c in range(COLS):
			row.append(0)
		grid.append(row)

	# Build walls from layout
	# W = wall(1), . = path(0), P = player, G = gem, E = exit, M = monster
	var layout: Array[String] = [
		"WWWWWWWWWWWWWWWWWWWWWWWW",
		"WP....W.........W......W",
		"W.WW..W.WWW....W.WWWW..W",
		"W..........WW........W.W",
		"W.WWWW.WWW....WWWW.WW..W",
		"W...M....WW..WW.....WW.W",
		"WWWW.WWW...W....WWWW...W",
		"W.....M...W..WW......WWW",
		"W.WWWW.WW.WWW....WWWW..W",
		"W.G.......W..WW........W",
		"W.WW..WW.W...W.WW..M.W.W",
		"W......................W",
		"W...W......W......G..E.W",
		"WWWWWWWWWWWWWWWWWWWWWWWW"
	]

	for r in range(ROWS):
		for c in range(COLS):
			var ch := layout[r][c]
			match ch:
				'P':
					grid[r][c] = CellType.EMPTY
					player_start = Vector2i(c, r)
				'G':
					grid[r][c] = CellType.EMPTY
					gem_positions.append(Vector2i(c, r))
				'E':
					grid[r][c] = CellType.EMPTY
					exit_pos = Vector2i(c, r)
				'M':
					grid[r][c] = CellType.EMPTY
					monster_spawns.append(Vector2i(c, r))
				'W':
					grid[r][c] = CellType.WALL
				_: # '.' or anything else
					grid[r][c] = CellType.EMPTY

func cell_to_world(cell: Vector2i) -> Vector2:
	return Vector2(cell.x * TILE_SIZE + TILE_SIZE / 2, cell.y * TILE_SIZE + TILE_SIZE / 2)

func cell_to_world_topleft(cell: Vector2i) -> Vector2:
	return Vector2(cell.x * TILE_SIZE, cell.y * TILE_SIZE)

func is_wall(cell: Vector2i) -> bool:
	if cell.x < 0 or cell.x >= COLS or cell.y < 0 or cell.y >= ROWS:
		return true
	return grid[cell.y][cell.x] == CellType.WALL

func is_valid_move(cell: Vector2i) -> bool:
	return not is_wall(cell)

## Find a random valid cell for monster patrol targeting
func get_random_open_cell() -> Vector2i:
	var c := randi_range(1, COLS - 2)
	var r := randi_range(1, ROWS - 2)
	var cell := Vector2i(c, r)
	var attempts := 0
	while is_wall(cell) and attempts < 100:
		c = randi_range(1, COLS - 2)
		r = randi_range(1, ROWS - 2)
		cell = Vector2i(c, r)
		attempts += 1
	return cell

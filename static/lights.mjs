import * as Draw from "./draw.mjs";
import {
	Coord, newColors, changeColors, pointToCell, coordToValue, valueToCoord,
	copy, adjacent, isValidCoord, colorsToSaveable, saveableToColors
} from "./grid.mjs";
import { EMPTY, BLOCK, LIGHT } from "./lights_enum.mjs";

export class LightHandler {
	constructor(walls, clues, solution, loadedState) {
		this.selected = new Set();
		this.rows = walls.length;
		this.columns = walls[0].length;
		this.walls = walls;
		this.clues = clues;
		this.solution = solution;
		if (loadedState) {
			this.state = JSON.parse(loadedState);
			if (this.state) {
				this.state.colors = saveableToColors(this.state.colors);
			}
		}
		if (!this.state) {
			this.state = {
				"input": newInput(this.rows, this.columns),
				"colors": newColors(this.rows, this.columns),
			};
		}
		this.stateUndo = [];
		this.stateRedo = [];
		this.won = false;
	}
	
	resetPuzzle() {
		this.selected.clear();
		this.state = {
			"input": newInput(this.rows, this.columns),
			"colors": newColors(this.rows, this.columns),
		};
		this.stateUndo = [];
		this.stateRedo = [];
		this.won = false;
	}
	
	pushState(state) {
		this.stateRedo = [];
		this.stateUndo.push(this.state);
		this.state = state;
	}
	
	saveState() {
		return JSON.stringify({
			"input": this.state.input,
			"colors": colorsToSaveable(this.state.colors),
		});
	}
	
	clearSelected() {
		this.selected.clear();
	}
	
	addToSelected(x, y) {
		var coord = pointToCell(x, y);
		if (coord === null) {
			// console.log("no coord from " + x + ", " + y);
			return;
		}
		// Because records aren't a thing yet, need to translate the coord into
		// a number and store that.  Also need to translate it back to a Coord
		// whenever accessing.
		this.selected.add(coordToValue(coord));
	}
	
	draw(context, highlightErrors) {
		context.clearRect(0, 0, context.canvas.width, context.canvas.height);
		Draw.drawLightWalls(context, this.walls);
		var lit = calcLit(this.state.input, this.walls);
		if (!highlightErrors) {
			lit.errors = [];
		}
		var missedClues = [];  // Array<Coord>
		if (highlightErrors) {
			missedClues = calcMissedClues(this.clues, this.state.input, lit.lit, this.walls);
		}
		Draw.drawLightClues(context, this.clues, missedClues);
		Draw.drawLightsInput(context, this.state.input, lit.lit, lit.errors);
		Draw.drawGrid(context, this.rows, this.columns);
		Draw.drawSelected(context, this.selected);
		Draw.drawColors(context, this.state.colors);
	}
	
	allowsLines() {
		return false;
	}
	
	controls() {
		return [
			{
				"text": "Light",
				"class": "lights-control",
				"keys": ["KeyZ", "Space"],
				"method": function(handler) { handler.placeLights(); }
			},
			{
				"text": "Block",
				"class": "lights-control",
				"keys": ["KeyX"],
				"method": function(handler) { handler.blockCells(); }
			},
		];
	}
	
	instructions() {
		return `
		<p>
		Select the "Controls" tab.  Select cells by clicking and draging across the grid.  Click "Light" or press "Z" or "Space" to place a light.  Click "Block" or press "X" to place a hint where lights cannot go.
		</p>
		<p>
		Holding "Shift" or "Ctrl" while clicking on the grid will add to the selected cells.
		</p>
		`;
	}
	
	placeLights() {
		this.input(LIGHT, this.selected);
	}
	
	blockCells() {
		this.input(BLOCK, this.selected);
	}
	
	input(code, cells) {
		if (this.won) {
			return;
		}
		var emptyCells = [];
		var allCells = [];
		for (var cell of cells) {
			var coord = valueToCoord(cell)
			// Don't try to block/unblock walls.
			if (this.walls[coord.row][coord.col]) {
				continue;
			}
			// Ignore cells which have a different input code than the one we're changing.
			// (i.e., can't swap a light to a block or vice versa)
			if (this.state.input[coord.row][coord.col] == EMPTY) {
				allCells.push(coord);
				emptyCells.push(coord);
			} else if (this.state.input[coord.row][coord.col] == code) {
				allCells.push(coord);
			}
		}
		// If there are empty cells, change them only.
		if (emptyCells.length > 0) {
			var ip = copy(this.state.input);
			for (cell of emptyCells) {
				ip[cell.row][cell.col] = code;
			}
			this.pushState({
				"input": ip,
				"colors": this.state.colors,
			});
			return;
		}
		// All cells already on, so turn them off.
		if (allCells.length > 0) {
			var ip = copy(this.state.input);
			for (cell of allCells) {
				ip[cell.row][cell.col] = EMPTY;
			}
			this.pushState({
				"input": ip,
				"colors": this.state.colors,
			});
			return;
		}
	}
	
	addColor(color) {
		this.pushState({
			"input": this.state.input,
			"colors": changeColors(this.state.colors, color, this.selected),
		});
	}
	
	undo() {
		if (this.stateUndo.length == 0) {
			return;
		}
		this.stateRedo.push(this.state);
		this.state = this.stateUndo.pop();
	}
	
	redo() {
		if (this.stateRedo.length == 0) {
			return;
		}
		this.stateUndo.push(this.state);
		this.state = this.stateRedo.pop();
	}
	
	hasWon() {
		for (var i = 0; i < this.rows; i++) {
			for (var j = 0; j < this.columns; j++) {
				if (this.solution[i][j] ^ (this.state.input[i][j] == LIGHT)) {
					return false;
				}
			}
		}
		this.won = true;
		return true;
	}
}

function newInput(rows, columns) {
	var input = [];
	for (var i = 0; i < rows; i++) {
		var row = [];
		for (var j = 0; j < columns; j++) {
			row.push(EMPTY);
		}
		input.push(row);
	}
	return input;
}

function calcMissedClues(clues, input, lit, walls) {
	var missed = [];
	for (var i = 0; i < clues.length; i++) {
		for (var j = 0; j < clues[0].length; j++) {
			if (clues[i][j] == "") {
				continue;
			}
			var coord = Coord(i,j);
			if (typeof(clues[i][j]) === "number") {
				// Assume that the arrow is always pointing in a diagonally
				// cardinal direction.
				var dirY = 0;
				if (Math.sin(clues[i][j]) > 0.1) {
					dirY = -1;
				} else if (Math.sin(clues[i][j]) < 0.1) {
					dirY = 1;
				}
				var dirX = 0;
				if (Math.cos(clues[i][j]) > 0.1) {
					dirX = 1;
				} else if (Math.cos(clues[i][j]) < 0.1) {
					dirX = -1;
				}
				num = numInDir(input, walls, lit, coord, dirX, dirY);
				if (num.lights > 1) {
					missed.push(coord);
				} else if (num.lights == 0 && num.unlit == 0) {
					missed.push(coord);
				}
			} else {
				var num = parseInt(clues[i][j]);
				var lights = 0;
				var unlit = 0;
				for (var adj of adjacent(coord)) {
					if (input[adj.row][adj.col] == LIGHT) {
						lights++;
					} else if (!lit[adj.row][adj.col]) {
						unlit++;
					}
				}
				if (lights > num) {
					missed.push(coord);
				}
				if (unlit < (num - lights)) {
					missed.push(coord);
				}
			}
			// If clue is directional then
			//   - clue is missed if EMPTY, non-lit == 0
			//   - clue is missed if LIGHT > 1
		}
	}
	return missed;
}

function numInDir(input, walls, lit, coord, dirX, dirY) {
	var lights = 0;
	var unlit = 0;
	while (isValidCoord(coord)) {
		if (!walls[coord.row][coord.col]) {
			if (input[coord.row][coord.col] == LIGHT) {
				lights++;
			} else if (!lit[coord.row][coord.col]) {
				unlit++;
			}
		}
		coord = Coord(coord.row + dirY, coord.col + dirX);
	}
	return {"lights": lights, "unlit": unlit};
}

function calcLit(input, walls) {
	// Start by making an array the same size as input
	var lit = [];
	var errors = [];
	for (var i = 0; i < input.length; i++) {
		var row = [];
		for (var j = 0; j < input[0].length; j++) {
			row.push(false);
		}
		lit.push(row);
	}
	// Now look for lights.
	for (var i = 0; i < input.length; i++) {
		for (var j = 0; j < input[0].length; j++) {
			if (input[i][j] == LIGHT) {
				// The light itself is lit.
				lit[i][j] = true;
				var collision = false
				// And any cells in the cardinal directions until they hit walls.
				collision |= light(lit, i, j, 1, 0, walls, input);
				collision |= light(lit, i, j, 0, 1, walls, input);
				collision |= light(lit, i, j, -1, 0, walls, input);
				collision |= light(lit, i, j, 0, -1, walls, input);
				if (collision) {
					errors.push(Coord(i, j));
				}
			}
		}
	}
	return {"lit": lit, "errors": errors};
}

function light(lit, row, col, xDir, yDir, walls, input) {
	var x = row + xDir;
	var y = col + yDir;
	while (isValidCoord(Coord(x, y))) {
		if (walls[x][y]) {
			break;
		}
		if (input[x][y] == LIGHT) {
			return true;
		}
		lit[x][y] = true;
		x += xDir;
		y += yDir;
	}
	return false;
}

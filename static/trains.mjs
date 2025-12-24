import * as Draw from "./draw.mjs";
import {
	Coord, newColors, changeColors, pointToCell, coordToValue, valueToCoord,
	copy, diagonallyAdjacent, changeDimension, pointToEdgeOrCell
} from "./grid.mjs";
import { UNSET, BLOCK, TRACK } from "./trains_enum.mjs";

export class TrainsHandler {
	constructor(solution, clues) {
		// Just the inner 9x9 that the player has control over.
		this.solution = solution;
		// Any cell/edge marked TRACK/BLOCK is also locked, so the player can't
		// change it.
		this.clues = clues;
		this.rows = 2 + (clues.body.length - 1) / 2;
		this.columns = 2 + (clues.body[0].length - 1) / 2;
		this.won = false;
		this.selected = new Set();
		this.state = {
			"input": newTrainsInput(this.rows, this.columns),
			"colors": newColors(this.rows, this.columns),
		};
		this.stateUndo = [];
		this.stateRedo = [];
		changeDimension(2*this.columns+1, 2*this.rows+1);
	}
	
	resetPuzzle() {
		this.won = false;
		this.selected = new Set();
		this.state = {
			"input": newTrainsInput(this.rows, this.columns),
			"colors": newColors(this.rows, this.columns),
		};
		this.stateUndo = [];
		this.stateRedo = [];
	}
	
	pushState(state) {
		this.stateRedo = [];
		this.stateUndo.push(this.state);
		this.state = state;
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
	
	// TODO: Hard to reproduce bug: Sometimes the state can be such that it
	// doesn't recognize a real win.  Occurred after messing around with many
	// block/track operations, so might leave something behind that doesn't
	// show up on the display but which affects this method.
	hasWon() {
		if (this.won) return true;
		for (var i = 0; i < this.solution.length; i++) {
			for (var j = 0; j < this.solution[0].length; j++) {
				// Solution is an offset subset of the full input space, hence
				// the +3 when checking input.
				if (this.solution[i][j] == TRACK && this.state.input[i+3][j+3] != TRACK) {
					return false;
				}
			}
		}
		this.won = true;
		return true;
	}
	
	draw(context, highlightErrors) {
		context.clearRect(0, 0, context.canvas.width, context.canvas.height);
		var merged = mergeInputAndClues(this.state.input, this.clues.body);
		Draw.drawTrackCells(context, this.state.input, this.clues.body, merged);
		Draw.drawEdgeClues(context, this.clues);
		Draw.drawGrid(context, this.rows, this.columns, 1, this.rows-1, 1, this.columns-1);
		// Does not used merged, so that given edges can be drawn in a different color.
		Draw.drawTrackEdges(context, this.state.input, this.clues.body);
		if (highlightErrors) {
			Draw.drawErrors(context, calcInvalid(this.state.input, this.clues), this.rows, this.columns);
		}
		Draw.drawColors(context, this.state.colors);
		Draw.drawCornerSelected(context, this.selected, this.rows, this.columns);
	}
	
	addToSelected(x, y) {
		var coord = pointToEdgeOrCell(x, y);
		if (coord === null) {
			return;
		}
		this.selected.add(coordToValue(coord));
	}
	
	clearSelected() {
		this.selected.clear();
	}
	
	// TODO: fix this up
	addColor(color) {
		this.pushState({
			"input": this.state.input,
			"colors": changeColors(this.state.colors, color, this.selected, true),
		});
	}
	
	placeTrack() {
		var allCoords = [];
		var withoutTrack = [];
		for (var cell of this.selected) {
			var coord = valueToCoord(cell);
			if (!canBeChanged(coord, this.clues.body, this.rows, this.columns)) {
				continue;
			}
			if (coord.row % 2 == 1 && coord.col % 2 == 0) {
				// Vertical edge.  Ignore if either adjacent cell is blocked.
				var row = coord.row;
				var westCol = coord.col - 1;
				if (this.state.input[row][westCol] == BLOCK || this.clues.body[row-2][westCol-2] == BLOCK) {
					continue;
				}
				var eastCol = coord.col + 1;
				if (this.state.input[row][eastCol] == BLOCK || this.clues.body[row-2][eastCol-2] == BLOCK) {
					continue;
				}
			}
			if (coord.row % 2 == 0 && coord.col % 2 == 1) {
				// Horizontal edge.  Ignore if either adjacent cell is blocked.
				var col = coord.col;
				var northRow = coord.row - 1;
				if (this.state.input[northRow][col] == BLOCK || this.clues.body[northRow-2][col-2] == BLOCK) {
					continue;
				}
				var southRow = coord.row + 1;
				if (this.state.input[southRow][col] == BLOCK || this.clues.body[southRow-2][col-2] == BLOCK) {
					continue;
				}
			}
			// Ignore coords that are explicitly set to BLOCK.
			if (this.state.input[coord.row][coord.col] != BLOCK) {
				allCoords.push(coord);
			}
			// Keep track of coords that are not set.
			if (this.state.input[coord.row][coord.col] == UNSET) {
				withoutTrack.push(coord);
			}
		}
		if (allCoords.length == 0) {
			return; // nothing to do.
		}
		// If all coords had a track, remove track from all coord.
		if (withoutTrack.length == 0) {
			var newInput = copy(this.state.input);
			for (var coord of allCoords) {
				newInput[coord.row][coord.col] = UNSET;
			}
			this.pushState({
				"input": newInput,
				"colors": this.state.colors,
			});
			return;
		}
		// Otherwise, add a track to those without it.
		var newInput = copy(this.state.input);
		for (var coord of withoutTrack) {
			newInput[coord.row][coord.col] = TRACK;
		}
		this.pushState({
			"input": newInput,
			"colors": this.state.colors,
		});
	}
	
	blockTrack() {
		var allCoords = [];
		var withoutBlock = [];
		for (var cell of this.selected) {
			var coord = valueToCoord(cell);
			if (!canBeChanged(coord, this.clues.body, this.rows, this.columns)) {
				continue;
			}
			if (coord.row % 2 == 1 && coord.col % 2 == 1) {
				// Can't block a cell that has a track going into it.
				if (adjacentTrack(coord, this.state.input, this.clues.body)) {
					continue;
				}
			}
			// Ignore cells that are explicitly set to TRACK
			if (this.state.input[coord.row][coord.col] != TRACK) {
				allCoords.push(coord);
			}
			// Keep track of coords that are not set.
			if (this.state.input[coord.row][coord.col] == UNSET) {
				withoutBlock.push(coord);
			}
		}
		if (allCoords.length == 0) {
			return; // nothing to do.
		}
		// If all coords had a block, remove block from all coord.
		if (withoutBlock.length == 0) {
			var newInput = copy(this.state.input);
			for (var coord of allCoords) {
				newInput[coord.row][coord.col] = UNSET;
			}
			this.pushState({
				"input": newInput,
				"colors": this.state.colors,
			});
			return;
		}
		// Otherwise, add a block to those without it.
		var newInput = copy(this.state.input);
		for (var coord of withoutBlock) {
			newInput[coord.row][coord.col] = BLOCK;
		}
		this.pushState({
			"input": newInput,
			"colors": this.state.colors,
		});
	}
	
	allowsLines() {
		return false;
	}
	
	controls() {
		return [
			{
				"text": "Track",
				"class": "trains-control",
				"keys": ["KeyZ", "Space"],
				"method": function(handler) { handler.placeTrack(); }
			},
			{
				"text": "Block",
				"class": "trains-control",
				"keys": ["KeyX"],
				"method": function(handler) { handler.blockTrack(); }
			},
		];
	}
	
	instructions() {
		return `
		<p>
		Select the "Controls" tab.  Select cells and edges by clicking and draging across the grid.  Click "Track" or press "Z" to place tracks.  Click "Block" or press "X" to place a hint where tracks cannot go.
		</p>
		<p>
		Holding "Shift" or "Ctrl" while clicking on the grid will add to the selected cells and edges.
		</p>
		`;
	}
}

function canBeChanged(coord, body, rows, columns) {
	if (coord.row < 3 || coord.col < 3 || coord.row >= 2*rows - 2 || coord.col >= 2*columns - 2) {
		// Ignore selection on the edge or outside of the grid.
		return false;
	}
	if (body[coord.row-2][coord.col-2] != UNSET) {
		// Ignore selection over a given clue.
		return false;
	}
	if (coord.row % 2 == 0 && coord.col % 2 == 0) {
		// Ignore selected corners.
		return false;
	}
	return true;
}

function adjacentTrack(coord, input, body) {
	for (var dir of [[-1, 0], [0, -1], [1, 0], [0, 1]]) {
		var checkRow = coord.row + dir[0];
		var checkCol = coord.col + dir[1];
		if (input[checkRow][checkCol] == TRACK || body[checkRow-2][checkCol-2] == TRACK) {
			return true;
		}
	}
	return false;
}

function newTrainsInput(rows, columns) {
	var input = [];
	for (var i = 0; i < 2*rows+1; i++) {
		var row = [];
		for (var j = 0; j < 2*columns+1; j++) {
			row.push(UNSET);
		}
		input.push(row);
	}
	return input;
}

// Undecided on whether or not I'll use this.  On one hand, this makes counting
// track edges much easier.  On the other hand, can no longer differentiate
// between user-provided and puzzle-provided drawing.
function mergeInputAndClues(input, clues) {
	var newInput = [];
	for (var i = 0; i < input.length; i++) {
		var row = [];
		for (var j = 0; j < input[0].length; j++) {
			// There are no clues in this range.
			if (i < 2 || j < 2 || i >= 2 + clues.length || j >= 2 + clues[0].length) {
				row.push(input[i][j]);
				continue;
			}
			row.push(clues[i-2][j-2] == UNSET ? input[i][j] : clues[i-2][j-2]);
		}
		newInput.push(row);
	}
	return newInput;
}

// Returns Array<CornerCoord> of cells to highlight due to invalid input.
// Actually this could return CellCoords right?  No way to tell that a single
// edge is invalid.
function calcInvalid(input, clues) {
	var merged = mergeInputAndClues(input, clues.body);
	var invalid = [];
	// Check columns for too many tracks.
	for (var i = 0; i < clues.north.length; i++) {
		var clue = clues.north[i];
		var row = 0;
		if (clues.south[i] > 0) {
			clue = clues.south[i];
			row = (input.length-1)/2 - 1;
		}
		if (clue > 0 && !validColumn(merged, 2*(i+1)+1, clue)) {
			invalid.push(Coord(row, i+1));
		}
	}
	// Check rows for too many tracks.
	for (var i = 0; i < clues.west.length; i++) {
		var clue = clues.west[i];
		var col = 0;
		if (clues.east[i] > 0) {
			clue = clues.east[i];
			col = (input[0].length-1)/2 - 1;
		}
		if (clue > 0 && !validRow(merged, 2*(i+1)+1, clue)) {
			invalid.push(Coord(i+1, col));
		}
	}
	// Check for cells with more than 2 edges on.
	for (var i = 1; i < merged.length; i += 2) {
		for (var j = 1; j < merged[0].length; j += 2) {
			var count = 0;
			for (var dir of [[-1, 0], [0, -1], [1, 0], [0,1]]) {
				if (merged[i + dir[0]][j + dir[1]] == TRACK) {
					count++;
				}
			}
			if (count > 2) {
				invalid.push(Coord((i-1)/2, (j-1)/2));
			}
		}
	}
	// TODO: potentially add checks for track loops.
	return invalid;
}

function validColumn(input, column, max) {
	for (var i = 1; i < input.length; i += 2) {
		if (input[i][column] == TRACK) {
			max -= 1;
		}
		if (max < 0) {
			return false;
		}
	}
	return true;
}

function validRow(input, row, max) {
	for (var i = 1; i < input[0].length; i += 2) {
		if (input[row][i] == TRACK) {
			max--;
		}
		if (max < 0) {
			return false;
		}
	}
	return true;
}
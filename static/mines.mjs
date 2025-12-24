import * as Draw from "./draw.mjs";
import {
	Coord, newColors, changeColors, pointToCell, coordToValue, valueToCoord,
	copy, diagonallyAdjacent
} from "./grid.mjs";

export const HIDDEN = 0;
export const FLAGGED = 1;
export const REVEALED = 2;

export class MineHandler {
	constructor(clues, specials) {
		this.selected = new Set();
		this.clues = clues;
		this.rows = clues.length;
		this.columns = clues[0].length;
		this.specials = specials;
		this.state = {
			"input": newInput(this.rows, this.columns),
			"colors": newColors(this.rows, this.columns),
		};
		this.stateUndo = [];
		this.stateRedo = [];
		this.won = false;
		this.failed = false;
		this.failedCoord = null;
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
		this.failed = false;
		this.failedCoord = null;
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
	
	hasWon() {
		if (this.won) {
			return true;
		}
		for (var i = 0; i < this.clues.length; i++) {
			for (var j = 0; j < this.clues[0].length; j++) {
				if ((this.clues[i][j] >= 0) ^ (this.state.input[i][j] == REVEALED)) {
					return false;
				}
			}
		}
		this.won = true;
		return true;
	}
	
	draw(context, highlightErrors) {
		context.clearRect(0, 0, context.canvas.width, context.canvas.height);
		Draw.drawMineClues(context, this.clues, this.failedCoord);
		Draw.drawFog(context, this.state.input);
		Draw.drawSpecialClues(context, this.specials, this.state.input);
		Draw.drawMineInput(context, this.state.input);
		if (highlightErrors) {
			var errors = [];
			for (var i = 0; i < this.state.input.length; i++) {
				for (var j = 0; j < this.state.input[0].length; j++) {
					// Only highlight if the clue has been revealed.
					if (this.state.input[i][j] != REVEALED) {
						continue;
					}
					var coord = new Coord(i, j);
					var count = 0;
					for (var adjacent of diagonallyAdjacent(coord)) {
						if (this.state.input[adjacent.row][adjacent.col] == FLAGGED) {
							count++;
						}
					}
					if (count > this.clues[i][j]) {
						errors.push(coord);
					}
				}
			}
			Draw.drawErrors(context, errors, this.rows, this.columns);
		}
		Draw.drawGrid(context, this.rows, this.columns);
		Draw.drawSelected(context, this.selected);
		Draw.drawColors(context, this.state.colors);
	}
	
	addToSelected(x, y) {
		var coord = pointToCell(x, y);
		if (coord === null) {
			return;
		}
		this.selected.add(coordToValue(coord));
	}
	
	clearSelected() {
		this.selected.clear();
	}
	
	addColor(color) {
		this.pushState({
			"input": this.state.input,
			"colors": changeColors(this.state.colors, color, this.selected),
		});
	}
	
	allowsLines() {
		return false;
	}
	
	controls() {
		return [
			{
				"text": "Reveal",
				"class": "mine-control",
				"keys": ["KeyZ", "Space"],
				"method": function(handler) { handler.reveal(); }
			},
			{
				"text": "Flag",
				"class": "mine-control",
				"keys": ["KeyX"],
				"method": function(handler) { handler.flag(); }
			},
		];
	}
	
	instructions() {
		return `
		<p>
		Select the "Controls" tab.  Select cells by clicking and draging across the grid.  Click "Reveal" or press "Z" or "Space" to open a cell.  Click "Flag" or press "X" to place a hint where mines are located.
		</p>
		<p>
		Holding "Shift" or "Ctrl" while clicking on the grid will add to the selected cells.
		</p>
		`;
	}
	
	reveal() {
		if (this.failed || this.won) {
			return;
		}
		var toOpen = [];
		for (var cell of this.selected) {
			var coord = valueToCoord(cell);
			if (this.state.input[coord.row][coord.col] == HIDDEN) {
				toOpen.push(coord);
			}
		}
		// Don't push something new to the stack if nothing is changing.
		if (toOpen.length == 0) {
			return;
		}
		var ip = copy(this.state.input);
		// When a clue is zero, we automatically open all the cells around it,
		// which is why we're doing this "depth first search"
		while (toOpen.length > 0) {
			var coord = toOpen.pop();
			// This includes unflagging something that got unopened in a burst.
			ip[coord.row][coord.col] = REVEALED;
			if (this.clues[coord.row][coord.col] < 0) {
				// Revealed a bomb, stop now
				this.failed = true;
				this.failedCoord = coord;
				break;
				// TODO: hmm, should failed also be put on the stack?
				// That would allow to undo and proceed as soon as you hit an
				// error instead of resetting the whole puzzle.  Not sure if
				// I want that or not.
			}
			if (this.clues[coord.row][coord.col] == 0) {
				for (var adjacent of diagonallyAdjacent(coord)) {
					toOpen.push(adjacent);
				}
			}
		}
		this.pushState({
			"input": ip,
			"colors": this.state.colors,
		});
	}
	
	flag() {
		if (this.failed || this.won) {
			return;
		}
		var flaggableCells = [];
		var unflaggedCells = [];
		for (var cell of this.selected) {
			var coord = valueToCoord(cell)
			if (this.state.input[coord.row][coord.col] != REVEALED) {
				flaggableCells.push(coord);
			}
			if (this.state.input[coord.row][coord.col] == HIDDEN) {
				unflaggedCells.push(coord);
			}
		}
		// If there are unflagged cells, flag only them.
		if (unflaggedCells.length > 0) {
			var ip = copy(this.state.input);
			for (var cell of unflaggedCells) {
				ip[cell.row][cell.col] = FLAGGED;
			}
			this.pushState({
				"input": ip,
				"colors": this.state.colors,
			});
			return;
		}
		// Otherwise, unflag all the cells, if there are any
		if (flaggableCells.length > 0) {
			var ip = copy(this.state.input);
			for (var cell of flaggableCells) {
				ip[cell.row][cell.col] = HIDDEN;
			}
			this.pushState({
				"input": ip,
				"colors": this.state.colors,
			});
			return;
		}
	}
}

function newInput(rows, cols) {
	var input = [];
	for (var i = 0; i < rows; i++) {
		var row = [];
		for (var j = 0; j < cols; j++) {
			row.push(HIDDEN);
		}
		input.push(row);
	}
	return input;
}
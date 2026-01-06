import * as Draw from "./draw.mjs";
import {
	Coord, newColors, changeColors, pointToCell, coordToValue, valueToCoord,
	copy, diagonallyAdjacent, newLines, changeLines, getClosestCorner, NORTH,
	SOUTH, WEST, EAST, colorsToSaveable, saveableToColors
} from "./grid.mjs";

// Mode Enum
const FINAL = 0;
const INNER = 1;
const OUTER = 2;

export class SudokuHandler {
	// solution: the final grid, also used for size for drawing
	// digits: Array<Object<Coord, Number>>, the given digit clues
	// cages: ???, the cage clues
	// arrows: Array<Array<Coord>>, the arrow clues with each arrow being an
	//   Array of Coords from the bulb to the the tip.
	constructor(solution, digits, cages, arrows, loadedState) {
		this.rows = solution.length;
		this.columns = solution[0].length;
		this.solution = solution;
		this.digits = digits;
		this.mode = FINAL;
		this.cages = [];
		for (var cage of cages) {
			this.cages.push(new Cage(cage.cells, cage.sum));
		}
		this.arrows = arrows;
		this.won = false;
		this.selected = new Set();
		this.lastLineCoord = null;
		if (loadedState) {
			this.state = JSON.parse(loadedState);
			if (this.state) {
				this.state.colors = saveableToColors(this.state.colors);
				this.state.digits = saveableToDigits(this.state.digits);
			}
		}
		if (!this.state) {
			this.state = {
				"digits": newDigits(this.rows, this.columns),
				"lines": newLines(this.rows, this.columns),
				"colors": newColors(this.rows, this.columns),
			};
		}
		this.stateUndo = [];
		this.stateRedo = [];
	}
	
	resetPuzzle() {
		this.selected.clear();
		this.lastLineCoord = null;
		this.won = false;
		this.state = {
			"digits": newDigits(this.rows, this.columns),
			"lines": newLines(this.rows, this.columns),
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
	
	saveState() {
		return JSON.stringify({
			"digits": digitsToSaveable(this.state.digits),
			"lines": this.state.lines,
			"colors": colorsToSaveable(this.state.colors),
		});
	}
	
	hasWon() { 
		if (this.won) return true;
		for (var i = 0; i < this.solution.length; i++) {
			for (var j = 0; j < this.solution[0].length; j++) {
				if (this.solution[i][j] != this.state.digits[i][j].final) {
					return false;
				}
			}
		}
		this.won = true;
		return true;
	}
	
	draw(context, highlightErrors) {
		context.clearRect(0, 0, context.canvas.width, context.canvas.height);
		Draw.drawGrid(context, this.rows, this.columns);
		Draw.drawSudokuArrows(context, this.arrows, this.rows, this.columns);
		Draw.drawCages(context, this.cages, this.rows, this.columns);
		if (highlightErrors) {
			Draw.drawErrors(context, errorDigits(this.state.digits), this.rows, this.columns);
		}
		// TODO: draw provided digits, not needed for this version of the puzzle.
		Draw.drawSudokuDigits(context, this.state.digits);
		Draw.drawLines(context, this.state.lines);
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
	
	changeMode(mode) {
		this.mode = mode;
	}
	
	placeDigit(digit) {
		if (this.won) {
			return;
		}
		if (this.mode == FINAL) {
			if (this.selected.size == 0) {
				return;
			}
			// In final mode, we replace all final digits regardless of value.
			var newDigits = copyDigits(this.state.digits);
			for (var cell of this.selected) {
				var coord = valueToCoord(cell);
				newDigits[coord.row][coord.col].final = digit;
			}
			this.pushState({
				"digits": newDigits,
				"lines": this.state.lines,
				"colors": this.state.colors,
			});
		} else {
			var notHasDigit = [];
			var allCells = [];
			for (var cell of this.selected) {
				var coord = valueToCoord(cell);
				allCells.push(coord);
				var current = this.state.digits[coord.row][coord.col];
				if ((this.mode == INNER && !current.inner.has(digit)) ||
				    (this.mode == OUTER && !current.outer.has(digit))) {
					notHasDigit.push(coord);
				}
			}
			// If some cells don't have the digit, give it to them.
			if (notHasDigit.length > 0) {
				var newDigits = copyDigits(this.state.digits);
				for (var coord of notHasDigit) {
					if (this.mode == INNER) {
						newDigits[coord.row][coord.col].inner.add(digit);
					} else if (this.mode == OUTER) {
						newDigits[coord.row][coord.col].outer.add(digit);
					}
				}
				this.pushState({
					"digits": newDigits,
					"lines": this.state.lines,
					"colors": this.state.colors,
				});
				return;
			}
			// Otherwise, remove the digits from all cells.
			if (allCells.length > 0) {
				var newDigits = copyDigits(this.state.digits);
				for (var coord of allCells) {
					if (this.mode == INNER) {
						newDigits[coord.row][coord.col].inner.delete(digit);
					} else if (this.mode == OUTER) {
						newDigits[coord.row][coord.col].outer.delete(digit);
					}
				}
				this.pushState({
					"digits": newDigits,
					"lines": this.state.lines,
					"colors": this.state.colors,
				});
				return;
			}
		}
	}
	
	removeDigit() {
		// If any of the selected cells has a final digit, consider the action
		// to be removing those digits.
		var hasFinal = [];
		// Otherwise we will try removing in mode digits first, so collect
		// them now.
		var hasInMode = [];
		for (var cell of this.selected) {
			var coord = valueToCoord(cell);
			var current = this.state.digits[coord.row][coord.col];
			if (current.final > 0) {
				hasFinal.push(coord);
			}
			if ((this.mode == INNER && current.inner.size > 0) ||
			    (this.mode == OUTER && current.outer.size > 0)) {
				hasInMode.push(coord);
			}				
		}
		if (hasFinal.length > 0) {
			var newDigits = copyDigits(this.state.digits);
			for (var coord of hasFinal) {
				newDigits[coord.row][coord.col].final = 0;
			}
			this.pushState({
				"digits": newDigits,
				"lines": this.state.lines,
				"colors": this.state.colors,
			});
			return;
		}
		// Otherwise, if there are in mode digits, remove those.
		if (hasInMode.length > 0) {
			var newDigits = copyDigits(this.state.digits);
			for (var coord of hasInMode) {
				if (this.mode == INNER) {
					newDigits[coord.row][coord.col].inner.clear();
				} else if (this.mode == OUTER) {
					newDigits[coord.row][coord.col].outer.clear();
				}
			}
			this.pushState({
				"digits": newDigits,
				"lines": this.state.lines,
				"colors": this.state.colors,
			});
			return
		}
		// Otherwise, just clear everything
		var newDigits = copyDigits(this.state.digits);
		for (var cell of this.selected) {
			var coord = valueToCoord(cell);
			newDigits[coord.row][coord.col].final = 0;
			newDigits[coord.row][coord.col].inner.clear();
			newDigits[coord.row][coord.col].outer.clear();
		}
		this.pushState({
			"digits": newDigits,
			"lines": this.state.lines,
			"colors": this.state.colors,
		});
	}
	
	recordLine(x, y) {
		var coord = getClosestCorner(x, y);
		if (this.lastLineCoord !== null) {
			var dir = -1;
			if (coord.row > this.lastLineCoord.row) {
				dir = SOUTH
			} else if (coord.row < this.lastLineCoord.row) {
				dir = NORTH
			} else if (coord.col > this.lastLineCoord.col) {
				dir = EAST
			} else if (coord.col < this.lastLineCoord.col) {
				dir = WEST
			}
			// If we haven't hit one of the conditions above, it's probably a duplicate
			// coord, so don't do anything.
			if (dir !== -1) {
				this.pushState({
					"digits": this.state.digits,
					"lines": changeLines(this.state.lines, this.lastLineCoord, dir),
					"colors": this.state.colors,
				});
			}
		}
		this.lastLineCoord = coord;
	}
	
	endLine() {
		this.lastLineCoord = null;
	}
	
	clearSelected() {
		this.selected.clear();
	}
	
	addColor(color) {
		this.pushState({
			"digits": this.state.digits,
			"lines": this.state.lines,
			"colors": changeColors(this.state.colors, color, this.selected),
		});
	}
	
	allowsLines() {
		return true;
	}
	
	controls() {
		var cs = [
			{
				"text": "Place Final Digit",
				"class": "sudoku-control",
				"keys": ["KeyZ"],
				"method": function(handler) { handler.changeMode(FINAL); },
			},
			{
				"text": "Place Hint Center Digit",
				"class": "sudoku-control",
				"keys": ["KeyX"],
				"method": function(handler) { handler.changeMode(INNER); },
			},
			{
				"text": "Place Hint Edge Digit",
				"class": "sudoku-control",
				"keys": ["KeyC"],
				"method": function(handler) { handler.changeMode(OUTER); },
			},
			{
				"text": "Remove",
				"class": "sudoku-remove",
				"keys": ["Backspace", "Digit0", "Numpad0"],
				"method": function(handler) { handler.removeDigit(); },
			},
		];
		for (var i = 1; i <= 9; i++) {
			cs.push({
				"text": "" + i,
				"class": "sudoku-digit" + (i%3==0 ? "" : " sudoku-float"),
				"keys": ["Digit"+i, "Numpad"+i],
				"method": function(i){ return function(handler) { handler.placeDigit(i); }; }(i),
			});
		}
		return cs;
	}
	
	instructions() {
		return `
		<p>
		Select the "Controls" tab.  Select cells by clicking and draging across the grid.
		</p>
		<p>
		Holding "Shift" or "Ctrl" while clicking on the grid will add to the selected cells.
		</p>
		<p>
		Click "Place Final Digit" or press "Z" to place large digits in cells, that will be used to check the solution.  Click "Place Center Digit" or press "X" to place small digits in the center of a cell that can be used as hints.  Click "Place Hint Edge Digit" or press "C" to place small digits around the edge of a cell that can be used as hints.
		</p>
		<p>
		Press number keys to place digits in selected cells.  Click "Remove" or press "Backspace" to remove digits and hints from cells.
		</p>
		`;
	}
}

// Cage is a plain old datatype for storing a sudoku cage and attributes that
// make drawing it on a canvas easy.
class Cage {
	constructor(cells, sum) {
		this.sum = sum;
		// Array<Pair<Coord, CageDrawInformation>>.  This is a really weird way
		// to store this, but Coord is not hashable, and we don't need random
		// access, so it's fine.
		this.cells = []
		this.upperLeft = Coord(100, 100);
		for (var cell of cells) {
			this.cells.push([cell, Draw.cageCell(cell, cells)]);
			if (cell.row < this.upperLeft.row || (cell.row == this.upperLeft.row && cell.col < this.upperLeft.col)) {
				this.upperLeft = Coord(cell.row, cell.col);
			}
		}
	}
}

function newDigits(rows, columns) {
	var digits = [];
	for (var i = 0; i < rows; i++) {
		var row = [];
		for (var j = 0; j < columns; j++) {
			row.push({
				"final": 0,
				"inner": new Set(),
				"outer": new Set(),
			});
		}
		digits.push(row);
	}
	return digits;
}

function copyDigits(digits) {
	var newDigits = [];
	for (var i = 0; i < digits.length; i++) {
		var row = [];
		for (var j = 0; j < digits[0].length; j++) {
			var newCell = {
				"final": digits[i][j].final,
				"inner": new Set(),
				"outer": new Set(),
			};
			for (var inny of digits[i][j].inner) {
				newCell.inner.add(inny);
			}
			for (var outty of digits[i][j].outer) {
				newCell.outer.add(outty);
			}
			row.push(newCell);
		}
		newDigits.push(row);
	}
	return newDigits;
}

// Replaces the sets of `inner` and `outer` with lists.
function digitsToSaveable(digits) {
	var saveable = [];
	for (var i = 0; i < digits.length; i++) {
		var row = [];
		for (var j = 0; j < digits[0].length; j++) {
			var save = {
				"final": digits[i][j].final,
				"inner": [],
				"outer": [],
			};
			digits[i][j].inner.forEach((x) => {save.inner.push(x);});
			digits[i][j].outer.forEach((x) => {save.outer.push(x);});
			row.push(save);
		}
		saveable.push(row);
	}
	return saveable;
}

function saveableToDigits(saveable) {
	var digits = [];
	for (var i = 0; i < saveable.length; i++) {
		var row = [];
		for (var j = 0; j < saveable[0].length; j++) {
			var digit = {
				"final": saveable[i][j].final,
				"inner": new Set(),
				"outer": new Set(),
			};
			for (var k = 0; k < saveable[i][j].inner.length; k++) {
				digit.inner.add(saveable[i][j].inner[k]);
			}
			for (var k = 0; k < saveable[i][j].outer.length; k++) {
				digit.outer.add(saveable[i][j].outer[k]);
			}
			row.push(digit);
		}
		digits.push(row);
	}
	return digits;
}

// Returns Array<Coord> of cells to highlight as containing invalid input per
// sudoku rules.  Only checks the row/column duplicates, because boxes are not
// part of the given solution and I don't feel like checking cage/arrow sums.
// Imporantly based solely on user input, not on solution.
function errorDigits(digits) {
	var errors = [];
	for (var i = 0; i < digits.length; i++) {
		for (var j = 0; j < digits[0].length; j++) {
			if (digits[i][j].final > 0 && hasDuplicate(digits, i, j)) {
				errors.push(Coord(i,j));
			}
		}
	}
	return errors;
}

function hasDuplicate(digits, i, j) {
	for (var k = 0; k < digits.length; k++) {
		if (k == i) continue;
		if (digits[k][j].final == digits[i][j].final) {
			return true;
		}
	}
	for (var k = 0; k < digits[0].length; k++) {
		if (k == j) continue;
		if (digits[i][k].final == digits[i][j].final) {
			return true;
		}
	}
	return false;
}
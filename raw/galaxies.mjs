import * as Draw from "./draw.mjs";
import {
	Coord, newColors, changeColors, pointToCell, coordToValue, valueToCoord,
	copy, NORTH, SOUTH, WEST, EAST, getClosestCorner, newLines, changeLines,
	adjacentCellCoords, containsCoord, isValidCoord, adjacentCornerCoords,
	colorsToSaveable, saveableToColors
} from "./grid.mjs";

export class GalaxyHandler {
	constructor(centers, solution, clues, loadedState) {
		this.centers = centers;
		this.solution = solution;
		this.clues = clues;
		// Corners and edges are part of the clues and solutions, so a bit more
		// work to turn that into rows/columns
		this.rows = (centers.length - 1) / 2;
		this.columns = (centers[0].length - 1) / 2;
		this.won = false;
		this.selected = new Set();
		this.lastLineCoord = null;
		if (loadedState) {
			this.state = JSON.parse(loadedState);
			if (this.state) {
				this.state.colors = saveableToColors(this.state.colors);
			}
		}
		// If there is no loaded state or it did not parse correctly set to a default.
		if (!this.state) {
			this.state = {
				"lines": newLines(this.rows, this.columns),
				"colors": newColors(this.rows, this.columns),
			}
		}
		this.stateUndo = [];
		this.stateRedo = [];
	}
	
	resetPuzzle() {
		this.selected.clear();
		this.lastLineCoord = null;
		this.won = false;
		this.state = {
			"lines": newLines(this.rows, this.columns),
			"colors": newColors(this.rows, this.columns),
		}
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
			"lines": this.state.lines,
			"colors": colorsToSaveable(this.state.colors),
		});
	}
	
	hasWon() {
		if (this.won) {
			return true;
		}
		for (var i = 0; i < this.state.lines.length; i++) {
			for (var j = 0; j < this.state.lines[0].length; j++) {
				if (this.state.lines[i][j] != this.solution[i][j]) {
					return false;
				}
			}
		}
		this.won = true;
		return true;
	}
	
	draw(context, highlightErrors) {
		context.clearRect(0, 0, context.canvas.width, context.canvas.height);
		if (highlightErrors) {
			Draw.drawValid(context, calcValid(this.centers, this.state.lines));
		}
		Draw.drawGrid(context, this.rows, this.columns);
		Draw.drawCenters(context, this.centers);
		Draw.drawGalaxyArrows(context, this.clues, this.rows, this.columns);
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
			"lines": this.state.lines,
			"colors": changeColors(this.state.colors, color, this.selected),
		});
	}
	
	allowsLines() {
		return true;
	}
	
	controls() {
		// The solution is drawn with lines which are part of generic controls.
		return [];
	}
	
	instructions() {
		return `
		<p>
		Select the "Line" tab.  Click and drag along grid lines to turn them on/off.
		</p>
		`;
	}
}

// Calculate which cells should be highlighted as creating valid galaxies.  A
// galaxy is considered valid if, there is exactly one center in it's enclosure
// (as defined by lines), it is 180 degree rotationally symmetric, and it's
// single center is the center of the symmetery.
function calcValid(centers, lines) {
	var valid = [];
	for (var i = 0; i < lines.length; i++) {
		var row = [];
		for (var j = 0; j < lines[0].length; j++) {
			row.push(false);
		}
		valid.push(row);
	}
	// For each galaxy center, expand the enclosure, and add that to valid.
	for (var i = 0; i < centers.length; i++) {
		for (var j = 0; j < centers[0].length; j++) {
			if (centers[i][j]) {
				var enclosure = galaxyEnclosure(Coord(i, j), centers, lines);
				// enclosure is empty if the galaxy is invalid, so it's safe to
				// always do this for loop.
				for (var coord of enclosure) {
					valid[coord.row][coord.col] = true;
				}
			}
		}
	}
	return valid;
}

var dirs = [{
	"dir": NORTH,
	"row": -1,
	"col": 0,
	"opp": SOUTH,
},{
	"dir": WEST,
	"row": 0,
	"col": -1,
	"opp": EAST
},{
	"dir": SOUTH,
	"row": 1,
	"col": 0,
	"opp": NORTH
},{
	"dir": EAST,
	"row": 0,
	"col": 1,
	"opp": WEST
}];

// Returns a list of Coords (cell coordinates) of all the cells that enclose
// the galaxy centered at `center`, given the list of all galaxy centers, and
// the lines drawn by the player.  The returned list is empty if the galaxy is
// not enclosed or not enclosed in a valid way.
function galaxyEnclosure(center, centers, lines) {
	var log = false;
	if (center.row == 3 && center.col == 3) {
		log = false;
	}
	// Step 1: get the cells immediately adjacent to the center. 1, 2, or 4 of them.
	var enclosure = adjacentCellCoords(center);
	if (log) {
		console.log(enclosure);
	}
	// Step 2: check validity (no lines between these cells).
	// TODO: there's probably a quicker way to do this
	for (var i = 0; i < enclosure.length; i++) {
		for (var j = 0; j < enclosure.length; j++) {
			if (i == j) { continue; }
			if (enclosure[i].row == enclosure[j].row) {
				if (enclosure[i].col == enclosure[j].col - 1) {
					// [i] must have EAST, [j] must have WEST.
					if (!(lines[enclosure[i].row][enclosure[i].col] & EAST)) {
						return [];
					}
					if (!(lines[enclosure[j].row][enclosure[j].col] & WEST)) {
						return [];
					}
				} else if (enclosure[i].col == enclosure[j].col + 1) {
					// [i] must have WEST, [j] must have EAST.
					if (!(lines[enclosure[i].row][enclosure[i].col] & WEST)) {
						return [];
					}
					if (!(lines[enclosure[j].row][enclosure[j].col] & EAST)) {
						return [];
					}
				}
			}
			if (enclosure[i].col == enclosure[j].col) {
				if (enclosure[i].row == enclosure[j].row - 1) {
					// [i] must have SOUTH, [j] must have NORTH.
					if (!(lines[enclosure[i].row][enclosure[i].col] & SOUTH)) {
						return [];
					}
					if (!(lines[enclosure[j].row][enclosure[j].col] & NORTH)) {
						return [];
					}
				} else if (enclosure[i].col == enclosure[j].col + 1) {
					// [i] must have NORTH, [j] must have SOUTH.
					if (!(lines[enclosure[i].row][enclosure[i].col] & NORTH)) {
						return [];
					}
					if (!(lines[enclosure[j].row][enclosure[j].col] & SOUTH)) {
						return [];
					}
				}
			}
		}
	}
	if (log) {
		console.log("passed lines over center test");
	}
	// Step 3: Push each coord to a stack.
	var stack = [];
	for (var coord of enclosure) {
		stack.push(coord);
	}
	// DFS to find the enclosure.
	while (stack.length != 0) {
		var current = stack.pop();
		for (var dir of dirs) {
			var next = Coord(current.row + dir.row, current.col + dir.col);
			if (log) {
				console.log("evaluating <" + next.row + ", " + next.col + ">");
			}
			if (containsCoord(enclosure, next)) {
				if (log) {
					console.log("dropping because already in"); 
				}
				continue;
			}
			// Don't try to expand outside of the grid.
			if (!isValidCoord(next)) {
				if (log) {
					console.log("outside of grid");
				}
				continue;
			}
			// If there's an edge here and the thing on the other side of the
			// edge is in the enclosure, the whole enclosure is invalid.
			if ((lines[current.row][current.col] & dir.dir) != 0 && containsCoord(enclosure, next)) {
				if (log) {
					console.log("past " + dir.dir + "edge is also part of enclosure");
				}
				return [];
			} else if ((lines[current.row][current.col] & dir.dir) == 0 && !containsCoord(enclosure, next)) {
				// We are expanding in this direction.
				// 1) Does the symmetric expansion also work? -> cell valid, not edged, not visited.
				var opp = symmetricOpposite(next, center);
				if (log) {
					console.log("evaluating opposite <" + opp.row + ", " + opp.col + ">");
				}
				if (!isValidCoord(opp)) {
					if (log) {
						console.log("opp outside of grid, invalid");
					}
					return [];
				}
				// Note that opp is taken from next instead of current, so we
				// use the same direction instead of the opposite direction to
				// check for the expansion boundary.
				// If there's an edge here and the thing on the other side of
				// the edge is in the enclosure, the whole enclosure is invalid
				if ((lines[opp.row][opp.col] & dir.dir) != 0) {
					if (log) {
						console.log("past " + dir.dir + " expansion is not valid");
					}
					return [];
				} else if ((lines[opp.row][opp.col] & dir.dir) == 0) {
					// Both expansions are valid.
					// 2) Any centers adjacent to next or symmetric make this invalid
					if (adjacentGalaxyCenter(next, centers) || adjacentGalaxyCenter(opp, centers)) {
						if (log) {
							console.log("other galaxy center is adjacent");
						}
						return [];
					}
					enclosure.push(next);
					enclosure.push(opp);
					stack.push(next);
					stack.push(opp);
				}
			}
		}
	}
	if (log) {
		console.log(enclosure);
	}
	return enclosure;
}

// Returns the Coord (cell space) of the cell opposite the given `cell` from
// the given `center`.  `cell` is a Coord in cell space, `center` is a Coord
// in corner space.
// TODO: this is wrong.
function symmetricOpposite(cell, center) {
	return Coord(center.row - cell.row - 1, center.col - cell.col - 1);
}

function adjacentGalaxyCenter(cell, centers) {
	var corners = adjacentCornerCoords(cell);
	for (var corner of corners) {
		if (centers[corner.row][corner.col]) {
			return true;
		}
	}
	return false;
}

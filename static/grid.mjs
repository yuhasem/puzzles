// Exported for draw.mjs
export const canvMargin = 5;
export var height = 0;
export var width = 0;
export var horzMargin = 0;
export var vertMargin = 0;
export var cellSize = 0;
export var gridWidth = 11;
export var gridHeight = 11;

// Border bit mask for line drawing.  This technically duplicates state across
// cells, but it's easier to reason about because it's stored on the same
// width/height array as a standard clues puzzle.
export const NORTH = 1 << 0;
export const EAST = 1 << 1;
export const SOUTH = 1 << 2;
export const WEST = 1 << 3;

// resize sets the internal structure to be able to draw things.
export function resize(context) {
	height = context.canvas.height;
	width = context.canvas.width;
	// TODO: how do I get both the context and the grid size here?
	cellSize = (Math.min(height, width) - 2 * canvMargin) / 11;
	horzMargin = (width - 11*cellSize) / 2;
	vertMargin = (height - 11*cellSize) / 2;
}

export function changeDimension(width, height) {
	gridWidth = width;
	gridHeight = height;
}

// Coord represents a coordinate in "cell space".
// TODO: these should be records when JS starts being a good language.
export function Coord(row, col) {
	return {"row": row, "col": col};
}

export function isValidCoord(c) {
	if (c.row < 0 || c.row >= gridHeight) {
		return false;
	}
	if (c.col < 0 || c.col >= gridWidth) {
		return false;
	}
	return true;
}

// CornerCoord represents a coordinate in "corner space" where edges and
// corners are spaces that need to be represented.
// TODO: these should be records when JS starts being a good language.
export function CornerCoord(row, col) {
	return {"row": row, "col": col};
}

export function isValidCornerCoord(cc) {
	if (cc.row < 0 || cc.row >= 2*gridHeight + 1) {
		return false;
	}
	if (cc.col < 0 || cc.col >= 2*gridWidth + 1) {
		return false;
	}
	return true;
}

// Point to cell converts a canvas point (e.g. where a user clicked) into a Coord.
export function pointToCell(x, y) {
	var row = Math.floor((y - vertMargin) / cellSize);
	var col = Math.floor((x - horzMargin) / cellSize);
	var c = new Coord(row, col);
	if (isValidCoord(c)) {
		return c;
	}
	return null;
}

// Returns a coord in corner space corresponding to the edge or cell that was
// clicked.  This function treats edges as extending into a cell so that they
// are easier to click on.
export function pointToEdgeOrCell(x, y) {
	// First find the cell row/col
	var cellRow = Math.floor((y - vertMargin) / cellSize);
	var cellCol = Math.floor((x - horzMargin) / cellSize);
	// And ensure the cell is valid.
	if (!isValidCoord(Coord(cellRow, cellCol))) {
		return null;
	}
	// Then find the offset within the cell.
	var xOffset = x - cellCol * cellSize - vertMargin;
	var yOffset = y - cellRow * cellSize - horzMargin;
	// Then use the offset to calculate if we're near an edge and need to adjust.
	var row = 2*cellRow+1;
	var col = 2*cellCol+1;
	const inset = 0.125;
	if (xOffset < cellSize*inset) {
		return CornerCoord(row, col-1);
	}
	if (yOffset < cellSize*inset) {
		return CornerCoord(row-1, col);
	}
	if (xOffset > cellSize*(1-inset)) {
		return CornerCoord(row, col+1);
	}
	if (yOffset > cellSize*(1-inset)) {
		return CornerCoord(row+1, col);
	}
	return CornerCoord(row, col);
}

// Returns valid adjacent coords in cell space.
export function adjacent(coord) {
	var coords = [];
	var c = Coord(coord.row - 1, coord.col);
	if (isValidCoord(c)) {
		coords.push(c);
	}
	c = Coord(coord.row + 1, coord.col);
	if (isValidCoord(c)) {
		coords.push(c);
	}
	c = Coord(coord.row, coord.col - 1);
	if (isValidCoord(c)) {
		coords.push(c);
	}
	c = Coord(coord.row, coord.col + 1);
	if (isValidCoord(c)) {
		coords.push(c);
	}
	return coords;
}

// Returns valid diagonally adjacent coords in cell space.
export function diagonallyAdjacent(coord) {
	var coords = [];
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			if (i == 0 && j == 0) {
				continue;
			}
			var c = Coord(coord.row + i, coord.col + j);
			if (isValidCoord(c)) {
				coords.push(c);
			}
		}
	}
	return coords;
}

// Makees a shallow copy of a 2d array.
export function copy(arr) {
	var next = []
	for (var i = 0; i < arr.length; i++) {
		var row = [];
		for (var j = 0; j < arr[0].length; j++) {
			row.push(arr[i][j]);
		}
		next.push(row);
	}
	return next;
}

export function newColors(rows, columns) {
	var colors = [];
	for (var i = 0; i < rows; i++) {
		var row = [];
		for (var j = 0; j < columns; j++) {
			row.push(new Set());
		}
		colors.push(row);
	}
	return colors;
}

export function changeColors(colors, color, cells, isCornerCoords) {
	// Make a deep copy, so that we can preserve state for undo/redo ops.
	var newColors = [];
	for (var i = 0; i < colors.length; i++) {
		var row = [];
		for (var j = 0; j < colors[0].length; j++) {
			var s = new Set();
			for (var c of colors[i][j]) {
				s.add(c);
			}
			row.push(s);
		}
		newColors.push(row);
	}
	var toAdd = [];
	for (var cell of cells) {
		var coord = valueToCoord(cell)
		if (isCornerCoords) {
			coord = cornerCoordToCellCoord(coord);
		}
		if (!newColors[coord.row][coord.col].has(color)) {
			toAdd.push(coord);
		}
	}
	// If there were cells that didn't have the color, just add the color to them.
	if (toAdd.length > 0) {
		for (var cell of toAdd) {
			newColors[cell.row][cell.col].add(color);
		}
		return newColors;
	}
	// If all cells had the color, remove it from all of them.
	for (var cell of cells) {
		var coord = valueToCoord(cell)
		if (isCornerCoords) {
			coord = cornerCoordToCellCoord(coord);
		}
		newColors[coord.row][coord.col].delete(color);
	}
	return newColors;
}

// Expects a double array of Sets.  Returns a triple array.
export function colorsToSaveable(colors) {
	var saveable = [];
	for (var i = 0; i < colors.length; i++) {
		var row = [];
		for (var j = 0; j < colors[0].length; j++) {
			var save = [];
			colors[i][j].forEach((x) => {save.push(x);});
			row.push(save);
		}
		saveable.push(row);
	}
	return saveable;
}

export function saveableToColors(saveable) {
	var colors = [];
	for (var i = 0; i < saveable.length; i++) {
		var row = [];
		for (var j = 0; j < saveable[0].length; j++) {
			var color = new Set();
			for (var k = 0; k < saveable[i][j].length; k++) {
				color.add(saveable[i][j][k]);
			}
			row.push(color);
		}
		colors.push(row);
	}
	return colors;
}

export function newLines(rows, columns) {
	var lines = [];
	for (var i = 0; i < rows; i++) {
		var row = [];
		for (var j = 0; j < columns; j++) {
			// Set edges on, since galaxy validity checking can't figure out
			// the edges, and they always have to be on for the solution
			// anyway.
			var set = 0;
			if (i == 0) set |= NORTH;
			if (i == rows - 1) set |= SOUTH;
			if (j == 0) set |= WEST;
			if (j == columns - 1) set |= EAST;
			row.push(set);
		}
		lines.push(row);
	}
	return lines;
}

// Flips a line in lines.  The coord is the cell whose top-left corner is the
// starting point of the added line, traveling in dir, from the direction
// bit mask.  If the line was on, it is turned off.  If the line was off, it is
// turned on.  dir must be a cardinal direction.
export function changeLines(lines, coord, dir) {
	// Make a deep copy, to preserve previous for undo/redo ops.
	var newLines = [];
	for (var i = 0; i < lines.length; i++) {
		var row = [];
		for (var j = 0; j < lines[0].length; j++) {
			row.push(lines[i][j]);
		}
		newLines.push(row);
	}
	if (dir == NORTH) {
		if (isValidCoord(Coord(coord.row-1, coord.col)) && coord.col != 0) {
			newLines[coord.row-1][coord.col] ^= WEST;
		}
		if (isValidCoord(Coord(coord.row-1, coord.col-1)) && coord.col != lines[0].length) {
			newLines[coord.row-1][coord.col-1] ^= EAST;
		}
	} else if (dir == EAST) {
		if (isValidCoord(coord)) {
			// This case specifically could be out of bounds even though it's
			// the coord passed in that we're using.
			if (coord.row != 0) {
				newLines[coord.row][coord.col] ^= NORTH;
			}
		}
		if (isValidCoord(Coord(coord.row-1, coord.col)) && coord.row != lines.length) {
			newLines[coord.row-1][coord.col] ^= SOUTH;
		}
	} else if (dir == SOUTH) {
		if (isValidCoord(Coord(coord.row, coord.col-1)) && coord.col != lines[0].length) {
			newLines[coord.row][coord.col-1] ^= EAST;
		}
		if (isValidCoord(coord)) {
			// This case specifically could be out of bounds even though it's
			// the coord passed in that we're using.
			if (coord.col != 0) {
				newLines[coord.row][coord.col] ^= WEST;
			}
		}
	} else if (dir == WEST) {
		if (isValidCoord(Coord(coord.row-1, coord.col-1)) && coord.row != lines.length) {
			newLines[coord.row-1][coord.col-1] ^= SOUTH;
		}
		if (isValidCoord(Coord(coord.row, coord.col-1)) && coord.row != 0) {
			newLines[coord.row][coord.col-1] ^= NORTH;
		}
	}
	return newLines;
}

// This returns the Coord whose upper-left corner is the closest to the given
// point.  Note that to return corners on the right and bottom edges, this
// will return Coords that do not pass isValidCoord.
export function getClosestCorner(x, y) {
	x -= horzMargin;
	y -= vertMargin; 
	return Coord(Math.floor(y/cellSize + 0.5), Math.floor(x/cellSize + 0.5));
}

// To make them directly comparable for Set.
export function coordToValue(coord) {
	return coord.col * gridHeight + coord.row
}

// To undo what coordToValue done did.
export function valueToCoord(value) {
	return Coord(value % gridHeight, Math.floor(value / gridHeight));
}

// Returns the coord in the Corner system corresponding to the middle
// of the given Cell coord.
export function cellCoordToCornerCord(coord) {
	return CornerCoord(2*coord.row + 1, 2*coord.col + 1);
}

// Returns the coord in the Cell system corresponding to the given Corner
// Coord.  The corner coord's in the top left, top middle, left, middle, and
// middle of a cell get mapped to that cell.
export function cornerCoordToCellCoord(coord) {
	return Coord(Math.floor(coord.row/2), Math.floor(coord.col/2));
}

// Returns the Corner Coords adjacent to the given Cell Coord
export function adjacentCornerCoords(coord) {
	var cc = cellCoordToCornerCord(coord);
	var ccs = [];
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			// TODO: Is it more appropriate to leave this in?
			// if (i == 0 && j == 0) {
				// continue;
			// }
			ccs.push(CornerCoord(cc.row + i, cc.col + j));
		}
	}
	return ccs;
}

// Returns the Cell Coords adjacent to the given corner coords.
export function adjacentCellCoords(coord) {
	var c = cornerCoordToCellCoord(coord);
	var cs = [c];
	if (coord.row % 2 == 0) {
		cs.push(Coord(c.row - 1, c.col));
	}
	if (coord.col % 2 == 0) {
		var len = cs.length;
		for (var i = 0; i < len; i++) {
			cs.push(Coord(cs[i].row, cs[i].col - 1));
		}
	}
	return cs;
}

// Returns true if the list contains the coord.  Needed because indexOf doesn't
// work with objects.
export function containsCoord(list, coord) {
	for (var el of list) {
		if (el.row == coord.row && el.col == coord.col) {
			return true;
		}
	}
	return false;
}
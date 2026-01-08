import {
	canvMargin, Coord, CornerCoord, cellCoordToCornerCord,
	cornerCoordToCellCoord, containsCoord, height, width, cellSize, horzMargin,
	vertMargin, gridWidth, gridHeight, valueToCoord, NORTH, SOUTH, WEST, EAST
} from "./grid.mjs";
import { EMPTY, BLOCK, LIGHT } from "./lights_enum.mjs";
import { UNSET, BLOCK as T_BLK, TRACK } from "./trains_enum.mjs";

function getGrid(context, rows, columns) {
	// height = context.canvas.height;
	// width = context.canvas.width;
	// cellSize = Math.min((height - 2*canvMargin)/rows, (width - 2*canvMargin)/columns);
	// horzMargin = (width - columns*cellSize) / 2;
	// vertMargin = (height - rows*cellSize) / 2;
	return {
		"size": cellSize,
		"horzMargin": horzMargin,
		"vertMargin": vertMargin,
		"height": height,
		"width": width,
	}
}

function cellCorner(coord, grid) {
	return {
		"x": grid.horzMargin + grid.size * coord.col,
		"y": grid.vertMargin + grid.size * coord.row
	}
}

function cellCenter(coord, grid) {
	return {
		"x": grid.horzMargin + grid.size * (coord.col + 0.5),
		"y": grid.vertMargin + grid.size * (coord.row + 0.5)
	}
}

// Draws the black boxes that denote walls in the Lights puzzle.
export function drawLightWalls(context, walls) {
	var grid = getGrid(context, walls.length, walls[0].length);
	for (var i = 0; i < walls.length; i++) {
		for (var j = 0; j < walls[0].length; j++) {
			if (walls[i][j]) {
				drawWall(context, grid, Coord(i, j));
			}
		}
	}
}

function drawWall(context, grid, coord) {
	var corner = cellCorner(coord, grid);
	context.fillStyle = "black";
	context.fillRect(corner.x, corner.y, grid.size, grid.size);
}

// Draws the number and arrow clues for the Lights puzzle.
export function drawLightClues(context, clues, missedClues) {
	var grid = getGrid(context, clues.length, clues[0].length);
	for (var i = 0; i < clues.length; i++) {
		for (var j = 0; j < clues[0].length; j++) {
			if (clues[i][j] == "") {
				continue;
			}
			if (typeof(clues[i][j]) === "number") {
				drawArrow(context, grid, clues[i][j], Coord(i, j), "white");
			} else {
				drawSmallNumber(context, grid, parseInt(clues[i][j]), Coord(i, j));
			}
		}
	}
	for (var missed of missedClues) {
		highlightFailed(context, missed, grid);
	}
}


// TODO: 0 doesn't work as dir?
function drawArrow(context, grid, dir, coord, color) {
	var center = cellCenter(coord, grid);
	context.strokeStyle = color;
	context.lineWidth = 3;
	context.lineCap = "round";
	var radius = grid.size * 1/3;
	var arrowLength = grid.size * 1/6;
	var tipX = center.x + radius*Math.cos(dir);
	var tipY = center.y - radius*Math.sin(dir);
	var backX = center.x + radius*Math.cos(dir + Math.PI);
	var backY = center.y - radius*Math.sin(dir + Math.PI);
	var leftX = tipX + arrowLength*Math.cos(dir + 3*Math.PI/4);
	var leftY = tipY - arrowLength*Math.sin(dir + 3*Math.PI/4);
	var rightX = tipX + arrowLength*Math.cos(dir - 3*Math.PI/4);
	var rightY = tipY - arrowLength*Math.sin(dir - 3*Math.PI/4);
	context.beginPath();
	context.moveTo(backX, backY);
	context.lineTo(tipX, tipY);
	// I don't feel like reading the docs on how to make the corner join go away.
	context.moveTo(tipX, tipY);
	context.lineTo(leftX, leftY);
	context.moveTo(tipX, tipY);
	context.lineTo(rightX, rightY);
	context.stroke();
}

function drawSmallNumber(context, grid, num, coord) {
	context.fillStyle = "white";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = Math.floor(2*grid.size/3) + "px Arial";
	var center = cellCenter(coord, grid);
	context.fillText(num, center.x, center.y);
}

function drawBigNumber(context, grid, coord, num, color) {
	context.fillStyle = color;
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = Math.floor(grid.size) + "px Arial";
	var center = cellCenter(coord, grid);
	context.fillText(num, center.x, center.y);
}

// Draws the lights and the lit cells for the Ligths puzzle.
export function drawLightsInput(context, lights, lit, errors) {
	var grid = getGrid(context, lights.length, lights[0].length);
	for (var i = 0; i < lit.length; i++) {
		for (var j = 0; j < lit[0].length; j++) {
			if (lit[i][j]) {
				context.fillStyle = "yellow";
				var corner = cellCorner(Coord(i, j), grid);
				context.fillRect(corner.x, corner.y, grid.size, grid.size);
			}
		}
	}
	for (var i = 0; i < lights.length; i++) {
		for (var j = 0; j < lights[0].length; j++) {
			var coord = Coord(i, j);
			if (lights[i][j] == 1) {
				drawBlock(context, grid, coord);
			} else if (lights[i][j] == 2) {
				drawLight(context, grid, coord);
			}
		}
	}
	for (var error of errors) {
		highlightFailed(context, error, grid);
	}
}

function drawBlock(context, grid, coord) {
	var corner = cellCorner(coord, grid);
	context.fillStyle = "black";
	context.fillRect(corner.x + 2*grid.size/5, corner.y + 2*grid.size/5, grid.size/5, grid.size/5);
}

function drawLight(context, grid, coord) {
	var center = cellCenter(coord, grid);
	drawCircle(context, grid, center);
}

// Draws the grid lines over a puzzle.  Use {row,column}{Begin,End} to leave
// some rows or columns out if clues nned to be placed on the edges.
export function drawGrid(context, rows, columns, rowBegin, rowEnd, columnBegin, columnEnd) {
	rowBegin = rowBegin || 0;
	rowEnd = rowEnd || rows;
	columnBegin = columnBegin || 0;
	columnEnd = columnEnd || columns;
	var grid = getGrid(context, rows, columns);
	context.strokeStyle = "#444444";
	context.lineWidth = 3;
	context.lineCap = "square";
	
	// Vertical lines
	context.beginPath();
	for (var i = rowBegin; i < rowEnd+1; i++) {
		var at = grid.horzMargin + i*grid.size;
		context.moveTo(at, grid.vertMargin + rowBegin*grid.size);
		context.lineTo(at, grid.height - grid.vertMargin - grid.size*(rows-rowEnd));
	}
	context.stroke();
	
	// Horizontal lines
	context.beginPath();
	for (var i = columnBegin; i < columnEnd+1; i++) {
		var at = grid.vertMargin + i*grid.size;
		context.moveTo(grid.horzMargin + columnBegin*grid.size, at);
		context.lineTo(grid.width - grid.horzMargin - grid.size*(columns-columnEnd), at);
	}
	context.stroke();
}

const selectedGradiantWhite = "rgba(100%,100%,100%,0)";
const selectedGradiantBlue = "rgba(0%,50%,100%,1)";

// Draws a highlight around all the cells that are selected.
export function drawSelected(context, selected) {
	var grid = getGrid(context, gridHeight, gridWidth);
	for (var cell of selected) {
		var coord = valueToCoord(cell);
		var center = cellCenter(coord, grid);
		var innerRad = grid.size / 2.2;
		var outerRad = grid.size / Math.SQRT2;
		var rg = context.createRadialGradient(center.x, center.y, innerRad, center.x, center.y, outerRad);
		rg.addColorStop(0, selectedGradiantWhite);
		rg.addColorStop(1, selectedGradiantBlue);
		context.fillStyle = rg;
		var corner = cellCorner(coord, grid);
		context.fillRect(corner.x, corner.y, grid.size, grid.size);
	}
}

// Draws color highlights in all the cells that have them.
export function drawColors(context, colors) {
	var grid = getGrid(context, colors.length, colors[0].length);
	for (var i = 0; i < colors.length; i++) {
		for (var j = 0; j < colors[0].length; j++) {
			drawCellColor(context, Coord(i, j), colors[i][j], grid);
		}
	}
}

function drawCellColor(context, coord, colors, grid) {
	var colorList = [];
	for (var color of colors) {
		colorList.push(color);
	}
	colorList.sort();
	var n = colorList.length;
	if (n == 0) {
		return;
	}
	// console.log("drawing color <" + coord.row + "," + coord.col + ">");
	var angle = 2 * Math.PI / n;
	var corner = Math.PI/4;
	var center = cellCenter(coord, grid)
	var topLeft = cellCorner(coord, grid);
	for (var i = 0; i < n; i++) {
		context.lineWidth = 1;
		context.fillStyle = numToColor(colorList[i]);
		context.beginPath();
		// console.log("move to " + center.x + ", " + center.y);
		context.moveTo(center.x, center.y);
		var offset = squareAt(i * angle, grid)
		// console.log("line to " + (topLeft.x + offset.x) + ", " + (topLeft.y + offset.y));
		context.lineTo(topLeft.x + offset.x, topLeft.y + offset.y);
		while (corner < (i+1) * angle) {
			var offset = squareAt(corner, grid);
			// console.log("line to " + (topLeft.x + offset.x) + ", " + (topLeft.y + offset.y));
			context.lineTo(topLeft.x + offset.x, topLeft.y + offset.y);
			corner += Math.PI / 2;
		}
		offset = squareAt((i+1) * angle, grid);
		// console.log("line to " + (topLeft.x + offset.x) + ", " + (topLeft.y + offset.y));
		context.lineTo(topLeft.x + offset.x, topLeft.y + offset.y);
		// console.log("line to " + center.x + ", " + center.y);
		context.lineTo(center.x, center.y);
		context.fill();
	}
}

// Returns the canvas coordinates relative to the top left corner cell that
// represent a point on the edge of the cell |angle| radians counter-clockwise
// with angle 0 pointing horizontally to the right.
function squareAt(angle, grid) {
	var x = 0;
	var y = 0;
	if (Math.PI/4 < angle && angle <= 3*Math.PI/4) {
		y = 0;
		var alpha = Math.PI/2 - angle;
		x = grid.size/2 + (Math.tan(alpha) * grid.size/2);
	} else if (3*Math.PI/4 < angle && angle <= 5*Math.PI/4) {
		x = 0;
		var alpha = angle - Math.PI;
		y = grid.size/2 + (Math.tan(alpha) * grid.size/2);
	} else if (5*Math.PI/4 < angle && angle <= 7*Math.PI/4) {
		y = grid.size;
		var alpha = angle - 3*Math.PI/2;
		x = grid.size/2 + (Math.tan(alpha) * grid.size/2);
	} else {
		x = grid.size;
		y = grid.size/2 - Math.tan(angle) * grid.size/2;
	}
	return {"x": x, "y": y}
}

function numToColor(num) {
	switch (num) {
		case 0:
		return "rgba(100%,100%,100%,0)";
		case 1:
		return "rgba(80%,20%,20%,0.5)";
		case 2:
		return "rgba(20%,80%,20%,0.5)";
		case 3:
		return "rgba(20%,20%,80%,0.5)";
		case 4:
		return "rgba(80%,80%,20%,0.5)";
		case 5:
		return "rgba(80%,20%,80%,0.5)";
		case 6:
		return "rgba(20%,80%,80%,0.5)";
	}
	return "rgba(100%,100%,100%,0)";
}

// Draws the digits representing adjacent bombs in the Mines puzzle.
export function drawMineClues(context, clues, failedCoord) {
	var grid = getGrid(context, clues.length, clues[0].length);
	if (failedCoord !== null) {
		highlightFailed(context, failedCoord, grid);
	}
	for (var i = 0; i < clues.length; i++) {
		for (var j = 0; j < clues[0].length; j++) {
			if (clues[i][j] == 0) {
				continue;
			}
			if (clues[i][j] < 0) {
				drawBomb(context, Coord(i, j), grid);
				continue;
			}
			var color = "black";
			switch (clues[i][j]) {
			case 1:
				color = "blue";
				break;
			case 2:
				color = "green";
				break;
			case 3:
				color = "red";
				break;
			case 4:
				color = "purple";
				break;
			case 5:
				color = "brown";
			}
			drawBigNumber(context, grid, Coord(i, j), clues[i][j], color);
		}
	}
}

function highlightFailed(context, coord, grid) {
	var center = cellCenter(coord, grid);
	var innerRad = grid.size / 3;
	var outerRad = grid.size / Math.SQRT2;
	var rg = context.createRadialGradient(center.x, center.y, innerRad, center.x, center.y, outerRad);
	rg.addColorStop(0, "rgba(100%,100%,100%,0)");
	rg.addColorStop(1, "rgba(100%,0%,0%,1)");
	context.fillStyle = rg;
	var corner = cellCorner(coord, grid);
	context.fillRect(corner.x, corner.y, grid.size, grid.size);
	
}

function drawBomb(context, coord, grid) {
	var center = cellCenter(coord, grid);
	context.lineCap = "round";
	context.lineWidth = 9;
	context.strokeStyle = "black";
	context.beginPath();
	var spikeExtreme = grid.size*0.375;
	context.moveTo(center.x - spikeExtreme, center.y - spikeExtreme);
	context.lineTo(center.x +spikeExtreme, center.y + spikeExtreme);
	context.moveTo(center.x - spikeExtreme, center.y);
	context.lineTo(center.x + spikeExtreme, center.y);
	context.moveTo(center.x - spikeExtreme, center.y + spikeExtreme);
	context.lineTo(center.x + spikeExtreme, center.y - spikeExtreme);
	context.moveTo(center.x, center.y - spikeExtreme);
	context.lineTo(center.x, center.y + spikeExtreme);
	context.stroke();
	context.beginPath();
	context.arc(center.x, center.y, grid.size * 0.25, 0, 2 * Math.PI, false);
	context.stroke();
	
}

// Where fog[row][col] != 2 means it has fog.
export function drawFog(context, fog) {
	var grid = getGrid(context, fog.length, fog[0].length);
	for (var i = 0; i < fog.length; i++) {
		for (var j = 0; j < fog[0].length; j++) {
			if (fog[i][j] != 2) {
				context.fillStyle = "#888888";
				var corner = cellCorner(Coord(i, j), grid);
				context.fillRect(corner.x, corner.y, grid.size, grid.size);
			}
		}
	}
}

// Clues a list of Coord indicating where to draw an indication that the cell
// is clear for Mines puzzle.
export function drawSpecialClues(context, clues, input) {
	var grid = getGrid(context, input.length, input[0].length);
	for (var coord of clues) {
		if (input[coord.row][coord.col] == 2) {
			continue;
		}
		var center = cellCenter(coord, grid);
		context.strokeStyle = "#22CC22";
		context.lineWidth = 9;
		context.beginPath();
		var rad = grid.size * 0.3;
		context.arc(center.x, center.y, rad, 0, 2 * Math.PI, false);
		context.stroke();
	}
	
}

// Draws the flags for a Mines puzzle.
export function drawMineInput(context, input) {
	var grid = getGrid(context, input.length, input[0].length);
	// Draw flags
	for (var i = 0; i < input.length; i++) {
		for (var j = 0; j < input[0].length; j++) {
			if (input[i][j] != 1) {
				continue;
			}
			drawFlag(context, new Coord(i, j), grid);
		}
	}
}

function drawFlag(context, coord, grid) {
	var corner = cellCorner(coord, grid);
	var poleTop = corner.y + grid.size * 0.25
	var poleMiddle = corner.y + grid.size * 0.5;
	var poleBottom = corner.y + grid.size * 0.75;
	var leftEdge = corner.x + grid.size * 0.33;
	var rightEdge = corner.x + grid.size * 0.67;
	var flagMiddle = corner.y + grid.size * 0.375;
	context.lineWidth = 1;
	context.fillStyle = "red";
	context.beginPath();
	context.moveTo(leftEdge, poleTop);
	context.lineTo(rightEdge, flagMiddle);
	context.lineTo(leftEdge, poleMiddle);
	context.fill();
	context.lineWidth = 5;
	context.lineCap = "round";
	context.strokeStyle = "brown";
	context.beginPath();
	context.moveTo(leftEdge, poleTop);
	context.lineTo(leftEdge, poleBottom);
	context.stroke();
}

// Draws an error highlight around the given coords for any puzzle.
export function drawErrors(context, coords, rows, columns) {
	var grid = getGrid(context, rows, columns);
	for (var coord of coords) {
		highlightFailed(context, coord, grid);
	}
}

// Draws the galaxy centers for a Galaxies puzzle.
export function drawCenters(context, centers) {
	var grid = getGrid(context, (centers.length - 1)/2, (centers[0].length - 1)/2);
	for (var i = 0; i < centers.length; i++) {
		for (var j = 0; j < centers[0].length; j++) {
			if (!centers[i][j]) {
				continue;
			}
			var center = cellCenter(Coord(Math.floor(i/2), Math.floor(j/2)), grid);
			if (i % 2 == 0) {
				center.y -= grid.size / 2;
			}
			if (j % 2 == 0) {
				center.x -= grid.size / 2;
			}
			drawCircle(context, grid, center);
		}
	}
}

// A common definition for Lights input, Galaxy centers, and Sudoku arrow bulbs
// so that all appear the same while moving through the chain.
function drawCircle(context, grid, center) {
	var radius = 3*grid.size/8;
	// Start by filling the circle in white.
	context.fillStyle = "white";
	context.beginPath();
	context.arc(center.x, center.y, radius, 0, 2*Math.PI)
	context.fill();
	// And then draw a black border around it.
	context.beginPath();
	context.strokeStyle = "black";
	context.lineWidth = 3;
	context.arc(center.x, center.y, radius, 0, 2*Math.PI)
	context.stroke();
	
}

// Highlights the given cells which are considered valid for a Galaxies puzzle.
export function drawValid(context, valid) {
	var grid = getGrid(context, valid.length, valid[0].length);
	for (var i = 0; i < valid.length; i++) {
		for (var j = 0; j < valid[0].length; j++) {
			if (valid[i][j]) {
				var corner = cellCorner(Coord(i, j), grid);
				context.fillStyle = "#DDDDDD";
				context.fillRect(corner.x, corner.y, grid.size, grid.size);
			}
		}
	}
}

// Draws the user inputted lines for any puzzle.
export function drawLines(context, lines) {
	var grid = getGrid(context, lines.length, lines[0].length);
	for (var i = 0; i < lines.length; i++) {
		for (var j = 0; j < lines[0].length; j++) {
			var corner = cellCorner(Coord(i, j), grid);
			context.strokeStyle = "black";
			context.lineWidth = 5;
			context.lineCap = "round";
			context.beginPath();
			if ((lines[i][j] & NORTH) > 0) {
				context.moveTo(corner.x, corner.y);
				context.lineTo(corner.x + grid.size, corner.y);
			}
			if ((lines[i][j] & EAST) > 0) {
				context.moveTo(corner.x + grid.size, corner.y);
				context.lineTo(corner.x + grid.size, corner.y + grid.size);
			}
			if ((lines[i][j] & SOUTH) > 0) {
				context.moveTo(corner.x, corner.y + grid.size);
				context.lineTo(corner.x + grid.size, corner.y + grid.size);
			}
			if ((lines[i][j] & WEST) > 0) {
				context.moveTo(corner.x, corner.y);
				context.lineTo(corner.x, corner.y + grid.size);
			}
			context.stroke();
		}
	}
}

// Draws arrow clues for a galaxies puzzle.
export function drawGalaxyArrows(context, arrows, rows, columns) {
	var grid = getGrid(context, rows, columns);
	for (var arrow of arrows) {
		drawArrow(context, grid, arrow.dir, arrow.coord, "black");
	}
}

// Draws cages for a Sudoku puzzle.
export function drawCages(context, cages, rows, columns) {
	for (var cage of cages) {
		drawCage(context, cage, rows, columns);
	}
}

function drawCage(context, cage, rows, columns) {
	var grid = getGrid(context, rows, columns);
	context.strokeStyle = "#FF88CC";  // actually, maybe we should go with the same brown we want to do for trains.
	context.lineWidth = 3;
	context.lineCap = "square";
	// TODO: Potentially separate this into multiple strokes and change the
	// offset of West + South edges so that things look even.
	context.setLineDash([grid.size * 0.1, grid.size * 0.1]);
	context.beginPath();
	for (var [cell, edges] of cage.cells) {
		var corner = cellCorner(cell, grid);
		// WEST
		if (edges[0]) {
			drawCageEdge(context, grid, corner, false, edges[1], edges[3], 0.1);
		}
		// NORTH
		if (edges[1]) {
			drawCageEdge(context, grid, corner, true, edges[0], edges[2], 0.1);
		}
		// EAST
		if (edges[2]) {
			drawCageEdge(context, grid, corner, false, edges[1], edges[3], 0.9);
		}
		// SOUTH
		if (edges[3]) {
			drawCageEdge(context, grid, corner, true, edges[0], edges[2], 0.9);
		}
	}
	context.stroke();
	// TODO: text of the cage sum
	context.fillStyle = "#FF88CC";
	context.textAlign = "left";
	context.textBaseline = "top";
	context.font = Math.floor(grid.size * 0.3) + "px Arial";
	var corner = cellCorner(cage.upperLeft, grid);
	context.fillText(cage.sum, corner.x + grid.size * 0.125, corner.y + grid.size * 0.125);
	
	// unset line dash so no other functions have to worry about this.
	context.setLineDash([]);
}

function drawCageEdge(context, grid, corner, horz, startEdge, endEdge, insetRatio) {
	var inset = grid.size * insetRatio + (horz ? corner.y : corner.x);
	var start = (horz ? corner.x : corner.y) + (startEdge ? grid.size * 0.1 : -grid.size * 0.1);
	var end = (horz ? corner.x : corner.y) + (endEdge ? grid.size * 0.9 : grid.size * 1.1);
	if (horz) {
		context.moveTo(start, inset);
		context.lineTo(end, inset);
	} else {
		context.moveTo(inset, start);
		context.lineTo(inset, end);
	}
}

// Returns which edges are on for a given cage cell.  Edges start with WEST and
// continue clockwise around the cell.
export function cageCell(cell, cage) {
	var ret = [];
	for (var offset of [[0, -1], [-1, 0], [0, 1], [1, 0]]) {
		// Note, we don't check these cells for validity, since we also want to
		// draw cage borders on the edge of the grid.
		var next = Coord(cell.row + offset[0], cell.col + offset[1]);
		ret.push(!containsCoord(cage, next));
	}
	return ret;
}

// Draw arrow clues for a Sudoku puzzle.
export function drawSudokuArrows(context, arrows, rows, columns) {
	var grid = getGrid(context, rows, columns);
	for (var arrow of arrows) {
		drawSudokuArrow(context, grid, arrow);
	}
}

function drawSudokuArrow(context, grid, arrow) {
	var radius = 3*grid.size/8
	var prevCoord = null;
	var currentCoord = null;
	for (var i = 0; i < arrow.length; i++) {
		currentCoord = arrow[i];
		var center = cellCenter(currentCoord, grid);
		if (i == 0) {
			// Draw the bulb.
			drawCircle(context, grid, center);
		} else {
			var prevCenter = cellCenter(prevCoord, grid);
			if (i == 1) {
				// don't want to draw through the bulb.
				// Because the canvas is mirrored, we still have to but delta
				// x first, even though atan2's args are backward.
				var theta = Math.atan2(center.x - prevCenter.x, center.y - prevCenter.y);
				prevCenter = {"x": prevCenter.x + radius*Math.sin(theta), "y": prevCenter.y + radius*Math.cos(theta)};
			}
			if (i == arrow.length - 1) {
				// Pull the end in a bit so it looks nicer at intersections.
				var theta = Math.atan2(center.x - prevCenter.x, center.y - prevCenter.y);
				var endRadius = grid.size*0.25
				center = {"x": center.x - endRadius*Math.sin(theta), "y": center.y - endRadius*Math.cos(theta)};
			}
			// Relying on the same stroke style set in drawCircle?
			context.beginPath();
			context.moveTo(prevCenter.x, prevCenter.y);
			context.lineTo(center.x, center.y);
			context.stroke();
			if (i == arrow.length - 1) {
				// Draw the arrow bit.
				var theta = Math.atan2(center.x - prevCenter.x, center.y - prevCenter.y);
				var length = grid.size*0.25;
				var pointOneX = center.x + length*Math.sin(theta + 3*Math.PI/4);
				var pointOneY = center.y + length*Math.cos(theta + 3*Math.PI/4);
				var pointTwoX = center.x + length*Math.sin(theta - 3*Math.PI/4);
				var pointTwoY = center.y + length*Math.cos(theta - 3*Math.PI/4);
				context.beginPath();
				context.moveTo(pointOneX, pointOneY);
				context.lineTo(center.x, center.y);
				context.lineTo(pointTwoX, pointTwoY);
				context.stroke();
			}
		}
		prevCoord = currentCoord;
	}
}

// Draw user inputted digits for a Sudoku puzzle.
export function drawSudokuDigits(context, digits) {
	var grid = getGrid(context, digits.length, digits[0].length);
	for (var i = 0; i < digits.length; i++) {
		for (var j = 0; j < digits[0].length; j++) {
			var current = digits[i][j];
			var coord = Coord(i, j);
			if (current.final > 0) {
				drawBigNumber(context, grid, coord, current.final, "#222288");
			} else {
				drawSudokuInners(context, grid, coord, current.inner);
				drawSudokuOuters(context, grid, coord, current.outer);
			}
		}
	}
}

// Draw user inputted inner small clues for a Sudoku puzzle.
export function drawSudokuInners(context, grid, coord, digits) {
	context.fillStyle = "#222288";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = Math.floor(grid.size*0.25) + "px Arial";
	var center = cellCenter(coord, grid);
	var list = [];
	for (var digit of digits) {
		list.push(digit);
	}
	list.sort();
	var txt = "";
	for (var digit of list) {
		txt += digit;
	}
	context.fillText(txt, center.x, center.y);
}

// Draw user inputted outer small clues for a Sudoku puzzle.
export function drawSudokuOuters(context, grid, coord, digits) {
	if (digits.size == 0) return;
	var spacing = Math.ceil(digits.size/2);
	var list = [];
	for (var digit of digits) {
		list.push(digit);
	}
	list.sort();
	context.fillStyle = "#222288";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = Math.floor(grid.size*0.25) + "px Arial";
	var corner = cellCorner(coord, grid);
	var top = corner.y + grid.size*0.15;
	for (var i = 0; i < spacing; i++) {
		var space = Math.max(spacing - 1, 1);
		var along = corner.x + grid.size*(0.15+(0.85-0.15)/space*i);
		context.fillText(list[i], along, top);
	}
	top = corner.y + grid.size*0.85
	for (var i = spacing; i < list.length; i++) {
		var space = Math.max(spacing - 1, 1);
		var along = corner.x + grid.size*(0.15+(0.85-0.15)/space*(i-spacing));
		context.fillText(list[i], along, top);
	}
}

const trackGiven = "#AAAAAA";
const trackInput = "#DDDDDD";
const blockGiven = "black";
const blockInput = "brown";

// Draws the cells which are a track or a block for a Trains puzzle.
export function drawTrackCells(context, input, body, merged) {
	var grid = getGrid(context, (input.length-1)/2, (input[0].length-1)/2);
	// Ignore the outer rows.
	for (var i = 3; i < input.length - 3; i += 2) {
		for (var j = 3; j < input[0].length - 3; j += 2) {
			var coord = Coord((i-1)/2, (j-1)/2);
			if (body[i-2][j-2] == TRACK) {
				drawTrackOn(context, grid, coord, trackGiven, merged);
			} else if (body[i-2][j-2] == T_BLK) {
				drawTrackBlock(context, grid, cellCorner(coord, grid), blockGiven);
			} else {
				if (input[i][j] == TRACK) {
					drawTrackOn(context, grid, coord, trackInput, merged);
				} else if (input[i][j] == T_BLK) {
					drawTrackBlock(context, grid, cellCorner(coord, grid), blockInput);
				}
			}
		}
	}
}

// Draw the numbers around the edges for a Trains puzzle.
export function drawEdgeClues(context, clues) {
	var rows = 2 + (clues.body.length-1)/2;
	var columns = 2 + (clues.body[0].length-1)/2;
	var grid = getGrid(context, rows, columns);
	for (var i = 0; i < clues.north.length; i++) {
		if (clues.north[i] > 0) {
			drawBigNumber(context, grid, Coord(0, i+1), clues.north[i], "black");
		}
	}
	for (var i = 0; i < clues.south.length; i++) {
		if (clues.south[i] > 0) {
			drawBigNumber(context, grid, Coord(rows-1, i+1), clues.south[i], "black");
		}
	}
	for (var i = 0; i < clues.west.length; i++) {
		if (clues.west[i] > 0) {
			drawBigNumber(context, grid, Coord(i+1, 0), clues.west[i], "black");
		}
	}
	for (var i = 0; i < clues.east.length; i++) {
		if (clues.east[i] > 0) {
			drawBigNumber(context, grid, Coord(i+1, columns-1), clues.east[i], "black");
		}
	}
}

// Draw the edges (joints between track cells) for a Trains puzzle.
export function drawTrackEdges(context, input, body) {
	var grid = getGrid(context, (input.length-1)/2, (input[0].length-1)/2);
	// Ignore the outer 2 rows since we don't want to draw on them anyway.
	for (var i = 2; i < input.length - 2; i++) {
		if (i % 2 == 0) {
			// Horizontal edges along this row, in the odd columns
			for (var j = 3; j < input[0].length - 2; j += 2) {
				// Check the body clues...
				var corner = cellCorner(Coord(i/2, (j-1)/2), grid);
				if (body[i-2][j-2] == TRACK) {
					drawVerticalTrack(context, grid, corner, "brown");
				} else if (body[i-2][j-2] == T_BLK) {
					corner.y -= grid.size/2;
					drawTrackBlock(context, grid, corner, blockGiven);
				} else {
					if (input[i][j] == TRACK) {
						drawVerticalTrack(context, grid, corner, "brown");
					} else if (input[i][j] == T_BLK) {
						corner.y -= grid.size/2;
						drawTrackBlock(context, grid, corner, blockInput);
					}
				}
			}
		} else {
			// Vertical edges along this row, in the even columns.
			for (var j = 2; j < input[0].length - 2; j += 2) {
				// Check the body clues...
				var corner = cellCorner(Coord((i-1)/2, j/2), grid);
				if (body[i-2][j-2] == TRACK) {
					drawHorizontalTrack(context, grid, corner, "brown");
				} else if (body[i-2][j-2] == T_BLK) {
					corner.x -= grid.size/2;
					drawTrackBlock(context, grid, corner, blockGiven);
				} else {
					if (input[i][j] == TRACK) {
						drawHorizontalTrack(context, grid, corner, "brown");
					} else if (input[i][j] == T_BLK) {
						corner.x -= grid.size/2;
						drawTrackBlock(context, grid, corner, blockInput);
					}
				}
			}
		}
	}
}

function drawTrackOn(context, grid, coord, color, merged) {
	var corner = cellCorner(coord, grid);
	context.fillStyle = color;
	context.fillRect(corner.x, corner.y, grid.size, grid.size);
	// Translate from cell to corner space for the next operations to make sense.
	coord = cellCoordToCornerCord(coord);
	// There's only 6 options, so I unrolled the for loop
	if (merged[coord.row-1][coord.col] == TRACK) {
		// If NORTH is on...
		if (merged[coord.row][coord.col+1] == TRACK) {
			// If EAST is on, bendy from NORTH to EAST.
			var arcCenter = {"x": corner.x + 7*grid.size/8, "y": corner.y + grid.size/8};
			drawTrackBendy(context, grid, arcCenter, Math.PI, "brown");
		} else if (merged[coord.row+1][coord.col] == TRACK) {
			// If SOUTH is on, vertical track.
			drawVerticalTrackFace(context, grid, corner, "brown");
		} else if (merged[coord.row][coord.col-1] == TRACK) {
			// If WEST is on, bendy from WEST to NORTH.
			var arcCenter = {"x": corner.x + grid.size/8, "y": corner.y + grid.size/8};
			drawTrackBendy(context, grid, arcCenter, Math.PI/2, "brown");
		}
	} else if (merged[coord.row][coord.col+1] == TRACK) {
		// If EAST is on...
		if (merged[coord.row+1][coord.col] == TRACK) {
			// If SOUTH is on, bendy from EAST to SOUTH.
			var arcCenter = {"x": corner.x + 7*grid.size/8, "y": corner.y + 7*grid.size/8};
			drawTrackBendy(context, grid, arcCenter, 3*Math.PI/2, "brown");
		} else if (merged[coord.row][coord.col-1] == TRACK) {
			// If WEST is on, horizontal track.
			drawHorizontalTrackFace(context, grid, corner, "brown");
		}
	} else if (merged[coord.row+1][coord.col] == TRACK && merged[coord.row][coord.col-1] == TRACK) {
		// If SOUTH and WEST are on, bendy from SOUTH to WEST.
		var arcCenter = {"x": corner.x + grid.size/8, "y": corner.y + 7*grid.size/8};
		drawTrackBendy(context, grid, arcCenter, 0, "brown");
	}
}

function drawVerticalTrack(context, grid, corner, color) {
	context.strokeStyle = color;
	context.lineWidth = 7;
	context.lineCap = "square";
	context.beginPath();
	context.moveTo(corner.x + grid.size/4, corner.y - grid.size/8);
	context.lineTo(corner.x + grid.size/4, corner.y + grid.size/8);
	context.moveTo(corner.x + 3*grid.size/4, corner.y - grid.size/8);
	context.lineTo(corner.x + 3*grid.size/4, corner.y + grid.size/8);
	context.stroke();
}

function drawVerticalTrackFace(context, grid, cornerPoint, color) {
	context.strokeStyle = color;
	context.lineWidth = 7;
	context.lineCap = "square";
	context.beginPath();
	context.moveTo(cornerPoint.x + grid.size/4, cornerPoint.y);
	context.lineTo(cornerPoint.x + grid.size/4, cornerPoint.y + grid.size);
	context.moveTo(cornerPoint.x + 3*grid.size/4, cornerPoint.y);
	context.lineTo(cornerPoint.x + 3*grid.size/4, cornerPoint.y + grid.size);
	context.stroke();
}

function drawHorizontalTrack(context, grid, corner, color) {
	context.strokeStyle = color;
	context.lineWidth = 7;
	context.lineCap = "square";
	context.beginPath();
	context.moveTo(corner.x - grid.size/8, corner.y + grid.size/4);
	context.lineTo(corner.x + grid.size/8, corner.y + grid.size/4);
	context.moveTo(corner.x - grid.size/8, corner.y + 3*grid.size/4);
	context.lineTo(corner.x + grid.size/8, corner.y + 3*grid.size/4);
	context.stroke();
}

function drawHorizontalTrackFace(context, grid, cornerPoint, color) {
	context.strokeStyle = color;
	context.lineWidth = 7;
	context.lineCap = "square";
	context.beginPath();
	context.moveTo(cornerPoint.x, cornerPoint.y + grid.size/4);
	context.lineTo(cornerPoint.x + grid.size, cornerPoint.y + grid.size/4);
	context.moveTo(cornerPoint.x, cornerPoint.y + 3*grid.size/4);
	context.lineTo(cornerPoint.x + grid.size, cornerPoint.y + 3*grid.size/4);
	context.stroke();
}

function drawTrackBendy(context, grid, corner, startAngle, color) {
	context.strokeStyle = color;
	context.lineWidth = 7;
	context.lineCap = "square";
	drawBend(context, corner, grid.size/8, startAngle);
	drawBend(context, corner, 5*grid.size/8, startAngle);
}

function drawBend(context, center, radius, startAngle) {
	context.beginPath();
	context.arc(center.x, center.y, radius, startAngle, startAngle-Math.PI/2, true);
	context.stroke();
}

function drawTrackBlock(context, grid, corner, color) {
	context.strokeStyle = color;
	context.lineWidth = 3;
	context.lineCap = "round";
	context.beginPath();
	context.moveTo(corner.x + grid.size/3, corner.y + grid.size/3);
	context.lineTo(corner.x + 2*grid.size/3, corner.y + 2*grid.size/3);
	context.moveTo(corner.x + 2*grid.size/3, corner.y + grid.size/3);
	context.lineTo(corner.x + grid.size/3, corner.y + 2*grid.size/3);
	context.stroke();
}

// Selected is an array of CornerCoord for Trains puzzles, so can't reuse drawSelected.
export function drawCornerSelected(context, selected, rows, columns) {
	var grid = getGrid(context, rows, columns);
	for (var cell of selected) {
		// Coord will be in the corner space, but of type Coord, unfortunately...
		var coord = valueToCoord(cell);
		if (coord.row % 2 == 1 && coord.col % 2 == 1) {
			// cell.  highlight the inner portion.
			coord = cornerCoordToCellCoord(coord);
			var center = cellCenter(coord, grid);
			var innerRad = grid.size / 4;
			var outerRad = 3 * Math.SQRT2 * grid.size / 8;
			var rg = context.createRadialGradient(center.x, center.y, innerRad, center.x, center.y, outerRad);
			rg.addColorStop(0, selectedGradiantWhite);
			rg.addColorStop(1, selectedGradiantBlue);
			context.fillStyle = rg;
			var corner = cellCorner(coord, grid);
			context.fillRect(corner.x + grid.size/8, corner.y + grid.size/8, 3*grid.size/4, 3*grid.size/4);
		} else if (coord.row % 2 == 1 && coord.col % 2 == 0) {
			// vertical edge.  highlight the edge.
			coord = cornerCoordToCellCoord(coord);
			// This will be the north end of the edge.
			var corner = cellCorner(coord, grid);
			var innerRad = 0.1 * grid.size/8;
			var outerRad = Math.SQRT2 * grid.size/8;
			// Once to fill the upper half
			var rg = context.createRadialGradient(corner.x, corner.y + grid.size/4, innerRad, corner.x, corner.y + grid.size/4, outerRad);
			rg.addColorStop(0, selectedGradiantWhite);
			rg.addColorStop(1, selectedGradiantBlue);
			context.fillStyle = rg;
			context.fillRect(corner.x - grid.size/8, corner.y + grid.size/8, grid.size/4, grid.size/8);
			// Once to fill the center
			rg = context.createLinearGradient(corner.x - outerRad, corner.y, corner.x + outerRad, corner.y);
			rg.addColorStop(0, selectedGradiantBlue);
			rg.addColorStop(0.5, selectedGradiantWhite);
			rg.addColorStop(1, selectedGradiantBlue);
			context.fillStyle = rg;
			context.fillRect(corner.x - grid.size/8, corner.y + grid.size/4, grid.size/4, grid.size/2);
			// Once to fill the lower half
			rg = context.createRadialGradient(corner.x, corner.y + 3*grid.size/4, innerRad, corner.x, corner.y + 3*grid.size/4, outerRad);
			rg.addColorStop(0, selectedGradiantWhite);
			rg.addColorStop(1, selectedGradiantBlue);
			context.fillStyle = rg;
			context.fillRect(corner.x - grid.size/8, corner.y + 3*grid.size/4, grid.size/4, grid.size/8);
		} else if (coord.row % 2 == 0 && coord.col % 2 == 1) {
			// horizontal edge. highlight the edge.
			coord = cornerCoordToCellCoord(coord);
			// This will be the west end of the edge.
			var corner = cellCorner(coord, grid);
			var innerRad = 0.1 * grid.size/8;
			var outerRad = Math.SQRT2 * grid.size/8;
			// Once to fill the left half
			var rg = context.createRadialGradient(corner.x + grid.size/4, corner.y, innerRad, corner.x + grid.size/4, corner.y, outerRad);
			rg.addColorStop(0, selectedGradiantWhite);
			rg.addColorStop(1, selectedGradiantBlue);
			context.fillStyle = rg;
			context.fillRect(corner.x + grid.size/8, corner.y - grid.size/8, grid.size/8, grid.size/4);
			// Once to fill the center
			rg = context.createLinearGradient(corner.x, corner.y - outerRad, corner.x, corner.y + outerRad);
			rg.addColorStop(0, selectedGradiantBlue);
			rg.addColorStop(0.5, selectedGradiantWhite);
			rg.addColorStop(1, selectedGradiantBlue);
			context.fillStyle = rg;
			context.fillRect(corner.x + grid.size/4, corner.y - grid.size/8, grid.size/2, grid.size/4);
			// Once to fill the right half
			var rg = context.createRadialGradient(corner.x + 3*grid.size/4, corner.y, innerRad, corner.x + 3*grid.size/4, corner.y, outerRad);
			rg.addColorStop(0, selectedGradiantWhite);
			rg.addColorStop(1, selectedGradiantBlue);
			context.fillStyle = rg;
			context.fillRect(corner.x + 3*grid.size/4, corner.y - grid.size/8, grid.size/8, grid.size/4);
		}
		// ignore corners.
	}
}
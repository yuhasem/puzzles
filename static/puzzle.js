var context = null;
var height = 0;
var width = 0;

function onLoad() {
	context =  document.getElementById("puzzle").getContext("2d");
	height = context.canvas.height;
	width = context.canvas.width;
	draw(context);
}

function Coord(row, col) {
	this.row = row;
	this.col = col;
}

Coord.prototype.isValid = function() {
	if (this.row < 0 || this.row >= numRows) {
		return false;
	}
	if (this.col < 0 || this.col >= numCols) {
		return false;
	}
	return true;
}

var clues = [
	[2, -1, 2, 2, -1, 2, -1, 2, 2, -1, 2],
	[-1, 2, 2, -1, 2, 2, 2, -1, 2, 2, -1],
	[2,  2, 2, 2,  2, 2, 2,  2, 2, 2,  2],
	[2, -1, 2, 2, -1, 2, -1, 2, 2, -1, 2],
	[-1, 2, 2, -1, 2, 2, 2, -1, 2, 2, -1],
	[2,  2, 2, 2,  2, 0, 2,  2, 2, 2,  2],
	[-1, 2, 2, -1, 2, 2, 2, -1, 2, 2, -1],
	[2, -1, 2, 2, -1, 2, -1, 2, 2, -1, 2],
	[2,  2, 2, 2,  2, 2, 2,  2, 2, 2,  2],
	[-1, 2, 2, -1, 2, 2, 2, -1, 2, 2, -1],
	[2, -1, 2, 2, -1, 2, -1, 2, 2, -1, 2],
];

var numRows = clues.length;
var numCols = clues[0].length;

/////
// User Input
/////
var failed = false;
var failedCoord = null;
var won = false;

var revealed = [];
for (var i = 0; i < clues.length; i++) {
	var row = [];
	for (var j = 0; j < clues[0].length; j++) {
		row.push(false);
	}
	revealed.push(row);
}

var flagged = [];
for (var i = 0; i < clues.length; i++) {
	var row = [];
	for (var j = 0; j < clues[0].length; j++) {
		row.push(false);
	}
	flagged.push(row);
}

var colors = [];
for (var i = 0; i < clues.length; i++) {
	var row = [];
	for (var j = 0; j < clues[0].length; j++) {
		row.push(new Set());
	}
	colors.push(row);
}

function resetPuzzle() {
	failed = false;
	failedCoord = null;
	won = false;
	for (var i = 0; i < clues.length; i++) {
		for (var j = 0; j < clues[i].length; j++) {
			revealed[i][j] = false;
			flagged[i][j] = false;
			colors[i][j].clear();
		}
	}
	document.getElementById("message").innerHTML = "";
	draw(context);
}

//////
// UI functions
//////
var canvMargin = 5;
// var ctx = document.getElementById("puzzle").getContext("2d");

function cellHeight() {
	return (height - 2 * canvMargin) / numRows;
}

function cellWidth() {
	return (width - 2 * canvMargin) / numCols;
}

function cellXY(row, col) {
	return {
		"x": canvMargin + cellWidth() * col,
		"y": canvMargin + cellHeight() * row
	}
}

function cellCenter(coord) {
	return {
		"x": canvMargin + cellWidth() * (coord.col + 0.5),
		"y": canvMargin + cellHeight() * (coord.row + 0.5)
	}
}

function draw(ctx) {
	ctx.clearRect(0, 0, width, height)
	drawClues(ctx);
	drawFog(ctx, revealed);
	drawSpecialClues(ctx);
	drawGrid(ctx);
	drawUserInput(ctx);
}

function drawClues(ctx) {
	if (failedCoord !== null) {
		highlightFailed(ctx, failedCoord);
	}
	for (var i = 0; i < clues.length; i++) {
		var row = clues[i];
		for (var j = 0; j < row.length; j++) {
			var clue = row[j];
			if (clue == 0) {
				continue;
			}
			if (clue < 0) {
				drawBomb(ctx, i, j);
				continue;
			}
			ctx.fillStyle = "black";
			if (clue == 1) {
				ctx.fillStyle = "blue";
			} else if (clue == 2) {
				ctx.fillStyle = "green";
			} else if (clue == 3) {
				ctx.fillStyle = "red";
			} else if (clue == 4) {
				ctx.fillStyle = "purple";
			} else if (clue == 5) {
				ctx.fillStyle = "brown";
			}
			ctx.textAlign = "center";
			ctx.textBaseline = "ideographic";
			ctx.font = Math.floor(cellHeight()) + "px Arial";
			// row + 1 to align with the bottom of the cell.
			var coord = cellXY(i+1, j);
			var x = coord.x + cellWidth() / 2;
			var y = coord.y;
			ctx.fillText(clue, x, y);
		}
	}
}

function highlightFailed(ctx, coord) {
	var center = cellCenter(coord);
	var innerRad = Math.min(cellHeight(), cellWidth()) / 3;
	var outerRad = Math.max(cellHeight(), cellWidth()) / Math.SQRT2;
	var rg = ctx.createRadialGradient(center.x, center.y, innerRad, center.x, center.y, outerRad);
	rg.addColorStop(0, "rgba(100%,100%,100%,0)");
	rg.addColorStop(1, "rgba(100%,0%,0%,1)");
	ctx.fillStyle = rg;
	var corner = cellXY(coord.row, coord.col);
	ctx.fillRect(corner.x, corner.y, cellWidth(), cellHeight());
}

function drawBomb(ctx, row, col) {
	var center = cellCenter(new Coord(row, col));
	var bound = Math.min(cellHeight(), cellWidth());
	ctx.lineCap = "round";
	ctx.lineWidth = 9;
	ctx.strokeStyle = "black";
	ctx.beginPath();
	var spikeExtreme = bound*0.375;
	ctx.moveTo(center.x - spikeExtreme, center.y - spikeExtreme);
	ctx.lineTo(center.x +spikeExtreme, center.y + spikeExtreme);
	ctx.moveTo(center.x - spikeExtreme, center.y);
	ctx.lineTo(center.x + spikeExtreme, center.y);
	ctx.moveTo(center.x - spikeExtreme, center.y + spikeExtreme);
	ctx.lineTo(center.x + spikeExtreme, center.y - spikeExtreme);
	ctx.moveTo(center.x, center.y - spikeExtreme);
	ctx.lineTo(center.x, center.y + spikeExtreme);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(center.x, center.y, bound * 0.25, 0, 2 * Math.PI, false);
	ctx.stroke();
}

function drawFog(ctx, revealed) {
	for (var i = 0; i < revealed.length; i++) {
		var row = revealed[i];
		for (var j = 0; j < row.length; j++) {
			if (!row[j]) {
				ctx.fillStyle = "#888888";
				var coord = cellXY(i, j);
				ctx.fillRect(coord.x, coord.y, cellWidth(), cellHeight());
			}
		}
	}
}

function drawSpecialClues(ctx) {
	if (!revealed[5][5]) {
		var coord = cellCenter(new Coord(5,5));
		ctx.strokeStyle = "#22CC22";
		ctx.lineWidth = 9;
		ctx.beginPath();
		var rad = Math.min(cellHeight(), cellWidth()) * 0.3;
		ctx.arc(coord.x, coord.y, rad, 0, 2 * Math.PI, false);
		ctx.stroke();
	}
}

function drawGrid(ctx) {
	ctx.strokeStyle = "#444444";
	ctx.lineWidth = 3;
	ctx.lineCap = "square";
	
	// Vertical lines
	var end = height - canvMargin;
	ctx.beginPath();
	for (var i = 0; i < numRows+1; i++) {
		var at = canvMargin + i*cellWidth();
		ctx.moveTo(at, canvMargin);
		ctx.lineTo(at, end);
	}
	ctx.stroke();
	
	// Horizontal lines
	var end = width - canvMargin;
	ctx.beginPath();
	for (var i = 0; i < numCols+1; i++) {
		var at = canvMargin + i*cellHeight();
		ctx.moveTo(canvMargin, at);
		ctx.lineTo(end, at);
	}
	ctx.stroke();
}

var innerHighlightMargin = 2;

function drawUserInput(ctx) {
	// Highlight selected cells
	for (cell of selectedCells) {
		var coord = valueToCoord(cell);
		drawHighlight(ctx, coord);
	}
	// Draw flags
	for (var i = 0; i < flagged.length; i++) {
		for (var j = 0; j < flagged[i].length; j++) {
			if (!flagged[i][j]) {
				continue;
			}
			drawFlag(ctx, new Coord(i, j));
		}
	}
	// Calculate invalid clues based on flags, and highlight errors.
	if (document.getElementById("highlight-errors").checked) {
		for (var i = 0; i < clues.length; i++) {
			for (var j = 0; j < clues[i].length; j++) {
				// Only highlight if the clue has been revealed.
				if (!revealed[i][j]) {
					continue;
				}
				var coord = new Coord(i, j);
				if (adjacentFlags(coord) > clues[i][j]) {
					highlightFailed(ctx, coord);
				}
			}
		}
	}
	for (var i = 0; i < colors.length; i++) {
		for (var j = 0; j < colors[i].length; j++) {
			drawColors(ctx, colors[i][j], new Coord(i, j));
		}
	}
}

// Returns the number of cells adjacent to the given Coord that were flagged
// by the user.
function adjacentFlags(coord) {
	var numAdjacent = 0;
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			var c = new Coord(coord.row + i, coord.col + j);
			if (!c.isValid()) {
				continue;
			}
			if (flagged[c.row][c.col]) {
				numAdjacent++;
			}
		}
	}
	return numAdjacent;
}

function drawHighlight(ctx, coord) {
	var center = cellCenter(coord);
	var innerRad = Math.min(cellHeight(), cellWidth()) / 2.2;
	var outerRad = Math.max(cellHeight(), cellWidth()) / Math.SQRT2;
	var rg = ctx.createRadialGradient(center.x, center.y, innerRad, center.x, center.y, outerRad);
	rg.addColorStop(0, "rgba(100%,100%,100%,0)");
	rg.addColorStop(1, "rgba(0%,50%,100%,1)");
	ctx.fillStyle = rg;
	var corner = cellXY(coord.row, coord.col);
	ctx.fillRect(corner.x, corner.y, cellWidth(), cellHeight());
}

function drawFlag(ctx, coord) {
	var corner = cellXY(coord.row, coord.col);
	var poleTop = corner.y + cellHeight() * 0.25
	var poleMiddle = corner.y + cellHeight() * 0.5;
	var poleBottom = corner.y + cellHeight() * 0.75;
	var leftEdge = corner.x + cellWidth() * 0.33;
	var rightEdge = corner.x + cellWidth() * 0.67;
	var flagMiddle = corner.y + cellHeight() * 0.375;
	ctx.lineWidth = 1;
	ctx.fillStyle = "red";
	ctx.beginPath();
	ctx.moveTo(leftEdge, poleTop);
	ctx.lineTo(rightEdge, flagMiddle);
	ctx.lineTo(leftEdge, poleMiddle);
	ctx.fill();
	ctx.lineWidth = 5;
	ctx.lineCap = "round";
	ctx.strokeStyle = "brown";
	ctx.beginPath();
	ctx.moveTo(leftEdge, poleTop);
	ctx.lineTo(leftEdge, poleBottom);
	ctx.stroke();
}

function drawColors(ctx, colors, coord) {
	var colorList = [];
	for (color of colors) {
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
	var center = cellCenter(coord)
	var topLeft = cellXY(coord.row, coord.col);
	for (var i = 0; i < n; i++) {
		ctx.lineWidth = 1;
		ctx.fillStyle = numToColor(colorList[i]);
		ctx.beginPath();
		// console.log("move to " + center.x + ", " + center.y);
		ctx.moveTo(center.x, center.y);
		var offset = squareAt(i * angle)
		// console.log("line to " + (topLeft.x + offset.x) + ", " + (topLeft.y + offset.y));
		ctx.lineTo(topLeft.x + offset.x, topLeft.y + offset.y);
		while (corner < (i+1) * angle) {
			var offset = squareAt(corner);
			// console.log("line to " + (topLeft.x + offset.x) + ", " + (topLeft.y + offset.y));
			ctx.lineTo(topLeft.x + offset.x, topLeft.y + offset.y);
			corner += Math.PI / 2;
		}
		offset = squareAt((i+1) * angle);
		// console.log("line to " + (topLeft.x + offset.x) + ", " + (topLeft.y + offset.y));
		ctx.lineTo(topLeft.x + offset.x, topLeft.y + offset.y);
		// console.log("line to " + center.x + ", " + center.y);
		ctx.lineTo(center.x, center.y);
		ctx.fill();
	}
}

// Returns the canvas coordinates relative to the top left corner cell that
// represent a point on the edge of the cell |angle| radians counter-clockwise
// with angle 0 pointing horizontally to the right.
function squareAt(angle) {
	var x = 0;
	var y = 0;
	if (Math.PI/4 < angle && angle <= 3*Math.PI/4) {
		y = 0;
		var alpha = Math.PI/2 - angle;
		x = cellWidth()/2 + (Math.tan(alpha) * cellHeight()/2);
	} else if (3*Math.PI/4 < angle && angle <= 5*Math.PI/4) {
		x = 0;
		var alpha = angle - Math.PI;
		y = cellHeight()/2 + (Math.tan(alpha) * cellWidth()/2);
	} else if (5*Math.PI/4 < angle && angle <= 7*Math.PI/4) {
		y = cellHeight();
		var alpha = angle - 3*Math.PI/2;
		x = cellWidth()/2 + (Math.tan(alpha) * cellHeight()/2);
	} else {
		x = cellWidth();
		y = cellHeight()/2 - Math.tan(angle) * cellWidth()/2;
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

/////
// Input functions
/////
function pointToCell(x, y) {
	var row = Math.floor((y - canvMargin) / cellHeight());
	var col = Math.floor((x - canvMargin) / cellWidth());
	var c = new Coord(row, col);
	if (c.isValid()) {
		return c;
	}
	return null;
}

// To make them directly comparable for Set.
function coordToValue(coord) {
	return coord.col * numRows + coord.row
}

function valueToCoord(value) {
	return new Coord(value % numRows, Math.floor(value / numRows));
}

var selectedCells = new Set();
var currentCell = null;
var mouseHold = false;

function addCellSelection(ev) {
	var bbox = ev.target.getBoundingClientRect();
	var x = ev.clientX - bbox.left;
	var y = ev.clientY - bbox.top;
	var coord = pointToCell(x, y);
	if (coord === null) {
		// console.log("no coord from " + x + ", " + y);
		return;
	}
	currentCell = coord;
	selectedCells.add(coordToValue(coord));
}

function canvasClick(ev) {
	mouseHold = true;
	if (ev.target.id != "puzzle") {
		console.log("non puzzle click?");
		return;
	}
	// Holding control or shift will add to the current selection, otherwise clear them.
	if (!(ev.ctrlKey || ev.shiftKey)) {
		currentCell = null;
		selectedCells.clear();
	}
	addCellSelection(ev);
	draw(context);
}

function move(ev) {
	if (!mouseHold) {
		return;
	}
	addCellSelection(ev);
	draw(context);
}

function unclick(ev) {
	mouseHold = false;
}

// This doesn't get cought by a handler on body if the unclick happens outside
// a DOM element, and only having it on the canvas would mean we wouldn't
// detect when a mouse up happens after dragging the cursor off the canvas.
// This seems like the best solution to a good user experience.
window.addEventListener("mouseup", (event) => { unclick(event); });

function key(ev) {
	if (ev.code == "KeyZ" || ev.code == "Space") {
		openCells(selectedCells);
	}
	if (ev.code == "KeyX") {
		flagCells(selectedCells);
	}
}

function adjacentUnrevealedCells(coord) {
	var coords = [];
	for (var i = -1; i <= 1; i++) {
		for (var j = -1; j <= 1; j++) {
			var c = new Coord(coord.row + i, coord.col + j);
			if (!c.isValid()) {
				continue;
			}
			if (revealed[c.row][c.col]) {
				continue;
			}
			coords.push(c);
		}
	}
	return coords;
}

function openCells(cells) {
	if (failed || won) {
		return;
	}
	var toOpen = [];
	for (cell of cells) {
		var coord = valueToCoord(cell);
		if (flagged[coord.row][coord.col]) {
			continue;
		}
		toOpen.push(coord);
	}
	while (toOpen.length > 0) {
		var coord = toOpen.pop();
		revealed[coord.row][coord.col] = true;
		// Always unflag anything that got openend from a burst.
		flagged[coord.row][coord.col] = false;
		if (clues[coord.row][coord.col] < 0) {
			// Bomb!
			fail(coord);
			break;
		}
		if (clues[coord.row][coord.col] == 0) {
			for (c of adjacentUnrevealedCells(coord)) {
				toOpen.push(c);
			}
		}
	}
	if (hasWon()) {
		win();
	}
	draw(context);
}

function flagCells(cells) {
	if (failed || won) {
		return;
	}
	var unflagged = [];
	var allCells = [];
	for (cell of cells) {
		var coord = valueToCoord(cell);
		// Ignore opened cells.
		if (revealed[coord.row][coord.col]) {
			continue;
		}
		allCells.push(coord);
		if (!flagged[coord.row][coord.col]) {
			unflagged.push(coord);
		}
	}
	if (unflagged.length == 0) {
		// All the selected cells were flagged, so we unflag them now.
		for (coord of allCells) {
			flagged[coord.row][coord.col] = false;
		}
	} else {
		// Flag all the unflagged cells.
		for (coord of unflagged) {
			flagged[coord.row][coord.col] = true;
		}
	}
	draw(context);
}

function addColor(color, cells) {
	var notColored = []
	var allCells = []
	for (cell of cells) {
		var coord = valueToCoord(cell);
		allCells.push(coord);
		if (!colors[coord.row][coord.col].has(color)) {
			notColored.push(coord);
		}
	}
	if (notColored.length == 0) {
		// All the cells have that color, so remove it.
		for (coord of allCells) {
			colors[coord.row][coord.col].delete(color);
		}
	} else {
		// Color all the not colored cells.
		for (coord of notColored) {
			colors[coord.row][coord.col].add(color);
		}
	}
	draw(context);
}

function hasWon() {
	if (won) { return true; }
	for (var i = 0; i < clues.length; i++) {
		for (var j = 0; j < clues[i].length; j++) {
			// Any cell without a bomb must be revealed, any cell with a bomb must not be revealed.
			if (!((clues[i][j] < 0) ^ (revealed[i][j]))) {
				return false;
			}
		}
	}
	return true;
}

function fail(coord) {
	failed = true;
	failedCoord = coord;
	var message = document.getElementById("message");
	message.innerHTML = "Oh no, that's a bomb!  Press Reset to try again."
}

function win() {
	won = true;
	var message = document.getElementById("message");
	message.innerHTML = "Congratulations, you won!"
}

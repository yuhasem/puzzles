const N = 1, E = 2, S = 4, W = 8;
const Y = 0, B = 1, L = 2;
const U = 0, T = 2;

function C(r,c) { return {"row": r, "col": c}; }

// TODO: figure out how to make this generic and loadable, probably with golang templates
var LWalls = [
	[false, true, false, false, true, false, true, false, false, true, false],
	[true, false, false, true, false, false, false, true, false, false, true],
	[false, false, false, false, false, false, false, false, false, false, false],
	[false, true, false, false, true, false, true, false, false, true, false],
	[true, false, false, true, false, false, false, true, false, false, true],
	[false, false, false, false, false, false, false, false, false, false, false],
	[true, false, false, true, false, false, false, true, false, false, true],
	[false, true, false, false, true, false, true, false, false, true, false],
	[false, false, false, false, false, false, false, false, false, false, false],
	[true, false, false, true, false, false, false, true, false, false, true],
	[false, true, false, false, true, false, true, false, false, true, false]
];

var LClues = [
	["", "2", "", "", "", "", "1", "", "", "", ""],
	[7*Math.PI/4, "", "", "1", "", "", "", "", "", "", ""],
	["", "", "", "", "", "", "", "", "", "", ""],
	["", "1", "", "", "1", "", "", "", "", "", ""],
	["", "", "", "", "", "", "", "2", "", "", ""],
	["", "", "", "", "", "", "", "", "", "", ""],
	["", "", "", "1", "", "", "", "", "", "", ""],
	["", "", "", "", "", "", "3", "", "", "", ""],
	["", "", "", "", "", "", "", "", "", "", ""],
	["", "", "", "2", "", "", "", 3*Math.PI/4, "", "", ""],
	["", "", "", "", "", "", "", "", "", "", ""]
];

var LSolution = [
	[true, false, false, true, false, false, false, true, false, false, true],
	[false, true, false, false, false, true, false, false, false, true, false],
	[false, false, true, false, false, false, false, false, false, false, false],
	[true, false, false, true, false, false, false, true, false, false, true],
	[false, false, false, false, false, false, false, false, true, false, false],
	[false, false, false, false, true, false, false, false, false, false, false],
	[false, true, false, false, false, false, true, false, false, true, false],
	[true, false, false, true, false, false, false, true, false, false, true],
	[false, false, false, false, false, false, true, false, false, false, false],
	[false, true, false, false, true, false, false, false, false, true, false],
	[true, false, false, true, false, false, false, true, false, false, true]
];

var mineClues = [
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

var galaxyClues = [
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, true, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, true, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, false, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, true, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, true, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, false, false, true, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false, true, false, false, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, true, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, true, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, false, false, true, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false, true, false, false, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	[false, true, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, true, false],
	[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
];

var galaxySolution = [
	[N|E|S|W, N|S|W, N|E, N|E|S|W, N|E|W, N|S|W, N|S, N|S, N|S, N|E|S, N|E|S|W],
	[N|E|W, N|E|S|W, W, N|E, S|W, N|S, N|E, N|E|W, N|S|W, N|S, N|E|S],
	[S|W, N, 0, S, N|E, N|E|W, E|S|W, W, N, N, N|E|S],
	[N|E|S|W, S|W, E, N|E|S|W, E|S|W, W, N, 0, S, E, N|E|S|W],
	[N|W, N|E, S|W, N|E|S, N|S|W, S, S, E, N|E|S|W, E|S|W, N|E|W],
	[S|W, E, N|S|W, N|S, N|S, N|S, N|E|S, E|S|W, N|E|W, N|W, S|E],
	[N|E|W, E|W, N|S|W, N|E, N|W, N|S, N|S, N|S, S|E, E|W, N|E|W],
	[E|W, W, N|E, E|W, E|S|W, N|W, N|E, N|E|S|W, N|W, S|E, W|E],
	[E|S|W, S|W, S|E, S|W, N|E|S, S|W, 0, N|E, E|S|W, N|E|W, E|S|W],
	[N|S|W, N|S, N|E|S, N|S|W, N|S, N|E|S, S|W, S|E, N|S|W, 0, N|E|S],
	[N|E|S|W, N|S|W, N|S, N|S, N|S, N|E|S, N|S|W, N|S, N|E|S, E|S|W, N|E|S|W],
];

var sudokuSolution = [
	[0, 0, 3, 6, 7, 0, 0, 0, 0, 0, 0],
	[0, 0, 5, 4, 8, 2, 6, 9, 1, 3, 7],
	[0, 0, 9, 1, 2, 7, 3, 5, 8, 6, 4],
	[0, 6, 7, 3, 0, 8, 1, 4, 9, 5, 2],
	[0, 8, 2, 5, 9, 6, 7, 3, 4, 1, 0],
	[0, 1, 4, 9, 3, 5, 2, 6, 7, 8, 0],
	[3, 7, 6, 0, 4, 1, 8, 2, 5, 9, 0],
	[5, 9, 8, 2, 1, 4, 0, 0, 0, 0, 0],
	[4, 2, 1, 7, 5, 3, 9, 8, 6, 0, 0],
	[0, 0, 0, 8, 6, 9, 5, 1, 2, 0, 0],
	[0, 0, 0, 0, 0, 0, 4, 7, 3, 0, 0],
];

var sudokuCages = [
	{"cells": [C(0,0)], "sum": ""},
	{"cells": [C(0,1), C(0,2), C(1,0), C(1,2), C(1,3), C(2,0), C(2,1), C(2,2), C(2,3), C(2,4), C(3,1), C(3,2), C(3,4), C(4,2), C(4,3)], "sum": ""},
	{"cells": [C(0,3)], "sum": 6},
	{"cells": [C(0,4), C(1,4), C(1,5), C(1,6), C(2,6)], "sum": ""},
	{"cells": [C(0,5), C(0,6), C(0,7), C(0,8), C(0,9)], "sum": 0},
	{"cells": [C(0,10)], "sum": ""},
	{"cells": [C(1,1)], "sum": 0},
	{"cells": [C(1,7), C(2,5), C(2,7), C(2,8), C(2,9), C(2,10), C(3,5), C(3,6), C(3,7), C(3,8), C(3,9), C(4,4), C(4,5), C(4,6), C(4,7), C(4,9), C(5,7)], "sum": ""},
	{"cells": [C(1,8), C(1,9), C(1,10)], "sum": 11},
	{"cells": [C(3,0)], "sum": 0},
	{"cells": [C(3,3)], "sum": 3},
	{"cells": [C(3,10)], "sum": 2},
	{"cells": [C(4,0), C(4,1), C(5,0), C(5,1), C(6,1), C(7,1), C(7,2), C(8,1), C(8,2)], "sum": 36},
	{"cells": [C(4,8)], "sum": 4},
	{"cells": [C(4,10), C(5,9), C(5,10), C(6,9), C(7,8), C(7,9), C(8,8)], "sum": 23},
	{"cells": [C(5,2), C(5,3), C(5,4), C(5,5), C(5,6)], "sum": 23},
	{"cells": [C(5,8), C(6,4), C(6,5), C(6,6), C(6,7), C(6,8), C(7,4)], "sum": 28},
	{"cells": [C(6,0), C(7,0), C(8,0)], "sum": 12},
	{"cells": [C(6,2), C(6,3), C(7,3), C(8,3), C(8,4)], "sum": 20},
	{"cells": [C(6,10), C(7,10), C(8,10)], "sum": 0},
	{"cells": [C(7,5), C(7,6), C(8,5), C(8,6), C(8,7), C(9,6), C(9,7)], "sum": 30},
	{"cells": [C(7,7)], "sum": ""},
	{"cells": [C(8,9), C(9,8), C(9,9), C(9,10), C(10,9)], "sum": 2},
	{"cells": [C(9,0), C(9,1), C(9,2)], "sum": 0},
	{"cells": [C(9,3), C(9,4), C(9,5)], "sum": 23},
	{"cells": [C(10,0)], "sum": ""},
	{"cells": [C(10,1), C(10,2), C(10,3), C(10,4), C(10,5)], "sum": 0},
	{"cells": [C(10,6), C(10,7), C(10,8)], "sum": 14},
	{"cells": [C(10,10)], "sum": ""},
];

var sudokuArrows = [
	[C(1,9), C(1,8), C(0,8), C(0,7), C(0,6), C(1,5)],
	[C(2,2), C(3,2), C(4,2)],
	[C(3,7), C(3,6), C(2,6)],
	[C(6,1), C(6,2), C(6,3), C(7,4)],
	[C(6,6), C(5,6), C(4,5)],
	[C(6,9), C(5,10), C(4,10), C(3,10), C(2,9), C(1,8)],
	[C(7,3), C(7,4), C(6,5)],
	[C(7,0), C(8,1), C(8,2), C(7,3)],
];

var trainsSolution = [
	[U, U, B, T, T, T, T, T, T, U, U, U, T, T, T, T, B],
	[U, U, U, U, U, U, U, U, T, U, U, U, T, U, U, U, U],
	[U, U, U, U, T, T, T, T, T, U, U, U, T, U, U, U, U],
	[U, U, U, U, T, U, U, U, U, U, U, U, T, U, U, U, U],
	[U, U, U, U, T, U, U, U, U, U, U, U, T, U, U, U, U],
	[U, U, U, U, T, U, U, U, U, U, U, U, T, U, U, U, U],
	[U, U, U, U, T, T, T, U, U, U, U, U, T, T, T, U, U],
	[U, U, U, U, U, U, T, U, U, U, U, U, U, U, T, U, U],
	[T, T, T, T, T, T, T, U, U, U, T, T, T, T, T, U, U],
	[T, U, U, U, U, U, U, U, U, U, T, U, U, U, U, U, U],
	[T, U, U, U, U, U, U, U, T, T, T, U, U, U, U, U, U],
	[T, U, U, U, U, U, U, U, T, U, U, U, U, U, U, U, U],
	[T, T, T, T, T, T, T, U, T, U, U, U, U, U, U, U, U],
	[U, U, U, U, U, U, T, U, T, U, U, U, U, U, U, U, U],
	[U, U, U, U, U, U, T, U, T, T, T, T, T, U, U, U, U],
	[U, U, U, U, U, U, T, U, U, U, U, U, T, U, U, U, U],
	[U, U, U, U, U, U, T, T, T, T, T, T, T, U, U, U, U],
];

var trainsClues = {
	// Clues along the edges. length is the length of the inner puzzle.
	"north": [0, 3, 6, 7, 0, 0, 0, 0, 0],
	"west": [0, 0, 0, 0, 0, 3, 5, 4, 0],
	"south": [0, 0, 0, 0, 0, 4, 7, 3, 0],
	"east": [7, 4, 2, 0, 0, 0, 0, 0, 0],
	// Any clues given along the inner puzzle. 2*size+1 by 2*size+1.
	"body": [
		[B, U, B, T, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U],
		[U, B, U, T, U, U, U, U, U, U, U, U, U, U, U, U, U, T, T],
		[B, U, B, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U],
		[U, B, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U],
		[B, U, B, U, U, U, B, U, B, U, U, U, U, U, U, U, U, U, U],
		[U, U, U, U, U, U, U, B, U, U, U, U, U, U, U, U, U, U, U],
		[U, U, U, U, U, U, B, U, B, U, U, U, U, U, U, U, U, U, U],
		[U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, B, U, U],
		[U, U, U, U, U, U, U, U, U, B, U, U, U, U, U, U, U, U, U],
		[U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U],
		[U, U, U, U, B, U, B, U, U, U, U, U, U, U, U, U, U, U, U],
		[U, U, U, U, U, B, U, U, U, U, U, U, U, U, U, U, U, U, U],
		[U, U, U, U, B, U, B, U, U, U, B, U, B, U, B, U, B, U, B],
		[U, U, U, U, U, U, U, U, U, U, U, B, U, B, U, B, U, B, U],
		[U, U, U, U, U, U, U, U, U, U, B, U, B, U, B, U, B, U, B],
		[U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, B, U],
		[B, U, B, U, B, U, U, U, U, U, U, U, U, U, U, U, B, U, B],
		[U, B, U, B, U, U, U, U, U, U, U, U, U, U, U, U, U, B, U],
		[B, U, B, U, B, U, U, U, U, U, U, U, U, U, U, U, B, U, B],
	],
};


var chain = [
	{
		"type": "MINES",
		"clues": mineClues,
		"specials": [C(5,5)],
		"rules": `
		<h2><center>Link 1/5: Mines</center></h2>
		<p>
		Open every cell which does not contain a mine to advance to the next link.
		</p>
		<p>
		A cell containing a number indicates how many of the 8 diagonally adjacent cells contain a mine.
		</p>
		<p>
		You are given that the center cell does not contain a mine.  No guessing is required.
		</p>
		`,
	},
	{
		"type": "LIGHTS",
		"walls": LWalls,
		"clues": LClues,
		"solution": LSolution,
		"rules": `
		<h2><center>Link 2/5: Lights</center></h2>
		<p>
		The mines have become walls!
		</p>
		<p>
		Place lights so that every cell is lit up.  Lights light up every cell in the 4 cardinal directions until they reach a wall.  Two lights may not shine on each other.
		</p>
		<p>
		A number on a wall indicates how many lights are in the 4 adjacent cells to that wall.
		</p>
		<p>
		An arrow on a wall indicates that there is exactly 1 light in the direction of the arrow.
		</p>
		`,
	},
	{
		"type": "GALAXIES",
		"clues": galaxyClues,
		"solution": galaxySolution,
		"specials": [{"coord": C(7,4), "dir": Math.PI/6}],
		"rules": `
		<h2><center>Link 3/5: Galaxies</center></h2>
		<p>
		The Ls are now the centers of galaxies!
		</p>
		<p>
		Partition the grid into galaxies.  Every cell must be a part of exactly one galaxy.  Galaxies are 180° rotationally symmetric around one of the given cetners.  Galaxies must be connected (diagonals don't count).
		</p>
		<p>
		An arrow in a cell indicates that cell is part of a galaxy whose center is in the direction of the arrow.
		</p>
		`,
	},
	{
		"type": "SUDOKU",
		"digits": [],
		"cages": sudokuCages,
		"arrows": sudokuArrows,
		"solution": sudokuSolution,
		"rules": `
		<h2><center>Link 4/5: Sudoku</center></h2>
		<p>
		The galaxies are now cages!  Some of the galaxy centers have become arrows!
		</p>
		<p>
		Fill the grid with 9 non-overlapping 3x3 square regions.  The digits 1-9 appear once in each region, and no row or column may contain any repeat digits.  Cells outside a region do not contain a digit.
		</p>
		<p>
		The sum of the digits in a cage must equal the number in the top left of the cage, if given.  Digits may repeat within a cage.
		</p>
		<p>
		The digit at the circle end of an arrow must be the sum of all digits along the arrow.  Digits may repeat along an arrow.
		</p>
		`,
	},
	{
		"type": "TRAINS",
		"clues": trainsClues,
		"solution": trainsSolution,
		"rules": `
		<h2><center>Link 5/5: Trains</center></h2>
		<p>
		Build a single continuous train track from the start (just below the 3 in the top row) to the end (just left of the 7 in the right column).  The track must not cross itself and must not form any loops.
		</p>
		<p>
		Some of the sudoku digits were left outside of the grid.  A digit indicates how many cells contains a track in that row or column.
		</p>
		<p>
		Cells and edges marked with an "X" cannot contain a track.  All cells which didn't have a digit from the sudoku are blocked.
		</p>
		`,
	},
];
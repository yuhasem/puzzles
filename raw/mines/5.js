function C(r,c) { return {"row": r, "col": c}; }

var mineClues = [
	[-1,  1,  1,  2, -1,  3, -1,  2, -1, -1],
	[ 2,  2,  1, -1,  3, -1,  2,  2,  3, -1],
	[-1,  3,  2,  1,  3,  2,  2,  0,  2,  2],
	[-1, -1,  1,  1,  3, -1,  3,  2,  2, -1],
	[-1,  3,  1,  1, -1, -1, -1,  3, -1,  2],
	[ 1,  2,  1,  2,  2,  3,  3, -1,  3,  2],
	[ 1,  2, -1,  2,  2,  1,  3,  3, -1,  2],
	[ 1, -1,  4, -1,  2, -1,  2, -1,  4, -1],
	[ 2,  3, -1,  3,  4,  2,  3,  2, -1,  2],
	[ 1, -1,  3, -1,  2, -1,  1,  1,  1,  1],
];

var chain = [
	{
		"type": "MINES",
		"clues": mineClues,
		"specials": {"givenClears": [C(1,0)], "givenBombs": [C(0,0)]},
		"rules": `
		<h2><center>1...2...3...Mine!</center></h2>
		<ul>
		<li>Open every cell which does not contain a mine.</li>
		<li>A cell containing a number indicates how many of the 8 diagonally adjacent cells contain a mine.</li>
		<li>Knightsweeper: A mine may not be a knight's move (in chess) from another mine</li>
		</ul>
		<p>
		You are given that r1c1 (marked with a red X) contains a mine and r2c1 (marked with a green O) does not contain a mine.  No guessing is required.
		</p>
		`,
		"message": "Congratulations, you've won!  <a href=\"/puzzles/mines/6\">Want to try another Knightsweeper?</a>",
	},
]
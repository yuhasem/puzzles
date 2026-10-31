function C(r,c) { return {"row": r, "col": c}; }

var mineClues = [
	[ 1,  2, -1,  2, -1,  2,  2,  2, -1,  1],
	[ 2, -1,  3,  4,  3, -1,  2, -1,  2,  1],
	[-1,  3, -1,  2, -1,  3,  3,  1,  2,  1],
	[ 2,  3,  1,  3,  3, -1,  2,  1,  1, -1],
	[-1,  3,  2,  2, -1,  3, -1,  1,  2,  2],
	[-1, -1,  2, -1,  3,  4,  2,  2,  1, -1],
	[-1,  3,  2,  2, -1,  3, -1,  2,  3,  2],
	[ 2,  3,  1,  3,  3, -1,  3, -1,  2, -1],
	[-1,  2, -1,  3, -1,  2,  3,  2,  4,  2],
	[ 1,  2,  2, -1,  2,  1,  1, -1,  2, -1],
];

var chain = [
	{
		"type": "MINES",
		"clues": mineClues,
		"specials": {"givenClears": [C(0,6), C(1,6)]},
		"rules": `
		<h2><center>How Does the Horsey Move?</center></h2>
		<ul>
		<li>Open every cell which does not contain a mine.</li>
		<li>A cell containing a number indicates how many of the 8 diagonally adjacent cells contain a mine.</li>
		<li>Knightsweeper: A mine may not be a knight's move (in chess) from another mine</li>
		</ul>
		<p>
		You are given that r1c7 and r2c7 (marked with green Os) do not contain mines.  No guessing is required.
		</p>
		`,
		"message": "Congratulations, you've won!  <a href=\"/puzzles/mines/2\">Want to try another Knightsweeper?</a>",
	},
];
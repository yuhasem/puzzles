function C(r,c) { return {"row": r, "col": c}; }

var mineClues = [
	[ 1,  2,  2, -1,  2, -1, -1,  2,  1,  1],
	[-1,  2, -1,  3,  3,  3, -1,  2,  2, -1],
	[ 2,  3,  2, -1,  1,  2,  2,  2,  3, -1],
	[-1,  2,  1,  1,  1,  1, -1,  1,  2, -1],
	[-1,  2,  1,  1,  1,  1,  1,  1,  1,  1],
	[ 2,  2,  1, -1,  1,  0,  1,  1,  2,  1],
	[-1,  2,  1,  1,  1,  1,  2, -1,  3, -1],
	[-1,  2,  1,  1,  1,  1, -1,  4, -1,  3],
	[ 2,  3,  2, -1,  1,  1,  2, -1,  4, -1],
	[-1,  2, -1,  2,  1,  0,  1,  2, -1,  2],
];

var chain = [
	{
		"type": "MINES",
		"clues": mineClues,
		"specials": {"givenClears": [C(9,9)]},
		"rules": `
		<h2><center>Surrounded by Caltrops</center></h2>
		<ul>
		<li>Open every cell which does not contain a mine.</li>
		<li>A cell containing a number indicates how many of the 8 diagonally adjacent cells contain a mine.</li>
		<li>Knightsweeper: A mine may not be a knight's move (in chess) from another mine</li>
		</ul>
		<p>
		You are given that r10c10 (marked with a green O) do not contain a mine.  No guessing is required.
		</p>
		`,
		"message": "Congratulations, you've won!  <a href=\"/puzzles/mines/3\">Want to try another Knightsweeper?</a>",
	},
]
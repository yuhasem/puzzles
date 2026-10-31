var mineClues = [
	[-1,  3, -1,  3, -1,  3, -1],
	[ 3, -1,  4, -1,  4, -1,  3],
	[-1,  4, -1,  4, -1,  4, -1],
	[ 3, -1,  4, -1,  4, -1,  3],
	[-1,  4, -1,  4, -1,  4, -1],
	[ 3, -1,  4, -1,  4, -1,  3],
	[-1,  3, -1,  3, -1,  3, -1],
];

var chain = [
	{
		"type": "MINES",
		"clues": mineClues,
		"specials": {},
		"rules": `
		<h2><center>X Marks the Mine</center></h2>
		<ul>
		<li>Open every cell which does not contain a mine.</li>
		<li>A cell containing a number indicates how many of the 8 diagonally adjacent cells contain a mine.</li>
		<li>Knightsweeper: A mine may not be a knight's move (in chess) from another mine</li>
		</ul>
		<p>
		You are given that there are 25 mines.  No guessing is required.
		</p>
		`,
		"message": "Congratulations, you've won!  <a href=\"/puzzles/mines/5\">Want to try another Knightsweeper?</a>",
	},
]
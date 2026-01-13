import { resize } from "./grid.mjs";

class ChainController {
	constructor(context) {
		this.context = context;
		resize(context);
		this.mouseHold = false;
		this.touchId = null;
		this.mode = "controls";
		this.chainIndex = parseInt(window.localStorage.getItem("index"));
		if (!this.chainIndex) {
			this.chainIndex = 0;
		}
		this.controls = [];
		this.next(true);
		this.changeMode({"target": {"id": "control"}});
	}
	
	// Controls expects an Array of objects with "text", "class", and "method"
	// fields, representing display text, css class, and function to call on
	// click respectively.
	setControls(controls, allowsColors, allowsLines) {
		// Used in key()
		this.controls = controls;
		var tab = document.getElementById("control-tab");
		tab.innerHTML = "";
		for (var control of controls) {
			var buttonEl = document.createElement("button");
			buttonEl.innerText = control.text;
			buttonEl.className = control.class;
			buttonEl.onclick = function(control) {
				return function() {
					controller.execute(control.method);
				}
			}(control);
			tab.appendChild(buttonEl);
		}
		// Show only the relevant tabs
		var labels = document.getElementsByTagName("label");
		for (var label of labels) {
			switch (label.attributes.for.nodeValue) {
			case "control":
				label.style.display = controls.length > 0 ? "" : "none";
				break;
			case "color":
				label.style.display = allowsColors ? "" : "none";
				break;
			case "line":
				label.style.display = allowsLines ? "" : "none";
				break;
			}
		}
	}
	
	resetPuzzle() {
		this.handler.resetPuzzle();
		this.draw(this.context);
	}
	
	draw() {
		this.handler.draw(this.context, document.getElementById("highlight-errors").checked);
	}
	
	addColor(color) {
		this.handler.addColor(color);
		this.save();
		this.draw()
	}
	
	redo() {
		this.handler.redo();
		this.draw();
	}
	
	undo() {
		this.handler.undo();
		this.draw();
	}
	
	click(ev) {		
		this.mouseHold = true;
		if (this.mode === "line") {
			var c = clickCoord(ev);
			this.handler.recordLine(c.x, c.y);
			this.draw();
			return;
		}
		if (ev.target.id != "puzzle") {
			console.log("non puzzle click?");
			return;
		}
		// Holding control or shift will add to the current selection, otherwise clear them.
		if (!(ev.ctrlKey || ev.shiftKey)) {
			this.handler.clearSelected();
		}
		var c = clickCoord(ev);
		this.handler.addToSelected(c.x, c.y);
		this.draw();
	}
	
	// Touch dispatches to click, since the events on mobile screens can differ.
	touch(ev) {
		console.log("touch");
		console.log(ev);
		console.log("last touch " + this.touchId);
		if (this.touchId !== null) {
			return;
		}
		ev.preventDefault();
		for (const touch of ev.changedTouches) {
			this.touchId = touch.identifier;
			this.click({
				"target": ev.target,
				"ctrlKey": false,
				"shiftKey": false,
				"clientX": touch.pageX,
				"clientY": touch.pageY,
			});
			break;
		}
		console.log("now touch " + this.touchId);
	}
	
	move(ev) {
		if (!this.mouseHold) {
			return;
		}
		var c = clickCoord(ev);
		if (this.mode === "line") {
			this.handler.recordLine(c.x, c.y);
			this.save();
			// Only needed for galaxies.  Can we avoid this check elsewhere?
			if (this.handler.hasWon()) {
				this.win();
			}
		} else {
			this.handler.addToSelected(c.x, c.y);
		}
		this.draw();
	}
	
	// touchMove dispatches to move, since the events on mobile screens can differ.
	touchMove(ev) {
		console.log("touch move");
		console.log(ev);
		ev.preventDefault();
		for (const touch of ev.changedTouches) {
			console.log("touch move " + touch.identifier);
			if (touch.identifier !== this.touchId) {
				continue;
			}
			console.log("calling move");
			this.move({
				"target": ev.target,
				"clientX": touch.pageX,
				"clientY": touch.pageY,
			});
		}
	}
	
	unclick() {
		this.mouseHold = false;
		if (this.mode === "line") {
			this.handler.endLine();
		}
	}
	
	// touchEnd dispatches to unclick, since the events on mobile screens can differ.
	touchEnd(ev) {
		// Never fired.
		console.log("touch end");
		// ev.preventDefault();
		this.touchId = null;
		this.unclick();
	}
	
	key(ev) {
		if ((ev.ctrlKey && ev.code == "KeyZ") || ev.code == "KeyU") {
			this.undo();
		} else if ((ev.ctrlKey && ev.code == "KeyY") || ev.code == "KeyR") {
			this.redo();
		} else {
			for (var control of this.controls) {
				for (var key of control.keys) {
					if (ev.code == key) {
						this.execute(control.method);
					}
				}
			}
		}
	}
	
	execute(method) {
		method(this.handler);
		if (this.handler.hasWon()) {
			this.win();
		}
		this.save();
		this.draw();
	}
	
	win() {
		var message = document.getElementById("message");
		message.innerHTML = "Congratulations, you won!"
		message.style.display = "";
		if (this.chainIndex < chain.length - 1) {
			document.getElementById("next").disabled = false;
		}
	}
	
	next(tryLoad) {
		document.getElementById("next").disabled = true;
		var message = document.getElementById("message");
		message.innerHTML = ""
		message.style.display = "none";

		var loadedState = "";
		if (tryLoad) {
			loadedState = window.localStorage.getItem("state");
		} else {
			// If we are not loading, then we are actually interested in
			// advancing to the next link.
			this.chainIndex++;
		}
		var link = chain[this.chainIndex];
		document.getElementById("rules").innerHTML = link.rules;
		var loadedState = "";
		if (tryLoad) {
			loadedState = window.localStorage.getItem("state");
		}
		switch(link.type) {
		case "MINES":
			import("./mines.mjs").then((mines) => {
				this.handler = new mines.MineHandler(link.clues, link.specials, loadedState);
				this.setNext();
			});
			break;
		case "LIGHTS":
			import("./lights.mjs").then((lights) => {
				this.handler = new lights.LightHandler(link.walls, link.clues, link.solution, loadedState);
				this.setNext();
			});
			break;
		case "GALAXIES":
			import("./galaxies.mjs").then((glx) => {
				this.handler = new glx.GalaxyHandler(link.clues, link.solution, link.specials, loadedState);
				this.setNext();
			});
			break;
		case "SUDOKU":
			import("./sudoku.mjs").then((sudoku) => {
				this.handler = new sudoku.SudokuHandler(link.solution, link.digits, link.cages, link.arrows, loadedState);
				this.setNext();
			});
			break;
		case "TRAINS":
			import("./trains.mjs").then((trains) => {
				this.handler = new trains.TrainsHandler(link.solution, link.clues, loadedState);
				this.setNext();
			});
			break;
		}
	}
	
	setNext() {
		// TODO: build in a way for controllers to disable colors if they can't handle them.
		this.setControls(this.handler.controls(), true, this.handler.allowsLines());
		document.getElementById("instructions").innerHTML = this.handler.instructions();
		this.save();
		this.draw();
	}
	
	changeMode(ev) {
		this.mode = ev.target.id;
		for (var tab of document.getElementsByClassName("tab")) {
			if (tab.id === this.mode + "-tab") {
				tab.style.display = "";
			} else {
				tab.style.display = "none";
			}
		}
	}
	
	save() {
		window.localStorage.setItem("index", this.chainIndex);
		window.localStorage.setItem("state", this.handler.saveState());
	}
}

function onLoad() {
	controller = new ChainController(document.getElementById("puzzle").getContext("2d"));
}

// To make things look better on mobile (vertical) and so that the canvas is adjustable size.
// TODO: resize Canvas dynamically for smaller resolutions?
function arrangeWindow() {
	if (window.innerHeight > window.innerWidth) {
		document.getElementById("left").style.float = "none";
	} else {
		document.getElementById("left").style.float = "left";
	}
}

window.addEventListener('load', (event) => {
	arrangeWindow();
	onLoad();
});
window.addEventListener('resize', (event) => {
	arrangeWindow();
	resize(document.getElementById("puzzle").getContext("2d"));
});

// This doesn't get cought by a handler on body if the unclick happens outside
// a DOM element, and only having it on the canvas would mean we wouldn't
// detect when a mouse up happens after dragging the cursor off the canvas.
// This seems like the best solution to a good user experience.
window.addEventListener("mouseup", (event) => { controller.unclick(); });
window.addEventListener("touchend", (event) => { controller.touchEnd(event); });

function clickCoord(ev) {	
	var bbox = ev.target.getBoundingClientRect();
	var x = ev.clientX - bbox.left;
	var y = ev.clientY - bbox.top;
	return {"x": x, "y": y}
}
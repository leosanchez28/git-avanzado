/**
 * sketch.js - Composition root. Wires the three modules together.
 *
 * This file owns the p5 lifecycle and NOTHING else: no game rules, no
 * drawing, no model calls. Those live in js/gamelogic.js, js/ui.js and
 * js/handpose.js respectively.
 *
 * Per-frame order matters and is the contract between the three modules:
 *   1. ml5 reports a result  -> Hands updates (async, from detectStart)
 *   2. Game.update()         -> reads Hands, writes Game.state
 *   3. UI.render()           -> reads Game + Hands, writes pixels
 *
 * In p5 2.x, async setup() replaces preload() for async work, which is why
 * this function is async and why ml5 is awaited here.
 */
async function setup() {
  createCanvas(windowWidth, windowHeight);

  // ml5 + camera. Blocks until the model is loaded and the camera permission
  // is granted - which is why index.html must be served over http(s), not
  // opened as file:// (getUserMedia requires a secure context).
  await Hands.init({
    maxHands: 2,
    modelType: "lite",
    smoothing: 0.4,
  });

  Game.init();
  UI.init();
}

function draw() {
  background(0);

  if (!Hands.ready) return;

  Game.update();
  UI.render();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/**
 * gamelogic.js - Game state derived from hand input.
 *
 * OWNER: person in charge of game logic.
 * Consumes window.Hands (read-only). Produces window.Game (read-only to UI).
 *
 * ----------------------------------------------------------------------
 * CONTRACT
 *
 *   Game.ready   {boolean}  module initialised
 *   Game.state   {object}   whatever shape the game needs - UI reads it
 *   Game.init()             called once, after Hands.ready
 *   Game.update()           called once per frame, before UI.render()
 *
 * RULE: this module must never draw. It receives geometry and produces state.
 * No fill(), no stroke(), no text() here - that is UI's job.
 * ----------------------------------------------------------------------
 */

/**
 * Squared distance between two joints, in canvas pixels.
 * Squared on purpose: comparing against a squared threshold avoids a sqrt
 * per finger per frame. Take the square root only when a real distance is
 * needed for display.
 */
function jointDistanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

window.Game = {
  ready: false,
  state: {
    tracking: false,
    hands: 0,
    pinch: 0, // 0..1, 1 = thumb and index touching
  },

  init() {
    this.ready = true;
  },

  update() {
    const hand = Hands.hands[0];
    this.state.tracking = Hands.isTracking;
    this.state.hands = Hands.hands.length;

    if (!hand) {
      this.state.pinch = 0;
      return;
    }

    const thumb = hand.joints.find((j) => j.name === "thumb_tip");
    const index = hand.joints.find((j) => j.name === "index_finger_tip");
    if (!thumb || !index) {
      this.state.pinch = 0;
      return;
    }

    // ~60px apart reads as open, ~10px apart reads as pinched. Tune freely.
    const PINCH_RANGE = 50;
    const distance = Math.sqrt(jointDistanceSquared(thumb, index));
    this.state.pinch = constrain(1 - distance / PINCH_RANGE, 0, 1);
  },
};

/**
 * ui.js - All drawing lives here.
 *
 * OWNER: person in charge of UI.
 * Consumes window.Game and window.Hands (both read-only). Produces pixels.
 *
 * ----------------------------------------------------------------------
 * CONTRACT
 *
 *   UI.ready             {boolean}  module initialised
 *   UI.config            {object}   colours, sizes, stroke weights
 *   UI.init()            called once, after Game.init()
 *   UI.render()          called once per frame, last
 *
 * RULE: this module must never mutate Hands or Game. Reading is fine,
 * writing is how the three modules start breaking each other.
 * ----------------------------------------------------------------------
 */

window.UI = {
  ready: false,

  config: {
    boneColor: "#00e5ff",
    jointColor: "#ffffff",
    tipColor: "#ff4081",
    boneWeight: 3,
    jointRadius: 5,
    tipRadius: 9, // fingertips get a bigger dot so the hand reads clearly
  },

  // Landmarks ml5 reports as fingertips, by name.
  tipNames: ["thumb_tip", "index_finger_tip", "middle_finger_tip", "ring_finger_tip", "pinky_finger_tip"],

  init() {
    this.ready = true;
  },

  render() {
    if (!Hands.isTracking) return;

    const { boneColor, jointColor, tipColor, boneWeight, jointRadius, tipRadius } = this.config;

    for (const hand of Hands.hands) {
      this._drawBones(hand, boneColor, boneWeight);
      this._drawJoints(hand, jointColor, tipColor, jointRadius, tipRadius);
    }
  },

  /** Bones first, so joints sit on top of the line ends. */
  _drawBones(hand, color, weight) {
    stroke(color);
    strokeWeight(weight);
    noFill();

    for (const [from, to] of hand.bones) {
      const a = hand.joints[from];
      const b = hand.joints[to];
      if (!a || !b) continue;
      line(a.x, a.y, b.x, b.y);
    }
  },

  _drawJoints(hand, jointColor, tipColor, jointRadius, tipRadius) {
    noStroke();

    for (const joint of hand.joints) {
      const isTip = this.tipNames.includes(joint.name);
      fill(isTip ? tipColor : jointColor);
      circle(joint.x, joint.y, isTip ? tipRadius * 2 : jointRadius * 2);
    }
  },
};

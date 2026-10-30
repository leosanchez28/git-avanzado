/**
 * handpose.js - Hand tracking module (the source of the data flow).
 *
 * Owns:
 *   - camera lifecycle (createCapture) and the ml5 HandPose model
 *   - mapping landmarks from VIDEO pixel space to CANVAS pixel space
 *   - hand anatomy: which landmarks connect to which (bone topology)
 *   - optional temporal smoothing of raw landmarks
 *
 * Exposes window.Hands. Consumes nothing.
 *
 * ----------------------------------------------------------------------
 * CONTRACT - the only members other modules may touch:
 *
 *   Hands.ready       {boolean}  model loaded and camera running
 *   Hands.isTracking  {boolean}  at least one hand on the last frame
 *   Hands.hands       {Hand[]}   geometry in CANVAS coordinates, mirrored
 *
 *   Hand   = { handedness: "Left" | "Right",
 *              confidence: number,              // 0..1
 *              joints:     Joint[],
 *              bones:      [number, number][] } // indices into joints
 *
 *   Joint  = { name: string, x: number, y: number }
 *
 * READ-ONLY. Never assign into Hands.hands or its nested objects: Game reads
 * them and UI draws them, and shared mutable state is exactly how three
 * people break each other's work.
 * ----------------------------------------------------------------------
 */
class HandTracker {
  constructor() {
    this.model = null;
    this.capture = null;
    this.connections = [];
    this.ready = false;
    this.isTracking = false;
    this.hands = [];

    this.smoothing = 0.4;
    this._smoothed = [];
  }

  /**
   * Load the model and start the camera. Async because in p5 2.x the ml5
   * constructors return a Promise (preload() no longer handles this).
   *
   * @param {object} [options]
   * @param {number} [options.maxHands=2]
   * @param {string} [options.modelType="lite"]  "lite" = faster, "full" = more accurate
   * @param {number} [options.smoothing=0.4]      1 = no smoothing (snappy),
   *                                              0 = frozen. 0.3-0.5 is a good range.
   */
  async init(options = {}) {
    const {
      maxHands = 2,
      modelType = "lite",
      smoothing = 0.4,
    } = options;

    this.smoothing = smoothing;

    // Camera first: ml5 needs a live source. Hidden on purpose - the user only
    // wants the rendered skeleton, never the raw video feed.
    this.capture = createCapture(VIDEO);
    this.capture.hide();

    // NOTE the casing: the public method is ml5.handPose (capital P). The docs
    // page is lowercase (/reference/handpose), so copying that name throws
    // "ml5.handpose is not a function".
    //
    // flipHorizontal: true = mirror / selfie mode, so moving your hand to the
    // right moves the skeleton to the right.
    this.model = await ml5.handPose({
      maxHands,
      modelType,
      flipHorizontal: true,
      runtime: "tfjs",
    });

    // Anatomical bone pairs as [fromIndex, toIndex], e.g. wrist -> thumb_cmc.
    // Pulled from the model instead of hardcoded so it stays correct if the
    // landmark set ever changes.
    this.connections = this.model.getConnections();

    this.ready = true;

    // detectStart runs ml5's own async loop (one inference per animation
    // frame), so draw() must NOT call detect(). The callback below fires
    // whenever a result arrives; draw() only reads the processed state.
    this.model.detectStart(this.capture.elt, (predictions) =>
      this._onResults(predictions)
    );

    return this;
  }

  /**
   * Convert one raw ml5 prediction into canvas-space joints.
   * @private
   */
  _mapJoints(prediction, handIndex) {
    const keypoints = prediction.keypoints || [];
    const video = this.capture.elt;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Video is usually 4:3 while the canvas is whatever the window is.
    // Cover-fit scales the video up until it fills the canvas and centres the
    // overflow, so hands use the whole screen with no letterboxing.
    const scale =
      videoWidth && videoHeight
        ? Math.max(width / videoWidth, height / videoHeight)
        : 1;
    const offsetX = (width - videoWidth * scale) / 2;
    const offsetY = (height - videoHeight * scale) / 2;

    return keypoints.map((keypoint, jointIndex) => {
      // ml5 already mirrors x when flipHorizontal is true - do not flip again.
      let x = keypoint.x * scale + offsetX;
      let y = keypoint.y * scale + offsetY;

      // Exponential smoothing. Raw MediaPipe landmarks jitter a few pixels per
      // frame; lerping toward the new position hides most of it.
      if (this.smoothing < 1) {
        const previous = this._smoothed[handIndex] &&
          this._smoothed[handIndex][jointIndex];
        if (previous) {
          x = previous.x + (x - previous.x) * this.smoothing;
          y = previous.y + (y - previous.y) * this.smoothing;
        }
      }
      if (!this._smoothed[handIndex]) this._smoothed[handIndex] = [];
      this._smoothed[handIndex][jointIndex] = { x, y };

      return { name: keypoint.name, x, y };
    });
  }

  /**
   * ml5 callback: process a raw result into the read-only public state.
   * @private
   */
  _onResults(predictions) {
    const raw = Array.isArray(predictions) ? predictions : [];

    // Hand indices appear and disappear between frames, and smoothing state is
    // positional, so it is only valid while the hand count is unchanged.
    if (raw.length !== this._smoothed.length) this._smoothed = [];

    this.hands = raw.map((prediction, handIndex) => {
      return {
        handedness: prediction.handedness,
        confidence: prediction.confidence,
        joints: this._mapJoints(prediction, handIndex),
        bones: this.connections,
      };
    });

    this.isTracking = this.hands.length > 0;
  }
}

window.Hands = new HandTracker();

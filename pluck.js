'use strict';

const paper = require('paper');
const Howl = require('howler').Howl;
const debounce = require('lodash/debounce');
const throttle = require('lodash/throttle');
const isFunction = require('lodash/isFunction');
const addEventListener = require('add-dom-event-listener');

/**
 * Renders an interactive musical string on a canvas.
 * @property {number} _w Width of the canvas
 * @property {number} _h Height of the canvas
 * @property {Howl} _sound Plucking sound
 * @property {paper.Path} _line The plucking string
 */
module.exports = class PluckString {
  /**
   * @param {object} options
   * @param {HTMLCanvasElement} options.element - Canvas DOM element on which to initiate the plucking string
   * @param {number|function} options.width - Width of the container, or a callback for determining the width of the container
   * @param {number|function} options.height - Height of the container, or a callback for determining the height of the container
   */
  constructor(options) {
    ///////////////
    // Constants //
    ///////////////

    /**
     * The factor by which the vibration decreases each animation frame
     * @constant {number}
     */
    this.FRICTION = 0.94;

    /**
     * Size in pixels of the area that can be grabbed by the mouse
     * @constant (number)
     */
    this.HANDLE_SIZE = 10;

    /**
     * Amplitude (0-1) under which the "short" sound sprite is played
     * @constant (number)
     */
    this.SHORT_SOUND_THRESHOLD = 0.25;

    /**
     * Sound volume is proportional to amplitude, but not under this amplitude (0-1)
     * @constant {number}
     */
    this.MIN_VOLUME = 0.3;

    ////////////////////////////
    // Create dynamic methods //
    ////////////////////////////

    /**
     * Fires when Paper's built in resize alters the canvas size.
     * Fixes the coordinate system and redraws the line.
     * @param {paper.Event} event
     */
    this._draw = debounce(event => {
      this._updateBounds();

      paper.view.viewSize = new paper.Size(this._w, this._h);

      this._line.strokeWidth = this._h / 115.0 * 5.0;

      this._line.segments[0].point = [ 0,         this._h/2 ];
      this._line.segments[1].point = [ this._w/2, this._h/2 ];
      this._line.segments[2].point = [ this._w,   this._h/2 ];

      this._line.segments[0].handleOut.x = this._w * 0.15;
      this._line.segments[1].handleIn.x =  this._w * -0.2;
      this._line.segments[1].handleOut.x = this._w * 0.2;
      this._line.segments[2].handleIn.x =  this._w * -0.15;

      paper.view.draw();
    }, 30);

    this._vibrateStringBound = this._vibrateString.bind(this); // JavaScript: The Good Parts

    /**
     * Set the string in motion and play the appropriate sound.
     * @param {paper.Event} event
     */
    this._releaseString = throttle(event => {
      const shouldPlaySound = this._line.segments[1].point.y !== this._h / 2 && !paper.view.responds('frame');

      if (shouldPlaySound) {
        const amplitude = (Math.abs(this._line.segments[1].point.y - (this._h / 2))) / (this._h / 2);

        // Give it an appropriate volume level
        this._sound.volume = (1 - this.MIN_VOLUME) * amplitude * amplitude + this.MIN_VOLUME;

        this._sound.stop();
        if (amplitude < this.SHORT_SOUND_THRESHOLD) {
          this._sound.play('short');
        } else {
          this._sound.play('long');
        }

        // Set the string in motion
        paper.view.on('frame', this._vibrateStringBound);
      }
    }, 30);

    ////////////////
    // Store args //
    ////////////////

    // Load up the DOM element we will need
    const canvas = options.element;
    if (!canvas) {
      throw new Error('Could not initialize PluckString. Missing Canvas element.')
    }

    this._widthOption = options.width;
    if (!this._widthOption) {
      throw new Error('Could not initialize PluckString. Missing width option.');
    }

    this._heightOption = options.height;
    if (!this._heightOption) {
      throw new Error('Could not initialize PluckString. Missing height option.')
    }

    ////////////////
    // Initialize //
    ////////////////

    // Set up Howler.js
    this._sound = new Howl({
      src: [
        require('./sounds/pluck.ogg'),
        require('./sounds/pluck.mp3'),
        require('./sounds/pluck.wav'),
      ],
      sprite: {
        short: [0, 672],
        long: [800, 2133]
      }
    });

    // Set up Paper.js
    paper.setup(canvas);
    paper.project.currentStyle = {
      strokeColor: 'black'
    };

    // Set up coordinates
    this._updateBounds();

    // Initialize the line!
    this._line = new paper.Path({
      segments: [
        [ 0,         this._h/2 ],
        [ this._w/2, this._h/2 ],
        [ this._w,   this._h/2 ]
      ],
      strokeWidth: this._h / 115.0 * 5
    });

    // Set up mouse
    paper.tool = new paper.Tool();

    // Create event listeners
    paper.view.onResize = this._draw.bind(this);
    paper.tool.onMouseMove = this._mouseMoveHandler.bind(this);
    paper.tool.onMouseUp = this._releaseString.bind(this);
    addEventListener(canvas, 'mouseout', this._releaseString.bind(this));
    addEventListener(window, 'resize', this._draw.bind(this));

    // Initial draw
    this._draw();
  }

  /**
  * Refresh this._w and this._h
  */
  _updateBounds() {
    this._w = isFunction(this._widthOption) ? this._widthOption() : this._widthOption;
    this._h = isFunction(this._heightOption) ? this._heightOption() : this._heightOption;
  }

  /**
  * Event listener for mouse movements. Determines whether to grab or release the line.
  * @param {paper.MouseEvent} event
  */
  _mouseMoveHandler(event) {
    const lineIsGrabbed = event.point.y > this._line.strokeWidth &&
      event.point.y < this._h - this._line.strokeWidth &&
      event.point.x > this._w * 0.15 &&
      event.point.x < this._w * 0.85 &&
      Math.abs(event.point.y - this._line.segments[1].point.y) < this.HANDLE_SIZE;

    if (lineIsGrabbed) {
      this._endVibration();
      this._line.segments[1].point.y = event.point.y;
    } else {
      this._releaseString();
    }
  }

  /**
  * Stop all sounds and end any motion.
  */
  _endVibration() {
    this._sound.stop();
    paper.view.off('frame', this._vibrateStringBound);
  }

  /**
  * Simulate the vibration of the string. Event handler for onFrame.
  */
  _vibrateString(event) {
    const amplitude = Math.abs(this._line.segments[1].point.y - (this._h/2));
    if (amplitude > 1) {
      // Move the closer to the center
      this._line.segments[1].point.y = 0.5 * this._h * (this.FRICTION + 1) - (this.FRICTION * this._line.segments[1].point.y);
    } else {
      // Attach the line to the center
      this._line.segments[1].point.y = this._h/2;

      this._endVibration();
    }
  }
};
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('paper'), require('howler').Howl, require('lodash'));
  } else {
    root.pluckString = factory(root.paper, root.Howl, root._);
  }
}(this, function(paper, Howl, _) {

/**
 * @param {object} options
 * @param {HTMLCanvasElement} options.element - Canvas DOM element on which to initiate the plucking string
 * @param {number|function} options.width - Width of the container, or a callback for determining the width of the container
 * @param {number|function} options.height - Height of the container, or a callback for determining the height of the container
 * @param {string} options.scriptPath - URL or path from compiled client-side JS to this package, for loading sounds,
 *   with a trailing slash.
 */
function pluckString(options) {
  /**
   * Physics and UI constants
   * @type {Object}
   */
  var constants = {
    FRICTION: 0.94,
    HANDLE_SIZE: 10,
    SHORT_SOUND_THRESHOLD: 0.25,
    MIN_VOLUME: 0.3
  };

  /**
   * Width of the canvas
   * @type {number}
   */
  var w;

  /**
   * Height of the canvas
   * @type {number}
   */
  var h;

  /**
   * Plucking sound
   * @type {Howl}
   */
  var sound;

  /**
   * The plucking string
   * @type {paper.Path}
   */
  var line;

  /**
   * Fires when Paper's built in resize alters the canvas size.
   * Fixes the coordinate system and redraws the line.
  */
  var draw = _.debounce(function (event) {
    updateBounds();

    paper.view.viewSize = new paper.Size(w, h);

    line.strokeWidth = h / 115.0 * 5.0;

    line.segments[0].point = [0, h/2];
    line.segments[1].point = [w/2, h/2];
    line.segments[2].point = [w, h/2];

    line.segments[0].handleOut.x = w * 0.15;
    line.segments[1].handleIn.x = w * -0.2;
    line.segments[1].handleOut.x = w * 0.2;
    line.segments[2].handleIn.x = w * -0.15;

    paper.view.draw();
  }, 30);

  /**
  * Event listener for mouse movements. Determines whether to grab or release the line.
  */
  function mouseMoveHandler(event) {
    if(event.point.y > line.strokeWidth &&
    event.point.y < h - line.strokeWidth &&
    event.point.x > w * 0.15 &&
    event.point.x < w * 0.85 &&
    Math.abs(event.point.y - line.segments[1].point.y) < constants.HANDLE_SIZE) {
      endVibration();
      line.segments[1].point.y = event.point.y;
    } else {
      releaseString();
    }
  }

  /**
  * Set the string in motion and play the appropriate sound.
  */
  var releaseString = _.throttle(function (event) {
    if (line.segments[1].point.y !== h/2 && !paper.view.responds('frame')) {
      // Play the sound
      var amplitude = (Math.abs(line.segments[1].point.y - (h/2))) / (h/2);

      // Give it an appropriate volume level
      sound.volume = (1-constants.MIN_VOLUME) * amplitude * amplitude + (constants.MIN_VOLUME);

      sound.stop();
      if (amplitude < constants.SHORT_SOUND_THRESHOLD) {
        sound.play('short');
      } else {
        sound.play('long');
      }

      // Set the string in motion
      paper.view.on('frame', vibrateString);
    }
  }, 30);

  /**
  * Stop all sounds and end any motion.
  */
  function endVibration() {
    sound.stop();
    paper.view.off('frame', vibrateString);
  }

  /**
  * Simulate the vibration of the string. Event handler for onFrame.
  */
  function vibrateString(event) {
    var amplitude = Math.abs(line.segments[1].point.y - (h/2));
    if (amplitude > 1) {
      // Move the closer to the center
      line.segments[1].point.y = 0.5 * h * (constants.FRICTION + 1) - (constants.FRICTION * line.segments[1].point.y);
    } else {
      // Attach the line to the center
      line.segments[1].point.y = h/2;

      endVibration();
    }
  }

  /**
  * Set the global coordinate vars.
  */
  function updateBounds() {
    w = _.isFunction(options.width) ? options.width() : options.width;
    h = _.isFunction(options.height) ? options.height() : options.height;
  }

  /**
   * Helper function to attach an event listener without jQuery
   * @see http://stackoverflow.com/a/3150139
   */
  function addEvent(object, type, callback) {
    if (object == null || typeof(object) == 'undefined') return;
    if (object.addEventListener) {
      object.addEventListener(type, callback, false);
    } else if (object.attachEvent) {
      object.attachEvent("on" + type, callback);
    } else {
      object["on"+type] = callback;
    }
  }

  /**
   * Should run once to set up the plucking string
   */
  function init() {
    // Load up the DOM elements we will need
    var canvas = options.element;
    if (!canvas) return;

    // Default value for scriptPath
    if (_.isUndefined(options.scriptPath))
      options.scriptPath = '';

    // Set up Howler.js
    sound = new Howl({
      src: [
        options.scriptPath + 'sounds/pluck.ogg',
        options.scriptPath + 'sounds/pluck.mp3',
        options.scriptPath + 'sounds/pluck.wav'
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
    updateBounds();

    // Initialize the line!
    line = new paper.Path({
      segments: [
        [0, h/2],
        [w/2, h/2],
        [w, h/2]
      ],
      strokeWidth: h / 115.0 * 5
    });

    // Set up mouse
    paper.tool = new paper.Tool();

    // Create event listeners
    paper.view.onResize = draw;
    paper.tool.onMouseMove = mouseMoveHandler;
    paper.tool.onMouseUp = releaseString;
    addEvent(canvas, 'mouseout', releaseString);
    addEvent(window, 'resize', draw);

    // Initial draw
    draw();
  }

  init();
}

return pluckString;

}));

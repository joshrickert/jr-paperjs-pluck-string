/**
 * @param {object} options
 * @param {string} options.elementId - ID of the canvas DOM element on which to initiate the plucking string
 * @param {number|function} options.width - Width of the container, or a callback for determining the width of the container
 * @param {number|function} options.height - Height of the container, or a callback for determining the height of the container
 */
function pluckString(options) {
  /**
   * Fires when Paper's built in resize alters the canvas size.
   * Fixes the coordinate system and redraws the line.
  */
  function resizeHandler(event) {
    updateBounds();

    paper.view.viewSize = [w, h];

    line.strokeWidth = h / 115.0 * 5.0;

    line.segments[0].point = [0, h/2.0];
    line.segments[1].point = [w/2.0, h/2.0];
    line.segments[2].point = [w, h/2.0];

    line.segments[0].handleOut.x = w * 0.15;
    line.segments[1].handleIn.x = w * -0.2;
    line.segments[1].handleOut.x = w * 0.2;
    line.segments[2].handleIn.x = w * -0.15;
  }
  var debounceResizeHandler = _.debounce(resizeHandler, 30);

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
      debounceReleaseString();
    }
  }

  /**
  * Set the string in motion and play the appropriate sound.
  */
  function releaseString(event) {
    if (line.segments[1].point.y !== h/2 &&
      !paper.view.responds('frame')) {
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
      paper.view.attach('frame', vibrateString);
    }
  }
  var debounceReleaseString = _.debounce(releaseString, 30);

  /**
  * Stop all sounds and end any motion.
  */
  function endVibration() {
    sound.stop();
    paper.view.detach('frame', vibrateString);
  }

  /**
  * Simulate the vibration of the string. Event handler for onFrame.
  */
 var vibrateString = _.throttle(function (event) {
    var amplitude = Math.abs(line.segments[1].point.y - (h/2));
    if (amplitude > 1) {
      // Move the closer to the center
      line.segments[1].point.y = 0.5 * h * (constants.FRICTION + 1) - (constants.FRICTION * line.segments[1].point.y);
    } else {
      // Attach the line to the center
      line.segments[1].point.y = h/2;

      endVibration();
    }
  }, 16.67);

  /**
  * Set the global coordinate vars.
  */
  function updateBounds() {
    w = _.isFunction(options.width) ? options.width() : options.width;
    h = _.isFunction(options.height) ? options.height() : options.height;
  }

  // Load up the DOM elements we will need
  var c = document.getElementById(options.elementId);

  // Set default parameters
  var constants = {
    FRICTION: 0.94,
    HANDLE_SIZE: 10,
    SHORT_SOUND_THRESHOLD: 0.25,
    MIN_VOLUME: 0.3
  };

  // Set up Howler.js
  var sound = new Howl({
    urls: [
      wordpressData.templateUrl + '/assets/sounds/pluck.ogg',
      wordpressData.templateUrl + '/assets/sounds/pluck.mp3',
      wordpressData.templateUrl + '/assets/sounds/pluck.wav'
    ],
    sprite: {
      short: [0, 672],
      long: [800, 2133]
    }
  });

  // Set up Paper.js
  paper.setup(c);
  paper.project.currentStyle = {
    strokeColor: 'black'
  };

  // Set up coordinates
  var w, h;
  updateBounds();

  // Initialize the line!
  var line = new paper.Path({
    segments: [
      [0, h/2.0],
      [w/2.0, h/2.0],
      [w, h/2.0]
    ],
    strokeWidth: h / 115.0 * 5.0
  });

  // Initial draw
  resizeHandler();
  paper.view.onResize = resizeHandler;

  // Set up mouse
  paper.tool = new paper.Tool();
  paper.tool.onMouseMove = mouseMoveHandler;
  c.onmouseout = paper.tool.onMouseUp = debounceReleaseString;
}
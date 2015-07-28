jQuery(document).ready(function() {		
	// This fixes SVG across the whole site and probably shouldn't be in this script.
	if (!Modernizr.svg) {
	  // wrap this in a closure to not expose any conflicts
	  (function() {
	    // grab all images. getElementsByTagName works with IE5.5 and up
	    var imgs = document.getElementsByTagName('img'),endsWithDotSvg = /.*\.svg$/,i = 0,l = imgs.length;
	    // quick for loop
	    for(; i < l; ++i) {
	      if(imgs[i].src.match(endsWithDotSvg)) {
	        // replace the png suffix with the svg one
	        imgs[i].src = imgs[i].src.slice(0, -3) + 'png';
	      }
	    }
	  })();
	}
	
	if (!navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
	
		// Load up our audio
		var pluckShort = new Audio();
		pluckShort.src = Modernizr.audio.ogg ? 	'snd/pluck1.ogg' :
	                                 		   	'snd/pluck1.aac';
		var pluckLong = new Audio();
		pluckLong.src = Modernizr.audio.ogg ? 	'snd/pluck2.ogg' :
	                                 		 	'snd/pluck2.aac';
			
		// Setup paper
		paper.setup(document.getElementById('masthead-canvas'));
		var mouseTool = new paper.Tool();
		
		// Set up our parameters
		var width = paper.view.size.width;
		var height = paper.view.size.height;
		var lineWeight = 5;
		var friction = 0.94;
		var grabbingLeeway = 10;
		var shortSoundThreshold = 0.25;
		var minVolume = 0.3;
		
		// Create a Paper.js Path to draw a line into it:
		var pluckingString = new paper.Path();
		
		// Give the stroke a color and a width
		pluckingString.strokeColor = 'black';
		pluckingString.strokeWidth = lineWeight;
		
		// Create two endpoints and a middle one to pluck
		pluckingString.add(new paper.Point(0,height/2));
		pluckingString.add(new paper.Point(width/2,height/2));
		pluckingString.add(new paper.Point(width,height/2));
		
		// Set out handles so it all stays nice and smooth
		pluckingString.segments[0].handleOut.x = 100;
		pluckingString.segments[1].handleIn.x = -150;
		pluckingString.segments[1].handleOut.x = 150;
		pluckingString.segments[2].handleIn.x = -100;
		
		// This is how we will detect the plucking motion
		var stringGrabbed = false;
		
		// And let's make sure we don't double up on sounds
		var soundPlaying = false;
		
		mouseTool.onMouseMove = function(event) {
			if (event.point.y > lineWeight &&
			event.point.y < height - lineWeight &&
			event.point.x > 0 &&
			event.point.x < width &&
			Math.abs(event.point.y - pluckingString.segments[1].point.y) < grabbingLeeway) {
				stringGrabbed = true;
			} else {
				stringGrabbed = false;			
			}
			
			if (stringGrabbed) { pluckingString.segments[1].point.y = event.point.y; }
		}
		
		mouseTool.onMouseOut = function(event) {
			stringGrabbed = false;
		}
		
		mouseTool.onMouseUp = function(event) {
			stringGrabbed = false;
		}
		
		function muteSound(sound) {
			//$(sound).animate({volume: 0}, 10);
			
			sound.pause();
			sound.currentTime = 0;
		}
		
		paper.view.onFrame = function(event) {
			if (!stringGrabbed) {
				var amplitude = Math.abs(pluckingString.segments[1].point.y - (height/2));
				if (amplitude > 1) {
					pluckingString.segments[1].point.y = 0.5 * height * (friction + 1) - (friction * pluckingString.segments[1].point.y);
					
					if (!soundPlaying) {
						var sound;
						var amplitudePercentage = amplitude / (height/2);
						if (amplitudePercentage < shortSoundThreshold) {
							sound = pluckShort;
						} else {
							sound = pluckLong;
						}
						
						//$(sound).stop(true);
						sound.volume = (1-minVolume) * amplitudePercentage * amplitudePercentage + (minVolume);
						sound.play();
						
						soundPlaying = true;
					}	
				} else {
					pluckingString.segments[1].point.y = height/2;
				}
			} else {
				muteSound(pluckShort);
				muteSound(pluckLong);
				soundPlaying = false;
			}
		}
	} else {
	// Fall back to rendering a rectangle if we're on iOS
		var canvas = document.getElementById('masthead-canvas');
		var context = canvas.getContext("2d");
		context.fillStyle="#000000";
		context.fillRect(0,55,635,5);
	}
});
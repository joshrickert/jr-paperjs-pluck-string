'use strict';

const PluckString = require('../pluck');

new PluckString({
  element: document.getElementById('pluck-canvas'),
  width: function() {
    return 635;
  },
  height: 155
});
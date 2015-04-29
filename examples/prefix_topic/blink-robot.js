'use strict';

var Cylon = require('cylon');

Cylon.robot({
  name: 'cybot',

  connections: {
    arduino: { adaptor: 'firmata', port: '/dev/ttyACM0' }
  },

  devices: {
    led: { driver: 'led', pin: 13 }
  },

  work: function() {
    // Add your robot code here,
    // for this simple blink example
    // we'll interacting with the
    // robot through the 'led' device.
  }
});

// ensure you install the API plugin first:
// $ npm install cylon-api-mqtt
Cylon.api(
  'mqtt',
  {
  broker: 'mqtt://test.mosquitto.org',
  prefix: 'myappname', // Optional
});

Cylon.start();

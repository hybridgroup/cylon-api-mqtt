'use strict';

var Cylon = require('cylon');

Cylon.robot({
  name: 'cybot',

  connections: {
    arduino: { adaptor: 'firmata', port: '/dev/ttyACM0' }
  },

  devices: {
    sensor: { driver: 'analog-sensor', pin: 0 }
  },

  work: function() {
    // Add your robot code here
  },
});

// ensure you install the API plugin first:
// $ npm install cylon-api-mqtt
Cylon.api(
  'mqtt',
  {
    broker: 'mqtt://test.mosquitto.org',
    port: '3000'
  }
);

Cylon.start();

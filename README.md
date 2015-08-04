# Cylon.js API Plugin For MQTT

Cylon.js (http://cylonjs.com) is a JavaScript framework for robotics, physical computing, and the Internet of Things using Node.js

API plugins are separate from the Cylon.js main module, to make everything more modular and at the same time make Cylon.js lighter.

This repository contains the Cylon API plugin for the MQTT (http://mqtt.org) machine to machine messaging system. The implementation uses the [mqtt node module](https://github.com/mqttjs/MQTT.js) maintained by [@adamvr](https://github.com/adamvr) and [@mcollina](https://github.com/mcollina) thank you!

For more information about Cylon, check out the repo at
https://github.com/hybridgroup/cylon

[![Build Status](https://travis-ci.org/hybridgroup/cylon-api-mqtt.svg)](https://travis-ci.org/hybridgroup/cylon-api-mqtt)
[![Code Climate](https://codeclimate.com/github/hybridgroup/cylon-api-mqtt/badges/gpa.svg)](https://codeclimate.com/github/hybridgroup/cylon-api-mqtt)
[![Test Coverage](https://codeclimate.com/github/hybridgroup/cylon-api-mqtt/badges/coverage.svg)](https://codeclimate.com/github/hybridgroup/cylon-api-mqtt)


## How to Install

```bash
$ npm install cylon-api-mqtt
```

## How to Use

Make sure you have Cylon.js installed, then we can add MQTT support to cylon
programs as follows:

```javascript
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
  port: '3000'
});

Cylon.start();
```
## How to Connect

Once you have added the api to your Cylon.js code, and your robots are up and running, you can communicate with it using the MQTT broker.

You send commands to the robot by publishing MQTT messages to the broker intended for that robot using an MQTT topic matching the CPPP.IO (http://cppp.io) based route.

You subscribe to events from that robot, again by using the correct MQTT topic matching the CPPP.IO (http://cppp.io) based route.

```javascript
'use strict';

var mqtt    = require('mqtt');
var client  = mqtt.connect('mqtt://test.mosquitto.org');

client.on('message', function (topic, payload) {
  var data, sender;

  if (!!payload && (payload.length > 0)) {
    data = JSON.parse(payload);
    sender = data.sender;
  }

  if (sender !== 'self') {
    console.log('Topic name ==>', topic);
    console.log('Payload ==>', data);
  }
});

var params = {
  sender: 'self',
  args: ['param1', 'param2', 'param3']
};

// Payload needs to be a JSON string
var payload = JSON.stringify(params);

// get response messages from the robot-level command `toggle`
client.subscribe('/api/robots/cybot/commands/toggle');

setInterval(function() {
  // call robot-level command `toggle`
  client.publish(
    '/api/robots/cybot/commands/toggle',
    payload);
}, 2000);
```
You can also send commands or subscribe to events directly on any robot's devices. Take a look at the examples folder for more samples.

## Documentation

We're busy adding documentation to [cylonjs.com](http://cylonjs.com). Please check there as we continue to work on Cylon.js.

Thank you!

## Contributing

For our contribution guidelines, please go to [https://github.com/hybridgroup/cylon/blob/master/CONTRIBUTING.md](https://github.com/hybridgroup/cylon/blob/master/CONTRIBUTING.md).

## Release History

For the release history, please go to [https://github.com/hybridgroup/cylon-api-mqtt/blob/master/RELEASES.md](https://github.com/hybridgroup/cylon-api-mqtt/blob/master/RELEASES.md).

## License

Copyright (c) 2014-2015 The Hybrid Group. Licensed under the Apache 2.0 license.

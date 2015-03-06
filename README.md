# Cylon.js API Plugin For MQTT

API plugins were stripped from Cylon.js main module, to make everything more modular
and at the same time make Cylon.js lighter, we now have two API plugins
for different protocols, the one in this repo `cylon-api-mqtt`,
[cylon-api-socketio](http://github.com/hybridgroup/cylon-api-socketio) and
[cylon-api-http](http://github.com/hybridgroup/cylon-api-http).

Cylon.js (http://cylonjs.com) is a JavaScript framework for robotics, physical computing, and the Internet of Things using Node.js

This repository contains the Cylon API plugin for MQTT.

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
// $ npm install cylon-api-socket-io
Cylon.api(
  'mqtt',
  {
  broker: 'mqtt://test.mosquitto.org',
  prefix: 'cybot', // Optional
});

Cylon.start();
```

## How to Connect

Once you have added the api to your Cylon.js code, and your robots are up and running, you can connect
using MQTT, you need to subscribe to the topics you want to receive info for and publish the ones that
execute commands in your robot.

```javascript
'use strict';

var mqtt    = require('mqtt');
var client  = mqtt.connect('mqtt://test.mosquitto.org');

client.on('message', function (topic, data) {
  data = (!!data) ? JSON.parse(data) : data;

  console.log('topic ==>', topic.toString());
  console.log('payload ==>', data);
});

client.subscribe('/cybot/listen/api/robots');
client.publish('/cybot/emit/api/robots');

client.subscribe('/cybot/listen/api/robots/cybot/devices/led/toggle');

setInterval(function() {
  client.publish(
    '/cybot/emit/api/robots/cybot/devices/led/toggle',
    JSON.stringify({ param1: 'uno' }));
}, 2000);

//client.end();
```

## Documentation

We're busy adding documentation to [cylonjs.com](http://cylonjs.com). Please check there as we continue to work on Cylon.js.

Thank you!

## Contributing

* All patches must be provided under the Apache 2.0 License
* Please use the -s option in git to "sign off" that the commit is your work and you are providing it under the Apache 2.0 License
* Submit a Github Pull Request to the appropriate branch and ideally discuss the changes with us in IRC.
* We will look at the patch, test it out, and give you feedback.
* Avoid doing minor whitespace changes, renamings, etc. along with merged content. These will be done by the maintainers from time to time but they can complicate merges and should be done seperately.
* Take care to maintain the existing coding style.
* Add unit tests for any new or changed functionality & lint and test your code using `make test` and `make lint`.
* All pull requests should be "fast forward"
  * If there are commits after yours use “git rebase -i <new_head_branch>”
  * If you have local changes you may need to use “git stash”
  * For git help see [progit](http://git-scm.com/book) which is an awesome (and free) book on git

## Release History

0.1.1 - Fixes an issue with topic /api/robots not adding the topic prefix

0.1.0 - Initial release

## License

Copyright (c) 2014-2015 The Hybrid Group. Licensed under the Apache 2.0 license.

# Cylon.js API Plugin For Socket.io

API plugins were stripped from Cylon.js main module, to make everything more modular
and at the same time make Cylon.js lighter, we now have two API plugins
for different protocols, the one in this repo `cylon-api-socketio` and
[cylon-api-http](http://github.com/hybridgroup/cylon-api-http).

Cylon.js (http://cylonjs.com) is a JavaScript framework for robotics, physical computing, and the Internet of Things using Node.js

This repository contains the Cylon API plugin for Socket.io

For more information about Cylon, check out the repo at
https://github.com/hybridgroup/cylon

[![Build Status](https://travis-ci.org/hybridgroup/cylon-api-socketio.svg)](https://travis-ci.org/hybridgroup/cylon-api-socketio)
[![Code Climate](https://codeclimate.com/github/hybridgroup/cylon-api-socketio/badges/gpa.svg)](https://codeclimate.com/github/hybridgroup/cylon-api-socketio)
[![Test Coverage](https://codeclimate.com/github/hybridgroup/cylon-api-socketio/badges/coverage.svg)](https://codeclimate.com/github/hybridgroup/cylon-api-socketio)

## How to install

```bash
$ npm install cylon-api-socketio
```

## How to use

Make sure you have Cylon.js installed, then we can add Socket.io support to cylon
programs as follows:

```javascript
"use strict";

var Cylon = require("cylon");

Cylon.robot({
  name: 'rosie',

  connections: {
    arduino: { adaptor: 'firmata', port: '/dev/ttyACM0' }
  },

  devices: {
    led: { driver: 'led', pin: 13 }
  },

  work: function() {
    // Add your robot code here,
    // for this example with sockets
    // we are going to be interacting
    // with the robot using the code in
    // ./analog-read-client.html.
  }
});

// ensure you install the API plugin first:
// $ npm install cylon-api-socket-io
Cylon.api(
  'socketio',
  {
  host: "0.0.0.0",
  port: "3000"
});

Cylon.start();
```

## How to Connect

Once you have added the api to your Cylon.js code, and your robots are up and running, you can connect
to them using Socket.io through cylon using the following code:

```html
<!doctype html>
<html>
  <head>
    <title>Socket.IO chat</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font: 13px Helvetica, Arial; }
      form { background: #000; padding: 3px; position: fixed; bottom: 0; width: 100%; }
      form input { border: 0; padding: 10px; width: 90%; margin-right: .5%; }
      form button { width: 9%; background: rgb(130, 224, 255); border: none; padding: 10px; }
      #messages { list-style-type: none; margin: 0; padding: 0; }
      #messages li { padding: 5px 10px; }
      #messages li:nth-child(odd) { background: #eee; }
    </style>
  </head>
  <script src="https://cdn.socket.io/socket.io-1.2.0.js"></script>
  <script src="http://code.jquery.com/jquery-1.11.1.js"></script>
  <script type="text/javascript">
    var cylon, robot, device;

    window.onload = function() {
      if (!device) {
        // Since we already know which device we want to connect to,
        // we create a new socket for the `led` device.
        device = io('http://127.0.0.1/api/robots/rosie/devices/led');

        // Listen to the 'message' event on device
        device.on('message', function(msg) {
          $('#messages').append($('<li>').text(msg));
        });

        // Listen to the 'commands' event on device
        // returns a list of available commands for the device,
        // you need to first send a 'commands' event down
        // the socket, so it knows to trigger this event
        // with the list of commands.
        device.on('commands', function(commands) {
          var msg = 'commands:' + commands.toString();
          console.log('commands ==>', commands);
          $('#messages').append($('<li>').text(msg));
        });

        // Every time a command is executed the 'command' event
        // is triggered, returns the name of the command executed
        // and the value returned by the method the command calls.
        device.on('command', function(command, value) {
          console.log('command name ==>', command);
          console.log('command returned ==>', value);
        });

        // Listen to the 'events' event on device
        // returns a list of available events for the device,
        // same as with commands you need to emit a 'events'
        // event first.
        device.on('events', function(events) {
          var msg = 'events:' + events.toString();
          console.log('events ==>', events);
          $('#messages').append($('<li>').text(msg));
        });

        // We emit 'commands' and 'events' so we can listen
        // and get the lists of available items.
        device.emit('commands');
        device.emit('events');

        // The "hello world" program of robotics, the
        // blink and LED program, we just emit the command
        // we want our device to execute.
        setInterval(function() {
          device.emit('toggle');
        }, 1000);
      }
    };
  </script>
  <body>
    <ul id="messages"></ul>
    <form action="">
      <input id="m" autocomplete="off" /><button>Send</button>
    </form>
  </body>
</html>
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

0.2.4 - Fix issue with npm module release

0.2.3 - Changes for latest Cylon release v0.22.1

0.2.2 - Fixes api.server.listen undefined issue

0.2.1 - Update examples to fix an issue with CORS

0.2.0 - Add support for robot commands and events

0.1.0 - Initial release

## License

Copyright (c) 2014-2015 The Hybrid Group. Licensed under the Apache 2.0 license.

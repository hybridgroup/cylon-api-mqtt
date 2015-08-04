'use strict';

var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://test.mosquitto.org');

client.on('message', function(topic, data) {
  // MQTT only receives and sends message payload as
  // string or buffer, so we need to parse the JSON string
  // send by Cylon, this way we can access it as a regular
  // JS object.
  var sender;

  if (!!data && (data.length > 0)) {
    data = JSON.parse(data);
    sender = data.sender;
  }

  if (sender !== 'self') {
    console.log('Topic name ==>', topic);
    console.log('Payload ==>', data);
  }
});

// In order to be able to pass params to the commands
// we need to convert them to json, since MQTT only
// accepts strings and buffers as the paylod.
// Cylon.js will convert the `args` array passed
// in the payload and pass the params to the
// command, method or function as regular params,
// in the same way `function.apply()` would do.
var params = {
  sender: 'self',
  args: ['param1', 'param2', 'param3']
};

// Payload needs to be a JSON string
var payload = JSON.stringify(params);

// get messages from the robot-level command `toggle`
client.subscribe('/api/robots/cybot/commands/toggle');

setInterval(function() {
  // call robot-level command `toggle`
  client.publish(
    '/api/robots/cybot/commands/toggle',
    payload);
}, 2000);

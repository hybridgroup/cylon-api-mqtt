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

// Payload needs to be a JSON string
var payload = JSON.stringify({
  sender: 'self',
  param1: 'uno'
});

// get list of all devices for robot 'cybot'
client.subscribe('/api/robots/cybot/devices');
client.publish('/api/robots/cybot/devices', payload);

// get info for 'led' device of robot 'cybot'
client.subscribe('/api/robots/cybot/devices/led');
client.publish('/api/robots/cybot/devices/led', payload);

// get events for 'led' device of robot 'cybot'
client.subscribe('/api/robots/cybot/devices/led/events');
client.publish('/api/robots/cybot/devices/led/events', payload);

// get commands for 'led' device of robot 'cybot'
client.subscribe('/api/robots/cybot/devices/led/commands');
client.publish('/api/robots/cybot/devices/led/commands', payload);

var params = {
  sender: 'self',
  param1: 'uno',
  param2: 'dos',
  param3: 'tres'
};

// In order to be able to pass params to the commands
// we need to convert them to json, since MQTT only
// accepts strings and buffers as the paylod.
// Cylon.js will convert this and pass them to the
// commands, methods or functions as regular params.
payload = JSON.stringify(params);

// get messages from the robot 'cybot' device 'led' command `toggle`
client.subscribe('/api/robots/cybot/devices/led/commands/toggle');

setInterval(function() {
  // send 'toggle' command to the robot 'cybot' device 'led'
  client.publish(
    '/api/robots/cybot/devices/led/commands/toggle',
    payload);
}, 2000);

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

// get list of all robots
client.subscribe('/myappname/api/robots');
client.publish('/myappname/api/robots', payload);

// get messages from the robot 'cybot' device 'led' command `toggle`,
// with the prefix 'myappname'
client.subscribe('/myappname/api/robots/cybot/devices/led/commands/toggle');

setInterval(function() {
  // send 'toggle' command to the robot 'cybot' device 'led'
  // with the prefix 'myappname'
  client.publish(
    '/myappname/api/robots/cybot/devices/led/commands/toggle',
    payload);
}, 2000);

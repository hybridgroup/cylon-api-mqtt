'use strict';

var mqtt    = require('mqtt');
var client  = mqtt.connect('mqtt://test.mosquitto.org');

client.on('message', function (topic, data) {
  // MQTT only receives and sends message payload as
  // string or buffer, so we need to parse the JSON string
  // send by Cylon, this way we can access it as a regular
  // JS object.
  data = (!!data) ? JSON.parse(data) : data;

  console.log('topic ==>', topic.toString());
  console.log('payload ==>', data);
});

client.subscribe('/listen/api/robots');
client.publish('/emit/api/robots');

client.publish('/api/robots/cybot/devices');
client.publish('/api/robots/cybot/events');
client.publish('/api/robots/cybot/commands');

client.subscribe('/listen/api/robots/cybot/toggle');

var params = {
  param1: 'uno',
  param2: 'dos',
  param3: 'tres'
};

// In order to be able to pass params to the commands
// we need to convert them to json, since MQTT only
// accepts strings and buffers as the paylod.
// Cylon.js will convert this and pass them to the
// commands, methods or functions as regular params.
params = JSON.stringify(params);

setInterval(function() {
  client.publish(
    '/emit/api/robots/cybot/devices/led/toggle',
    params);
}, 2000);

//client.end();

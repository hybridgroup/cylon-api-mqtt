'use strict';

var mqtt    = require('mqtt');
var client  = mqtt.connect('mqtt://test.mosquitto.org');

client.on('message', function (topic, payload) {
  // MQTT only receives and sends message payload as
  // string or buffer, so we need to parse the JSON string
  // send by Cylon, this way we can access it as a regular
  // JS object.
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

// Payload needs to be a JSON string
var payload = JSON.stringify({
  sender: 'self',
  param1: 'uno'
});

client.subscribe('/api/robots');
client.publish('/api/robots', payload);

client.subscribe('/api/robots/cybot');
client.publish('/api/robots/cybot', payload);

client.subscribe('/api/robots/cybot/devices');
client.publish('/api/robots/cybot/devices', payload);

client.subscribe('/api/robots/cybot/events');
client.publish('/api/robots/cybot/events', payload);

client.subscribe('/api/robots/cybot/commands');
client.publish('/api/robots/cybot/commands', payload);

client.subscribe('/api/robots/cybot/devices/led');
client.publish('/api/robots/cybot/devices/led', payload);

client.subscribe('/api/robots/cybot/devices/led/events');
client.publish('/api/robots/cybot/devices/led/events', payload);

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

client.subscribe('/listen/api/robots/cybot/devices/led/toggle');

setInterval(function() {
  client.publish(
    '/emit/api/robots/cybot/devices/led/toggle',
    payload);
}, 2000);

//client.end();

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


client.subscribe('/cybot/api/robots');
client.publish('/cybot/api/robots', payload);

client.subscribe('/cybot/api/robots/cybot/devices');
client.publish('/cybot/api/robots/cybot/devices', payload);

client.subscribe('/cybot/api/robots/cybot/devices/sensor/events');
client.publish('/cybot/api/robots/cybot/devices/sensor/events', payload);

client.subscribe('/cybot/api/robots/cybot/devices/sensor/analogRead');

//client.end();

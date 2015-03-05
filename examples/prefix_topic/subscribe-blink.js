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

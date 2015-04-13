/*
 * Cylon MQTT API
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var _ = require('lodash'),
    MqttMaster = require('./mqtt-master.js');

var API = module.exports = function(opts) {
  if (opts == null) {
    opts = {};
  }

  this.mcp = opts.mcp;

  _.forEach(this.defaults, function(def, name) {
    this[name] = _.has(opts, name) ? opts[name] : def;
  }, this);
};

API.prototype.defaults = {
  name: 'mqtt',
  host: '127.0.0.1',
  broker: 'mqtt://127.0.0.1',
  prefix: null,
  port: '3000',
  auth: false,
  CORS: '*:*',
};

API.prototype.start = function() {
  this.createServer();
};

API.prototype.createServer = function createServer() {
  this.mqtt = this._newMqtt();
  this.mqtt.start();

  console.log('cylon-api-mqtt ready');
};

API.prototype._newMqtt = function() {
  return new MqttMaster(this.broker, this.mcp, this.prefix);
};

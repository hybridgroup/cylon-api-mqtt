/*
 * Cylon MQTT master
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var mqtt = require('mqtt'),
    _ = require('lodash'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

var MqttMaster = module.exports = function MqttMaster(broker, mcp, prefix) {
  this.mcp = mcp;
  this.broker = broker;
  this.client = {};
  this.topics = {};

  // You can pass a prefix to the topic master to preceed your topic names
  this.prefix = prefix ? '/' + prefix : '';
  this.sender = this.prefix + (Math.random() * Date.now());
};

util.inherits(MqttMaster, EventEmitter);

MqttMaster.prototype.start = function() {
  this.client = mqtt.connect(this.broker);

  console.log('MQTT API has started...');

  this.client.on('connect', function() {
    this.client.on('close', function() {
      console.log('Disconnected from broker!');
    });

    this.client.on('message', function(topic, payload) {
      var data = null, sender = null;

      if (!!payload && (payload.length > 0)) {
        data = JSON.parse(payload);
        sender = data.sender;
      }

      if (sender !== this.sender) {
        this.emit(topic, data);
      }
    }.bind(this));

    this.subscribeMCP();
    this.subscribeRobots();

    _.forIn(this.mcp.robots, function(robot) {
      this.subscribeDevices(robot);
    }, this);
  }.bind(this));
};

MqttMaster.prototype._subscribeItems = function(topic, items, callback) {
  _.forIn(items, function(item, key) {
    var fullTopic = this.prefix + topic + key;

    if (!this.topics[fullTopic]) {
      this.topics[fullTopic] = fullTopic;
      callback(fullTopic, item);
    }
  }, this);
};

MqttMaster.prototype.subscribeMCP = function() {
  console.log('Setting up MQTT API...');
  console.log('Subscribing MCP...');

  var callback = function(topic, mcp) {
    var rootTopic = topic + '/',
        robotsTopic = topic + '/robots';

    var rootCB = function() {
      var payload = this._stringify(mcp.toJSON());

      this.publish(rootTopic, payload);
      this.publish(topic, payload);
    }.bind(this);

    this.on(topic, rootCB);
    this.on(rootTopic, rootCB);
    this.on(robotsTopic, function() {
      var robotsNames = _.map(mcp.robots, function(val, key) {
            return key;
          }),
          payload = this._stringify({ robots: robotsNames });

      this.publish(robotsTopic, payload);
    }.bind(this));

    this.subscribe([topic, rootTopic, robotsTopic]);

    this._addDefaultListeners(topic, mcp);
  }.bind(this);

  this._subscribeItems('/api', { '': this.mcp }, callback);
};

MqttMaster.prototype.subscribeRobots = function() {
  console.log('Subscribing robots...');

  var callback = function(topic, robot) {
    var devicesTopic = topic + '/devices';

    this.on(topic, function() {
      var details = robot.toJSON(),
          payload = this._stringify(details);

      this.publish(topic, payload);
    }.bind(this));

    this.on(devicesTopic, function() {
      var devices = robot.devices,
          payload = this._stringify(devices);

      this.publish(devicesTopic, payload);
    }.bind(this));

    this.subscribe([topic, devicesTopic]);

    this._addDefaultListeners(topic, robot);
  }.bind(this);

  this._subscribeItems('/api/robots/', this.mcp.robots, callback);
};

MqttMaster.prototype.subscribeDevices = function(robot) {
  console.log('Subscribing devices...');

  var topic = '/api/robots/' + robot.name + '/devices/',
      callback = this._addDefaultListeners.bind(this);

  this._subscribeItems(topic, robot.devices, callback);
};

MqttMaster.prototype._addDefaultListeners = function(topic, item) {
  var loopbackTopic = topic + '/loopback',
      commandsTopic = topic + '/commands',
      commandTopic = topic + '/command',
      eventsTopic = topic + '/events';

  var subscribeTo = [
    loopbackTopic,
    commandsTopic,
    eventsTopic,
    commandTopic
  ];

  this.on(loopbackTopic, function(payload) {
    this.publish(loopbackTopic, this._stringify({ data: payload }));
  }.bind(this));

  this.on(commandsTopic, function() {
    var commands = _.keys(item.commands),
        payload = this._stringify({ commands: commands });

    this.publish(commandsTopic, payload);
  }.bind(this));

  this.on(commandTopic, function(payload) {
    var ret = item.commands[payload.command].apply(item, payload.args),
        data = this._stringify({ command: payload.command, data: ret });

    this.publish(commandTopic, data);
  }.bind(this));

  // Custom Commands
  _.forIn(item.commands, function(command, cname) {
    var itemTopic = commandsTopic + '/' + cname;

    this.on(itemTopic, function(payload) {
      var args = _.toArray(payload),
          ret = command.apply(item, args);

      ret = ret || null;

      this.publish(itemTopic, this._stringify({ data: ret }));
      this.publish(commandTopic, this._stringify({ data: ret }));
    }.bind(this));

    subscribeTo.push(itemTopic);
  }, this);

  this.on(eventsTopic, function() {
    var events = item.events,
        payload = this._stringify({ events: events });

    this.publish(eventsTopic, payload);
  }.bind(this));

  // Custom Events
  _.forIn(item.events, function(eventName) {
    var itemTopic = eventsTopic + '/' + eventName;
    item.on(eventName, function(data) {
      this.publish(itemTopic, this._stringify({ data: data }));
    }.bind(this));
  }, this);

  this.subscribe(subscribeTo);
};

MqttMaster.prototype._stringify = function(payload) {
  payload.sender = this.sender;
  return JSON.stringify(payload);
};

MqttMaster.prototype.subscribe = function(topics) {
  this.client.subscribe(topics);
};

MqttMaster.prototype.publish = function(topic, payload) {
  this.client.publish(topic, payload);
};

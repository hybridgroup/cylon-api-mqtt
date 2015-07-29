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
  this.sender = prefix + (Math.random() * Date.now());
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
    key = key.toLowerCase();
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
            return key.toLowerCase();
          }),
          payload = this._stringify({ robots: robotsNames });

      this.publish(robotsTopic, payload);
    }.bind(this));

    this.subscribe([topic, rootTopic, robotsTopic]);
  }.bind(this);

  this._subscribeItems('/api', { '': this.mcp }, callback);
};

MqttMaster.prototype.subscribeRobots = function() {
  console.log('Subscribing robots...');

  var callback = function(topic, robot) {
    var devicesTopic = topic + '/devices';

    var innerCB = function() {
      var devices = _.keys(robot.devices),
          payload = this._stringify({
            devices: devices
          });

      this.publish(topic, payload);
      this.publish(devicesTopic, payload);
    }.bind(this);

    this.on(topic, innerCB);
    this.on(devicesTopic, innerCB);

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
  var messageTopic = topic + '/message',
      commandsTopic = topic + '/commands',
      eventsTopic = topic + '/events',
      commandTopic = topic + '/command';

  this.on(messageTopic, function(payload) {
    this.publish(
      messageTopic,
      this._stringify({
        data: payload
      }));
  }.bind(this));

  this.on(commandsTopic, function() {
    var commands = _.keys(item.commands),
        payload = this._stringify({ commands: commands });

    this.publish(commandsTopic, payload);
  }.bind(this));

  this.on(eventsTopic, function() {
    var events = item.events,
        payload = this._stringify({ events: events });

    this.publish(eventsTopic, payload);
  }.bind(this));

  this.on(commandTopic, function(payload) {
    var ret = item.commands[payload.command].apply(item, payload.args);

    this.publish(
      commandTopic,
      this._stringify({
        command: payload.command,
        returned: ret
      })
    );
  }.bind(this));

  var subscribeTo = [
    messageTopic,
    commandsTopic,
    eventsTopic,
    commandTopic
  ];

  // Custom Commands
  _.forIn(item.commands, function(command, cname) {
    this.on(topic + '/' + cname, function(payload) {
      var args = _.toArray(payload),
          ret = command.apply(item, args);

      ret = ret || null;

      this.publish(
        topic + '/' + cname,
        this._stringify({ returned: ret })
      );
    }.bind(this));

    subscribeTo.push(topic + '/' + cname);
  }, this);

  // Custom Events
  _.forIn(item.events, function(eventName) {
    item.on(eventName, function() {
      this.publish(
        topic + '/' + eventName,
        this._stringify({ arguments: arguments })
      );
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

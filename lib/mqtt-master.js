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
  if (!!prefix) {
    this.ePrefix = '/' + prefix + '/emit';
    this.lPrefix = '/' + prefix + '/listen';
  } else {
    this.ePrefix = '/emit';
    this.lPrefix = '/listen';
  }
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
      this.emit(topic, payload);
    }.bind(this));

    this.subscribeMCP();
    this.subscribeRobots();

    _.forIn(this.mcp.robots, function(robot) {
      this.subscribeDevices(robot);
    }, this);
  }.bind(this));
};

MqttMaster.prototype._subscribeItems = function(topic, items, callback) {
  _.forIn(items, function(item, name) {
    var topicName;

    name = name.toLowerCase();
    topicName = topic + name;

    if (!this.topics[topicName]) {
      this.topics[name] = topicName;
      callback(topicName, name, item);
    }
  }, this);
};

MqttMaster.prototype.subscribeMCP = function() {
  console.log('Setting up MQTT API...');
  console.log('Subscribing MCP...');

  var callback = function(topicName, name, robots) {

    this.on(this.ePrefix + topicName, function() {
      var robotNames = _.keys(robots),
          params = JSON.stringify(robotNames);

      this.client.publish(this.lPrefix + topicName, params);
    }.bind(this));

    this.client.subscribe(this.ePrefix + topicName);
  }.bind(this);

  this._subscribeItems('/api/', { robots: this.mcp.robots }, callback);
};

MqttMaster.prototype.subscribeRobots = function() {
  console.log('Subscribing robots...');

  var robots = this.mcp.robots;

  var callback = function(topicName, name, robot) {
    var innerCB = function() {
      var devices = _.keys(robot.devices),
          params = JSON.stringify(devices);

      this.client.publish(this.lPrefix + topicName, params);
      this.client.publish(this.lPrefix + topicName + '/devices', params);
    }.bind(this);

    var mainTopic = this.ePrefix + topicName,
        devsTopic = mainTopic + '/devices',
        topics = [
          mainTopic,
          devsTopic
        ];

    this.on(mainTopic, innerCB);
    this.on(devsTopic, innerCB);

    this.client.subscribe(topics);

    this._addDefaultListeners(topicName, name, robot);
  }.bind(this);

  this._subscribeItems('/api/robots/', robots, callback);
};

MqttMaster.prototype.subscribeDevices = function(robot) {
  console.log('Subscribing devices...');

  var topic = '/api/robots/' + robot.name + '/devices/',
      callback = this._addDefaultListeners.bind(this);

  this._subscribeItems(topic, robot.devices, callback);
};

MqttMaster.prototype._addDefaultListeners = function(topicName, name, item) {
  var messageTopic = topicName + '/message',
      commandsTopic = topicName + '/commands',
      eventsTopic = topicName + '/events',
      commandTopic = topicName + '/command';

  this.on(this.ePrefix + messageTopic, function(payload) {
    this.client.publish(this.lPrefix + messageTopic, payload);
  }.bind(this));

  this.on(this.ePrefix + commandsTopic, function() {
    var commands = _.keys(item.commands);
    this.client.publish(this.lPrefix + commandsTopic, JSON.stringify(commands));
  }.bind(this));

  this.on(this.ePrefix + eventsTopic, function() {
    var events = item.events;
    this.client.publish(this.lPrefix + eventsTopic, JSON.stringify(events));
  }.bind(this));

  this.on(this.ePrefix + commandTopic, function(payload) {
    payload = (!!payload) ? JSON.parse(payload) : payload;

    var ret = item.commands[payload.command].apply(item, payload.args);

    this.client.publish(
      this.lPrefix + commandTopic,
      JSON.stringify({
        command: payload.command,
        returned: ret
      })
    );
  }.bind(this));

  var subscribeTo = [
    this.ePrefix + messageTopic,
    this.ePrefix + commandsTopic,
    this.ePrefix + eventsTopic,
    this.ePrefix + commandTopic
  ];

  // Custom Commands
  _.forIn(item.commands, function(command, cname) {
    this.on(this.ePrefix + topicName + '/' + cname, function(payload) {
      payload = (!!payload) ? JSON.parse(payload) : payload;

      var args = _.toArray(payload),
          ret = command.apply(item, args);

      ret = ret || null;

      this.client.publish(
        this.lPrefix + topicName + '/' + cname,
        JSON.stringify(ret)
      );
    }.bind(this));

    subscribeTo.push(this.ePrefix + topicName + '/' + cname);
  }, this);

  // Custom Events
  _.forIn(item.events, function(eventName) {
    item.on(eventName, function() {
      this.client.publish(
        this.lPrefix + topicName + '/' + eventName,
        JSON.stringify(arguments)
      );
    }.bind(this));
  }, this);

  this.client.subscribe(subscribeTo);
};

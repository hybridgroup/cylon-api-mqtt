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

var MqttMaster = module.exports = function MqttMaster(broker, mcp) {
  this.mcp = mcp;
  this.broker = broker;
  this.client = {};
  this.topics = {};
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

    this.on(topicName, function() {
      var robotNames = _.keys(robots);
      this.client.publish(topicName, robotNames.toString());
    }.bind(this));

    this.client.subscribe(topicName);
  }.bind(this);

  this._subscribeItems('/api/', { robots: this.mcp.robots }, callback);
};

MqttMaster.prototype.subscribeRobots = function() {
  console.log('Subscribing robots...');

  var robots = this.mcp.robots;

  var callback = function(topicName, name, robot) {
    var innerCB = function() {
      var devices = _.keys(robot.devices);
      this.client.publish(topicName, devices.toString());
    }.bind(this);

    this.on(topicName, innerCB);

    this.client.subscribe(topicName);

    var devsTopic = topicName + '/devices';
    this.on(devsTopic, innerCB);

    this.client.subscribe(devsTopic);

    this._addDefaultListeners(topicName, name, robot);
  }.bind(this);

  this._subscribeItems('/api/robots/', robots, callback);
};

MqttMaster.prototype.subscribeDevices = function(robot) {
  console.log('Subscribing devices...');

  var topic = '/api/robots/' + robot.name + '/devices/';

  var callback = this._addDefaultListeners.bind(this);

  this._subscribeItems(topic, robot.devices, callback);
};

MqttMaster.prototype._addDefaultListeners = function(topicName, name, item) {
  var messageTopic = topicName + '/message';
  this.on(messageTopic, function(payload) {
    this.client.publish(messageTopic, payload.toString());
  }.bind(this));

  var commandsTopic = topicName + '/commands';
  this.on(commandsTopic, function() {
    var commands = _.keys(item.commands);
    this.client.publish(commandsTopic, commands.toString());
  }.bind(this));

  var eventsTopic = topicName + '/events';
  this.on(eventsTopic, function() {
    var events = item.events;
    this.client.publish(eventsTopic, events.toString());
  }.bind(this));

  var commandTopic = topicName + '/command';
  this.on(commandTopic, function(payload) {
    var ret = item.commands[payload.command].apply(item, payload.args);
    this.client.publish(commandTopic, {
      command: payload.command,
      returned: ret
    }.toString());
  }.bind(this));

  // Custom Commands
  _.forIn(item.commands, function(command, cname) {
    this.on(topicName + '/' + cname, function(payload) {
      var args = _.toArray(payload);
      var ret = command.apply(item, args);
      this.client.publish(cname, ret.toString());
    }.bind(this));
  }, this);

  // Custom Events
  _.forIn(item.events, function(eventName) {
    item.on(eventName, function() {
      var args = _.toArray(arguments);

      args.unshift(eventName);

      this.client.publish.apply(this.client, args);
    }.bind(this));
  }, this);

  var subscribeTo = [
    messageTopic,
    commandsTopic,
    eventsTopic,
    commandTopic
  ];

  _.forIn(item.commands, function(command, cname) {
    subscribeTo.push(topicName + '/' + cname);
  });

  this.client.subscribe(subscribeTo);
};

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

    this.on('/emit' + topicName, function() {
      var robotNames = _.keys(robots),
          params = JSON.stringify(robotNames);

      this.client.publish('/listen' + topicName, params);
    }.bind(this));

    this.client.subscribe('/emit' + topicName);
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

      this.client.publish('/listen' + topicName, params);
      this.client.publish('/listen' + topicName + '/devices', params);
    }.bind(this);

    var mainTopic = '/emit' + topicName,
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

  var topic = '/api/robots/' + robot.name + '/devices/';

  var callback = this._addDefaultListeners.bind(this);

  this._subscribeItems(topic, robot.devices, callback);
};

MqttMaster.prototype._addDefaultListeners = function(topicName, name, item) {
  var messageTopic = topicName + '/message',
      commandsTopic = topicName + '/commands',
      eventsTopic = topicName + '/events',
      commandTopic = topicName + '/command';

  this.on('/emit' + messageTopic, function(payload) {
    this.client.publish('/listen' + messageTopic, payload.toString());
  }.bind(this));

  this.on('/emit' + commandsTopic, function() {
    var commands = _.keys(item.commands);
    this.client.publish('/listen' + commandsTopic, JSON.stringify(commands));
  }.bind(this));

  this.on('/emit' + eventsTopic, function() {
    var events = item.events;
    this.client.publish('/listen' + eventsTopic, JSON.stringify(events));
  }.bind(this));

  this.on('/emit' + commandTopic, function(payload) {
    payload = (!!payload) ? JSON.parse(payload) : payload;

    var ret = item.commands[payload.command].apply(item, payload.args);

    this.client.publish(
      '/listen' + commandTopic,
      JSON.stringify({
        command: payload.command,
        returned: ret
      })
    );
  }.bind(this));

  var subscribeTo = [
    '/emit' + messageTopic,
    '/emit' + commandsTopic,
    '/emit' + eventsTopic,
    '/emit' + commandTopic
  ];

  // Custom Commands
  _.forIn(item.commands, function(command, cname) {
    this.on('/emit' + topicName + '/' + cname, function(payload) {
      payload = (!!payload) ? JSON.parse(payload) : payload;

      var args = _.toArray(payload),
          ret = command.apply(item, args);

      ret = ret || null;

      this.client.publish(
        '/listen' + topicName + '/' + cname,
        JSON.stringify(ret)
      );
    }.bind(this));

    subscribeTo.push('/emit' + topicName + '/' + cname);
  }, this);

  // Custom Events
  _.forIn(item.events, function(eventName) {
    item.on(eventName, function() {
      this.client.publish(
        '/listen' + topicName + '/' + eventName,
        JSON.stringify(arguments)
      );
    }.bind(this));
  }, this);

  this.client.subscribe(subscribeTo);
};

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

  this.prefix = (!!prefix) ? '/' + prefix : '';
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
      if (!!payload && (payload.length > 0)) {
        payload = JSON.parse(payload);
      }

      if ((!!payload) && (payload.sender !== this.sender)) {
        this.emit(topic, payload);
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

    this.on(this.prefix + topicName, function() {
      var robotNames = _.keys(robots),
          payload = this._stringify({ robots: robotNames });

      this.client.publish(this.prefix + topicName, payload);
    }.bind(this));

    this.client.subscribe(this.prefix + topicName);
  }.bind(this);

  this._subscribeItems('/api/', { robots: this.mcp.robots }, callback);
};

MqttMaster.prototype.subscribeRobots = function() {
  console.log('Subscribing robots...');

  var robots = this.mcp.robots;

  var callback = function(topicName, name, robot) {
    var innerCB = function() {
      var devices = _.keys(robot.devices),
          payload = this._stringify({
            devices: devices
          });

      this.client.publish(this.prefix + topicName, payload);
      this.client.publish(this.prefix + topicName + '/devices', payload);
    }.bind(this);

    var mainTopic = this.prefix + topicName,
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

  this.on(this.prefix + messageTopic, function(payload) {
    this.client.publish(
      this.prefix + messageTopic,
      this._stringify({
        data: payload
      }));
  }.bind(this));

  this.on(this.prefix + commandsTopic, function() {
    var commands = _.keys(item.commands),
        payload = this._stringify({ commands: commands });

    this.client.publish( this.prefix + commandsTopic, payload);
  }.bind(this));

  this.on(this.prefix + eventsTopic, function() {
    var events = item.events,
        payload = this._stringify({ events: events });

    this.client.publish(this.prefix + eventsTopic, payload);
  }.bind(this));

  this.on(this.prefix + commandTopic, function(payload) {
    var ret = item.commands[payload.command].apply(item, payload.args);

    this.client.publish(
      this.prefix + commandTopic,
      this._stringify({
        command: payload.command,
        returned: ret
      })
    );
  }.bind(this));

  var subscribeTo = [
    this.prefix + messageTopic,
    this.prefix + commandsTopic,
    this.prefix + eventsTopic,
    this.prefix + commandTopic
  ];

  // Custom Commands
  _.forIn(item.commands, function(command, cname) {
    this.on(this.prefix + topicName + '/' + cname, function(payload) {
      var args = _.toArray(payload),
          ret = command.apply(item, args);

      ret = ret || null;

      this.client.publish(
        this.prefix + topicName + '/' + cname,
        this._stringify({ returned: ret })
      );
    }.bind(this));

    subscribeTo.push(this.prefix + topicName + '/' + cname);
  }, this);

  // Custom Events
  _.forIn(item.events, function(eventName) {
    item.on(eventName, function() {
      this.client.publish(
        this.prefix + topicName + '/' + eventName,
        this._stringify({ arguments: arguments })
      );
    }.bind(this));
  }, this);

  this.client.subscribe(subscribeTo);
};

MqttMaster.prototype._stringify = function(payload) {
  payload.sender = this.sender;
  return JSON.stringify(payload);
};

/*
 * Cylon MQTT master
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var mqtt = require('mqtt'),
    _ = require('lodash');

var MqttMaster = module.exports = function MqttMaster(broker, mcp) {
  console.log('mqtt broker ==>', broker.toString());
  console.log('mqtt mcp ==>', mcp.toString());
  this.mcp = mcp;
  this.broker = broker;
  this.client = {};
  this.topics = {};
};

MqttMaster.prototype.start = function() {
  this.client = mqtt.connect(this.broker);

  console.log('MQTT API has started...');

  this.client.on('connect', function() {
    this.client.on('close', function() {
      console.log('Disconnected from broker!');
    });

    this.publishMCP();
    this.publishRobots();

    _.forIn(this.mcp.robots, function(robot) {
      this.publishDevices(robot);
    }, this);

  }.bind(this));
};

MqttMaster.prototype._publishItems = function(topic, items, callback) {
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

MqttMaster.prototype.publishMCP = function() {
  console.log('Setting up MQTT API...');

  var callback = function(topicName, name, robots) {
    var robotNames = _.keys(robots);

    this.client.on('message', function(topic) {
      if (topicName === topic) {
        this.client.publish(name, robotNames);
      }
    }.bind(this));

    this.client.subscribe(topicName);
  }.bind(this);

  this._publishItems('/api/', { robots: this.mcp.robots }, callback);
};

MqttMaster.prototype.publishRobots = function() {
  console.log('Publishing robots...');

  var robots = this.mcp.robots;

  var callback = function(topicName, name, robot) {
    var devices = _.keys(robot.devices);

    this.client.on('message', function(topic) {
      if ((topic === topicName) || (topic === topicName + '/devices')) {
        this.client.publish('devices', devices);
      }
    }.bind(this));

    this.client.subscribe(topicName);

    this._addDefaultListeners(topicName, name, robot);
  }.bind(this);

  this._publishItems('/api/robots/', robots, callback);
};

MqttMaster.prototype.publishDevices = function(robot) {
  console.log('Publishing devices...');

  var topic = '/api/robots/' + robot.name + '/devices/';

  this._socketItems(topic, robot.devices, this._addDefaultListeners.bind(this));
};

MqttMaster.prototype._addDefaultListeners = function(topicName, name, item) {
  this.client.on('message', function(topic, payload) {
    switch(topic) {
      case topicName + '/message':
        this.client.publish('message', payload);
        break;
      case topicName + '/commands':
        var commands = _.keys(item.commands);
        this.client.publish('commands', commands);
        break;
      case topicName + '/events':
        var events = item.events;
        this.client.publish('events', events);
        break;
      case topicName + '/command':
        var ret = item.commands[payload.command].apply(item, payload.args);
        this.client.publish('command', payload.command, ret);
        break;
    }

    // Custom Commands
    _.forIn(item.commands, function(command, cname) {
      if (cname === name) {
        var args = _.toArray(payload);
        var ret = command.apply(item, args);
        this.client.publish(cname, ret);
      }
    }, this);

    // Custom Events
    _.forIn(item.events, function(eventName) {
      item.on(eventName, function() {
        var args = _.toArray(arguments);

        args.unshift(eventName);

        this.client.publish.apply(this.client, args);
      }.bind(this));
    }, this);
  }.bind(this));

  var subscribeTo = [
    topicName + '/message',
    topicName + '/commands',
    topicName + '/events',
    topicName + '/command'
  ];

  _.forIn(item.commands, function(command, cname) {
    subscribeTo.push(topicName + '/' + cname);
  });

  // NO NEED TO SUBSCRIBE TO EVENTS ONLY TO PUBLISH THEM
  //_.forIn(item.events, function(command, cname) {
    //subscribeTo.push(topicName + '/' + cname);
  //});

  this.client.subscribe();
};

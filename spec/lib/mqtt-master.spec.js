 /* jshint expr:true */
'use strict';

var MqttMaster = source('mqtt-master');

var mqtt = require('mqtt');

describe('MqttMaster', function() {
  var mm, mcp;

  beforeEach(function() {
    mcp = {
      robots: {
        rosie: {
          name: 'rosie',
          devices: {
            led: {
              commands: {
                turn_on: function() { return 1; }
              },
              events: ['analogRead']
            }
          },
          commands: {
            turn_on: function() { return 1; }
          }
        },
        thelma: {
          devices: {
            asensor: {
              commands: {
                turn_on: function() {}
              },
              events: ['analogRead']
            }
          },
          commands: {
            turn_on: function() { return 1; }
          }
        }
      }
    };
    mm = new MqttMaster('mqtt://test.mosquitto.org', mcp);
    stub(console, 'log');
  });

  afterEach(function() {
    console.log.restore();
  });

  describe('#constructor', function() {
    it('sets @broker', function() {
      expect(mm.broker).to.be.eql('mqtt://test.mosquitto.org');
    });

    it('sets @io', function() {
      expect(mm.client).to.be.eql({});
    });

    it('sets @mcp', function() {
      expect(mm.mcp).to.be.eql(mcp);
    });

    it('sets @nsp', function() {
      expect(mm.topics).to.be.eql({});
    });
  });

  describe('#start', function() {
    var client;

    beforeEach(function() {
      client = {
        on: stub()
      };

      stub(mqtt, 'connect');
      mqtt.connect.returns(client);

      client.on.yields('commands', {});

      stub(mm, 'emit');
      stub(mm, 'subscribeMCP');
      stub(mm, 'subscribeRobots');
      stub(mm, 'subscribeDevices');

      mm.start();
    });

    afterEach(function() {
      mqtt.connect.restore();
      mm.emit.restore();
      mm.subscribeMCP.restore();
      mm.subscribeRobots.restore();
      mm.subscribeDevices.restore();
    });

    it('connects to the broker with mqtt.connect', function() {
      expect(mqtt.connect).to.be.calledOnce;
    });

    it('sets @client', function() {
      expect(mm.client).to.be.eql(client);
    });

    it('sets listener for @client connect event', function() {
      expect(mm.client.on).to.be.calledWith('connect');
    });

    it('sets listeners for @client#on "close"', function() {
      expect(mm.client.on).to.be.calledWith('close');
    });

    it('on close event logs the disconnect', function() {
      expect(console.log).to.be.calledWith('Disconnected from broker!');
    });

    it('sets listener for @client#on "message"', function() {
      expect(mm.client.on).to.be.calledWith('message');
    });

    it('on @client message emits the topic on the object', function() {
      expect(mm.emit).to.be.calledWith('commands', {});
    });

    it('calls  #subscribeMCP', function() {
      expect(mm.subscribeMCP).to.be.calledOnce;
    });

    it('calls  #subscribeRobots', function() {
      expect(mm.subscribeRobots).to.be.calledOnce;
    });

    it('calls  #subscribeDevices', function() {
      expect(mm.subscribeDevices).to.be.calledTwice;
      expect(mm.subscribeDevices).to.be.calledWith(mcp.robots.rosie);
      expect(mm.subscribeDevices).to.be.calledWith(mcp.robots.thelma);
    });
  });

  describe('#_subscribeItems', function() {
    var callback;

    beforeEach(function() {
      callback = spy();

      mm._subscribeItems('/api/robots/', mcp.robots, callback);
    });

    it('sets topics for all robots', function() {
      expect(mm.topics.rosie).to.be.eql('/api/robots/rosie');
      expect(mm.topics.thelma).to.be.eql('/api/robots/thelma');
    });

    it('triggers the callback', function() {
      expect(callback).to.be.calledWith(
        '/api/robots/rosie',
        'rosie',
        mcp.robots.rosie
      );
      expect(callback).to.be.calledWith(
        '/api/robots/thelma',
        'thelma',
        mcp.robots.thelma
      );
    });
  });

  describe('#subscribeMCP', function() {
    var callback, client;

    beforeEach(function() {
      callback = spy();

      client = {
        publish: spy(),
        subscribe: spy()
      };

      mm.client = client;

      stub(mm, 'on');
      mm.on.yields();

      stub(mm, '_subscribeItems');
      mm._subscribeItems.yields('/api/robots', 'robots', mcp.robots);

      mm.subscribeMCP();
    });

    afterEach(function() {
      mm._subscribeItems.restore();
      mm.on.restore();
    });

    it('calls #_subscribeItems', function() {
      expect(mm._subscribeItems).to.be.calledWith(
        '/api/',
        { robots: mcp.robots }
      );
    });

    it('adds a listener /emit/api/robots', function() {
      expect(mm.on).to.be.calledWith('/emit/api/robots');
    });

    it('subscribes mm.client to /emit/api/robots topic', function() {
      expect(client.subscribe).to.be.calledWith('/emit/api/robots');
    });

    it('publishes to /listen/api/robots topic', function() {
      expect(client.publish).to.be.calledWith('/listen/api/robots');
      expect(client.publish).to.be.calledWith(
        '/listen/api/robots',
        JSON.stringify(['rosie', 'thelma'])
      );
    });
  });
/*
  describe('#socketRobots', function() {
    var callback, socket;

    beforeEach(function() {
      callback = spy();

      socket = {
        on: stub()
      };

      socket.on.yields({ command: 'turn_on', args: [] });
      stub(mm, '_socketItems');
      spy(mm, '_addDefaultListeners');

      mm.nsp = {
        robots: {
          emit: stub()
        },
        rosie: {
          emit: stub()
        }
      };

      mm._socketItems.yields(socket, 'rosie', mcp.robots.rosie);

      mm.socketRobots(mcp.robots);
    });

    afterEach(function() {
      mm._socketItems.restore();
      mm._addDefaultListeners.restore();
    });

    it('calls #_socketItems', function() {
      expect(mm._socketItems).to.be.calledWith(
        '/api/robots/',
        mcp.robots
      );
    });

    it('adds a listener for "devices" to the socket', function() {
      expect(socket.on).to.be.calledWith('devices');
    });

    it('calls #_addDefaultListeners', function() {
      expect(mm._addDefaultListeners).to.be.calledOnce;
      expect(mm._addDefaultListeners).to.be.calledWith(
        socket,
        'rosie'
      );
    });
  });

  describe('#socketDevices', function() {
    var callback, socket, asensor;

    beforeEach(function() {
      callback = spy();

      socket = {
        on: stub()
      };

      socket.on.yields({ command: 'turn_on', args: [] });

      stub(mm, '_socketItems');
      spy(mm, '_addDefaultListeners');

      mm.nsp = {
        robots: {
          emit: stub()
        },
        rosie: {
          emit: stub()
        },
        led: {
          emit: stub()
        },
      };

      asensor = mcp.robots.rosie.devices.led;
      asensor.on = stub();
      asensor.on.yields();

      mm._socketItems.yields(socket, 'led', mcp.robots.rosie.devices.led);

      mm.socketDevices(mcp.robots.rosie);
    });

    afterEach(function() {
      mm._socketItems.restore();
      mm._addDefaultListeners.restore();
    });

    it('calls #_socketItems', function() {
      expect(mm._socketItems).to.be.calledWith(
        '/api/robots/rosie/devices/',
        mcp.robots.rosie.devices
      );
    });

    it('adds a listener for "message" to the socket', function() {
      expect(socket.on).to.be.calledWith('message');
    });

    it('emits "message" event', function() {
      expect(mm.nsp.led.emit).to.be.calledWith('message');
    });

    it('adds a listener for "commands" to the socket', function() {
      expect(socket.on).to.be.calledWith('commands');
    });

    it('emits "commands" event', function() {
      expect(mm.nsp.led.emit).to.be.calledWith(
        'commands',
        ['turn_on']
      );
    });

    it('adds a listener for "events" to the socket', function() {
      expect(socket.on).to.be.calledWith('events');
    });

    it('emits "events" event', function() {
      expect(mm.nsp.led.emit).to.be.calledWith(
        'events',
        mcp.robots.rosie.devices.led.events
      );
    });

    it('adds a listener for "command" to the socket', function() {
      expect(socket.on).to.be.calledWith('command');
    });

    it('emits "events" event', function() {
      expect(mm.nsp.led.emit).to.be.calledWith(
        'command',
        'turn_on',
        1
      );
    });

    it('adds a listener for "turn_on" to the socket', function() {
      expect(socket.on).to.be.calledWith('turn_on');
    });

    it('emits "events" event', function() {
      expect(mm.nsp.led.emit).to.be.calledWith(
        'turn_on',
        1
      );
    });

    it('adds a listener for "analogRead" to the device', function() {
      expect(asensor.on).to.be.calledWith('analogRead');
    });

    it('emits "events" event', function() {
      expect(mm.nsp.led.emit).to.be.calledWith(
        'analogRead'
      );
    });

    it('calls #_addDefaultListeners', function() {
      expect(mm._addDefaultListeners).to.be.calledOnce;
      expect(mm._addDefaultListeners).to.be.calledWith(
        socket,
        'led'
      );
    });
  });
 */
});

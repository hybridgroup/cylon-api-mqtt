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
          },
          events: [
            'turned-on',
            'turned-off'
          ],
          on: function() {}
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

  describe('#subscribeRobots', function() {
    var client;

    beforeEach(function() {
      client = {
        publish: spy(),
        subscribe: spy()
      };

      mm.client = client;

      stub(mm, 'on');
      mm.on.yields();

      stub(mm, '_subscribeItems');
      mm._subscribeItems.yields('/api/robots/rosie', 'rosie', mcp.robots.rosie);

      stub(mm, '_addDefaultListeners');

      mm.subscribeRobots();
    });

    afterEach(function() {
      mm.on.restore();
      mm._subscribeItems.restore();
      mm._addDefaultListeners.restore();
    });

    it('calls #_subscribeItems with params', function() {
      expect(mm._subscribeItems).to.be.calledWith('/api/robots/', mcp.robots);
    });

    it('calls #_addDefaultListeners', function() {
      expect(mm._addDefaultListeners).to.be.calledOnce;
      expect(mm._addDefaultListeners).to.be.calledWith(
        '/api/robots/rosie',
        'rosie',
        mcp.robots.rosie
      );
    });

    it('calls #client.subscribe with', function() {
      var topics = [
        '/emit/api/robots/rosie',
        '/emit/api/robots/rosie/devices'
      ];
      expect(mm.client.subscribe).to.be.calledWith(topics);
    });

    it('adds a new listener for robot and devices', function() {
      expect(mm.on).to.be.calledWith('/emit/api/robots/rosie');
      expect(mm.on).to.be.calledWith('/emit/api/robots/rosie/devices');
    });

    it('call @client#publish for robot and devices', function() {
      var devs = Object.keys(mcp.robots.rosie.devices),
          topicPrefix = '/listen/api/robots/rosie';

      devs = JSON.stringify(devs);

      expect(client.publish).to.be.calledWith(topicPrefix, devs);
      expect(client.publish).to.be.calledWith(topicPrefix + '/devices', devs);
    });
  });

  describe('#subscribeDevices', function() {
    beforeEach(function() {
      stub(mm, '_subscribeItems');
      mm.subscribeDevices(mcp.robots.rosie);
    });

    afterEach(function() {
      mm._subscribeItems.restore();
    });

    it('calls #_subscribeItems with params', function() {
      expect(mm._subscribeItems).to.be.calledWith(
        '/api/robots/rosie/devices/',
        mcp.robots.rosie.devices
      );
    });
  });

  describe('#_addDefaultListeners', function() {
    var client, payload, rosie, topics;

    topics = [
      '/emit/api/robots/rosie/message',
      '/emit/api/robots/rosie/commands',
      '/emit/api/robots/rosie/events',
      '/emit/api/robots/rosie/command',
      '/emit/api/robots/rosie/turn_on'
    ];

    beforeEach(function() {
      rosie = mcp.robots.rosie;

      payload = JSON.stringify({
        command: 'turn_on',
        args: ['param1', 'param2']
      });

      client = {
        subscribe: stub(),
        publish: stub()
      };

      mm.client = client;

      stub(mm, 'on');
      mm.on.yields(payload);

      stub(rosie, 'on');
      rosie.on.yields('value1', 'value2');

      stub(rosie.commands, 'turn_on');
      rosie.commands.turn_on.returns(128);

      mm._addDefaultListeners('/api/robots/rosie', 'rosie', rosie);
    });

    afterEach(function() {
      mm.on.restore();
      rosie.on.restore();
    });

    it('adds a listener for /emit/api/robots/rosie/message', function() {
      expect(mm.on).to.be.calledWith(
        '/emit/api/robots/rosie/message'
      );
    });

    it('publishes to topic /listen/api/robots/rosie/message', function() {
      expect(client.publish).to.be.calledWith(
        '/listen/api/robots/rosie/message',
        payload
      );
    });

    it('adds a listener for  /emit/api/robots/rosie/commands', function() {
      expect(mm.on).to.be.calledWith('/emit/api/robots/rosie/commands');
    });

    it('publishes to topic /listen/api/robots/rosie/commands', function() {
      var keys = JSON.stringify(Object.keys(rosie.commands));
      expect(client.publish).to.be.calledWith(
        '/listen/api/robots/rosie/commands',
        keys
      );
    });

    it('adds a listener for /emit/api/robots/rosie/events', function() {
      expect(mm.on).to.be.calledWith('/emit/api/robots/rosie/events');
    });

    it('publishes to topic /listen/api/robots/rosie/events', function() {
      var keys = JSON.stringify(rosie.events);
      expect(client.publish).to.be.calledWith(
        '/listen/api/robots/rosie/events',
        keys
      );
    });

    it('adds a listener for /emit/api/robots/rosie/command', function() {
      expect(mm.on).to.be.calledWith('/emit/api/robots/rosie/command');
    });

    it('calls the robot command', function() {
      var params = JSON.parse(payload);
      expect(rosie.commands.turn_on)
        .to.be.calledWith(params.args[0], params.args[1]);
    });

    it('publishes to topic /listen/api/robots/rosie/command', function() {
      expect(client.publish).to.be.calledWith(
        '/listen/api/robots/rosie/command',
        JSON.stringify({ command: 'turn_on',
          returned: 128
        })
      );
    });

    it('adds a listener for /emit/api/robots/rosie/turn_on', function() {
      expect(mm.on).to.be.calledWith('/emit/api/robots/rosie/turn_on');
    });

    it('calls the turn_on command', function() {
      var params = JSON.parse(payload);
      expect(rosie.commands.turn_on)
        .to.be.calledWith(params.args[0], params.args[1]);
    });

    it('publishes to topic /listen/api/robots/rosie/command', function() {
      expect(client.publish).to.be.calledWith(
        '/listen/api/robots/rosie/turn_on',
        JSON.stringify(128)
      );
    });

    it('adds listeners to the robot for each event', function() {
      expect(rosie.on).to.be.calledWith('turned-on');
      expect(rosie.on).to.be.calledWith('turned-off');
    });

    it('publishes to topic /listen/api/robots/rosie/turn-on', function() {
      expect(client.publish).to.be.calledWith(
        '/listen/api/robots/rosie/turned-on',
        JSON.stringify({ '0': 'value1', '1': 'value2' })
      );
    });

    it('publishes to topic /listen/api/robots/rosie/turn-off', function() {
      expect(client.publish).to.be.calledWith(
        '/listen/api/robots/rosie/turned-off',
        JSON.stringify({ '0': 'value1', '1': 'value2' })
      );
    });

    it('subscribes to all robots topics', function() {
      expect(client.subscribe).to.be.calledWith(topics);
    });


    context('robot with prefix', function(){
      beforeEach(function() {
        mm.ePrefix = '/123456/emit';
        mm.lPrefix = '/123456/listen';

        mm._addDefaultListeners('/api/robots/rosie', 'rosie', rosie);
      });

      it('adds to the beggining of the listener topic', function() {
        expect(mm.on).to.be.calledWith(
          '/123456/emit/api/robots/rosie/message'
        );
      });

      it('adds to the beggining of the published topic', function() {
        expect(client.publish).to.be.calledWith(
          '/123456/listen/api/robots/rosie/message'
        );
      });
    });
  });

});

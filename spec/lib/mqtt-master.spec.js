'use strict';

var MqttMaster = lib('mqtt-master');

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
          on: function() {},
          toJSON: function() { return { devices: '1234' }; }
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
          },
          toJSON: function() { return { devices: '5678' }; }
        }
      },
      toJSON: function() { return { details: '1234' }; }
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

    it('sets @prefix', function() {
      expect(mm.prefix).to.be.eql('');
    });

    it('sets @sender', function() {
      expect(mm.topics).not.to.be.null();
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
      expect(mm.emit).to.be.calledWith('commands', null);
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
      expect(mm.topics['/api/robots/rosie']).to.be.eql('/api/robots/rosie');
      expect(mm.topics['/api/robots/thelma']).to.be.eql('/api/robots/thelma');
    });

    it('triggers the callback', function() {
      expect(callback).to.be.calledWith(
        '/api/robots/rosie',
        mcp.robots.rosie
      );
      expect(callback).to.be.calledWith(
        '/api/robots/thelma',
        mcp.robots.thelma
      );
    });

    context('with prefix', function() {
      it('prepends the prefix to the topic', function() {
        mm.prefix = '/123456';
        mm._subscribeItems('/api/robots/', mcp.robots, callback);
        expect(callback).to.be.calledWith(
          '/123456/api/robots/rosie',
          mcp.robots.rosie
        );
      });
    });
  });

  describe('#subscribeMCP', function() {
    var client;

    beforeEach(function() {
      client = {
        publish: spy(),
        subscribe: spy()
      };

      mm.client = client;

      stub(mm, '_stringify');
      spy(mm, 'subscribe');
      spy(mm, 'publish');

      stub(mm, 'on');
      mm.on.yields();

      stub(mm, '_subscribeItems');
      mm._subscribeItems.yields('/api', mcp);

      stub(mm, '_addDefaultListeners');

      mm.subscribeMCP();
    });

    afterEach(function() {
      mm._subscribeItems.restore();
      mm.on.restore();
    });

    it('calls #_subscribeItems', function() {
      expect(mm._subscribeItems).to.be.calledWith(
        '/api',
        { '': mcp }
      );
    });

    it('adds a listener for root "/"', function() {
      expect(mm.on).to.be.calledWith('/api');
      expect(mm.on).to.be.calledWith('/api/');
    });

    it('adds a listener /api/robots', function() {
      expect(mm.on).to.be.calledWith('/api/robots');
    });

    it('subscribes mm.client to root / and /api/robots topic', function() {
      expect(mm.subscribe).to.be.calledWith(['/api', '/api/', '/api/robots']);
    });

    it('calls #_addDefaultListeners', function() {
      expect(mm._addDefaultListeners).to.be.calledOnce;
      expect(mm._addDefaultListeners).to.be.calledWith(
        '/api',
        mcp
      );
    });
  });

  describe('#subscribeRobots', function() {
    var client, localSender;

    beforeEach(function() {
      client = {
        publish: spy(),
        subscribe: spy()
      };

      mm.client = client;

      localSender = mm.sender;

      stub(mm, 'on');
      mm.on.yields();

      stub(mm, '_subscribeItems');
      mm._subscribeItems.yields('/api/robots/rosie', mcp.robots.rosie);

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
        mcp.robots.rosie
      );
    });

    it('calls #client.subscribe with', function() {
      var topics = [
        '/api/robots/rosie',
        '/api/robots/rosie/devices'
      ];
      expect(mm.client.subscribe).to.be.calledWith(topics);
    });

    it('adds a new listener for robot and devices', function() {
      expect(mm.on).to.be.calledWith('/api/robots/rosie');
      expect(mm.on).to.be.calledWith('/api/robots/rosie/devices');
    });

    it('call @client#publish for robot and devices', function() {
      var topicPrefix = '/api/robots/rosie';

      var details = JSON.stringify({ devices: '1234', sender: localSender });

      var devices = {
        led: {
          commands: { },
          events: [ 'analogRead' ]
        },
        sender: localSender
      };


      devices = JSON.stringify(devices);

      expect(client.publish).to.be.calledWith(topicPrefix, details);
      expect(client.publish).to.be
        .calledWith(topicPrefix + '/devices', devices);
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
    var client, payload, rosie, topics, localSender;

    topics = [
      '/api/robots/rosie/loopback',
      '/api/robots/rosie/commands',
      '/api/robots/rosie/events',
      '/api/robots/rosie/command',
      '/api/robots/rosie/commands/turn_on'
    ];

    beforeEach(function() {
      rosie = mcp.robots.rosie;

      payload = {
        command: 'turn_on',
        args: ['param1', 'param2']
      };

      client = {
        subscribe: stub(),
        publish: stub()
      };

      localSender = mm.sender;

      mm.client = client;

      stub(mm, 'on');
      mm.on.yields(payload);

      stub(rosie, 'on');
      rosie.on.yields({ val: 'value1' });

      stub(rosie.commands, 'turn_on');
      rosie.commands.turn_on.returns(128);

      mm._addDefaultListeners('/api/robots/rosie', rosie);
    });

    afterEach(function() {
      mm.on.restore();
      rosie.on.restore();
    });

    it('adds a listener for /api/robots/rosie/loopback', function() {
      expect(mm.on).to.be.calledWith(
        '/api/robots/rosie/loopback'
      );
    });

    it('publishes to topic /api/robots/rosie/loopback', function() {
      var data = JSON.stringify({
        data: { command: 'turn_on', args: ['param1', 'param2'] },
        sender: localSender
      });

      expect(client.publish).to.be.calledWith(
        '/api/robots/rosie/loopback',
        data
      );
    });

    it('adds a listener for  /api/robots/rosie/commands', function() {
      expect(mm.on).to.be.calledWith('/api/robots/rosie/commands');
    });

    it('publishes to topic /api/robots/rosie/commands', function() {
      var data = JSON.stringify({
        commands: ['turn_on'],
        sender: localSender
      });

      expect(client.publish).to.be.calledWith(
        '/api/robots/rosie/commands',
        data
      );
    });

    it('adds a listener for /api/robots/rosie/events', function() {
      expect(mm.on).to.be.calledWith('/api/robots/rosie/events');
    });

    it('publishes to topic /api/robots/rosie/events', function() {
      var data = JSON.stringify({
        events: ['turned-on', 'turned-off'],
        sender: localSender
      });

      expect(client.publish).to.be.calledWith(
        '/api/robots/rosie/events',
        data
      );
    });

    it('adds a listener for /api/robots/rosie/command', function() {
      expect(mm.on).to.be.calledWith('/api/robots/rosie/command');
    });

    it('calls the robot command', function() {
      var params = payload;
      expect(rosie.commands.turn_on)
        .to.be.calledWith(params.args[0], params.args[1]);
    });

    it('publishes to topic /api/robots/rosie/command', function() {
      expect(client.publish).to.be.calledWith(
        '/api/robots/rosie/command',
        JSON.stringify({
          command: 'turn_on',
          data: 128,
          sender: localSender
        })
      );
    });

    it('adds a listener for /api/robots/rosie/commands/turn_on', function() {
      expect(mm.on).to.be.calledWith('/api/robots/rosie/commands/turn_on');
    });

    it('calls the turn_on command', function() {
      var params = payload;
      expect(rosie.commands.turn_on)
        .to.be.calledWith(params.args[0], params.args[1]);
    });

    it('publishes to topic /api/robots/rosie/commands/turn_on', function() {
      expect(client.publish).to.be.calledWith(
        '/api/robots/rosie/commands/turn_on',
        JSON.stringify(
          { data: 128, sender: localSender }
        )
      );
    });

    it('adds listeners to the robot for each event', function() {
      expect(rosie.on).to.be.calledWith('turned-on');
      expect(rosie.on).to.be.calledWith('turned-off');
    });

    it('publishes to topic /api/robots/rosie/turn-on', function() {
      expect(client.publish).to.be.calledWith(
        '/api/robots/rosie/events/turned-on',
        JSON.stringify({ data: { val: 'value1' }, sender: localSender })
      );
    });

    it('publishes to topic /api/robots/rosie/turn-off', function() {
      expect(client.publish).to.be.calledWith(
        '/api/robots/rosie/events/turned-off',
        JSON.stringify({ data: { val: 'value1' }, sender: localSender, })
      );
    });

    it('subscribes to all robots topics', function() {
      expect(client.subscribe).to.be.calledWith(topics);
    });
  });
});

'use strict';

var API = lib('api');

describe('MQTT API', function() {
  var api;

  beforeEach(function() {
    api = new API({ mcp: { attr1: 'mcp' } });
    stub(console, 'log');
  });

  afterEach(function() {
    console.log.restore();
  });

  describe('#constructor', function() {
    it('sets @name', function() {
      expect(api.name).to.be.eql('mqtt');
    });

    it('sets @host', function() {
      expect(api.host).to.be.eql('127.0.0.1');
    });

    it('sets @port', function() {
      expect(api.port).to.be.eql('3000');
    });

    it('sets @port', function() {
      expect(api.mcp).to.be.eql({ attr1: 'mcp' });
    });

    it('sets opts to an {} if null is passed', function() {
      var instance = new API();
      expect(instance.mcp).to.be.undefined();
    });
  });

  describe('#start', function() {
    beforeEach(function() {
      stub(api, 'createServer');

      api.start();
    });

    afterEach(function() {
      api.createServer.restore();
    });

    it('calls #createServer', function() {
      expect(api.createServer).to.be.calledOnce;
    });
  });

  describe('#createServer', function() {
    var res, next, ins;

    beforeEach(function() {
      ins = {
        set: stub(),
        get: stub(),
        use: stub()
      };

      stub(api, '_newMqtt').returns({
        start: spy(),
        io: {
          set: spy()
        }
      });

      res = {
        sendFile: spy(),
        status: spy(),
        json: spy(),
        header: spy()
      };

      next = spy();

      ins.get.yields(null, res);
      ins.use.yields({ err: 500 }, res, next);

      api.createServer();
    });

    afterEach(function() {
      api._newMqtt.restore();
    });

    it('calls #_newMqtt', function() {
      expect(api._newMqtt).to.be.calledOnce;
    });

    it('sets @mqtt', function() {
      expect(api.mqtt).to.not.be.undefined();
    });

    it('calls #sm#start', function() {
      expect(api.mqtt.start).to.be.calledOnce;
    });
  });
});

'use strict';

var expect = require('chai').expect
  , http = require('http')
  , https = require('https')
  , sinon = require('sinon')
  , eql = require('deep-eql')
  , testServer = require('./test-server/dummy-web-service')
  , proxyquire = require('proxyquire')
  , httpOverride = proxyquire('../lib/httpOverride', {
      'fh-instance-url': instanceUrlStub
    })
  , request = require('request');

// Need to accept the self signed cert being used
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// We'll attempt make requests to this host...
var HOST_TO_PROXY = 'http://super-fakedomain.com';

var proxyServerInstance = null;

var VALID_INSTANCE_CONFIG = {
  guid: '0ktwe5phpyrn55pmsgdszgof',
  domain: 'fakedomain.feedhenry.com',
  apiKey: 'fogzsdgsmp55nryphp5ewtk0fogzsdgsmp55nryphp5ewtk0',
  hosts: [HOST_TO_PROXY]
};

var INVALID_INSTANCE_CONFIG = {
  guid: '0ktwe5phpyrn55pmsgdszgof',
  domain: 'realfakedomain.feedhenry.com',
  apiKey: 'fogzsdgsmp55nryphp5ewtk0fogzsdgsmp55nryphp5ewtk0',
  hosts: [HOST_TO_PROXY]
};

function instanceUrlStub (opts, callback) {
  delete opts.forceProxy;

  if (eql(opts) === eql(VALID_INSTANCE_CONFIG)) {
    callback(null, 'http://127.0.0.1:3000');
  } else {
    callback(true, null);
  }
}


describe('HTTP Override', function () {
  this.timeout(40000);

  function getOverrideInit (opts, callback) {
    if (!callback) {
      callback = sinon.spy();
    }

    return function () {
      httpOverride.init(opts, callback);
    };
  }

  before(function (done) {
    testServer.stop();
    testServer.start(done, true);
  });

  describe('#init', function () {
    // Start clean each time
    beforeEach(httpOverride.reset);

    it('Should throw an error due to missing "apiKey"', function () {
      var fn = getOverrideInit({
        guid: '23456789jonibuvyct',
        domain: 'a.feedhenry.com',
        hosts: [HOST_TO_PROXY]
      });

      expect(fn).to.throw(Error);
    });

    it('Should throw an error due to missing "guid"', function () {
      var fn = getOverrideInit({
        apiKey: '23456789jonibuvyct',
        domain: 'a.feedhenry.com',
        hosts: [HOST_TO_PROXY]
      });

      expect(fn).to.throw(Error);
    });

    it('Should throw an error due to missing "domain"', function () {
      var fn = getOverrideInit({
        guid: '23456789jonibuvyct',
        apiKey: '23456789jonibuvyct',
        hosts: [HOST_TO_PROXY]
      });

      expect(fn).to.throw(Error);
    });

    it('Should throw an error due to invalid "hosts"', function () {
      var fn = getOverrideInit({
        guid: '23456789jonibuvyct',
        apiKey: '23456789jonibuvyct',
        domain: 'a.feedhenry.com',
        hosts: ''
      });

      expect(fn).to.throw(Error);
    });

    it('Should not throw an error as config is valid', function () {
      var fn = getOverrideInit({
        guid: '23456789jonibuvyct',
        apiKey: '23456789jonibuvyct',
        hosts: [HOST_TO_PROXY]
      });

      expect(fn).to.throw(Error);
    });

    it('Should return an error as the opts do not resolve', function () {
      var fn = getOverrideInit(INVALID_INSTANCE_CONFIG, function (err) {
        expect(err).to.equal(true);
      });
    });

    it('Should not throw an error as the opts do resolve', function () {
      var callback = sinon.spy()
      var fn = getOverrideInit(VALID_INSTANCE_CONFIG, callback);

      expect(fn).to.not.throw(Error);
      expect(callback.called).to.be.true;
    });

  });

  describe('Verify Override Intercepts Requests and Forwards to Correct ' +
    'Host', function () {

    // Start clean each time
    beforeEach(function (done) {
      httpOverride.reset();
      httpOverride.init(VALID_INSTANCE_CONFIG, done);
    });

    it('Should use the request module and return expected response from ' +
      HOST_TO_PROXY, function (done) {
      request({
        method: 'get',
        uri: HOST_TO_PROXY
      }, function (err, res, body) {
        expect(err).to.be.null;
        expect(res).to.be.an('object');
        expect(body.indexOf('ok')).not.to.equal(-1);
        done();
      });
    });

    it('Should use the http.get and return test content in place of ' +
      HOST_TO_PROXY, function (done) {

      var resData = '';

      var req = http.get({
        hostname: HOST_TO_PROXY
      }, function (res) {
        res.setEncoding('utf8');

        res.on('data', function (d) {
          resData += d;
        });

        res.on('end', function () {
          expect(resData.indexOf('ok')).not.to.equal(-1);
          done();
        });
      });

      req.on('error', done);
      req.end();
    });


    it('Should use the https.get and return proxy content in place of ' +
      HOST_TO_PROXY, function (done) {

      var resData = '';

      var req = https.get({
        hostname: HOST_TO_PROXY
      }, function (res) {
        res.setEncoding('utf8');

        res.on('data', function (d) {
          resData += d;
        });

        res.on('end', function () {
          expect(resData.indexOf('ok')).not.to.equal(-1);
          done();
        });
      });

      req.on('error', done);
      req.end();
    });



    it('Should use the http.get and return proxy "500" route in place of ' +
      HOST_TO_PROXY, function (done) {

      var resData = '';

      var req = http.get({
        hostname: HOST_TO_PROXY,
        path: '/500'
      }, function (res) {
        res.setEncoding('utf8');

        res.on('data', function (d) {
          resData += d;
        });

        res.on('end', function () {
          expect(resData.indexOf('500')).not.to.equal(-1);
          done();
        });
      });

      req.on('error', done);
      req.end();
    });

    it('Should use the request module and return "bad request" in place' +
      ' of ' + HOST_TO_PROXY, function (done) {
      request({
        uri: HOST_TO_PROXY.concat('/not-a-status-code')
      }, function (err, res, body) {
        expect(err).to.be.null;
        expect(res).to.be.an('object');
        expect(body.indexOf('Bad Request')).not.to.equal(-1);
        done();
      });
    });

  });

});

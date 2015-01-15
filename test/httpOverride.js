'use strict';

var expect = require('chai').expect
  , http = require('http')
  , https = require('https')
  , sinon = require('sinon')
  , request = require('request')
  , proxyquire = require('proxyquire')
  , httpOverride = proxyquire('../lib/httpOverride', {
    'fh-instance-url': instanceUrlStub
  });

var HOST_TO_PROXY = 'super-fakedomain.com';

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

  if (JSON.stringify(opts) === JSON.stringify(VALID_INSTANCE_CONFIG)) {
    callback(null, 'www.google.com');
  } else {
    // Just return google for testing purposes
    callback(true, null);
  }
}


describe('HTTP Override', function () {

  function getOverrideInit (opts, callback) {
    if (!callback) {
      callback = sinon.spy();
    }

    return function () {
      httpOverride.init(opts, callback);
    };
  }

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

    it('Should throw an error as the opts do not resolve', function () {
      var fn = getOverrideInit(INVALID_INSTANCE_CONFIG);

      expect(fn).to.throw(Error);
    });

    it('Should not throw an error as the opts do resolve', function () {
      var callback = sinon.spy()
      var fn = getOverrideInit(VALID_INSTANCE_CONFIG, callback);

      expect(fn).to.not.throw(Error);
      expect(callback.called).to.be.true;
    });

  });

  describe('Verify Override Intercepts Requests', function () {
    this.timeout(15000);

    // Start clean each time
    beforeEach(function (done) {
      httpOverride.reset();
      httpOverride.init(VALID_INSTANCE_CONFIG, done);
    });

    it('Should use the request module and return google.com in place of' +
      ' super-fakedomain.com', function (done) {
      request({
        uri: 'http://'.concat(HOST_TO_PROXY)
      }, function (err, res, body) {
        expect(err).to.be.null;
        expect(res).to.be.an('object');
        expect(body.indexOf('<title>Google</title>')).not.to.equal(-1);
        done();
      });
    });

    it('Should use the http.get and return google.com in place of' +
      ' super-fakedomain.com', function (done) {

      var resData = '';

      var req = http.get({
        hostname: HOST_TO_PROXY
      }, function (res) {
        res.setEncoding('utf8');

        res.on('data', function (d) {
          resData += d;
        });

        res.on('end', function () {
          expect(resData.indexOf('<title>Google</title>')).not.to.equal(-1);
          done();
        });
      });

      req.on('error', done);
      req.end();
    });


    it('Should use the https.get and return google.com in place of' +
      ' super-fakedomain.com', function (done) {

      var resData = '';

      var req = https.get({
        hostname: HOST_TO_PROXY
      }, function (res) {
        res.setEncoding('utf8');

        res.on('data', function (d) {
          resData += d;
        });

        res.on('end', function () {
          expect(resData.indexOf('<title>Google</title>')).not.to.equal(-1);
          done();
        });
      });

      req.on('error', done);
      req.end();
    });
  });

});

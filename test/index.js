'use strict';


var url = require('url')
  , assert = require('assert');

var SECURE_DOMAIN = 'fake-domain-name.com'
  , HTTP_SECURE_DOMAIN = url.format({
    protocol: 'http',
    host: SECURE_DOMAIN
  })
  , HTTPS_SECURE_DOMAIN = url.format({
    protocol: 'https',
    host: SECURE_DOMAIN
  })

// Setup the proxy env vars
process.env['PROXY_TARGET_FH'] = '127.0.0.1:9000';
process.env['PROXY_ADDRESSES_FH'] = '127.0.0.1';

var request = require('request');

// Setup the server that the proxy will target
require('./targetServer');
// Setup the proxy
require('../index.js');

describe('Proxy Server', function () {

  describe('Test using request module', function () {

    it('Should get an "ok" from SECURE_DOMAIN without proxy', function (done) {
      request({
        method: 'GET',
        url: 'http://' + process.env['PROXY_TARGET_FH'],
      }, function (err, res, body) {
        assert.equal(err, null);
        assert.equal(body, 'OK');
        done();
      });
    });

    it('Should get an "ok" from SECURE_DOMAIN via proxy', function (done) {
      request({
        method: 'GET',
        url: HTTP_SECURE_DOMAIN,
        proxy: 'http://127.0.0.1:8001'
      }, function (err, res, body) {
        assert.equal(err, null);
        assert.equal(body, 'OK');
        done();
      });
    });

  });

  describe('Verify IP Sec', function () {
    it('Should not forward request due to IP being invalid', function (done) {
      process.env['PROXY_ADDRESSES_FH'] = '';

      request({
        method: 'GET',
        url: HTTP_SECURE_DOMAIN,
        proxy: 'http://127.0.0.1:8001'
      }, function (err, res, body) {
        assert.equal(err, null);
        assert.equal(res.statusCode, 401);
        done();
      });
    });
  });

});

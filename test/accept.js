'use strict';

var proxyApp = require('./test-server/dummy-proxy.js')
  , proxyTarget = require('./test-server/dummy-web-service')
  , request = require('supertest')
  , app = null;

var VALID_OPTS = {
  fhInstance: 'abc',
  apiKey: '123',
  hosts: '127.0.0.1:3000'
};

describe('Acceptance Tests', function () {
  this.timeout(10000);


  beforeEach(function () {
    app = proxyApp.getApp(VALID_OPTS);
  });

  before(function (done) {
    proxyTarget.start(done);
  });


  describe('Security & Middelware', function () {
    it('Should return a 400 error due to missing api-key', function (done) {
      request(app)
        .get('/200')
        .expect(400)
        .expect('Header "x-fh-proxy-api-key" was missing from your request')
        .end(done);
    });

    it('Should return a 400 error due to missing guid', function (done) {
      request(app)
        .get('/200')
        .set({
          'x-fh-proxy-api-key': VALID_OPTS.apiKey
        })
        .expect(400)
        .expect('Header "x-fh-proxy-instance" was missing from your request')
        .end(done);
    });

    it('Should return a 400 error due to missing protocol', function (done) {
      request(app)
        .get('/200')
        .set({
          'x-fh-proxy-api-key': VALID_OPTS.apiKey,
          'x-fh-proxy-instance': VALID_OPTS.fhInstance,
          'x-fh-proxy-target': VALID_OPTS.hosts
        })
        .expect(400)
        .expect('Header "x-fh-proxy-protocol" was missing from your request')
        .end(done);
    });

    it('Should return a 400 error due to missing target', function (done) {
      request(app)
        .get('/200')
        .set({
          'x-fh-proxy-api-key': VALID_OPTS.apiKey,
          'x-fh-proxy-instance': VALID_OPTS.fhInstance,
          'x-fh-proxy-protocol': 'http:'
        })
        .expect(400)
        .expect('Header "x-fh-proxy-target" was missing from your request')
        .end(done);
    });

    it('Should return 403 due to an invalid target', function (done) {
      request(app)
        .get('/')
        .set({
          'x-fh-proxy-api-key': VALID_OPTS.apiKey,
          'x-fh-proxy-instance': VALID_OPTS.fhInstance,
          'x-fh-proxy-protocol': 'http:',
          'x-fh-proxy-target': 'stackoverflow.com'
        })
        .expect(403)
        .expect('Cannot proxy request to "stackoverflow.com". Host not whitelisted for proxy usage in PROXY_VALID_HOSTS')
        .end(done);
    });

    it('Should return 500 due to missing PROXY_VALID_HOSTS', function (done) {
      delete process.env.PROXY_VALID_HOSTS;

      request(app)
        .get('/')
        .set({
          'x-fh-proxy-api-key': VALID_OPTS.apiKey,
          'x-fh-proxy-instance': VALID_OPTS.fhInstance,
          'x-fh-proxy-protocol': 'http:',
          'x-fh-proxy-target': VALID_OPTS.hosts
        })
        .expect(500)
        .expect('No hosts have been configured. Please update PROXY_VALID_HOSTS and add any hosts you wish to proxy')
        .end(done);
    });
  });

  describe('Verify Request Proxying', function () {

    it('Should get a 200 OK from 127.0.0.1:3000/', function (done) {
      request(app)
        .get('/')
        .set({
          'x-fh-proxy-api-key': VALID_OPTS.apiKey,
          'x-fh-proxy-instance': VALID_OPTS.fhInstance,
          'x-fh-proxy-protocol': 'http:',
          'x-fh-proxy-target': VALID_OPTS.hosts
        })
        .expect(200)
        .expect('ok')
        .end(done);
    });

    it('Should get a 400 Bad Request from 127.0.0.1:3000/', function (done) {
      request(app)
        .get('/not-a-real-status-code')
        .set({
          'x-fh-proxy-api-key': VALID_OPTS.apiKey,
          'x-fh-proxy-instance': VALID_OPTS.fhInstance,
          'x-fh-proxy-protocol': 'http:',
          'x-fh-proxy-target': VALID_OPTS.hosts
        })
        .expect(400)
        .expect('Bad Request')
        .end(done);
    });

    it('Should get a 403 response from 127.0.0.1:3000/', function (done) {
      request(app)
        .get('/403')
        .set({
          'x-fh-proxy-api-key': VALID_OPTS.apiKey,
          'x-fh-proxy-instance': VALID_OPTS.fhInstance,
          'x-fh-proxy-protocol': 'http:',
          'x-fh-proxy-target': VALID_OPTS.hosts
        })
        .expect(403)
        .expect('403')
        .end(done);
    });

  });

});

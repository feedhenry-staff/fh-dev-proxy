'use strict';

var auth = require('../lib/auth')
  , sinon = require('sinon')
  , expect = require('chai').expect;

describe('Auth Middleware', function () {
  // Set some fake env vars for these tests
  var apiKey = process.env['FH_APP_API_KEY'] = 'abc123';
  var guid = process.env['FH_INSTANCE'] = '123cba';

  it('Should not call the "next" callback', function () {
    var next = sinon.spy()
      , response = sinon.spy();

    var res = {
      status: function () {
        return this;
      },
      end: response
    };

    var req = {
      headers: {}
    };

    // This is a synchrnonous call
    auth.middleware.verifyHeaders(req, res, next);

    expect(response.called).to.be.true;
    expect(next.called).to.be.false;
  });


  it('Should call the "next" callback', function () {
    var next = sinon.spy()
      , response = sinon.spy();

    var res = {
      status: function () {
        return this;
      },
      end: response
    };

    var req = {
      headers: {
        'x-fh-proxy-api-key': apiKey,
        'x-fh-proxy-instance': guid
      }
    };

    // This is a synchrnonous call
    auth.middleware.verifyHeaders(req, res, next);

    expect(response.called).to.be.false;
    expect(next.called).to.be.true;
  });

});

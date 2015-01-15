'use strict';

var expect = require('chai').expect
  , sinon = require('sinon')
  , xtend = require('xtend')
  , proxyquire = require('proxyquire')
  , proxy = proxyquire('../lib/routes/proxy', {
    '../proxy': proxyStub()
  }).exports.proxyRequest;

function genRes (status, end) {
  return {
    // Mimic normal express res behaviour but still call provided callback
    status: function () {
      status.apply(status, Array.prototype.slice.call(arguments));
      return this;
    },
    end: end
  }
}

function genReq (opts) {
  return xtend(opts, {
    connection: {
      remoteAddress: '127.0.0.1'
    }
  });
}

function proxyStub() {
  return {
    web: function (req, res) {
      if (req.headers == VALID_HEADERS) {
        res.status(200).end('ok');
      } else {
        res.status(404).end('not found');
      }
    }
  };
};

var FAKE_GUID = 'FAKE_GUID'
  , FAKE_API_KEY = 'FAKE_API_KEY'
  , FAKE_TARGET = 'FAKE_TARGET';

var VALID_HEADERS = {
  'x-fh-proxy-api-key': FAKE_API_KEY,
  'x-fh-proxy-instance': FAKE_GUID,
  'x-fh-proxy-target': FAKE_TARGET,
  'x-fh-proxy-protocol': 'http:'
};

describe('Proxy Route', function () {

  it ('Should return a 400 error due to missing headers', function () {
    var end = sinon.spy()
      , status = sinon.spy();

    proxy(genReq({
      headers: {
        'X-FH-Fake-Header': 'null'
      }
    }), genRes(status, end));

    expect(end.called).to.be.true;
    expect(status.called).to.be.true;

    expect(status.calledWith(400)).to.be.true;
  });

  it ('Should return a 200 OK', function () {
    var end = sinon.spy()
      , status = sinon.spy();

    proxy(genReq({
      headers: VALID_HEADERS
    }), genRes(status, end));

    expect(end.called).to.be.true;
    expect(status.called).to.be.true;
    console.log('ok')

    expect(status.calledWith(200)).to.be.true;
    expect(
      end.calledWith('ok')
      ).to.be.true;
  });

});

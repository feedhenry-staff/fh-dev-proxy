'use strict';

var httpProxy = require('http-proxy')
  , log = require('fhlog').getLogger('Proxy');

// We'll be using this to proxy all requests
var proxy = httpProxy.createProxyServer();

proxy.on('error', function (err, req, res) {
  log.error('A request encountered an error %j', err);
  res.end('Proxying request to remote host failed - ' + err.code);
});

proxy.on('proxyRes', function (/*proxyRes, req, res*/) {
  log.debug('Received a response from target host.');
});

module.exports = proxy;

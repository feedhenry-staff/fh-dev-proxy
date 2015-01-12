'use strict';

var httpProxy = require('http-proxy')
  , express = require('express')
  , auth = require('./auth')
  , log = require('fhlog').getLogger('Proxy');

// We'll be using this to proxy all requests
var proxy = httpProxy.createProxyServer();

proxy.on('error', function (err) {
  log.error('A request encountered an error %j', err);
});

proxy.on('proxyRes', function (/* proxyRes, req, res */) {
  log.debug('Received a response from target host.');
});

// Setup this router
var route = module.exports = new express.Router();
route.use(auth.validateIpAddress);
route.all('*', proxyRequest);

/**
 * Proxy an incoming request to the specified target.
 * @param  {Object}   req   Incoming request stream
 * @param  {Object}   res   Outgoing response stream
 * @param  {Function} next  Express stack callback
 */
function proxyRequest (req, res) {
  var ip = req.connection._peername.address;
  var proto = req.connection.encrypted ? 'https://' : 'http://';
  var target = proto.concat(process.env['PROXY_TARGET_FH']);

  log.info('Proxying request from %s to target %s.',
    ip,
    target);

  proxy.web(req, res, {
    target: target
  });
}

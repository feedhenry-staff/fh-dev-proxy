'use strict';

var httpProxy = require('http-proxy')
  , express = require('express')
  , auth = require('./auth')
  , url = require('url')
  , log = require('fhlog').getLogger('Proxy');

// We'll be using this to proxy all requests
var proxy = httpProxy.createProxyServer();

proxy.on('error', function (err, req, res) {
  log.error('A request encountered an error %j', err);
  res.end('Proxying request to remote host failed - ' + err.code);
});

proxy.on('proxyRes', function (/* proxyRes, req, res */) {
  log.debug('Received a response from target host.');
});

// Setup this router
var route = module.exports = new express.Router();
route.all('*', proxyRequest);

/**
 * Proxy an incoming request to the specified target.
 * @param  {Object}   req   Incoming request stream
 * @param  {Object}   res   Outgoing response stream
 * @param  {Function} next  Express stack callback
 */
function proxyRequest (req, res, next) {
  var ip = req.connection.remoteAddress || req.socket.remoteAddress;
  var proto = req.connection.encrypted ? 'https://' : 'http://';
  var parsedUrl = url.parse(req.originalUrl);
  var target = proto
    .concat(process.env['PROXY_TARGET_FH']);

  // Need to do this as the parsed url is usually
  // malformed if using request's proxy option...weird
  req._parsedUrl = parsedUrl;
  req.url = parsedUrl.path;


  log.info('Proxying request from %s to target %s.',
    ip,
    target);

  proxy.web(req, res, {
    target: target
  });
}

'use strict';

var proxy = require('../proxy')
  , express = require('express')
  , auth = require('../auth')
  , log = require('fhlog').getLogger('Proxy');

// Setup this router
var route = module.exports = new express.Router();
route.exports = {};
route.exports.proxyRequest = proxyRequest; // Lazy hack for testing

// Lowercase the headers
route.use(lowerCaseHeaders);
// Perform validation on requests
route.use(auth.middleware.verifyHeaders);
// Proxy any request type that passes validation
route.all('*', proxyRequest);

/**
 * Convert all headers in the headers object to lowercase.
 * Retain the original casing too.
 * @param  {Object}   req   Incoming request stream
 * @param  {Object}   res   Outgoing response stream
 * @param  {Function} next
 */
function lowerCaseHeaders (req, res, next) {
  var headers = req.headers;

  for (var h in headers) {
    headers[h.toLowerCase()] = headers[h];
  }

  next();
}

/**
 * Proxy an incoming request to the specified target.
 * @param  {Object}   req   Incoming request stream
 * @param  {Object}   res   Outgoing response stream
 */
function proxyRequest (req, res) {
  var ip = req.connection.remoteAddress || req.socket.remoteAddress;

  try {
    if (!req.headers['x-fh-proxy-protocol']) {
      return res.status(400).end('Bad Request. "x-fh-proxy-protocol" must be ' +
        'set to either "http:" or "https:"');
    }

    if (!req.headers['x-fh-proxy-target']) {
      return res.status(400).end('Bad Request. "x-fh-proxy-target" header ' +
        'must be set for all incoming proxy requests.');
    }

    var target = req.headers['x-fh-proxy-protocol']
      .concat('//')
      .concat(req.headers['x-fh-proxy-target']);

    // Update host portion of header
    req.headers['host'] = req.headers['x-fh-proxy-target'];

    log.info('Proxying request from %s to target %s.',
      ip,
      target);

    proxy.web(req, res, {
      target: target
    });
  } catch (e) {
    log.error('Unable to proxy request from %s with the following headers %j',
      ip,
      req.headers);
    log.error(e);

    res.status(500).end('Internal server error. Unable to proxy your request.');
  }
}

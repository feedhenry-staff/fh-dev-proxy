'use strict';

var proxy = require('../proxy')
  , express = require('express')
  , auth = require('../auth')
  , log = require('fhlog').getLogger('Proxy');

// Setup this router
var route = module.exports = new express.Router();
route.exports = {};
route.exports.proxyRequest = proxyRequest; // Lazy hack for testing
// Perform validation on requests
route.use(auth.middleware.verifyHeaders);
// Proxy any request type that passes validation
route.all('*', proxyRequest);

/**
 * Proxy an incoming request to the specified target.
 * @param  {Object}   req   Incoming request stream
 * @param  {Object}   res   Outgoing response stream
 */
function proxyRequest (req, res) {
  var ip = req.connection.remoteAddress || req.socket.remoteAddress;

  try {
    var proto = req.headers['X-FH-Proxy-Protocol'];

    if (!req.headers['X-FH-Proxy-Target']) {
      return res.status(400).end('Bad Request. "X-FH-Proxy-Target" header ' +
        'must be set for all incoming proxy requests.');
    }

    var target = proto
      .concat('//')
      .concat(req.headers['X-FH-Proxy-Target']);

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

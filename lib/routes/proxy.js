'use strict';

var proxy = require('../proxy')
  , express = require('express')
  , middleware = require('../middleware')
  , log = require('fhlog').getLogger('Proxy');

// Setup this router
var route = module.exports = new express.Router();
route.exports = {};
route.exports.proxyRequest = proxyRequest; // Lazy hack for testing

// Lowercase the headers just in case...
route.use(lowerCaseHeaders);
// Perform validation on requests
route.use(middleware.verifyHeaders);
// Verify the host is supported
route.use(middleware.validateHost);
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
    var target = req.headers['x-fh-proxy-protocol']
      .concat('//')
      .concat(req.headers['x-fh-proxy-target']);

    // Set host (nodejitsu proxy does this anyway I think)
    req.headers['host'] = req.headers['x-fh-proxy-target'];
    // Set the correct URL, it gets messed up sometimes
    req.url = req.originalUrl;

    // Delete fh headers
    delete req.headers['x-fh-req-id'];
    delete req.headers['x-fh-proxy-api-key'];
    delete req.headers['x-fh-proxy-instance'];
    delete req.headers['x-fh-proxy-target'];
    delete req.headers['x-fh-proxy-protocol'];

    log.info(
      'Proxying request from %s to target %s',
      ip,
      target
    );

    // Tag the start time of the request so we can track how long it takes
    // to get a response from the target server
    res.reqStartTime = Date.now();

    proxy.web(req, res, {
      target: target,
      secure: false // Should probably support passing this as a parameter
    });
  } catch (e) {
    log.error('Unable to proxy request from %s with the following headers %j',
      ip,
      req.headers);
    log.error(e);

    res.status(500).end('Internal server error. Unable to proxy your request.');
  }
}

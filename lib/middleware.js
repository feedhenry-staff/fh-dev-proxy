'use strict';

var format = require('util').format
  , async = require('async');

var requiredHeaders = [
  'x-fh-proxy-api-key',
  'x-fh-proxy-instance',
  'x-fh-proxy-target',
  'x-fh-proxy-protocol'
];

/**
 * Verifies that the header security requirements have been met by the proxy.
 * @param  {Object}   req
 * @param  {Object}   res
 * @param  {Function} next
 */
function verifyHeaders (req, res, next) {

  function onHeaderCheckComplete(err) {
    if (err) {
      log.w(
        'Request from %s failed header verification.',
        req.headers['x-forwarded-for']
      );
      res.status(400).end(err);
    } else {
      verifyAuth();
    }
  }

  function headerExists (header, cb) {
    if (req.headers[header] && typeof req.headers[header] === 'string') {
      cb(null, null);
    } else {
      cb(format('Header "%s" was missing from your request', header), null);
    }
  }

  function verifyAuth () {
    if (req.headers['x-fh-proxy-api-key'] === process.env['FH_APP_API_KEY'] &&
        req.headers['x-fh-proxy-instance'] === process.env['FH_INSTANCE']) {
      next();
    } else {
      res.status(401).end('API Key and/or GUID supplied was invalid.');
    }
  }

  async.eachSeries(requiredHeaders, headerExists, onHeaderCheckComplete);
}


/**
 * Validates that the provided host in the request can be proxied.
 *
 * This is important as it stops abuse of the proxy to access live hosts etc.
 *
 * @param  {Object}   req
 * @param  {Object}   res
 * @param  {Function} next
 */
function validateHost (req, res, next) {
  var hosts = process.env['PROXY_VALID_HOSTS']
    , target = req.headers['x-fh-proxy-target'];


  if (!hosts || hosts === '') {
    // No hosts configured, return a useful message stating this
    res.status(500).end('No hosts have been configured. Please update' +
      ' PROXY_VALID_HOSTS and add any hosts you wish to proxy');
  } else {
    // Get hosts as an array
    hosts = hosts.split(',').map(function (h) {
      return h.trim();
    });

    if (hosts.indexOf(target) !== -1) {
      next();
    } else {
      var msg = format('Cannot proxy request to "%s". Host not whitelisted ' +
        'for proxy usage in PROXY_VALID_HOSTS', target);

      log.w(
        'Request from %s attempted to send request to %s, but ' +
          'was blocked due to it not being present in PROXY_VALID_HOSTS',
        req.headers['x-forwarded-for'],
        target
      );

      res.status(403).end(msg);
    }
  }
}

module.exports = {
  verifyHeaders: verifyHeaders,
  validateHost: validateHost
};

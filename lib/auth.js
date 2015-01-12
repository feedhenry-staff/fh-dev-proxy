'use strict';

var request = require('request')
  , cache = require('memory-cache')
  , url = require('url')
  , log = require('fhlog').getLogger('Auth');

var DOMAIN_URL = process.env['FH_MILLICORE']
  , PROXY_POLICY = 'FH-DevProxy'
  , AUTH_PATH = 'box/srv/1.1/admin/authpolicy/auth'
  , AUTH_TIMEOUT = process.env['PROXY_AUTH_TIMEOUT_FH'] || (10 * 60 * 1000);


/**
 * Split a comma separated list of IP addresses into an array.
 * @return {Array}
 */
function permittedAddresses () {
  var addresses = process.env['PROXY_ADDRESSES_FH'];

  if (typeof addresses === 'string') {
    // Remove whitespace and split into an array
    return addresses.replace(/ /g, '').split(',');
  } else {
    return [];
  }
}


/**
 * Create the JSON body for an authentication request.
 * @param  {Object} params Request body from the client
 * @return {Object}
 */
function createRequestBody (params, callback) {
  try {
    callback(null, {
      'policyId': PROXY_POLICY,
      'params': {
        'userId': params.username,
        'password': params.password
      },
      // 'device': '0EADEDEF94AF41098C16F10B891C6F34',
      '__fh': {
        'cuid': params.__fh.cuid,
        'appid': params.__fh.appid,
        'appkey': params.__fh.appkey,
        'destination': params.__fh.destination,
        'app_version': '764', // TODO: not sure if this is required
        'sdk_version': params.__fh.sdk_version
      }
    });
  } catch (e) {
    callback(new Error('Unable to create req body for FeedHenry Auth'), null);
  }
}


/**
 * Perform a login request and return the response stream
 * @param  {Object} params
 * @return {Stream}
 */
function validateLogin (params, callback) {
  createRequestBody(params, function (err, body) {
    if (err) {
      return callback(err, null);
    }

    log.debug('Performing proxy login for user %s', params.username);

    request.post({
      url: 'https://'.concat(url.resolve(DOMAIN_URL, AUTH_PATH)),
      json: body
    }, function (err, res, body) {
      if (err) {
        log.error('Auth failed for user %s due to %j', params.username, err);
        callback(err, null);
      } else if (res && res.statusCode === 200) {
        // TODO: Verify login failure vs success
        console.log('Received 200 response from FeedHenry Auth request');
        console.log(body);
      } else {
        log.error('Received non 200 response for user %s', params.username);
        var e = new Error('FeedHenry authentication returned non 200 status');
        callback(e, null);
      }
    });

  });
}


/**
 * Reset the auth timeout for the given IP address.
 * @param {String} ipAddress
 * @param  {Function} callback
 */
function updateIpAuthTimeout (ip, callback) {
  log.info('Updating auth timeout to %dms for IP %s', AUTH_TIMEOUT, ip);

  cache.put(ip, true, AUTH_TIMEOUT);
  callback(null, true);
}


/**
 * Validate whether an IP address has access to this proxy.
 * This does not perform async operations but could in the future.
 * @param  {String}   ip
 * @param  {Function} callback
 */
function validateIpAddress(ip, callback) {
  log.info('Validating IP %s for a request', ip);

  if (permittedAddresses().indexOf(ip) !== -1) {
    log.info('IP %s is configured as valid.', ip);
    callback(null, true);
  } else if (cache.get(ip)) {
    log.info('IP %s is valid via prior user authentication.', ip);
    updateIpAuthTimeout(ip, callback);
  } else {
    log.warn('IP %s is not valid for proxying.', ip);
    callback(null, false);
  }
}

module.exports = {
  validateLogin: validateLogin,
  validateIpAddress: validateIpAddress
};

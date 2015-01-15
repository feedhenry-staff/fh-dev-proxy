'use strict';

/**
 * This file is responsible for remapping user configured hosts to applicable
 * proxy instances running in the FeedHenry cloud prior to performing HTTP(S)
 * requests. The primary reason for this would be to access a secure backend
 * during local development.
 *
 * This works by intercepting the HTTP module request method before it's called
 * and modifying the provided host if required. This will work even if the user
 * is using the request module as it intercepts the core module call.
 *
 * The override is only applied if a host has been remapped.
 */

var http = require('http')
  , https = require('https')
  , util = require('util')
  , xtend = require('xtend')
  , fhInstanceUrl = require('fh-instance-url')
  , originalHttpReq = http.request
  , originalHttpsReq = https.request
  , proxyConfig = null;


/**
 * A function that intercepts calls to http.request, http.get, request etc.
 * @return {http.ClientRequest} A Node.js http.ClientRequest instance
 */
function getOverride (originalProtocol) {
  return function override (/* opts[, callback] */) {
    var args = Array.prototype.slice.call(arguments)
      , opts = args[0]
      , originalHost = opts.hostname || opts.host;

    if (proxyConfig.hosts.indexOf(originalHost) !== -1) {
      // Use the configured proxy for this host
      opts.hostname = opts.host = proxyConfig.proxyUrl;

      // Add in FeedHenry headers for security purposes
      opts.headers = opts.headers || {};
      opts.headers = xtend(opts.headers, {
        'X-FH-Proxy-Api-Key': proxyConfig.apiKey,
        'X-FH-Proxy-Instance': proxyConfig.guid,
        'X-FH-Proxy-Target': originalHost,
        // The cloud proxy will use this to use the desired protocol
        'X-FH-Proxy-Protocol': originalProtocol
      });
    }

    // All requests going to the proxy MUST be over HTTPS for security reasons
    return originalHttpsReq.apply(https, args);
  };
}


/**
 * Resolves a mapping GUID and domain to a cloud app dev url
 * The resolved URL is stored for later usage.
 * @param  {String}   host     The host (key) from remappedHosts to resolve
 * @param  {Function} callback
 */
function verifyProxy (callback) {
  fhInstanceUrl(proxyConfig, function (err, resolvedUrl) {
    if (err) {
      var e = util.format('You provided a proxy config that does not map to ' +
        'a valid FeedHenry cloud/proxy instance');

      throw new Error(e);
    } else {
      callback(null, resolvedUrl);
    }
  });
}


/**
 * Instruct this module to assign a mapping that will cause any HTTP requests
 * to the hosts in the object provided to be mapped to the proxy running on the
 * provided cloud app GUIDs
 * @param  {Object}   hostMap
 * @param  {Function} callback
 */
function init (config, callback) {
  if (process.env['FH_PORT']) {
    // We're running in the cloud, don't perform host remapping
    return callback(null, null);
  }

  // Apply the http(s) overrides
  http.request = getOverride('http:');
  https.request = getOverride('https:');

  if (!config.apiKey ||
      typeof config.apiKey !== 'string' ||
      !config.guid ||
      typeof config.guid !== 'string' ||
      !config.domain ||
      typeof config.domain !== 'string' ||
      !config.hosts ||
      !Array.isArray(config.hosts)) {

    throw new Error('Please provide valid "apiKey", "guid", "hosts", and ' +
      '"domain" options for the proxy you are configuring.');
  }

  // Store the config
  proxyConfig = config;

  // Verify that each guid resolves to a real
  // cloud app url and has required configs
  verifyProxy(function (err, resolvedUrl) {
    // Store the resolved url
    proxyConfig.proxyUrl = resolvedUrl;

    callback(null, null);
  });
}


/**
 * Reset this component; turns off proxying of requests.
 */
function reset () {
  proxyConfig = null;
  http.request = originalHttpReq;
  https.request = originalHttpsReq;
}

module.exports = {
  init: init,
  reset: reset
};

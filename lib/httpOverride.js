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
  , url = require('url')
  , util = require('util')
  , xtend = require('xtend')
  , fhInstanceUrl = require('fh-instance-url')
  , originalHttpReq = http.request
  , originalHttpsReq = https.request
  , proxyConfig = null;


/**
 * Forced proxy requires us to modify the request options object.
 * We may also need to override the protocol used (HTTP/HTTPS).
 * @param  {[type]} opts [description]
 * @return {[type]}      [description]
 */
function forcedProxy(opts, args) {
  // User has forced a proxy url, we must obey their http/https preference
  var parsedUrl = url.parse(proxyConfig.proxyUrl);

  opts.protocol = parsedUrl.protocol;
  opts.host = opts.hostname = parsedUrl.hostname;
  opts.port = parsedUrl.port;

  if (opts.protocol.indexOf('https') !== -1) {
    return originalHttpsReq.apply(https, args);
  } else {
    return originalHttpReq.apply(http, args);
  }
}

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
      // Use the FeedHenry proxy instance as a host
      opts.hostname = opts.host = url.parse(proxyConfig.proxyUrl).hostname;

      // Add in FeedHenry headers for security purposes
      opts.headers = opts.headers || {};
      opts.headers = xtend(opts.headers, {
        'host': opts.hostname, // Needs to be overwritten as per HTTP/1.1 spec
        'x-fh-proxy-api-key': proxyConfig.apiKey,
        'x-fh-proxy-instance': proxyConfig.guid,
        'x-fh-proxy-target': originalHost,
        // The cloud proxy will use this to detemine desired outbound protocol
        'x-fh-proxy-protocol': originalProtocol
      });


      if (proxyConfig.forceProxy) {
        return forcedProxy(opts, args);
      } else {
        // All requests going to a FH proxy MUST be over HTTPS
        return originalHttpsReq.apply(https, args);
      }
    }

    return originalHttpReq.apply(http, args);
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
 * Checks if the configuration provided is ok
 * @param  {Object} config0
 */
function verifyConfig (config) {
  if (!config.proxyUrl) {
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
  }
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
    // as it's unecessary
    return callback(null, null);
  }

  // Apply the http(s) overrides
  http.request = getOverride('http:');
  https.request = getOverride('https:');

  verifyConfig(config);

  // Store the config as a clone of the passed object
  proxyConfig = JSON.parse(JSON.stringify(config));

  if (proxyConfig.proxyUrl) {
    // Client has specified a url to use. We must use that
    proxyConfig.forceProxy = true;

    callback(null, null);
  } else {
    proxyConfig.forceProxy = false;

    // Verify that each guid resolves to a real
    // cloud app url and has required configs
    verifyProxy(function (err, resolvedUrl) {
      // Store the resolved url
      proxyConfig.proxyUrl = resolvedUrl;

      callback(null, null);
    });
  }
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

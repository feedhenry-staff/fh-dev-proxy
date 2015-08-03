'use strict';

// Always require fh-dev-proxy first
var proxy = require('../index.js');

proxy.httpOverride.init({
  // Special override to allow a URL be used in place of GUID & API Key
  proxyUrl: 'http://127.0.0.1:8001',
  guid: 'Test Instance Guid',
  apiKey: 'Test App Api Key',
  hosts: ['www.google.com']
}, function (err) {
  if (err) {
    throw err;
  }
  // Require all components inside this callback to ensure they
  // honor the proxy setup
  var request = require('request');

  request.get('http://www.google.com', function (err, res, body) {
    if (err) {
      console.error('Proxy failed to return google.com via HTTP');
      console.log(err);
    } else if (res && res.statusCode === 200) {
      console.log('Proxy successfully served the request');
    } else {
      console.log('Proxy returned unexpected status code: %s', res.statusCode);
      console.log(body);
    }
  });
});

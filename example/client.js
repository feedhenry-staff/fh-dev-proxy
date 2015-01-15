'use strict';

var proxy = require('../index.js')
  , request= require('request');

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

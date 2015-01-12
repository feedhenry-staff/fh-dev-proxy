'use strict';

// This represents a server that the proxy will send requests to

var server = require('http').createServer();

server.on('request', function (req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });

  res.end('OK');
});

server.listen(9000);

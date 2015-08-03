#!/usr/bin/env node

var program = require('commander')
  , log = require('fhlog').getLogger()
  , fhurl = require('fh-instance-url')
  , proxy = require('../lib/proxy')
  , xtend = require('xtend')
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , fs = require('fs');

var pkgDir = path.join(__dirname, '../package.json');

program
  .version(JSON.parse(fs.readFileSync(pkgDir, 'utf8')).version)
  .option('-i, --appid <s>', 'ID of the instance running the proxy.')
  .option('-k, --apikey <s>', 'Api Key for the instance running the proxy.')
  .option('-d, --fhdomain <s>', 'The domain the proxy is running on.')
  .option('-h, --host <s>', 'The private url you wish to proxy all requests ' +
    'to. You must include the http:// or https://')
  .option('-p, --port <n>', 'Port the local proxy will listen on. Default is 9000')
  .parse(process.argv);

log.info('Validating proxy configuration...');

// Ensure a port is configured
program.port = program.port || 9000;

function existsOrExit (param) {
  if (!program[param]) {
    log.err('%s is a required parameter.', param)
    log.err('Exiting due to invalid params');
    process.exit(1);
  }
}

['appid', 'host', 'fhdomain', 'apikey']
  .forEach(existsOrExit);

// Parse the remote host
program.host = url.parse(program.host);

if (program.host.hostname === null) {
  log.err('Please provide a valid host parameter e.g http://privatehost.com');
  process.exit(1);
}


fhurl({
  domain: program.fhdomain,
  guid: program.appid
}, function (err, targetUrl) {
  if (err) {
    return log.err('Failed to start local proxy. Options did not resolve to a valid ' +
      'cloud instance. Error: %j', err);
  }

  log.info('Proxy configuration is valid, starting server!');
  log.info('All requests to localhost:%s will be proxied to %s',
    program.port,
    targetUrl);

  http.createServer(function(req, res) {
    req.headers = xtend(req.headers, {
      // Needs to be overwritten as per HTTP/1.1 spec
      'host': url.parse(targetUrl).hostname,
      'x-fh-proxy-api-key': program.apikey,
      'x-fh-proxy-instance': program.appid,
      'x-fh-proxy-target': program.host.hostname,
      // The cloud proxy will use this to detemine desired outbound protocol
      'x-fh-proxy-protocol': program.host.protocol
    });

    // console.log(req);
    log.d('Proxying request for path %s to %s via %s',
      req.url,
      url.resolve(program.host.href, req.url),
      targetUrl);

    proxy.web(req, res, {
      target: targetUrl
    });
  }).listen(program.port);
});

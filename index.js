'use strict';

if (typeof process.env['PROXY_TARGET_FH'] !== 'string') {
  throw new Error('PROXY_TARGET_FH env var has not been set, startup aborted.');
}

var mbaasApi = require('fh-mbaas-api');
var express = require('express');
var mbaasExpress = mbaasApi.mbaasExpress();

// Proxy related libs/code
var auth = require('./lib/routes/auth');
var proxy = require('./lib/routes/proxy');

// list the endpoints which you want to make securable here
var securableEndpoints;
// fhlint-begin: securable-endpoints
securableEndpoints = ['auth'];
// fhlint-end

var app = express();

// Note: the order which we add middleware to Express here is important!
app.use('/sys', mbaasExpress.sys(securableEndpoints));
app.use('/mbaas', mbaasExpress.mbaas);

// Note: important that this is added just before your own Routes
app.use(mbaasExpress.fhmiddleware());

// fhlint-begin: custom-routes
app.use('/proxy-auth', auth);
// fhlint-end
app.use(auth.validateIpAddress);
app.use('/*', proxy);

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
var server = app.listen(port, function() {
  console.log("App started at: " + new Date() + " on port: " + port);
});

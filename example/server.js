'use strict';

var mbaasApi = require('fh-mbaas-api');
var express = require('express');
var mbaasExpress = mbaasApi.mbaasExpress();

// list the endpoints which you want to make securable here
var securableEndpoints;
// fhlint-begin: securable-endpoints
securableEndpoints = [];
// fhlint-end

var app = express();

// Note: the order which we add middleware to Express here is important!
app.use('/sys', mbaasExpress.sys(securableEndpoints));
app.use('/mbaas', mbaasExpress.mbaas);

// Note: important that this is added just before your own Routes
app.use(mbaasExpress.fhmiddleware());

// fhlint-begin: custom-routes

/**
 * This is where our proxy magic happens!
 * Need to set the env vars for this test; client env vars must match.
 */
process.env['FH_INSTANCE'] = 'Test Instance Guid';
process.env['FH_APP_API_KEY'] = 'Test App Api Key';
process.env['PROXY_VALID_HOSTS'] = 'www.google.com';
app.use('*', require('../index.js').proxy);

// fhlint-end

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
var server = app.listen(port, function() {
  console.log("App started at: " + new Date() + " on port: " + port);
});

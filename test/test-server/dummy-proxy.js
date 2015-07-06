'use strict';

var server = null;

exports.getHttpServer = function (app) {
  var path = require('path')
    , fs = require('fs')
    , https = require('https')
    , pk = fs.readFileSync(path.join(__dirname, 'server.key'), 'utf8')
    , cert = fs.readFileSync(path.join(__dirname, 'server.crt'), 'utf8');

  return https.createServer({
    key: pk,
    cert: cert
  }, app);
};

var getApp = exports.getApp = function (opts) {
  process.env.PROXY_VALID_HOSTS = opts.hosts;
  process.env.FH_APP_API_KEY = opts.apiKey;
  process.env.FH_INSTANCE = opts.fhInstance;

  var mbaasApi = require('fh-mbaas-api')
    , express = require('express')
    , proxy = require('../../index.js')
    , mbaasExpress = mbaasApi.mbaasExpress()


  // Need to ensure proxy accepts connections from local development machines
  process.env['FH_SERVICE_APP_PUBLIC'] = true;

  // Export the app instance for testing
  var app = express();

  // Note: the order which we add middleware to Express here is important!
  app.use('/sys', mbaasExpress.sys([]));
  app.use('/mbaas', mbaasExpress.mbaas);

  // Note: important that this is added just before your own Routes
  app.use(mbaasExpress.fhmiddleware());

  // fhlint-begin: custom-routes
  app.use('/*', proxy.proxy);
  // fhlint-end

  // Important that this is last!
  app.use(mbaasExpress.errorHandler());

  return app;
};

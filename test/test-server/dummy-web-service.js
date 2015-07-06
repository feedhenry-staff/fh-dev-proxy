'use strict';

var app = require('express')()
  , server = null;

app.get('/', function (req, res) {
  res.send('ok');
})

app.get('/:statusCode', function (req, res) {
  var c = parseInt(req.params.statusCode);
  if (isNaN(c)) {
    res.status(400).send('Bad Request');
  } else {
    res.status(c).send(req.params.statusCode);
  }
});

exports.start = function (callback, secure) {
  exports.stop();

   var path = require('path')
    , fs = require('fs')
    , https = require('https')
    , pk = fs.readFileSync(path.join(__dirname, 'server.key'), 'utf8')
    , cert = fs.readFileSync(path.join(__dirname, 'server.crt'), 'utf8');

  if (secure) {
    server = https.createServer({
      key: pk,
      cert: cert
    }, app);

    server.listen(3000, callback);
  } else {
    server = app.listen(3000, function (err) {
      callback(err);
    });
  }
};

exports.stop = function () {
  if (server) {
    server.close();
    server = null;
  }
};

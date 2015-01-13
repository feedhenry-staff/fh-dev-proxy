'use strict';

var express = require('express')
  , bodyParser = require('body-parser')
  , auth = require('../auth');

var route = module.exports = new express.Router();

route.use(bodyParser.json());
route.post('/', validateLogin);
route.get('/', verifyValidated);

// Append this for use as middleware external to this module
route.validateIpAddress = validateIpAddress;

/**
 * Validate a user login against FeedHenry Auth
 * @param  {Object} req
 * @param  {Object} res
 */
function validateLogin (req, res) {
  auth.validateLogin(req.body, function (err, valid) {
    if (err) {
      res.status(500).end('Internal server erorr.');
    } else {
      res.status(200).json({
        status: (valid === true) ? 'ok' : 'not ok'
      });
    }
  });
}

function verifyValidated (req, res) {
  var ip = req.connection.remoteAddress || req.socket.remoteAddress;

  auth.validateIpAddress(ip, function (err, valid) {
    if (err) {
      res.status(500).end('Internal server erorr.');
    } else if (!valid) {
      res.status(401).end('You\'re IP is currently not validated. You can\'t ' +
        'use this proxy');
    } else {
      res.status(200).end('Your IP has permission to use this proxy.');
    }
  });
}

/**
 * Used to determine if an IP address is validated to use this service.
 * @param  {Object}   req
 * @param  {Object}   res
 * @param  {Function} next
 */
function validateIpAddress (req, res, next) {
  var ip = req.connection.remoteAddress || req.socket.remoteAddress;

  auth.validateIpAddress(ip, function (err, valid) {
    if (err) {
      res.status(500).end('Internal server erorr.');
    } else if (!valid) {
      res.status(401).end('You don\'t have permission to make this request');
    } else {
      next();
    }
  });
}

'use strict';

/**
 * Verifies that the header security requirements have been met by the proxy.
 * @param  {Object} req The incoming request
 * @return {Boolean}
 */
function verifyHeaders (req, res, next) {
  if (req.headers['x-fh-proxy-api-key'] === process.env['FH_APP_API_KEY'] &&
      req.headers['x-fh-proxy-instance'] === process.env['FH_INSTANCE']) {
    next();
  } else {
    res.status(401).end('Please provide valid proxy authorisation headers.');
  }
}

module.exports = {
  middleware: {
    verifyHeaders: verifyHeaders
  }
};

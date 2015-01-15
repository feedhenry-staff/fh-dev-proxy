'use strict';

/**
 * Verifies that the header security requirements have been met by the proxy.
 * @param  {Object} req The incoming request
 * @return {Boolean}
 */
function verifyHeaders (req, res, next) {
  if (req.headers['X-FH-Proxy-Api-Key'] === process.env['FH_APP_API_KEY'] &&
      req.headers['X-FH-Proxy-Instance'] === process.env['FH_INSTANCE']) {
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

FH Dev Proxy
============

A simple to deploy proxy that can be used to enable local development requests 
to reach a private web service via the whitelisted FeedHenry cloud. 


## Security & Authentication
Naturally exposing a direct proxy without some form of security isn't 
wise as it could potentially be abused by would be attackers. Preventing 
unauthorised access to the proxy can be accomplished via two methods. It can be 
configured to allow a number of whitelisted IP addresses to have access without 
the need to have a login performed first, your office IP for example, or users 
can authenticate via a web portal. 

NOTE: _The web portal is not implemented yet, so you'll need to 
use IP whitelisting as mentioned above for now._

The web portal will allow users to authenticate their current IP address for 
use of the proxy by using their FeedHenry login credentials for the domain upon 
which this component is running. Users will need to be part of an _FH-DevProxy_ 
authentication policy to use this method. A session created in this manner will 
expire after 10 minutes of inactivity.

## Setup
Simply create a blank cloud application of the FeedHenry platform and place the 
following in the _application.js_. Naturally you will need to have the
_fh-dev-proxy_ dependency in your _package.json_.

```
require('fh-dev-proxy');
```

There should be no other code in _application.js_. All you need to do now is 
set your target address to proxy the requests to by setting the PROXY_TARGET_FH 
environment variable. When setting the PROXY_TARGET_FH leave out the protocol 
prefix and just provide the hostname e.g. _securehost.com_. The reason for 
this is due to the fact that the proxy will dynamically select the protocol 
based on the protocol you make the request using in your code.

## Reserved Routes
The usually FeedHenry routes are reserved as is _/proxy-auth_, this means that 
making a request to you proxy that has the path _/sys/info/ping_ will be routed 
to the FeedHenry handler for this. Realistically the potentially for this being 
an issue is _very_ slim.

## Usage
Below two options are described that will allow you to utilise your shiny new 
development proxy.

#### Option 1
Configure your hosts file to redirect all requests for the host in question to 
your proxy instance. Totally seemples!

#### Option 2
For most projects that use HTTP(S) requests you're probably using the fantastic 
_request_ module, and if that's the case then you're in luck! To make _request_ 
proxy requests to specific hosts for you, simply set a proxy option when making 
the request like so:

```javascript

var request = require('request');

request({
	url: 'http://somedomain.com/users',
	method: 'GET',
	// Request will actually be sent here and then to somedomain.com/users
	proxy: 'http://fh_cloudapp_url.com'
}, function (err, res, body) {
	
});

```

Naturally you only want to do this for requests to a certain host so wrap 
_request_ into modules such as _PrivateApiReq_ and have _PrivateApiReq_ have a 
_module.exports_ value equal to a _request.defaults_ instance with the correct 
settings based on environment e.g

```javascript
var request = require('request');

var proxyUrl = 'http://fh_cloudapp_url.com';

// An example of how we can determine if we should use the proxy or not
var proxy = process.env['FH_USE_LOCAL_DB'] ? proxyUrl : null;

module.exports = request.defaults({
	proxy: proxy
	timeout: 20000
});

```

If you aren't using _request_ you probably have your own abstraction over the 
standard Node.js http module and you can configure it in whatever manner you 
like there.


## Configuration 
You can configure a few environment variables to setup this component for use 
and your needs. The variables and their uses are explained below. 

* PROXY_TARGET_FH - Required. The domain you want this proxy to proxy requests 
to.

* PROXY_ADDRESSES_FH - A comma separated list of IP address(es) that can use 
this proxy without the need to validate with FeedHenry credentials via the 
login portal. Be sure it's your _external_ IP address if you're behind a NAT. 
Example (don't include the quotes when setting this): 
"73.186.83.1, 73.186.33.108"

* PROXY_SESSION_TIMEOUT_FH - The number of milliseconds of inactivity required 
for a logged in proxy session to be terminated. Defaults to 10 minutes.

These two variables are not yet supported, but may need to be in the future.
* PROXY_HTTP_PORT_FH - The port to send HTTP requests to on the 
PROXY_TARGET_FH. Defaults to 80.
* PROXY_HTTPS_PORT_FH - The port to send HTTPS requests to on the 
PROXY_TARGET_FH. Defaults to 443.


## Protocols and HTTPS
Requests will be proxied to the target using the incoming protocol. Only HTTP 
and HTTPS are supported at present.


## Further Security/Features/Ideas & Contributions
All are welcome. This is pretty simply put together at present and is a bit of 
a black box design rather than an extension of a FeedHenry Express application. 
It also doesn't inspect headers etc. as by design it requires as little 
modification to your application codebase as possible. If it moves towards a 
headers inspection style _Option #2_ above via _request.defaults_ might become 
the standard way of using this instead of the hosts, or combination of both.

It may be required that a proxy can perform requests to multiple target 
hosts rather than a single configured one as is the current situation, but for 
now this isn't supported.

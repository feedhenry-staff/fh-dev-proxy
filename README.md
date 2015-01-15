FH Dev Proxy
============

```
npm i fh-dev-proxy
```

A simple to deploy proxy that can be used to enable local development requests 
to reach a private web service via the whitelisted FeedHenry cloud. 

Also contains the necessary code required to ensure local development requests 
are proxied through a configured proxy instance. Development requests are 
always proxied from the local development machine to the cloud instance using 
HTTPS, the cloud will then execute the request using the original protocol you 
specified.


## Security & Authentication
Naturally exposing a direct proxy without some form of security isn't 
wise as it could potentially be abused by would be attackers. Preventing 
unauthorised access to the proxy can is accomplished by using ensuring users 
know the API Key for the cloud instance and it's GUID. Without these the proxy 
cannot be used to forward requests.


## Proxy Setup
Simply create a blank cloud application of the FeedHenry platform and place the 
following in the _application.js_. Naturally you will need to have the
_fh-dev-proxy_ dependency in your _package.json_.

```javascript
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
 */
app.use('/*', require('fh-dev-proxy').proxy);

// fhlint-end

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
var server = app.listen(port, function() {
  console.log("App started at: " + new Date() + " on port: " + port);
});

```

No other code is required in _application.js_.


## Reserved Routes
The usual FeedHenry specifc routes are reserved. This means that making a 
request to your proxy that has the path _/sys/info/ping_ will be routed to the 
FeedHenry handler for this as will other standard routes. Realistically the 
potentially for this being an issue is very slim.


## Protocols and HTTPS
Development requests are always proxied from the local development machine to 
the cloud instance using HTTPS, the cloud will then execute the request using 
the original protocol you specified.

Only HTTP and HTTPS are supported.


## Development Usage
To use this in your projects (and to actually use your proxy!) simply perform 
a host remapping as part of your cloud startup process. If your application is 
deployed in the FeedHenry cloud the mappings won't take effect, so you don't 
need to add any extra logic to manage local vs. FeedHenry environments; 
your code will simply work as expected!

The below code will ensure any HTTP/HTTPS requests you perform in your cloud 
application (when running locally) are proxied via the proxy you've specified. 
For example any HTTP request to _secure-domain-1.com_ when running on your 
local machine would be proxied via a cloud application with the guid 
_j7bmVE3VzOpcSCaiMi7H6L5x_ running on _yourdomain.feedhenry.com_ over HTTPS and 
then that proxy would perform the request over HTTP and return the result to 
your local instance.

```javascript
var proxy = require('fh-dev-proxy');

proxy.httpOverride.init({
	guid: 'j7bmVE3VzOpcSCaivi7H6L5x',
	domain: 'yourdomain.feedhenry.com',
	apiKey: '429b963cfd20921fc696531611f279a597dd1acb',
	hosts: ['secure-domain-1.com', 'secure-domain-2.ie']
}, function (err) {
	// Error would be non null if the provided options didn't resolve
	// to a valid FeedHenry cloud application (proxy)

	if (err) {
		// Bail. The proxy setup failed.
		process.exit(1);
	} else {
		// Start your app as normal. Your proxy will be used for any HTTP 
		// requests to secure-domain-1.com and secure-domain-2.ie
	}
});

```


## API

### proxy
This is the route handler used for all cloud requests in an express application.

Use like so:

```javascript

// This should be the last route handler in your express app
app.use('/*', require('fh-dev-proxy').proxy);

```

### httpOverride
An object with two methods bound. Allows you yo configure your local 
development environment.

#### init(params, callback)
Configures your local development environment to proxy requests to specified 
hosts via a proxy running in the FeedHenry cloud. Both parameters are required.

The _params_ must contain the following:

* guid (String) - The App ID for the cloud instance to use as a proxy.
* domain (String) - The domain on which this proxy is running. Leave out the 
"http://"
* apiKey (String) - The API Key for the cloud instance that you're using as a 
proxy.
* hosts (Array) - An array hosts you want to proxy via the cloud proxy you 
created e.g ['www.google.com', 'a-secure-domain.com']


## Further Security/Features/Ideas & Contributions
All are welcome! Fork it and create a PR.


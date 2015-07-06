FH Dev Proxy
============

```
npm i fh-dev-proxy
```

## Overview
When developing a Node.js application you plan to deploy on the FeedHenry 
platform you'll usually do so locally. Developing locally can be problematic if 
some of the web services you need to reach are behind firewalls or 
inaccessible for other reasons. This module will allow you to proxy requests to these hosts via the FeedHenry platform while developing locally so you can 
develop from anywhere without the need for a VPN. This module can also be 
used as a CLI to create a local web server that will also perform proxying 
which is useful if you need to run some test cURL commands against a secure 
web service.

Development requests are always proxied from the local development machine to 
the cloud instance using HTTPS, the cloud will then execute the request using 
the original protocol you specified. This image represents the process visually:

![Local Development is Enabled](https://dl.dropboxusercontent.com/u/58573547/images/fh_dev_proxy_after.png)

If we are to visualise this as components we'd have the following:

* Our Cloud Application code. This will be running locally and your laptop and 
is the code that needs to access some private web service.
* Our proxy instance. This is a standalone mBaaS Service or Cloud Application 
running on the FeedHenry platform and will be used by your local development 
code to proxy requests to a private web service.

This all works by having you add a small piece of code to your Cloud Application
code (the first bullet point above) and creating a separate cloud application 
or mBaaS Service to perform the required request proxying.


## Security & Authentication
Naturally exposing a direct proxy without some form of security isn't 
wise as it could potentially be abused by would be attackers. Preventing 
unauthorised access to the proxy is accomplished by using ensuring users 
know the API Key for the cloud instance and it's GUID. Without these the proxy 
cannot be used to forward requests. You must also add any hosts that can be 
proxied using the PROXY_VALID_HOSTS environment variable to the service or 
cloud application being used as a proxy instance.

## Usage
Getting your local development code to proxy requests requires two steps:

1. Setup a proxy on the FeedHenry Platform.
2. Add some initialisation code to your Cloud Application code.

#### Proxy Application Setup
You must complete this step before you can use the CLI or local development 
overrides. Simply create a blank Cloud Application or mBaaS Service on the FeedHenry platform and place the following in the _application.js_. Naturally 
you will need to have the _fh-dev-proxy_ added to the "dependencies" in your 
_package.json_. You will also need to make the application URL public from the 
bottom of the Details tab if it's an mBaaS Service.

Here's what your proxy instance _application.js_ should look like:

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
 * We add a route that can handle all requests and set the env var telling the
 * proxy which hosts it is permitted to forward requests to.
 */
// The proxy will only forward requests bound for "some-secure-domain.com"
process.env.PROXY_VALID_HOSTS = ['some-secure-domain.com'];
app.use('/*', require('fh-dev-proxy').proxy);

// fhlint-end

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
var server = app.listen(port, function() {
  console.log("App started at: " + new Date() + " on port: " + port);
});

```

No other code is required in other folders. Once you've replaced the contents 
of _application.js_ with the above code and deployed it you're ready to use 
your proxy.

#### Configure Request Forwarding in your Cloud Application
Now that you've created the proxy instance you just need to add some extra 
initialisation code to your Cloud Application code.

The below code will ensure any HTTP/HTTPS requests you perform in your cloud 
app, when running locally, are proxied via your FeedHenry proxy instance. 
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
		throw err;
	} else {
		// Start your app as normal. Your proxy will be used for any HTTP 
		// requests to secure-domain-1.com and secure-domain-2.ie
	}
});

```

If your application is deployed in the FeedHenry cloud the mappings won't take 
effect, so you don't need to add any extra logic to manage local vs. FeedHenry
environments; your code will simply work as expected!

## Reserved Routes
The usual FeedHenry specifc routes are reserved. This means that making a 
request to your proxy that has the path _/sys/info/ping_ will be routed to the 
FeedHenry handler for this as will other standard routes. The 
potential for this being an issue is very slim.


## Protocols and HTTPS
Development requests are _always_ proxied from the local development machine to 
the cloud instance using HTTPS, the cloud will then execute the request using 
the original protocol you specified on your local development machine.

Only HTTP and HTTPS are supported.


## API

### proxy
This is the route handler used for all cloud requests in an express application.
It will take requests and perform verification and proxying if the request 
contains the correct credentials.

Use like so:

```javascript

// This should be the last route handler in your express app
app.use('/*', require('fh-dev-proxy').proxy);

```

### httpOverride
An object with two methods bound. Allows you you configure your local 
development environment.

##### init(params, callback)
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

Example:

```javascript
var proxy = require('fh-dev-proxy');

proxy.httpOverride.init({
	guid: 'YOUR_SERVICE_OR_CLOUD_APPID',
	apiKey: 'API_KEY_RELATED_TO_ABOVE_GUID',
	domain: 'yourdomain.feedhenry.com',
	hosts: ['some.host-to-proxy.com']
}, function (err) {
	if (err) {
		throw err;
	} else {
		var express = require('express');
		var app = express();

		// Setup the rest of your app...
	}
});
```

## CLI Usage
Using this as a CLI is simple, install globally:

```
npm install -g fh-dev-proxy
```

Once installed globally the _fh-dev-proxy_ command is available for use like so:

```
fh-dev-proxy -appid [PROXY_ID] --apikey [PROXY_API_KEY] --fhdomain 
[YOUR_FH_DOMAIN] --host [HOST_TO_SERVE_LOCALLY]
```

For example, assume you have a private backend at _https://uat.myservice.com_ 
and want to browse it but only the FeedHenry platform is whitelisted for 
access. You can run the following command to run a web server at 
_localhost:9090_ that will serve the private web service locally for you by 
proxying requests via the FeedHenry platform.

```
fh-dev-proxy -appid [PROXY_ID] --apkey [PROXY_API_KEY] --fhdomain 
[YOUR_FH_DOMAIN] --host https://uat.myservice.com --port 9090
```

### CLI Options
All options are required unless stated otherwise as optional.

* **appid** - The ID of your proxy cloud application/service.
* **apikey** - The Api Key of your proxy. Required for authentication.
* **fhdomain** - The FeedHenry domain your proxy is running on.
* **host** - The host you want to serve locally.
* **port** - Optional. Port to use for the local webserver.


## Further Security/Features/Ideas & Contributions
All are welcome! Fork it and create a PR.


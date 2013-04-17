# nodule

A set of conventions and tools for building, bundling and serving single page apps with node.js

## What it does

1. Saves us, [&yet](http://andyet.com), from re-inventing this process for each app.
1. Let's a developer focus on building a great clientside experience, not boiler plate.
1. Let's you use CommonJS modules to structure your clientside code.
1. Manages clientside files during development so you can just write code.
1. Compiles/minifies/serves uniquely named JS files containing your application with really aggressive caching (since the name will change if the app does).
1. Plays nicely with [express.js](http://expressjs.com)

## How to use it

You create an instance of your nodule app with your configuration. Then tell express which urls to serve your single page app at. 

That's it.

```js
var express = require('express'),
    NoduleApp = require('./index.js'),
    app = express();

// configure our app
var clientApp = new NoduleApp({
    dir: __dirname + '/sample',
    dev: false,
    libraries: [
        'jquery.js'
    ],
    server: app
});

// We just specify the routes at which we want to serve this clientside app.
// This is important for supporting "deep linking" into a singlepage apps since the server
// has to know what urls to let the browser app handle.
app.get('*', clientApp.html());

// start listening for http requests
app.listen(3000);

```

## License

MIT

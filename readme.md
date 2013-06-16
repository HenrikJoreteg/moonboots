# moonboots

A set of conventions and tools for building, bundling and serving single page apps with node.js and express.js.

## What it does

1. Saves us from re-inventing this process for each app.
1. Let's a developer focus on building a great clientside experience, not boiler plate.
1. Let's you use CommonJS modules to structure your clientside code.
1. Manages clientside files during development so you can just write code.
1. Compiles/minifies/serves uniquely named JS files containing your application with really aggressive caching (since the name will change if the app does).
1. Plays nicely with [express.js](http://expressjs.com)

## Why?

1. Because single page apps are different. You're shipping an application to be run on the browser instead of running an application to ship a view to the browser.
1. Engineering a good client-side app requires a good set of conventions and structure for organizing your code.
1. Effeciently building/sending a client-side app to the browser is a tricky problem. It's easy to build convoluted solutions. We want something a bit simpler to use.

## How to use it

You grab your moonboots and pass it a config. Then tell express which urls to serve your single page app at. 

That's it.

```js
var express = require('express'),
    Moonboots = require('./index.js'),
    app = express();

// configure our app
var clientApp = new Moonboots({
    dir: __dirname + '/sample',
    developmentMode: false,
    libraries: [
        'jquery.js'
    ],
    server: app
});

// if we want to prime the user's cache with the
// application files. The login page is a great place
// to do this. We can retrieve the name of the
// JS file for the current app, by calling nodule's
// filename() function.
app.get('/login', function (req, res) {
    // then in our login page we can lazy load the application to
    // prime the user's cache while they're typing in their username/password
    res.render('login', {appFileName: clientApp.filename()});
});

// We also just need to specify the routes at which we want to serve this clientside app.
// This is important for supporting "deep linking" into a single page app. The server
// has to know what urls to let the browser app handle.
app.get('*', clientApp.html());

// start listening for http requests
app.listen(3000);


```

## Full example

For a working example, run `node server.js` file and it'll server the `sample` directory.

## License

MIT

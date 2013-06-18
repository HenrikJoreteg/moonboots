# moonboots

A set of conventions and tools for building, bundling and serving single page apps with node.js and express.js.

The bulk of the awesome bundling of CommonJS modules for client use is done using [browserify](http://browserify.org/).

This just gives us a structured way to include non-CommonJS libraries, work in development mode and agressively cache built JS files for production.


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
    main: __dirname + '/sample/app/app.js',
    developmentMode: false,
    libraries: [
        __dirname + '/sample/libraries/jquery.js'
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


## Options

Available options that can be passed to Moonboots:

- `main` (required, filepath) - The main entry point of your client app. Browserify uses this build out your dependency tree.
- `server` (optional, connect or express app, default: null) - Highly recommend using this. This way moonboots worries about serving your JS for you in the appropriate format given your other settings.
`developmentMode` (optional, boolean, default: false) - In development mode the JS is recompiled each time it's requested by the browser and it's not minified. Very important this isn't left this way for production. 
- `libraries` (optional, array of file paths, default: []) - An array of paths of JS files to concatenate and include before any CommonJS bundled code. This is useful for stuff like jQuery and jQuery plugins. Note that they will be included in the order specified. So if you're including a jQuery plugin, you'd better be sure that jQuery is listed first. 
- `templateFile` (optinal, filepath, default: bundled template): __dirname + '/sample/app.html',
- `cachePeriod` (optional, miliseconds to cache JS file, default: one year in MS)
- `browerify` (optional, object, default: {}) - options to pass directly into browserify's `bundle` methods.
- `modulesDir` (optional, directory path, default: '') - directory path of modules to be directly requirable (without using relative require paths). For example if you've got some helper modules that are not on npm but you still want to be able to require directly by name, you can include them here. So you can, for example, put a modified version of backbone in here and still just `require('backbone')`.


## Methods

**moonboots.html()** - returns connect request handler that will server the appropriate HTML file with the correct JS file name based on current settings.

**moonboots.fileName()** - returns string of the current filename based on current config. Useful if you want to render your own base html template or if you want to know what the filename is to prime someone's cache while on a login page, etc.

**moonboots.js()** - returns connect-compatible request handler that serves the JS file based on settings. If you use the `server` option, this will just be done for you. But you can also do it yourself using this method.
`


## Full example

For a working example, run `node server.js` file and it'll server the `sample` directory.

## License

MIT

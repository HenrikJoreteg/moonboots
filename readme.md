# moonboots

Moonboots makes it incredibly easy to jump into single-page-app development by encapsulating a set of conventions and tools for building, bundling, and serving SPAs with node.js.

Powered by [browserify](http://browserify.org/), moonboots gives us a structured way to include non-CommonJS libraries, work in development mode and agressively cache built JS and CSS files for production.


## What it does

1. Saves us from re-inventing this process for each app.
1. Let's a developer focus on building a great clientside experience, not boiler plate.
1. Let's you use CommonJS modules to structure your clientside code.
1. Manages clientside files during development so you can just write code.
1. Compiles/minifies/uniquely named JS files (and CSS files optionally) containing your application allowing really aggressive caching (since the name will change if the app does).
1. Plays nicely with [express.js](http://expressjs.com), [hapi.js](http://hapijs.com), or even straight [node http](http://nodejs.org/api/http.html)

## Why?

1. Because single page apps are different. You're shipping an application to be run on the browser instead of running an application to ship a view to the browser.
1. Engineering a good client-side app requires a good set of conventions and structure for organizing your code.
1. Effeciently building/sending a client-side app to the browser is a tricky problem. It's easy to build convoluted solutions. We want something a bit simpler to use.


## How to use it

You grab your moonboots and pass it a config. Then tell your http library which urls to serve your single page app at.

That's it.

```js
var express = require('express');
var Moonboots = require('moonboots');
var app = express();

// configure our app
var clientApp = new Moonboots({
    main: __dirname + '/sample/app/app.js',
    libraries: [
        __dirname + '/sample/libraries/jquery.js'
    ],
    stylesheets: [
        __dirname + '/styles.css'
    ]
});

app.get(clientApp.jsFileName(),
    function (req, res) {
        clientApp.jsSource(function (err, js) {
            res.send(js);
        })
    }
);
app.get('/app*', clientApp.htmlSource());

// start listening for http requests
app.listen(3000);

```


## Options

Available options that can be passed to Moonboots:

- `main` (required, filepath) - The main entry point of your client app. Browserify uses this to build out your dependency tree.
- `libraries` (optional, array of file paths, default: []) - An array of paths of JS files to concatenate and include before any CommonJS bundled code. This is useful for stuff like jQuery and jQuery plugins. Note that they will be included in the order specified. So if you're including a jQuery plugin, you'd better be sure that jQuery is listed first.
- `stylesheets` (optional, array of file paths, default: []) - An array of CSS files to concatenate
- `jsFileName` (optional, string, default: app) - the name of the JS file that will be built
- `cssFileName` (optional, string, default: styles) - the name of the CSS file that will be built
- `browserify` (optional, object, default: {debug: false}) - options to pass directly into browserify's `bundle` methods, as detailed [here](https://github.com/substack/node-browserify#bbundleopts-cb). Additional options are:
  - `browserify.transforms` (optional, list, default: []) - list of transforms to apply to the browserify bundle, see [here](https://github.com/substack/node-browserify#btransformtr) for more details.
- `uglify` (optional, object, default: {}) - options to pass directly into uglify, as detailed [here](https://github.com/mishoo/UglifyJS2)
- `modulesDir` (optional, directory path, default: '') - directory path of modules to be directly requirable (without using relative require paths). For example if you've got some helper modules that are not on npm but you still want to be able to require directly by name, you can include them here. So you can, for example, put a modified version of backbone in here and still just `require('backbone')`.
- `beforeBuildJS` (optional, function, default: nothing) - function to run before building the browserify bundle during development. This is useful for stuff like compiling clientside templates that need to be included in the bundle. If you specify a callback moonboots will wait for you to call it. If not, it will be run synchrnously (by the magic of Function.prototype.length).
- `beforeBuildCSS` (optional, function, default: nothing) - function to run before concatenating your CSS files during development. This is useful for stuff like generating your CSS files from a preprocessor. If you specify a callback moonboots will wait for you to call it. If not, it will be run synchrnously (by the magic of Function.prototype.length).
- `sourceMaps` (optional, boolean, default: false) - set to true to enable sourcemaps (sets browserify.debug to true)
- `resourcePrefix` (optional, string, default: '/') - specify what dirname should be prefixed when generating html source. If you're serving the whole app statically you may need relative paths. So just passing resourcePrefix: '' would make the template render with `<script src="app.js"></script>` instead of `<script src="/app.js"></script>`.
- `minify` (optional, boolean, default: true) - an option for whether to minify JS and CSS.
- `cache` (optional, boolean, default: true) - an option for whether or not to recalculate the bundles each time
- `buildDirectory` (optional, string, default: nothing) - directory path in which to write the js and css bundles after building and optionally minifying.  If this is set, moonboots will first look in this folder for files matching the jsFileName and cssFileName parameters and use them if present. Those files will be trusted implicitly and no hashing or building will be done.
- `developmentMode` (optional, boolean, default: false) - If this is true, forces cache to false, minify to true, and disables buildDirectory
- `timingMode` (optional, boolean, default: false) - If set to true, moonboots will emit log events w/ a 'timing' flag at various stages of building to assist with performance issues

## About Source Maps

Sourcemaps let you send the actual code to the browser along with a mapping to the individual module files. This makes it easier to debug, since you can get relevant line numbers that correspond to your actual source within your modules instead of the built bundle source.

Please note that if you are using `libraries` your line numbers will be off, because that prepends those files to the main bundle.  If it is important for you to maintain line numbers in your source maps, consider using [browserify-shim](https://github.com/thlorenz/browserify-shim) in your transforms to include those non-commonjs files in your app

## Methods

**moonboots.jsFileName()** - returns string of the current js filename.

**moonboots.jsSource()** - returns compiled (and optionally minified js source)

**moonboots.cssFileName()** - returns string of the current css filename.

**moonboots.jsSource()** - returns concatenated (and optionally minified css stylesheets)

**moonboots.htmlSource()** - returns default html to serve that represents your compiled app w/ a script and optional style tag

**moonboots.htmlContext()** - returns object w/ jsFileName and cssFileName attributes to pass to your http server's templating engine to build your own html source


## Full example

For a working example, check out [moonboots-hapi](https://github.com/wraithgar/moonboots-hapi) or [moonboots-express](https://github.com/lukekarrys/moonboots-express) or even [moonboots-static](https://github.com/lukekarrys/moonboots-static)


## License

MIT

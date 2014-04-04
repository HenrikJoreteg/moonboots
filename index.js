var fs = require('fs');
var crypto = require('crypto');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var browserify = require('browserify');
var UglifyJS = require('uglify-js');
var cssmin = require('cssmin');
var path = require('path');
var mdeps = require('module-deps');
var meta = require('bundle-metadata');


function Moonboots(opts) {
    var item;
    //'opts' has to be an object
    if (typeof opts !== 'object') {
        throw new Error('Invalid options');
    }
    //'main' is the only required parameter, throw if it's missing
    if (!opts.main) {
        throw new Error("You must supply at minimum a `main` file for your moonboots app: {main: 'myApp.js'}");
    }

    //Defaults
    this.config = {
        libraries: [],
        stylesheets: [],
        jsFileName: 'app',
        cssFileName: 'styles',
        browserify: {}, // overridable browerify options
        beforeBuildJS: function (cb) { cb(); },
        beforeBuildCSS: function (cb) { cb(); },
        sourceMaps: false, //turns on browserify debug
        resourcePrefix: '/',
        minify: true,
        developmentMode: false
    };

    // Were we'll store generated source code, etc.
    this.result = {
        js: {ext: 'js'},
        css: {ext: 'css'},
        html: {}
    };

    //Set this but let an explicity set config.browserify.debug override in the next loop
    this.config.browserify.debug = this.config.sourceMaps;

    for (item in opts) {
        this.config[item] = opts[item];
    }


    //developmentMode forces minify to false no matter what
    if (this.config.developmentMode) {
        this.config.minify = false;
    }

    //We'll re-add extensions later
    if (path.extname(this.config.jsFileName) === '.js') {
        this.config.jsFileName = this.config.jsFileName.slice(0, -3);
    }
    if (path.extname(this.config.cssFileName) === '.css') {
        this.config.cssFileName = this.config.cssFileName.slice(0, -4);
    }

    // inherit from event emitter and then wait for nextTick to do anything so that our parent has a chance to listen for events
    EventEmitter.call(this);
    process.nextTick(this.build.bind(this));
}

// Inherit from event emitter
Moonboots.prototype = Object.create(EventEmitter.prototype, {
    constructor: {
        value: Moonboots
    }
});

//Initial build, in development mode we just set hashes and filenames, otherwise we prime the sources
//Emits 'ready' when done
Moonboots.prototype.build = function () {
    var self = this;

    async.parallel([
        function _buildCSS(buildCSSDone) {
            //If we're in development mode we just have to set the hash
            if (self.config.developmentMode) {
                self.result.css.hash = 'dev';
                return buildCSSDone();
            }
            self.bundleCSS(true, buildCSSDone);
        },
        function _buildJS(buildJSDone) {
            //If we're in development mode we just have to set the hash
            if (self.config.developmentMode) {
                self.result.js.hash = 'dev';
                return buildJSDone();
            }
            self.bundleJS(true, buildJSDone);
        }
    ], function (/*err*/) {
        var cssFileName = self.config.cssFileName + '.' + self.result.css.hash;
        var jsFileName = self.config.jsFileName + '.' + self.result.js.hash;

        if (self.config.minify) {
            cssFileName += '.min';
            jsFileName += '.min';
        }

        cssFileName += '.css';
        jsFileName += '.js';

        self.result.css.fileName = cssFileName;
        self.result.js.fileName = jsFileName;

        //if (err) { throw new Error(err.message || err); }
        self.result.html.source = '<!DOCTYPE html>\n';
        if (self.config.stylesheets.length > 0) {
            self.result.html.source += linkTag(self.config.resourcePrefix + self.cssFileName());
        }
        self.result.html.source += scriptTag(self.config.resourcePrefix + self.jsFileName());
        self.result.html.context = {
            jsFileName: self.jsFileName(),
            cssFileName: self.cssFileName()
        };
        self.emit('ready');
    });
};

// Actually generate the CSS bundle
Moonboots.prototype.bundleCSS = function (setHash, done) {
    var self = this;
    async.series([
        self.config.beforeBuildCSS,
        function _buildCSS(next) {
            var cssCheckSum, csssha;
            self.result.css.source = concatFiles(self.config.stylesheets);
            if (setHash) {
                csssha = crypto.createHash('sha1'); // we'll calculate this to know whether to change the filename
                csssha.update(self.result.css.source);
                self.result.css.hash = csssha.digest('hex').slice(0, 8);
            }
            if (self.config.minify) {
                self.result.css.source = cssmin(self.result.css.source);
            }
            next();
        }
    ], function _bundleCSSDone() {
        done(null, self.result.css.source);
    });
};

// Actually generate the JS bundle
Moonboots.prototype.bundleJS = function (setHash, done) {
    var self = this;
    var jssha = crypto.createHash('sha1'); // we'll calculate this to know whether to change the filename
    async.series([
        self.config.beforeBuildJS,
        function _concatLibs(next) {
            //Start w/ external libraries
            self.result.js.source = concatFiles(self.config.libraries);
            jssha.update(self.result.js.source);
            next();
        },
        function (next) {
            self.browserify(setHash, next);
        },
        function (next) {
            if (setHash) {
                jssha.update(self.result.js.bundleHash);
                self.result.js.hash = jssha.digest('hex').slice(0, 8);
            }
            if (self.config.minify) {
                self.result.js.source = UglifyJS.minify(self.result.js.source, {fromString: true}).code;
            }
            next();
        }
    ], function _bundleJSDone() {
        done(null, self.result.js.source);
    });
};


Moonboots.prototype.browserify = function (setHash, done) {
    var modules, args, bundle, hashBundle;
    var self = this;

    // Create two bundles:
    // bundle is to get the actual js source from a browserify bundle
    // hashBundle is to create a copy of our other bundle (with the same requires and transforms)
    // so we can use its resolve fn to get a predictable hash from module-deps
    bundle = browserify();
    if (setHash) {
        hashBundle = browserify();
    }

    // handle module folder that you want to be able to require without relative paths.
    if (self.config.modulesDir) {
        modules = fs.readdirSync(self.config.modulesDir);
        modules.forEach(function (moduleFileName) {
            if (path.extname(moduleFileName) === '.js') {
                args = [
                    path.join(self.config.modulesDir, moduleFileName),
                    {expose: path.basename(moduleFileName, '.js')}
                ];
                bundle.require.apply(bundle, args);
                if (setHash) {
                    hashBundle.require.apply(hashBundle, args);
                }
            }
        });
    }

    // handle browserify transforms if passed
    if (self.config.browserify.transforms) {
        self.config.browserify.transforms.forEach(function (tr) {
            bundle.transform(tr);
            if (setHash) {
                hashBundle.transform(tr);
            }
        });
    }

    // add main import
    bundle.add(self.config.main);

    async.parallel([
        function (next) {
            if (!setHash) {
                return next();
            }
            // Get a predictable hash for the bundle
            mdeps(self.config.main, {
                resolve: hashBundle._resolve.bind(hashBundle)
            })
            .pipe(meta().on('hash', function (hash) {
                self.result.js.bundleHash = hash;
                next();
            }));
        },
        function (next) {
            // run main bundle function
            bundle.bundle(self.config.browserify, function (err, js) {
                //XXX I can't find a way to get error set
                //if (err) return next(err);
                self.result.js.source = self.result.source + js;
                next();
            });
        }
    ], done);
};

/*
* Main moonboots functions.
* These should be the only methods you call.
*/

//Send jsSource to callback, rebuilding every time if in development mode
Moonboots.prototype.jsSource = function (cb) {
    if (!this.config.developmentMode) {
        return cb(null, this.result.js.source);
    }
    this.bundleJS(false, cb);
};

//Send cssSource to callback, rebuilding every time if in development mode
Moonboots.prototype.cssSource = function (cb) {
    if (!this.config.developmentMode) {
        return cb(null, this.result.css.source);
    }
    this.bundleCSS(false, cb);
};

//Return jsFileName, which never changes
Moonboots.prototype.jsFileName = function () {
    return this.result.js.fileName;
};

//Return jsFileName, which never changes
Moonboots.prototype.cssFileName = function () {
    return this.result.css.fileName;
};

//Return htmlContext, which never changes
Moonboots.prototype.htmlContext = function () {
    return this.result.html.context;
};

//Return htmlSource, which never changes
Moonboots.prototype.htmlSource = function () {
    return this.result.html.source;
};

/*
* End main moonboots functions.
*/

// Main export
module.exports = Moonboots;


// a few helpers
function concatFiles(arrayOfFiles) {
    return arrayOfFiles.map(function (fileName) {
        return fs.readFileSync(fileName);
    }).join('\n');
}

function linkTag(filename) {
    return '<link href="' + filename + '" rel="stylesheet" type="text/css">\n';
}

function scriptTag(filename) {
    return '<script src="' + filename + '"></script>';
}

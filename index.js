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
    //The only required parameter, throw if it's missing
    if (typeof opts !== 'object') {
        throw new Error('Invalid options');
    }
    if (!opts.main) {
        throw new Error("You must supply at minimum a `main` file for your moonboots app: {main: 'myApp.js'}");
    }

    var self = this;
    var item;

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
        minify: true
    };

    // Were we'll store generated source code, etc.
    this.result = {
        js: {},
        css: {},
        html: {}
    };

    //Set this but let an explicity set config.browserify.debug override in the next loop
    this.config.browserify.debug = this.config.sourceMaps;

    for (item in opts) {
        this.config[item] = opts[item];
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

Moonboots.prototype.build = function () {
    var self = this;

    async.parallel([
        function _buildCSS(buildCSSDone) {
            async.series([
                self.config.beforeBuildCSS,
                function _concatCSS(next) {
                    self.result.css.source = concatFiles(self.config.stylesheets);
                    next();
                },
                function _sourceCSS(next) {
                    var cssCheckSum;
                    var csssha = crypto.createHash('sha1'); // we'll calculate this to know whether to change the filename
                    // create our hash and build filenames accordingly
                    csssha.update(self.result.css.source);
                    cssCheckSum = self.result.css.checkSum = csssha.digest('hex').slice(0, 8);

                    // store filenames
                    self.result.css.fileName = self.config.cssFileName + '.' + cssCheckSum;
                    if (self.config.minify) {
                        self.result.css.fileName = self.result.css.fileName + '.min';
                        self.result.css.source = cssmin(self.result.css.source);
                    }

                    self.result.css.fileName = self.result.css.fileName + '.css';

                    next();
                }
            ], buildCSSDone);
        },
        function _buildJS(buildJSDone) {
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
                    self.bundleJS(next);
                },
                function (next) {
                    var jsCheckSum;
                    // create our hash and build filenames accordingly
                    jssha.update(self.result.js.bundleHash);
                    jsCheckSum = self.result.js.checkSum = jssha.digest('hex').slice(0, 8);

                    // store filenames
                    self.result.js.fileName = self.config.jsFileName + '.' + jsCheckSum;

                    if (self.config.minify) {
                        self.result.js.fileName = self.result.js.fileName + '.min';
                        self.result.js.source = UglifyJS.minify(self.result.js.source, {fromString: true}).code;
                    }
                    self.result.js.fileName = self.result.js.fileName + '.js';

                    next();
                }
            ], buildJSDone);
        }
    ], function (/*err*/) {
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

// Actually generate the JS bundle
Moonboots.prototype.bundleJS = function (done) {
    var modules, args;
    var self = this;

    // Create two bundles:
    // bundle is to get the actual js source from a browserify bundle
    // hashBundle is to create a copy of our other bundle (with the same requires and transforms)
    // so we can use its resolve fn to get a predictable hash from module-deps
    self.bundle = browserify();
    self.hashBundle = browserify();

    // handle module folder that you want to be able to require without relative paths.
    if (self.config.modulesDir) {
        modules = fs.readdirSync(self.config.modulesDir);
        modules.forEach(function (moduleFileName) {
            if (path.extname(moduleFileName) === '.js') {
                args = [
                    path.join(self.config.modulesDir, moduleFileName),
                    {expose: path.basename(moduleFileName, '.js')}
                ];
                self.bundle.require.apply(self.bundle, args);
                self.hashBundle.require.apply(self.hashBundle, args);
            }
        });
    }

    // handle browserify transforms if passed
    if (self.config.browserify.transforms) {
        self.config.browserify.transforms.forEach(function (tr) {
            self.bundle.transform(tr);
            self.hashBundle.transform(tr);
        });
    }

    // add main import
    self.bundle.add(self.config.main);

    async.parallel([
        function (next) {
            // Get a predictable hash for the bundle
            mdeps(self.config.main, {
                resolve: self.hashBundle._resolve.bind(self.hashBundle)
            })
            .pipe(meta().on('hash', function (hash) {
                self.result.js.bundleHash = hash;
                next();
            }));
        },
        function (next) {
            // run main bundle function
            self.bundle.bundle(self.config.browserify, function (err, js) {
                //XXX I can't find a way to get error set
                //if (err) return next(err);
                self.result.js.source = self.result.source + js;
                next();
            });
        }
    ], done);
};

/*Main moonboots functions*/
Moonboots.prototype.jsSource = function () {
    return this.result.js.source;
};

Moonboots.prototype.cssSource = function () {
    return this.result.css.source;
};

Moonboots.prototype.jsFileName = function () {
    return this.result.js.fileName;
};

Moonboots.prototype.cssFileName = function () {
    return this.result.css.fileName;
};

Moonboots.prototype.htmlContext = function () {
    return this.result.html.context;
};

Moonboots.prototype.htmlSource = function () {
    return this.result.html.source;
};

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

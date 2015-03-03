var fs = require('fs');
var crypto = require('crypto');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var browserify = require('browserify');
var UglifyJS = require('uglify-js');
var cssmin = require('cssmin');
var path = require('path');


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
        browserify: {}, // overridable browserify options
        uglify: {}, // overridable uglify options
        beforeBuildJS: function (cb) { cb(); },
        beforeBuildCSS: function (cb) { cb(); },
        sourceMaps: false, //turns on browserify debug
        resourcePrefix: '/',
        minify: true,
        cache: true,
        developmentMode: false,
        timingMode: false
    };

    // Were we'll store generated source code, etc.
    this.result = {
        js: {ext: 'js', source: ''},
        css: {ext: 'css'},
        html: {}
    };

    for (item in opts) {
        this.config[item] = opts[item];
    }

    // Uglify fromString must be true
    this.config.uglify.fromString = true;

    // Use sourceMaps option to set browserify.debug if its not set already
    if (typeof this.config.browserify.debug === 'undefined') {
        this.config.browserify.debug = this.config.sourceMaps;
    }

    // Replace transforms with transform in the browserify config since
    // that is how browserify expects them
    if (this.config.browserify.transforms && !this.config.browserify.transform) {
        this.config.browserify.transform = this.config.browserify.transforms;
        delete this.config.browserify.transforms;
    }

    // Ensure browserify transforms is set
    if (typeof this.config.browserify.transform === 'undefined') {
        this.config.browserify.transform = [];
    }

    // developmentMode forces minify to false and never build no matter what
    if (this.config.developmentMode) {
        this.config.minify = false;
        this.config.buildDirectory = undefined;
        this.config.cache = false;
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

    self.timing('timing', 'build start');
    async.series([
        function _buildFiles(buildFilesDone) {
            var parts;
            if (!self.config.buildDirectory) {
                return buildFilesDone();
            }
            fs.readdir(self.config.buildDirectory, function (err, files) {
                self.timing('reading buildDirectory start');
                if (err) {
                    self.config.buildDirectory = undefined;
                    return buildFilesDone();
                }
                async.each(files, function (fileName, next) {
                    if (path.extname(fileName) === '.js' && fileName.indexOf(self.config.jsFileName) === 0) {
                        return fs.readFile(path.join(self.config.buildDirectory, fileName), 'utf8', function (err, data) {
                            if (err) {
                                self.config.buildDirectory = undefined;
                                return next(true);
                            }
                            parts = fileName.split('.');
                            self.result.js.hash = parts[1];
                            self.result.js.source = data;
                            self.result.js.filename = fileName;
                            self.result.js.fromBuild = true;
                            next();
                        });
                    }
                    if (path.extname(fileName) === '.css' && fileName.indexOf(self.config.cssFileName) === 0) {
                        return fs.readFile(path.join(self.config.buildDirectory, fileName), 'utf8', function (err, data) {
                            if (err) {
                                self.config.buildDirectory = undefined;
                                return next(true);
                            }
                            parts = fileName.split('.');
                            self.result.css.hash = parts[1];
                            self.result.css.source = data;
                            self.result.css.filename = fileName;
                            self.result.css.fromBuild = true;
                            next();
                        });
                    }
                    next();
                }, function () {
                    self.timing('reading buildDirectory finish');
                    buildFilesDone();
                });
            });
        },
        function _buildBundles(buildBundlesDone) {
            if (self.result.js.filename && self.result.css.filename) {
                //buildFiles found existing files we don't have to build bundles
                return buildBundlesDone();
            }
            async.parallel([
                function _buildCSS(buildCSSDone) {
                    self.timing('build css start');
                    //If we're rebuilding on each request we just have to set the hash
                    if (!self.config.cache) {
                        self.result.css.hash = 'nonCached';
                        return buildCSSDone();
                    }
                    self.bundleCSS(true, buildCSSDone);
                },
                function _buildJS(buildJSDone) {
                    //If we're rebuilding on each request we just have to set the hash
                    if (!self.config.cache) {
                        self.result.js.hash = 'nonCached';
                        return buildJSDone();
                    }
                    self.bundleJS(true, buildJSDone);
                }
            ], buildBundlesDone);
        },
        function _setResults(setResultsDone) {
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

            self.result.html.source = '<!DOCTYPE html>\n';
            if (self.config.stylesheets.length > 0) {
                self.result.html.source += linkTag(self.config.resourcePrefix + self.cssFileName());
            }
            self.result.html.source += scriptTag(self.config.resourcePrefix + self.jsFileName());
            self.result.html.context = {
                jsFileName: self.result.js.fileName,
                cssFileName: self.result.css.fileName
            };
            setResultsDone();
        },
        function _createBuildFiles(createBuildFilesDone) {
            if (!self.config.buildDirectory) {
                return createBuildFilesDone();
            }

            async.parallel([
                function (next) {
                    if (self.result.js.fromBuild) {
                        return next();
                    }
                    fs.writeFile(path.join(self.config.buildDirectory, self.result.css.fileName), self.result.css.source, next);
                }, function (next) {
                    if (self.result.css.fromBuild) {
                        return next();
                    }
                    fs.writeFile(path.join(self.config.buildDirectory, self.result.js.fileName), self.result.js.source, next);
                }
            ], createBuildFilesDone);
        }
    ], function () {
        self.timing('build finish');
        self.emit('ready');
    });
};

// Actually generate the CSS bundle
Moonboots.prototype.bundleCSS = function (setHash, done) {
    var self = this;
    async.series([
        function _beforeBuildCSS(next) {
            self.timing('beforeBuildCSS start');
            if (self.config.beforeBuildCSS.length) {
                self.config.beforeBuildCSS(function (err) {
                    self.timing('beforeBuildCSS finish');
                    next(err);
                });
            } else {
                self.config.beforeBuildCSS();
                self.timing('beforeBuildCSS finish');
                next();
            }
        },
        function _buildCSS(next) {
            var csssha;
            self.timing('buildCSS start');
            self.result.css.source = concatFiles(self.config.stylesheets);
            if (setHash) {
                csssha = crypto.createHash('sha1'); // we'll calculate this to know whether to change the filename
                csssha.update(self.result.css.source);
                self.result.css.hash = csssha.digest('hex').slice(0, 8);
            }
            if (self.config.minify) {
                self.result.css.source = cssmin(self.result.css.source);
            }
            self.timing('buildCSS finish');
            next();
        }
    ], function _bundleCSSDone(err) {
        if (err) {
            self.emit('log', ['moonboots', 'error'], err);
        }
        done(null, self.result.css.source);
    });
};

// Actually generate the JS bundle
Moonboots.prototype.bundleJS = function (setHash, done) {
    var self = this;
    var jssha = crypto.createHash('sha1'); // we'll calculate this to know whether to change the filename
    async.series([
        function _beforeBuildJS(next) {
            self.timing('beforeBuildJS start');
            if (self.config.beforeBuildJS.length) {
                self.config.beforeBuildJS(function (err) {
                    self.timing('beforeBuildJS finish');
                    next(err);
                });
            } else {
                self.config.beforeBuildJS();
                self.timing('beforeBuildJS finish');
                next();
            }
        },
        function _concatLibs(next) {
            //Start w/ external libraries
            self.timing('build libraries start');
            self.result.js.source = concatFiles(self.config.libraries);
            jssha.update(self.result.js.source);
            self.timing('build libraries finish');
            next();
        },
        function (next) {
            self.browserify(next);
        },
        function (next) {
            if (setHash) {
                jssha.update(self.result.js.source);
                self.result.js.hash = jssha.digest('hex').slice(0, 8);
            }
            if (self.config.minify) {
                self.timing('minify start');
                self.result.js.source = UglifyJS.minify(self.result.js.source, self.config.uglify).code;
                self.timing('minify finish');
            }
            next();
        }
    ], function _bundleJSDone(err) {
        if (err) {
            self.emit('log', ['moonboots', 'error'], err);
            if (self.config.developmentMode) {
                self.result.js.source = errorTrace(err);
            } else {
                throw err;
            }
        }
        done(null, self.result.js.source);
    });
};


Moonboots.prototype.browserify = function (done) {
    var modules, args, bundle;
    var self = this;

    self.timing('browserify start');

    bundle = browserify(self.config.browserify);

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
            }
        });
    }

    // add main import
    bundle.add(self.config.main);

    bundle.bundle(function (err, js) {
        if (self.result.js.source.trim().slice(-1) !== ';') {
            js = ';' + js;
        }
        self.result.js.source = self.result.js.source + js;

        self.timing('browserify finish');
        done(err);
    });
};

/*
* Main moonboots functions.
* These should be the only methods you call.
*/

//Send jsSource to callback, rebuilding every time if in development mode
Moonboots.prototype.jsSource = function (cb) {
    if (this.config.cache) {
        return cb(null, this.result.js.source);
    }
    this.bundleJS(false, cb);
};

//Send cssSource to callback, rebuilding every time if in development mode
Moonboots.prototype.cssSource = function (cb) {
    if (this.config.cache) {
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

Moonboots.prototype.timing = function (message) {
    if (this.config.timingMode) {
        this.emit('log', ['moonboots', 'timing', 'debug'], message, Date.now());
    }
};

/*
* End main moonboots functions.
*/

// Main export
module.exports = Moonboots;


// a few helpers
function concatFiles(arrayOfFiles) {
    return arrayOfFiles.map(function (fileName) {
        var source = fs.readFileSync(fileName, 'utf8');
        if (path.extname(fileName) !== '.js') {
            return source;
        }
        if (source.trim().slice(-1) !== ';') {
            source = source + ';';
        }
        return source;
    }).join('\n');
}

function linkTag(filename) {
    return '<link href="' + filename + '" rel="stylesheet" type="text/css">\n';
}

function scriptTag(filename) {
    return '<script src="' + filename + '"></script>';
}

function errorTrace(err) {
    var trace;
    if (err.stack) {
        trace = err.stack;
    } else {
        trace = JSON.stringify(err);
    }
    trace = trace.split('\n').join('<br>').replace(/"/g, '&quot;');
    return 'document.write("<pre style=\'background:#ECFOF2; color:#444; padding: 20px\'>' + trace + '</pre>");';
}

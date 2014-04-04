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
        server: '',
        libraries: [],
        stylesheets: [],
        templateFile: '',
        jsFileName: 'app',
        cssFileName: 'styles',
        browserify: {}, // overridable browerify options
        beforeBuildJS: function (cb) { cb(); },
        beforeBuildCSS: function (cb) { cb(); },
        sourceMaps: false, //turns on browserify debug
        resourcePrefix: '/',
        minify: true,
    };

    // Were we'll store generated source code, etc.
    this.result = {
        js: {
            fileName: '',
            source: '',
            min: ''
        },
        css: {
            fileName: '',
            source: '',
            min: ''
        }
    };

    //We'll re-add extensions later
    if (path.extname(this.config.jsFileName) === '.js') {
        this.config.jsFileName = this.jsFileName.slice(0, -3);
    }

    if (path.extname(this.config.cssFileName) === '.css') {
        this.config.cssFileName = this.cssFileName.slice(0, -4);
    }

    //Set this but let an explicity set config.browserify.debug override in the next loop
    this.config.browserify.debug = this.config.sourceMaps;

    for (item in opts) {
        this.config[item] = opts[item];
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

    //this._concatExternalLibraries();

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
    ], function (err) {
        if (err) { throw err; }
        /*
        self.result.html = self.getTemplate();
        */
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
                if (err) return next(err);
                self.result.js.source = self.result.source + js;
                next();
            });
        }
    ], done);
};

// Returns with source code for CSS or JS
// minified, if appropriate
/*
Moonboots.prototype._sendSource = function (type, cb) {
    var self = this,
        result = self.result[type],
        prepare = type === 'css' ? self.prepareCSSBundle : self.prepareBundle,
        config = self.config;

    if (config.developmentMode) {
        prepare.call(self, function (err, source) {
            // If we have an error, then make it into a JS string
            if (err) self._bundleError(err);
            cb(err, source);
        });
    } else if (config.minify) {
        cb(null, result.min);
    } else {
        cb(null, result.source);
    }
};
*/

/*Main moonboots functions*/
Moonboots.prototype.jsSource = function (cb) {
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

// Main template fetcher. Will look for passed file and settings
// or build default template.
/*
Moonboots.prototype.getTemplate = function () {
    var templateString = '';
    var prefix = this.config.resourcePrefix;
    if (this.config.templateFile) {
        templateString = fs.readFileSync(this.config.templateFile, 'utf-8');
        templateString = templateString
            .replace('#{jsFileName}', prefix + this.jsFileName())
            .replace('#{cssFileName}', prefix + this.cssFileName());
    } else {
        templateString = this._defaultTemplate();
    }
    return templateString;
};
*/

// If no custom template is specified use a standard one.
/*
Moonboots.prototype._defaultTemplate = function () {
    var string = '<!DOCTYPE html>\n';
    var prefix = this.config.resourcePrefix;
    if (this.result.css.source) {
        string += linkTag(prefix + this.cssFileName());
    }
    string += scriptTag(prefix + this.jsFileName());
    return this.result.html = string;
};
*/

// writeFiles kicks out your app HTML, JS, and CSS into a folder you specify.
/*
Moonboots.prototype.writeFiles = function (folder, callback) {
    var self = this;
    self._ensureReady(function () {
        async.parallel([
            function (cb) {
                self.sourceCode(function (err, source) {
                    if (err) return cb(err);
                    fs.writeFile(path.join(folder, self.jsFileName()), source, cb);
                });
            },
            function (cb) {
                self.cssSource(function (err, source) {
                    if (err) return cb(err);
                    fs.writeFile(path.join(folder, self.cssFileName()), source, cb);
                });
            },
            function (cb) {
                fs.writeFile(path.join(folder, 'index.html'), self.getTemplate(), cb);
            }
        ], callback);
    });
};
*/

Moonboots.prototype.getConfig = function (key) {
    var self = this;
    if (typeof key === 'string') {
        return this.config[key];
    }
    return this.config;
};

//TODO this should just be the html
/*
Moonboots.prototype.getResult = function(key, cb) {
    var self = this;
    self._ensureReady(function () {
        if (typeof key === 'string') {
            return cb(null, self.result[key]);
        }
        return cb(null, self.result);
    });
};
*/

// Main export
module.exports = Moonboots;


// a few helpers
function concatFiles(arrayOfFiles) {
    return arrayOfFiles.map(function (fileName) {
        return fs.readFileSync(fileName);
    }).join('\n');
}

/*
function linkTag(filename) {
    return '<link href="' + filename + '" rel="stylesheet" type="text/css">\n';
}

function scriptTag(filename) {
    return '<script src="' + filename + '"></script>';
}
*/

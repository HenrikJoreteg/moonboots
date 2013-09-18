var fs = require('fs');
var crypto = require('crypto');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var browserify = require('browserify');
var UglifyJS = require('uglify-js');
var cssmin = require('cssmin');
var path = require('path');


function Moonboots(opts) {
    var self = this;
    // we'll calculate this to know whether to change the filename
    var jssha = crypto.createHash('sha1');
    var csssha = crypto.createHash('sha1');
    var item;

    // inherit
    EventEmitter.call(this);

    if (!opts.main) {
        throw new Error("You must supply at minimum a `main` file for your moonboots app: {main: 'myApp.js'}");
    }

    this.config = {
        jsFileName: 'app',
        cssFileName: 'styles',
        minify: true,
        developmentMode: false,
        modulesDir: '',
        templateFile: '',
        server: '',
        cachePeriod: 86400000 * 360, // one year,
        // overridable browerify options
        browserify: {},
        sourceMaps: false,
        styles: [],
        libraries: [],
        beforeBuild: function (cb) {cb();},
        resourcePrefix: '/'
    };

    // Were we'll store generated
    // source code, etc.
    this.result = {
        source: '',
        minSource: '',
        css: '',
        html: '',
        jsFileName: '',
        jsMinFileName: '',
        checkSum: '',
        libs: ''
    };

    if (typeof opts === 'object') {
        for (item in opts) {
            this.config[item] = opts[item];
        }
    }

    // make sourcemaps a simple top-level option that only works
    // in development mode.
    if (this.config.sourceMaps && this.config.developmentMode) {
        this.config.browserify.debug = true;
    }

    // register handler for serving JS
    if (opts.server) {
        opts.server.get('/' + encodeURIComponent(this.config.jsFileName) + '*.js', this.js());
        opts.server.get('/' + encodeURIComponent(this.config.cssFileName) + '*.css', this.css());
    }

    this.concatExternalLibraries();

    async.series([
        function (cb) {
            self.prepareBundle(cb);
        },
        function (cb) {
            var jsCheckSum;
            // create our hash and build filenames accordingly
            jssha.update(self.result.source);
            jsCheckSum = self.result.jsCheckSum = jssha.digest('hex').slice(0, 8);

            // store filenames
            self.result.jsFileName = self.config.jsFileName + '.' + jsCheckSum + '.js';
            self.result.jsMinFileName = self.config.jsFileName + '.' + jsCheckSum + '.min.js';

            // css
            var cssCheckSum;
            csssha.update(self.cssSource());
            cssCheckSum = self.result.cssCheckSum = csssha.digest('hex').slice(0, 8);

            // store filenames
            self.result.cssFileName = self.config.cssFileName + '.' + cssCheckSum + '.css';
            self.result.cssMinFileName = self.config.cssFileName + '.' + cssCheckSum + '.min.css';

            // render our template
            self.result.html = self.getTemplate();

            cb();
        },
        function (cb) {
            if (self._shouldMinify()) {
                self.result.minSource = UglifyJS.minify(self.result.source, {fromString: true}).code;
            }
            cb();
        }
    ], function (err) {
        if (err) {
            self._bundleError(err);
        }
        self.ready = true;
        self.emit('ready');
    });
}

// Inherit from event emitter
Moonboots.prototype = Object.create(EventEmitter.prototype, {
    constructor: {
        value: Moonboots
    }
});

// Shows stack in browser instead of just blowing up on the server
Moonboots.prototype._bundleError = function (err) {
    if (!this.config.developmentMode) throw err;
    console.error(err.stack);
    this.result.source = 'document.write("<pre>' + err.stack.split('\n').join('<br>').replace(/"/g, '&quot;') + '</pre>");';
    return this.result.source;
};

// Returns contactenated external libraries
Moonboots.prototype.concatExternalLibraries = function () {
    var cache = this.result;
    return cache.libs || (cache.libs = concatFiles(this.config.libraries));
};

// Actually generate the JS bundle
Moonboots.prototype.prepareBundle = function (cb) {
    var self = this;

    function bundle() {
        self.bundle = browserify();

        // handle module folder that you want to be able to require
        // without relative paths.
        if (self.config.modulesDir) {
            var modules = fs.readdirSync(self.config.modulesDir);
            modules.forEach(function (moduleFileName) {
                if (path.extname(moduleFileName) === '.js') {
                    self.bundle.require(self.config.modulesDir + '/' + moduleFileName, {expose: path.basename(moduleFileName, '.js')});
                }
            });
        }

        // handle browserify transforms if passed
        if (self.config.browserify.transforms) {
            self.config.browserify.transforms.forEach(function(tr) {
                self.bundle.transform(tr);
            });
        }

        // add main import
        self.bundle.add(self.config.main);

        // run main bundle function
        self.bundle.bundle(self.config.browserify, function (err, js) {
            if (err) return cb(null, self._bundleError(err));
            self.result.source = self.result.libs + js;
            if (cb) cb(null, self.result.source);
        });
    }

    // if they pass a callback, wait for it
    if (this.config.beforeBuild.length) {
        this.config.beforeBuild(bundle);
    } else {
        this.config.beforeBuild();
        bundle();
    }
};

// Returns concatenated CSS source
Moonboots.prototype.getCSS = function (minify) {
    var css = concatFiles(this.config.stylesheets);
    return minify ? cssmin(css) : css;
};

// util for making sure files are built before trying to
// serve them
Moonboots.prototype._ensureReady = function (cb) {
    if (this.ready) {
        cb();
    } else {
        this.on('ready', cb);
    }
};

// Helper to determine if minification should happen
Moonboots.prototype._shouldMinify = function () {
    return this.config.minify && !this.config.developmentMode;
};

// Returns request handler to serve html
Moonboots.prototype.html = function () {
    var self = this;
    return function (req, res) {
        self._ensureReady(function () {
            res.set('Content-Type', 'text/html; charset=utf-8').send(self.result.html);
        });
    };
};

// Returns request handler for serving JS file
// minified, if appropriate.
Moonboots.prototype.js = function () {
    var self = this;
    return function (req, res) {
        self.sourceCode(function (source) {
            res.set('Content-Type', 'text/javascript; charset=utf-8');
            // set our far-future cache headers if not in dev mode
            if (!self.config.developmentMode) {
                res.set('Cache-Control', 'public, max-age=' + self.config.cachePeriod);
            }
            res.send(source);
        });
    };
};

// Returns request handler for serving JS file
// minified, if appropriate.
Moonboots.prototype.css = function () {
    var self = this;
    return function (req, res) {
        res.set('Content-Type', 'text/css; charset=utf-8');
            // set our far-future cache headers if not in dev mode
        if (!self.config.developmentMode) {
            res.set('Cache-Control', 'public, max-age=' + self.config.cachePeriod);
        }
        res.send(self.cssSource());
    };
};

// Return css source code
Moonboots.prototype.cssSource = function () {
    var cache = this.result;
    if (this.config.developmentMode) {
        return this.getCSS();
    } else {
        return cache.css || (cache.css = this.getCSS(this.config.minify));
    }
};

// Returns the appropriate JS sourcecode based on settings
Moonboots.prototype.sourceCode = function (cb) {
    var self = this;
    self._ensureReady(function () {
        var config = self.config;

        if (config.developmentMode) {
            self.prepareBundle(function (err, source) {
                cb(source);
            });
        } else {
            if (config.minify) {
                cb(self.result.minSource);
            } else {
                cb(self.result.source);
            }
        }
    });
};

// returns the filename of the currently built file based on
// development and minification settings.
Moonboots.prototype.jsFileName = function () {
    if (this.config.developmentMode) {
        return this.config.jsFileName + '.js';
    } else {
        return this.config.minify ? this.result.jsMinFileName : this.result.jsFileName;
    }
};

// returns the filename of the currently built file based on
// development and minification settings.
Moonboots.prototype.cssFileName = function () {
    if (this.config.developmentMode) {
        return this.config.cssFileName + '.css';
    } else {
        return this.config.minify ? this.result.cssMinFileName : this.result.cssFileName;
    }
};

// Main template fetcher. Will look for passed file and settings
// or build default template.
Moonboots.prototype.getTemplate = function () {
    var templateString = '';
    var prefix = this.config.resourcePrefix;
    if (this.config.templateFile) {
        templateString = fs.readFileSync(this.config.templateFile, 'utf-8');
        templateString = templateString
            .replace('#{jsFileName}', prefix + this.jsFileName())
            .replace('#{cssFileName}', prefix + this.cssFileName());
    } else {
        templateString = this.defaultTemplate();
    }
    return templateString;
};

// If no custom template is specified use a standard one.
Moonboots.prototype.defaultTemplate = function () {
    var string = '<!DOCTYPE html>\n';
    var prefix = this.config.resourcePrefix;
    if (this.getCSS()) {
        string += linkTag(prefix + this.cssFileName());
    }
    string += scriptTag(prefix + this.jsFileName());
    return this.result.html = string;
};

// Build kicks out your app HTML, JS, and CSS into a folder you specify.
Moonboots.prototype.build = function (folder, callback) {
    var self = this;
    this.sourceCode(function (source) {
        async.parallel([
            function (cb) {
                fs.writeFile(path.join(folder, self.jsFileName()), source, cb);
            },
            function (cb) {
                fs.writeFile(path.join(folder, self.cssFileName()), self.cssSource(), cb);
            },
            function (cb) {
                fs.writeFile(path.join(folder, 'index.html'), self.getTemplate(), cb);
            }
        ], callback);
    });
};

// Main export
module.exports = Moonboots;


// a few helpers
function concatFiles(arrayOfFiles) {
    return (arrayOfFiles || []).reduce(function (result, fileName) {
        return result + fs.readFileSync(fileName) + '\n';
    }, '');
}

function linkTag(filename) {
    return '<link href="' + filename + '" rel="stylesheet" type="text/css">\n';
}

function scriptTag(filename) {
    return '<script src="' + filename + '"></script>';
}

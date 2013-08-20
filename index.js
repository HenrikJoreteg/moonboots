var fs = require('fs');
var crypto = require('crypto');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var browserify = require('browserify');
var UglifyJS = require('uglify-js');


function Moonboots(opts, cb) {
    var self = this;
    // we'll calculate this to know whether to change the filename
    var shasum = crypto.createHash('sha1');
    var item;

    // inherit
    EventEmitter.call(this);

    if (!opts.main) {
        throw new Error("You must supply at minimum a `main` file for your moonboots app: {main: 'myApp.js'}");
    }

    this.config = {
        fileName: 'app',
        minify: true,
        developmentMode: false,
        templateFile: __dirname + '/sample/app.html',
        server: '',
        cachePeriod: 86400000 * 360, // one year,
        // overridable browerify options
        browserify: {
            // enables sourcemaps in development mode
            debug: opts.developmentMode
        }
    };

    // Were we'll store generated
    // source code, etc.
    this.result = {
        source: '',
        minSource: '',
        html: '',
        fileName: '',
        minFileName: '',
        checkSum: '',
        libs: ''
    };

    if (typeof opts === 'object') {
        for (item in opts) {
            this.config[item] = opts[item];
        }
    }

    // register handler for serving JS
    if (opts.server) {
        opts.server.get('/' + this.config.fileName + '*.js', this.js());
    }

    this.concatExternalLibraries();

    async.series([
        function (cb) {
            self.prepareBundle(cb);
        },
        function (cb) {
            var checkSum;
            // create our hash and build filenames accordingly
            shasum.update(self.result.source);
            checkSum = self.result.checkSum = shasum.digest('hex').slice(0, 8);
            self.result.fileName = self.config.fileName + '.' + checkSum + '.js';
            self.result.minFileName = self.config.fileName + '.' + checkSum + '.min.js';
            cb();
        },
        function (cb) {
            fs.readFile(self.config.templateFile || __dirname + 'template.html', function (err, buffer) {
                // ignore if we can't read template file
                if (err) return cb();
                self.result.html = buffer.toString().replace('#{fileName}', '/' + self.fileName());
                cb();
            });
        },
        function (cb) {
            if (!self.config.developmentMode && self.config.minify) {
                self.result.minSource = UglifyJS.minify(self.result.source, {fromString: true}).code;
            }
            cb();
        }
    ], function (err) {
        if (err) throw err;
        self.ready = true;
        self.emit('ready');
    });
}

// inherit
Moonboots.prototype = Object.create(EventEmitter.prototype, {
    constructor: {
        value: Moonboots
    }
});

Moonboots.prototype.concatExternalLibraries = function () {
    if (this.result.libs) return this.result.libs;
    var libs = this.config.libraries || [];
    var result = '';

    libs.forEach(function (file) {
        result += (fs.readFileSync(file) + '\n');
    });

    this.result.libs = result;
};

Moonboots.prototype.prepareBundle = function (cb) {
    var self = this;

    this.bundle = browserify();
    this.bundle.add(self.config.main);
    this.bundle.bundle(this.config.browserify, function (err, js) {
        if (err) throw err;
        self.result.source = self.result.libs + js;
        if (cb) cb();
    });
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

// returns request handler to serve html
Moonboots.prototype.html = function () {
    var self = this;
    return function (req, res) {
        self._ensureReady(function () {
            res.set('Content-Type', 'text/html; charset=utf-8').send(self.result.html);
        });
    };
};

// returns request handler for serving JS file
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

// returns the appropriate sourcecode based on settings
Moonboots.prototype.sourceCode = function (cb) {
    var self = this;
    self._ensureReady(function () {
        if (self.config.minify && !self.config.developmentMode) {
            cb(self.result.minSource);
        } else {
            cb(self.result.source);
        }
    });
};

// returns the filename of the currently built file based on
// development and minification settings.
Moonboots.prototype.fileName = function () {
    if (this.config.developmentMode) {
        return this.config.fileName + '.js';
    } else {
        return this.config.minify ? this.result.minFileName : this.result.fileName;
    }
};

module.exports = Moonboots;

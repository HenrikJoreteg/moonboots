var fs = require('fs'),
    crypto = require('crypto'),
    stitch = require('stitch'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter,
    UglifyJS = require('uglify-js');


function Moonboots(opts, cb) {
    var self = this,
        shasum = crypto.createHash('sha1'),
        // we'll calculate this to know whether to change the filename
        libs,
        item;

    // inherit
    EventEmitter.call(this);

    if (!opts.dir) {
        throw new Error("You must supply at minimum a directory name where your app lives: {dir: 'myApp'}");
    }

    this.config = {
        dir: opts.dir,
        fileName: 'app',
        clientModules: [opts.dir + '/modules', opts.dir + '/app'],
        dependencyFolder: opts.dir + '/libraries',
        minify: true,
        developmentMode: false,
        templateFile: __dirname + '/sample/app.html',
        server: '',
        cachePeriod: 86400000 * 360 // one year
    };

    // Were we'll store generated
    // source code, etc.
    this.result = {
        source: '',
        minSource: '',
        html: '',
        fileName: '',
        minFileName: '',
        checkSum: ''
    };

    if (typeof opts === 'object') {
        for (item in opts) {
            this.config[item] = opts[item];
        }
    }

    // build out full paths for our libraries
    libs = (this.config.libraries || []).map(function (lib) {
        return self.config.dependencyFolder + '/' + lib;
    });

    // our stitch package
    this.stitchPackage = stitch.createPackage({
        paths: this.config.clientModules,
        dependencies: libs
    });

    // register handler for serving JS
    if (opts.server) {
        opts.server.get('/' + this.config.fileName + '*.js', this.js());
    }

    async.series([
        function (cb) {
            self.stitchPackage.compile(function (err, js) {
                if (err) throw err;
                self.result.source = js;
                cb();
            });
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
            fs.readFile(self.config.templateFile, function (err, buffer) {
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
// minified,
Moonboots.prototype.js = function () {
    var self = this;
    if (this.config.developmentMode) {
        return this.stitchPackage.createServer();
    } else {
        return function (req, res) {
            self._ensureReady(function () {
                res.set('Content-Type', 'text/javascript; charset=utf-8');
                // set our far-future cache headers
                res.set('Cache-Control', 'public, max-age=' + self.config.cachePeriod);
                if (self.config.minify) {
                    res.send(self.result.minSource);
                } else {
                    res.send(self.result.source);
                }
            });
        };
    }
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

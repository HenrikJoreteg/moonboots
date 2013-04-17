var fs = require('fs'),
    crypto = require('crypto'),
    stitch = require('stitch'),
    _ = require('underscore'),
    async = require('async'),
    rmrf = require('rimraf'),
    ecstatic = require('ecstatic'),
    watch = require('watch'),
    UglifyJS = require('uglify-js');


function NoduleApp(opts, cb) {
    var self = this;

    if (!opts.dir) {
        throw new Error("You must supply at minimum a directory name where your app lives: {dir: 'myApp'}");
    }
    this.config = _.defaults(opts || {}, {
        fileName: 'app',
        dependencies: [],
        clientModules: [opts.dir + '/modules', opts.dir + '/app'],
        dependencyFolder: opts.dir + '/libraries',
        minify: true,
        dev: false,
        templateFile: opts.dir + '/app.html',
        buildDir: opts.dir + '/.build'
    });

    // build out full paths for our libraries
    var libs = (this.config.libraries || []).map(function (lib) {
        return self.config.dependencyFolder + '/' + lib;
    });

    opts.server.use(ecstatic({
        root: this.config.buildDir,
        cache: 86400 * 360 // ~1 year
    }));

    // our stitch package
    this.stitchPackage = stitch.createPackage({
        paths: this.config.clientModules,
        dependencies: libs
    });

    this._prepareFiles();

    if (this.config.dev) {
        opts.server.get('/' + this.config.fileName + '.js', this.stitchPackage.createServer());
        /*
        watch.watchTree(opts.dir ,function (filename) {
            if (typeof filename === 'string' && filename.indexOf(self.config.buildDir) === -1) {
                self._prepareFiles();
            }
        });
        */
    }
}

NoduleApp.prototype._prepareFiles = function (mainCb) {
    if (mainCb && this.source) {
        return mainCb();
    }

    var self = this,
        shasum = crypto.createHash('sha1'),
        // we'll calculate this to know whether to change the filename
        checkSum;

    async.series([
        function (cb) {
            rmrf(self.config.buildDir, function () {
                cb();
            });
        },
        async.apply(fs.mkdir, self.config.buildDir),
        function (cb) {
            self.stitchPackage.compile(function (err, js) {
                if (err) throw err;
                self.source = js;
                cb();
            });
        },
        function (cb) {
            // create our hash and build filenames accordingly
            shasum.update(self.source);
            checkSum = shasum.digest('hex').slice(0, 5);
            self._fileName = self.config.fileName + '.' + checkSum + '.js';
            self._minFileName = self.config.fileName + '.' + checkSum + '.min.js';
            cb();
        },
        function (cb) {
            fs.writeFile(self.config.buildDir + '/' + self._fileName, self.source, cb);
        },
        function (cb) {
            self.minifiedSource = UglifyJS.minify(self.config.buildDir + '/' + self._fileName).code;
            fs.writeFile(self.config.buildDir + '/' + self._minFileName, self.minifiedSource, cb);
        },
        function (cb) {
            fs.readFile(self.config.templateFile, function (err, buffer) {
                var file = self.config.minify ? self._minFileName : self._fileName;
                if (self.config.dev) {
                    file = self.config.fileName + '.js'
                }
                self._html = buffer.toString().replace('#{fileName}', '/' + file);
                cb();
            });
        }
    ], function () {
        if (self.config.dev) {
            console.log('Nodule: app files built and written.');
        }
        mainCb && mainCb();
    });
};

NoduleApp.prototype.html = function () {
    var self = this;
    return function (req, res) {
        self._prepareFiles(function () {
            res.set('Content-Type', 'text/html').status(200).send(self._html);
        });
    };
};

NoduleApp.prototype.fileName = function () {
    return this.config.minify ? this._minFileName : this._fileName;
};

module.exports = NoduleApp;

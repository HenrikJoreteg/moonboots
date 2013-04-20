var fs = require('fs'),
    crypto = require('crypto'),
    stitch = require('stitch'),
    _ = require('underscore'),
    async = require('async'),
    rmrf = require('rimraf'),
    ecstatic = require('ecstatic'),
    watch = require('watch'),
    templatizer = require('templatizer'),
    UglifyJS = require('uglify-js');


function Rocket(opts, cb) {
    var self = this;

    if (!opts.dir) {
        throw new Error("You must supply at minimum a directory name where your app lives: {dir: 'myApp'}");
    }
    this.config = _.defaults(opts || {}, {
        dir: opts.dir,
        fileName: 'app',
        dependencies: [],
        clientModules: [opts.dir + '/modules', opts.dir + '/app'],
        dependencyFolder: opts.dir + '/libraries',
        minify: true,
        dev: false,
        templateFile: opts.dir + '/app.html',
        buildDir: opts.dir + '/.build',
        templatesDir: opts.dir + '/templates',
        templatesFile: opts.dir + '/modules/templates.js',
        serveStaticFiles: true
    });

    // build out full paths for our libraries
    var libs = (this.config.libraries || []).map(function (lib) {
        return self.config.dependencyFolder + '/' + lib;
    });

    if (this.config.serveStaticFiles) {
        opts.server.use(ecstatic({
            root: this.config.buildDir,
            cache: 86400 * 360 // ~1 year
        }));
    }

    // our stitch package
    this.stitchPackage = stitch.createPackage({
        paths: this.config.clientModules,
        dependencies: libs
    });

    if (this.config.dev) {
        this.compileTemplates();
        opts.server.get('/' + this.config.fileName + '.js', this.stitchPackage.createServer());
        watch.watchTree(this.config.templatesDir, function (filename) {
            self.compileTemplates();
        });
    } else {
        this._prepareFiles();
    }
}

RocketApp.prototype._prepareFiles = function (mainCb) {
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
                // ignore if we can't read template file
                if (err) return cb();
                self._html = buffer.toString().replace('#{fileName}', '/' + self.fileName());
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

RocketApp.prototype.html = function () {
    var self = this;
    return function (req, res) {
        self._prepareFiles(function () {
            res.set('Content-Type', 'text/html').status(200).send(self._html);
        });
    };
};

RocketApp.prototype.fileName = function () {
    if (this.config.dev) {
        return this.config.fileName + '.js';
    } else {
        return this.config.minify ? this._minFileName : this._fileName;
    }
};

RocketApp.prototype.compileTemplates = function () {
    templatizer(this.config.templatesDir, this.config.templatesFile);
};

module.exports = RocketApp;

var fs = require('fs'),
    crypto = require('crypto'),
    stitch = require('stitch'),
    _ = require('underscore'),
    async = require('async'),
    rmrf = require('rimraf'),
    UglifyJS = require('uglify-js');


module.exports = function (app, opts) {
    if (!app) {
        throw Error('You have to pass in an app');
    }

    // base directory based on app entry point
    var baseDir = require.main.dirname,
        // config object for all our settings
        config = _.defaults(opts || {}, {
            fileName: 'app',
            dependencies: [],
            clientModules: ['clientmodules', 'clientapp'],
            dependencyFolder: baseDir + '/public',
            writeFile: true,
            minify: true,
            dev: false,
            templateFile: 'index.html',
            buildDir: '_build'
        }),
        shasum = crypto.createHash('sha1'),
        // our stitch package
        stitchPackage = stitch.createPackage({
            paths: config.clientModules,
            dependencies: config.dependencies
        }),
        // file name of minified file
        minFileName,
        // file name of non-minified JS file
        fileName,
        // holder for our compiled source
        source,
        minifiedSource,
        // we'll calculate this to know whether to change the filename
        checkSum,
        template,
        cacheHeaders = {
            'Content-Type': 'text/javascript',
            'Cache-Control': 'max-age=' + 86400 * 360 + ', public' // ~1 year
        };

    async.series([
        function (cb) {
            rmrf(config.buildDir, function () {
                cb();
            });
        },
        async.apply(fs.mkdir, config.buildDir),
        function (cb) {
            stitchPackage.compile(function (err, js) {
                source = js;
                cb();
            });
        },
        function (cb) {
            fs.readFile(config.templateFile, function (err, buffer) {
                template = buffer.toString();
                cb();
            });
        },
        function (cb) {
            // create our hash and build filenames accordingly
            shasum.update(source);
            checkSum = shasum.digest('hex').slice(0, 5);
            config.fileName += '.' + checkSum;
            fileName = config.fileName + '.js'
            minFileName = config.fileName + '.min.js'
            cb();
        },
        function (cb) {
            fs.writeFile(config.buildDir + '/' + fileName, source, cb);
        },
        function (cb) {
            minifiedSource = UglifyJS.minify(config.buildDir + '/' + fileName).code;
            fs.writeFile(config.buildDir + '/' + minFileName, minifiedSource, cb);
        }
    ], function () {
        app.get('/', function (req, res) {
            var file = config.minify ? minFileName : fileName;
            res.send(template.replace('#{fileName}', '/' + file), 200);
        });

        if (config.dev) {
            app.get('/' + fileName, stitchPackage.createServer());
        } else {
            if (config.minify) {
                app.get('/' + minFileName, function (req, res) {
                    res.set(cacheHeaders).send(minifiedSource);
                });
            } else {
                app.get('/' + fileName, function (req, res) {
                    res.set(cacheHeaders).send(source);
                });
            }
        }
    });
}

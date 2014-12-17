var Lab = require('lab');
var async = require('async');
var os = require('os');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Moonboots = require('..');
var moonboots;

Lab.experiment('files get read from buildDirectory', function () {
    var tmpHash = crypto.randomBytes(16).toString('hex');
    var buildDir = path.join(os.tmpdir(), tmpHash);
    Lab.before(function (done) {
        async.series([
            function (next) {
                fs.mkdir(buildDir, next);
            },
            function (next) {
                fs.writeFile(path.join(buildDir, 'app.deadbeef.min.js'), 'javascript!' + tmpHash, next);
            },
            function (next) {
                fs.writeFile(path.join(buildDir, 'app.deadbeef.min.css'), 'cascading stylesheets!' + tmpHash, next);
            },
            function (next) {
                fs.writeFile(path.join(buildDir, 'readme.md'), '# this file will be ignored in the builddir', next);
            }
        ], function () {
            var options = {
                main: __dirname + '/../fixtures/app/app.js',
                jsFileName: 'app',
                cssFileName: 'app',
                buildDirectory: buildDir,
                stylesheets: [
                    __dirname + '/../fixtures/stylesheets/style.css'
                ]
            };
            moonboots = new Moonboots(options);
            moonboots.on('ready', done);
        });
    });
    Lab.after(function (done) {
        async.series([
            function (next) {
                fs.unlink(path.join(buildDir, 'app.deadbeef.min.js'), next);
            },
            function (next) {
                fs.unlink(path.join(buildDir, 'app.deadbeef.min.css'), next);
            },
            function (next) {
                fs.unlink(path.join(buildDir, 'readme.md'), next);
            },
            function (next) {
                fs.rmdir(buildDir, next);
            }
        ], function (err) {
            if (err) {throw err; }
            done();
        });
    });
    Lab.test('htmlContext', function (done) {
        var context = moonboots.htmlContext();
        Lab.expect(context).to.have.keys('jsFileName', 'cssFileName');
        Lab.expect(context.jsFileName).to.equal('app.deadbeef.min.js');
        Lab.expect(context.cssFileName).to.equal('app.deadbeef.min.css');
        done();
    });
    Lab.test('js', function (done) {
        moonboots.jsSource(function (err, js) {
            Lab.expect(js).to.equal('javascript!' + tmpHash);
            done();
        });
    });
    Lab.test('css', function (done) {
        moonboots.cssSource(function (err, css) {
            Lab.expect(css).to.equal('cascading stylesheets!' + tmpHash);
            done();
        });
    });
});

Lab.experiment('Files get written to build directory', function () {
    var tmpHash = crypto.randomBytes(16).toString('hex');
    var buildDir = path.join(os.tmpdir(), tmpHash);
    Lab.before(function (done) {
        fs.mkdir(buildDir, function () {
            var options = {
                main: __dirname + '/../fixtures/app/app.js',
                jsFileName: 'app',
                cssFileName: 'app',
                buildDirectory: buildDir,
                stylesheets: [
                    __dirname + '/../fixtures/stylesheets/style.css'
                ],
                libraries: [
                    __dirname + '/../fixtures/libraries/iife-no-semicolon.js',
                    __dirname + '/../fixtures/libraries/lib.js'
                ]
            };
            moonboots = new Moonboots(options);
            moonboots.on('ready', done);
        });
    });
    Lab.after(function (done) {
        async.series([
            function (next) {
                fs.unlink(path.join(buildDir, 'app.3adb4850.min.js'), next);
            },
            function (next) {
                fs.unlink(path.join(buildDir, 'app.38ea6c96.min.css'), next);
            },
            function (next) {
                fs.rmdir(buildDir, next);
            }
        ], function (err) {
            if (err) {throw err; }
            done();
        });
    });
    Lab.test('js file was written', function (done) {
        var jsFileName = moonboots.jsFileName();
        var filePath = path.join(buildDir, jsFileName);
        Lab.expect(jsFileName).to.equal('app.3adb4850.min.js');
        fs.readFile(filePath, 'utf8', function (err) {
            Lab.expect(err).to.not.be.ok;
            // Test that iife-no-semicolon.js doesn't introduce a parsing bug
            // via a (function () {…})\n(function () {…}) sequence
            Lab.expect(function () { require(filePath); }).to.not.throw();
            done();
        });
    });
    Lab.test('css file was written', function (done) {
        var cssFileName = moonboots.cssFileName();
        Lab.expect(cssFileName).to.equal('app.38ea6c96.min.css');
        fs.readFile(path.join(buildDir, cssFileName), 'utf8', function (err) {
            Lab.expect(err).to.not.be.ok;
            done();
        });
    });
});

var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();
var async = require('async');
var os = require('os');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Moonboots = require('..');
var moonboots;

lab.experiment('files get read from buildDirectory', function () {
    var tmpHash = crypto.randomBytes(16).toString('hex');
    var buildDir = path.join(os.tmpdir(), tmpHash);
    lab.before(function (done) {
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
    lab.after(function (done) {
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
    lab.test('htmlContext', function (done) {
        var context = moonboots.htmlContext();
        Code.expect(context).to.include(['jsFileName', 'cssFileName']);
        Code.expect(context.jsFileName).to.equal('app.deadbeef.min.js');
        Code.expect(context.cssFileName).to.equal('app.deadbeef.min.css');
        done();
    });
    lab.test('js', function (done) {
        moonboots.jsSource(function (err, js) {
            Code.expect(js).to.equal('javascript!' + tmpHash);
            done();
        });
    });
    lab.test('css', function (done) {
        moonboots.cssSource(function (err, css) {
            Code.expect(css).to.equal('cascading stylesheets!' + tmpHash);
            done();
        });
    });
});

lab.experiment('Files get written to build directory', function () {
    var tmpHash = crypto.randomBytes(16).toString('hex');
    var buildDir = path.join(os.tmpdir(), tmpHash);
    lab.before(function (done) {
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
    lab.after(function (done) {
        async.series([
            function (next) {
                fs.unlink(path.join(buildDir, 'app.9b1ed6d6.min.js'), next);
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
    lab.test('js file was written', function (done) {
        var jsFileName = moonboots.jsFileName();
        var filePath = path.join(buildDir, jsFileName);
        Code.expect(jsFileName).to.equal('app.9b1ed6d6.min.js');
        fs.readFile(filePath, 'utf8', function (err) {
            Code.expect(err).to.not.be.ok;
            // Test that iife-no-semicolon.js doesn't introduce a parsing bug
            // via a (function () {…})\n(function () {…}) sequence
            Code.expect(function () { require(filePath); }).to.not.throw();
            done();
        });
    });
    lab.test('css file was written', function (done) {
        var cssFileName = moonboots.cssFileName();
        Code.expect(cssFileName).to.equal('app.38ea6c96.min.css');
        fs.readFile(path.join(buildDir, cssFileName), 'utf8', function (err) {
            Code.expect(err).to.not.be.ok;
            done();
        });
    });
});

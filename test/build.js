var Lab = require('lab');
var async = require('async');
var os = require('os');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Moonboots = require('..');
var moonboots;
var tmpHash = crypto.randomBytes(16).toString('hex');
var buildDir = os.tmpdir() + tmpHash;

Lab.experiment('files get built', function () {
    Lab.before(function (done) {
        async.parallel([
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
        ], function (err) {
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


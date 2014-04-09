var Lab = require('lab');
var Moonboots = require('..');
var moonboots;

Lab.experiment('error states', function () {
    Lab.test('missing main options', function (done) {
        function initBad() {
            moonboots = new Moonboots({});
        }
        Lab.expect(initBad).to.throw(Error);
        done();
    });
    Lab.test('invalid options', function (done) {
        function initEmpty() {
            moonboots = new Moonboots();
        }
        Lab.expect(initEmpty).to.throw(Error);
        done();
    });
    Lab.test('invalid build directory', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ],
            buildDirectory: __dirname + '/nonexistant'
        });
        moonboots.on('ready', function () {
            var context = moonboots.htmlContext();
            Lab.expect(context.jsFileName).to.equal('app.882ddd9b.min.js');
            done();
        });
    });
    Lab.test('unreadable build js file', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ],
            buildDirectory: __dirname + '/../fixtures/build1'
        });
        moonboots.on('ready', function () {
            var context = moonboots.htmlContext();
            Lab.expect(context.jsFileName).to.equal('app.882ddd9b.min.js');
            done();
        });
    });
    Lab.test('unreadable build css file', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            buildDirectory: __dirname + '/../fixtures/build2'
        });
        moonboots.on('ready', function () {
            var context = moonboots.htmlContext();
            Lab.expect(context.jsFileName).to.equal('app.882ddd9b.min.js');
            done();
        });
    });
    Lab.test('browserify error in development mode', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/badapp.js',
            developmentMode: true
        });
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, source) {
                Lab.expect(source.indexOf('document.write'), 'inline error').to.equal(0);
                Lab.expect(source.indexOf("Error: module &quot;foo&quot; not found"), 'inline error').to.not.equal(-1);
                done();
            });
        });
    });
    Lab.test('browserify error not in development mode', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/badapp.js'
        });
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, source) {
                Lab.expect(source.indexOf('document.write'), 'inline error').to.equal(-1);
                done();
            });
        });
    });
    Lab.test('beforeBuildJS error in development mode', function (done) {
        var errMsg = 'This is a before build error!';
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            developmentMode: true,
            beforeBuildJS: function (cb) {
                cb(new Error(errMsg));
            }
        });
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, source) {
                Lab.expect(source.indexOf('document.write'), 'inline error').to.equal(0);
                Lab.expect(source.indexOf(errMsg), 'inline error').to.not.equal(-1);
                done();
            });
        });
    });
    Lab.test('beforeBuildJS errors without an error object', function (done) {
        var errMsg = 'This is a before build error!';
        var errMsgKey = 'errorMessage';
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            developmentMode: true,
            beforeBuildJS: function (cb) {
                var err = {};
                err[errMsgKey] = errMsg;
                cb(err);
            }
        });
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, source) {
                Lab.expect(source.indexOf('document.write'), 'inline error').to.equal(0);
                Lab.expect(source.indexOf(errMsg), 'inline error').to.not.equal(-1);
                Lab.expect(source.indexOf(errMsgKey), 'inline error').to.not.equal(-1);
                done();
            });
        });
    });
    Lab.test('beforeBuildJS error not in development mode', function (done) {
        var errMsg = 'This is a before build error!';
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            beforeBuildJS: function (cb) {
                cb(new Error(errMsg));
            }
        });
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, source) {
                Lab.expect(source, 'inline error').to.equal('');
                done();
            });
        });
    });
});

var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();
var Moonboots = require('..');
var domain = require('domain');
var moonboots;

lab.experiment('error states', function () {
    lab.test('missing main options', function (done) {
        function initBad() {
            moonboots = new Moonboots({});
        }
        Code.expect(initBad).to.throw(Error);
        done();
    });
    lab.test('invalid options', function (done) {
        function initEmpty() {
            moonboots = new Moonboots();
        }
        Code.expect(initEmpty).to.throw(Error);
        done();
    });
    lab.test('invalid build directory', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ],
            buildDirectory: __dirname + '/nonexistant'
        });
        moonboots.on('ready', function () {
            var context = moonboots.htmlContext();
            Code.expect(context.jsFileName).to.equal('app.794c89f5.min.js');
            done();
        });
    });
    lab.test('unreadable build js file', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ],
            buildDirectory: __dirname + '/../fixtures/build1'
        });
        moonboots.on('ready', function () {
            var context = moonboots.htmlContext();
            Code.expect(context.jsFileName).to.equal('app.794c89f5.min.js');
            done();
        });
    });
    lab.test('unreadable build css file', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            buildDirectory: __dirname + '/../fixtures/build2'
        });
        moonboots.on('ready', function () {
            var context = moonboots.htmlContext();
            Code.expect(context.jsFileName).to.equal('app.248957fa.min.js');
            done();
        });
    });
    lab.test('browserify error in development mode', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/badapp.js',
            developmentMode: true
        });
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, source) {
                Code.expect(source.indexOf('document.write'), 'inline error').to.equal(0);
                Code.expect(source.indexOf("Error: Cannot find module 'not-a-module' from"), 'inline error').to.not.equal(-1);
                done();
            });
        });
    });
    lab.test('browserify error not in development mode should throw', function (done) {
        var errDomain = domain.create();

        errDomain.run(function () {
            moonboots = new Moonboots({
                main: __dirname + '/../fixtures/app/badapp.js'
            });
        });

        errDomain.on('error', function (e) {
            Code.expect(e.message).to.match(/not found/);
            done();
        });
    });
    lab.test('beforeBuildJS error in development mode', function (done) {
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
                Code.expect(source.indexOf('document.write'), 'inline error').to.equal(0);
                Code.expect(source.indexOf(errMsg), 'inline error').to.not.equal(-1);
                done();
            });
        });
    });
    lab.test('beforeBuildJS errors without an error object', function (done) {
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
                Code.expect(source.indexOf('document.write'), 'inline error').to.equal(0);
                Code.expect(source.indexOf(errMsg), 'inline error').to.not.equal(-1);
                Code.expect(source.indexOf(errMsgKey), 'inline error').to.not.equal(-1);
                done();
            });
        });
    });
    lab.test('beforeBuildJS error not in development mode should throw', function (done) {
        var errDomain = domain.create();
        var errMsg = 'This is a before build error!';

        errDomain.run(function () {
            moonboots = new Moonboots({
                main: __dirname + '/../fixtures/app/app.js',
                beforeBuildJS: function (cb) {
                    cb(new Error(errMsg));
                }
            });
        });

        errDomain.on('error', function (e) {
            Code.expect(e.message).to.equal(errMsg);
            done();
        });
    });
});

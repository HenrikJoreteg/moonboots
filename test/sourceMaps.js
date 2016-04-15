var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();
var Moonboots = require('..');
var moonboots;

lab.experiment('sourceMaps option sets browserify.debug', function () {
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            sourceMaps: true
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });

    lab.test('filename', function (done) {
        Code.expect(moonboots.config.browserify.debug).to.equal(true);
        done();
    });
});

lab.experiment('default is false', function () {
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app'
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });

    lab.test('filename', function (done) {
        Code.expect(moonboots.config.browserify.debug).to.equal(false);
        done();
    });
});

lab.experiment('sourceMaps option can be overwritten by browserify.debug', function () {
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            sourceMaps: true,
            browserify: {
                debug: false
            }
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });

    lab.test('filename', function (done) {
        Code.expect(moonboots.config.browserify.debug).to.equal(false);
        done();
    });
});
var Lab = require('lab');
var Moonboots = require('..');
var moonboots;

Lab.experiment('sourceMaps option sets browserify.debug', function () {
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            sourceMaps: true
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });

    Lab.test('filename', function (done) {
        Lab.expect(moonboots.config.browserify.debug).to.equal(true);
        done();
    });
});

Lab.experiment('default is false', function () {
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app'
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });

    Lab.test('filename', function (done) {
        Lab.expect(moonboots.config.browserify.debug).to.equal(false);
        done();
    });
});

Lab.experiment('sourceMaps option can be overwritten by browserify.debug', function () {
    Lab.before(function (done) {
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

    Lab.test('filename', function (done) {
        Lab.expect(moonboots.config.browserify.debug).to.equal(false);
        done();
    });
});
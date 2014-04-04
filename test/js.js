var Lab = require('lab');
var async = require('async');
var Moonboots = require('..');
var moonboots;


Lab.experiment('js with default options', function () {
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app'
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    Lab.test('filename', function (done) {
        Lab.expect(moonboots.jsFileName(), 'js filename').to.equal('app.882ddd9b.min.js');
        done();
    });
    /*
    Lab.test('content', function (done) {
        Lab.expect(moonboots.jsSource(), 'js source').to.equal('how do we even test this?');
        done();
    });
   */
});

Lab.experiment('js with no minify', function () {
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            cssFileName: 'app',
            minify: false
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    Lab.test('filename', function (done) {
        Lab.expect(moonboots.jsFileName(), 'js filename').to.equal('app.882ddd9b.js');
        done();
    });
    /*
    Lab.test('content', function (done) {
        Lab.expect(moonboots.jsSource(), 'js source').to.equal('how do we even test this?');
        done();
    });
   */
});

Lab.experiment('modulesDir', function () {
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            modulesDir: __dirname + '/../fixtures/modules'
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    Lab.test('module foo is in source', function (done) {
        Lab.expect(moonboots.jsSource(), 'js source').to.contain('exports="foo"');
        done();
    });
});

Lab.experiment('beforeBuildJS', function () {
    var beforeRan = false;
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            minify: false,
            beforeBuildJS: function (next) {
                beforeRan = true;
                next();
            }
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    Lab.test('ran', function (done) {
        Lab.expect(beforeRan).to.equal(true);
        done();
    });
});

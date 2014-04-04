var Lab = require('lab');
var async = require('async');
var Moonboots = require('..');
var moonboots;


Lab.experiment('css with default options', function () {
    Lab.before(function (done) {
        var default_options = {
            main: __dirname + '/../fixtures/app/app.js',
            cssFileName: 'app',
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ]
        };
        moonboots = new Moonboots(default_options);
        moonboots.on('ready', done);
    });
    Lab.test('filename', function (done) {
        Lab.expect(moonboots.cssFileName(), 'css filename').to.equal('app.38ea6c96.min.css');
        done();
    });
    Lab.test('content', function (done) {
        moonboots.cssSource(function (err, css) {
            Lab.expect(css, 'css source').to.equal('body{background:#ccc}');
        });
        done();
    });
});

Lab.experiment('css with no minify', function () {
    Lab.before(function (done) {
        var no_minify = {
            main: __dirname + '/../fixtures/app/app.js',
            cssFileName: 'app',
            minify: false,
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ]
        };
        moonboots = new Moonboots(no_minify);
        moonboots.on('ready', done);
    });
    Lab.test('filename', function (done) {
        Lab.expect(moonboots.cssFileName(), 'css filename').to.equal('app.38ea6c96.css');
        done();
    });
    Lab.test('content', function (done) {
        moonboots.cssSource(function (err, css) {
            Lab.expect(css, 'css source').to.equal('body {background: #ccc;}\n');
        });
        done();
    });
});

Lab.experiment('css with .css already added', function () {
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            cssFileName: 'app.css',
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ]
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    Lab.test('filename', function (done) {
        Lab.expect(moonboots.cssFileName(), 'css filename').to.equal('app.38ea6c96.min.css');
        done();
    });
});


Lab.experiment('beforeBuildCSS', function () {
    var beforeRan = false;
    Lab.before(function (done) {
        var no_minify = {
            main: __dirname + '/../fixtures/app/app.js',
            cssFileName: 'app',
            minify: false,
            beforeBuildCSS: function (next) {
                beforeRan = true;
                next();
            },
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ]
        };
        moonboots = new Moonboots(no_minify);
        moonboots.on('ready', done);
    });
    Lab.test('ran', function (done) {
        Lab.expect(beforeRan).to.equal(true);
        done();
    });
});

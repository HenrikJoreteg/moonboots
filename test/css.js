var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();
var Moonboots = require('..');
var moonboots;
var EXPECTED_CSS_HASH = 'app.38ea6c96.css';
var EXPECTED_CSS_MIN_HASH = 'app.38ea6c96.min.css';


lab.experiment('css with default options', function () {
    lab.before(function (done) {
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
    lab.test('filename', function (done) {
        Code.expect(moonboots.cssFileName(), 'css filename').to.equal(EXPECTED_CSS_MIN_HASH);
        done();
    });
    lab.test('content', function (done) {
        moonboots.cssSource(function (err, css) {
            Code.expect(css, 'css source').to.equal('body{background:#ccc}');
        });
        done();
    });
});

lab.experiment('css with no minify', function () {
    lab.before(function (done) {
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
    lab.test('filename', function (done) {
        Code.expect(moonboots.cssFileName(), 'css filename').to.equal(EXPECTED_CSS_HASH);
        done();
    });
    lab.test('content', function (done) {
        moonboots.cssSource(function (err, css) {
            Code.expect(css, 'css source').to.equal('body {background: #ccc;}\n');
        });
        done();
    });
});

lab.experiment('css with .css already added', function () {
    lab.before(function (done) {
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
    lab.test('filename', function (done) {
        Code.expect(moonboots.cssFileName(), 'css filename').to.equal(EXPECTED_CSS_MIN_HASH);
        done();
    });
});


lab.experiment('async beforeBuildCSS', function () {
    var beforeRan = false;
    lab.before(function (done) {
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
    lab.test('ran', function (done) {
        Code.expect(beforeRan).to.equal(true);
        done();
    });
});

lab.experiment('sync beforeBuildCSS', function () {
    var beforeRan = false;
    lab.before(function (done) {
        var no_minify = {
            main: __dirname + '/../fixtures/app/app.js',
            cssFileName: 'app',
            minify: false,
            beforeBuildCSS: function () {
                beforeRan = true;
            },
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ]
        };
        moonboots = new Moonboots(no_minify);
        moonboots.on('ready', done);
    });
    lab.test('ran', function (done) {
        Code.expect(beforeRan).to.equal(true);
        done();
    });
});

lab.experiment('bad css', function () {
    lab.before(function (done) {
        var bad_css = {
            main: __dirname + '/../fixtures/app/app.js',
            cssFileName: 'app',
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ],
            beforeBuildCSS: function (done) {
                done('Could not build css');
            }
        };
        moonboots = new Moonboots(bad_css);
        moonboots.on('ready', done);
    });
    lab.test('empty css, no crashing', function (done) {
        moonboots.cssSource(function (err, css) {
            Code.expect(css, 'css source').to.equal(undefined);
            done();
        });
    });
});

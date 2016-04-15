var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();
var Moonboots = require('..');
var moonboots;

var EXPECTED_JS_HASH = 'app.794c89f5.js';
var EXPECTED_JS_MIN_HASH = 'app.794c89f5.min.js';

lab.experiment('js with default options', function () {
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app'
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    lab.test('filename', function (done) {
        Code.expect(moonboots.jsFileName(), 'js filename').to.equal(EXPECTED_JS_MIN_HASH);
        done();
    });
    /*
    lab.test('content', function (done) {
        Code.expect(moonboots.jsSource(), 'js source').to.equal('how do we even test this?');
        done();
    });
   */
});

lab.experiment('js with uglify options', function () {
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            uglify: {
                mangle: false
            }
        };

        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    lab.test('filename', function (done) {
        Code.expect(moonboots.jsFileName(), 'js filename').to.equal(EXPECTED_JS_MIN_HASH);
        done();
    });
});

lab.experiment('js with no minify', function () {
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            minify: false
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    lab.test('filename', function (done) {
        Code.expect(moonboots.jsFileName(), 'js filename').to.equal(EXPECTED_JS_HASH);
        done();
    });
    /*
    lab.test('content', function (done) {
        Code.expect(moonboots.jsSource(), 'js source').to.equal('how do we even test this?');
        done();
    });
   */
});

lab.experiment('js with .js already added', function () {
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app.js'
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    lab.test('filename', function (done) {
        Code.expect(moonboots.jsFileName(), 'js filename').to.equal(EXPECTED_JS_MIN_HASH);
        done();
    });
});

lab.experiment('modulesDir', function () {
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            modulesDir: __dirname + '/../fixtures/modules'
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    lab.test('module foo is in source', function (done) {
        moonboots.jsSource(function (err, js) {
            Code.expect(js, 'js source').to.contain('"foo"');
            done();
        });
    });
});

lab.experiment('transforms', function () {
    var transformRan = 0;
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            browserify: {
                transforms: [
                    function () {
                        var through = require('through');
                        transformRan++;
                        return through(
                            function write() {},
                            function _end() {
                                this.queue(null);
                            }
                        );
                    }
                ]
            }
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    lab.test('ran', function (done) {
        Code.expect(transformRan).to.equal(1);
        done();
    });
});


lab.experiment('transforms with transform option', function () {
    var transformRan = 0;
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            browserify: {
                transform: [
                    function () {
                        var through = require('through');
                        transformRan++;
                        return through(
                            function write() {},
                            function _end() {
                                this.queue(null);
                            }
                        );
                    }
                ]
            }
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    lab.test('ran', function (done) {
        Code.expect(transformRan).to.equal(1);
        done();
    });
});

lab.experiment('sync beforeBuildJS', function () {
    var beforeRan = false;
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            minify: false,
            beforeBuildJS: function () {
                beforeRan = true;
            }
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    lab.test('ran', function (done) {
        Code.expect(beforeRan).to.equal(true);
        done();
    });
});

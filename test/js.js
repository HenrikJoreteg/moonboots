var Lab = require('lab');
var Moonboots = require('..');
var moonboots;

var EXPECTED_JS_HASH = 'app.794c89f5.js';
var EXPECTED_JS_MIN_HASH = 'app.794c89f5.min.js';

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
        Lab.expect(moonboots.jsFileName(), 'js filename').to.equal(EXPECTED_JS_MIN_HASH);
        done();
    });
    /*
    Lab.test('content', function (done) {
        Lab.expect(moonboots.jsSource(), 'js source').to.equal('how do we even test this?');
        done();
    });
   */
});

Lab.experiment('js with uglify options', function () {
    Lab.before(function (done) {
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
    Lab.test('filename', function (done) {
        Lab.expect(moonboots.jsFileName(), 'js filename').to.equal(EXPECTED_JS_MIN_HASH);
        done();
    });
});

Lab.experiment('js with no minify', function () {
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            minify: false
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    Lab.test('filename', function (done) {
        Lab.expect(moonboots.jsFileName(), 'js filename').to.equal(EXPECTED_JS_HASH);
        done();
    });
    /*
    Lab.test('content', function (done) {
        Lab.expect(moonboots.jsSource(), 'js source').to.equal('how do we even test this?');
        done();
    });
   */
});

Lab.experiment('js with .js already added', function () {
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app.js'
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    Lab.test('filename', function (done) {
        Lab.expect(moonboots.jsFileName(), 'js filename').to.equal(EXPECTED_JS_MIN_HASH);
        done();
    });
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
        moonboots.jsSource(function (err, js) {
            Lab.expect(js, 'js source').to.contain('"foo"');
            done();
        });
    });
});

Lab.experiment('transforms', function () {
    var transformRan = 0;
    Lab.before(function (done) {
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
    Lab.test('ran', function (done) {
        Lab.expect(transformRan).to.equal(1);
        done();
    });
});


Lab.experiment('transforms with transform option', function () {
    var transformRan = 0;
    Lab.before(function (done) {
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
    Lab.test('ran', function (done) {
        Lab.expect(transformRan).to.equal(1);
        done();
    });
});

Lab.experiment('sync beforeBuildJS', function () {
    var beforeRan = false;
    Lab.before(function (done) {
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
    Lab.test('ran', function (done) {
        Lab.expect(beforeRan).to.equal(true);
        done();
    });
});

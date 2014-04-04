var Lab = require('lab');
var async = require('async');
var Moonboots = require('..');
var moonboots, beforeBuildJSRan, beforeBuildCSSRan;

Lab.experiment('development mode', function () {
    Lab.before(function (done) {
        var options = {
            developmentMode: true,
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            cssFileName: 'app',
            beforeBuildJS: function (cb) {
                beforeBuildJSRan = true;
                cb();
            },
            modulesDir: __dirname + '/../fixtures/modules',
            browserify: {
                transforms: [
                    function (file) {
                        var through = require('through');
                        tranformRan = true;
                        return through(
                            function write() {},
                            function _end() {
                                this.queue(null);
                            }
                        );
                    }
                ]
            },
            beforeBuildCSS: function (cb) {
                beforeBuildCSSRan = true;
                cb();
            },
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ]
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    Lab.test('htmlContext', function (done) {
        var context = moonboots.htmlContext();
        Lab.expect(context).to.have.keys('jsFileName', 'cssFileName');
        Lab.expect(context.jsFileName).to.equal('app.dev.js');
        Lab.expect(context.cssFileName).to.equal('app.dev.css');
        done();
    });
    Lab.test('js rebuilds every request', function (done) {
        beforeBuildJSRan = false;
        moonboots.jsSource(function (err, js) {
            Lab.expect(beforeBuildJSRan).to.equal(true);
            done();
        });
    });
    Lab.test('css rebuilds every request', function (done) {
        beforeBuildCSSRan = false;
        moonboots.cssSource(function (err, css) {
            Lab.expect(beforeBuildCSSRan).to.equal(true);
            done();
        });
    });
});


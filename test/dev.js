var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();
var Moonboots = require('..');
var moonboots, beforeBuildJSRan, beforeBuildCSSRan, transformRan;

lab.experiment('development mode', function () {
    lab.before(function (done) {
        var options = {
            developmentMode: true,
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            cssFileName: 'app',
            beforeBuildJS: function (cb) {
                beforeBuildJSRan = true;
                cb();
            },
            beforeBuildCSS: function (cb) {
                beforeBuildCSSRan = true;
                cb();
            },
            modulesDir: __dirname + '/../fixtures/modules',
            browserify: {
                transforms: [
                    function () {
                        var through = require('through');
                        transformRan = true;
                        return through(
                            function write(data) {
                                this.queue(data);
                            },
                            function _end() {
                                this.queue(null);
                            }
                        );
                    }
                ]
            },
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ]
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', done);
    });
    lab.test('htmlContext', function (done) {
        var context = moonboots.htmlContext();
        Code.expect(context).to.include(['jsFileName', 'cssFileName']);
        Code.expect(context.jsFileName).to.equal('app.nonCached.js');
        Code.expect(context.cssFileName).to.equal('app.nonCached.css');
        done();
    });
    lab.test('js rebuilds every request', function (done) {
        beforeBuildJSRan = false;
        moonboots.jsSource(function (err, js) {
            Code.expect(beforeBuildJSRan).to.equal(true);
            Code.expect(transformRan).to.equal(true);
            Code.expect(js, 'js source').to.contain('"foo"');
            done();
        });
    });
    lab.test('css rebuilds every request', function (done) {
        beforeBuildCSSRan = false;
        transformRan = false;
        moonboots.cssSource(function () {
            Code.expect(beforeBuildCSSRan).to.equal(true);
            done();
        });
    });
});


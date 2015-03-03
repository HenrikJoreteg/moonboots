var Lab = require('lab');
var Moonboots = require('..');
var moonboots, beforeBuildJSRan, beforeBuildCSSRan, transformRan;

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
    Lab.test('htmlContext', function (done) {
        var context = moonboots.htmlContext();
        Lab.expect(context).to.have.keys('jsFileName', 'cssFileName');
        Lab.expect(context.jsFileName).to.equal('app.nonCached.js');
        Lab.expect(context.cssFileName).to.equal('app.nonCached.css');
        done();
    });
    Lab.test('js rebuilds every request', function (done) {
        beforeBuildJSRan = false;
        moonboots.jsSource(function (err, js) {
            Lab.expect(beforeBuildJSRan).to.equal(true);
            Lab.expect(transformRan).to.equal(true);
            Lab.expect(js, 'js source').to.contain('"foo"');
            done();
        });
    });
    Lab.test('css rebuilds every request', function (done) {
        beforeBuildCSSRan = false;
        transformRan = false;
        moonboots.cssSource(function () {
            Lab.expect(beforeBuildCSSRan).to.equal(true);
            done();
        });
    });
});


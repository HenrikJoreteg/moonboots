var Lab = require('lab');
var Moonboots = require('..');
var moonboots;

Lab.experiment('error states', function () {
    Lab.test('missing main options', function (done) {
        function initBad() {
            moonboots = new Moonboots({});
        }
        Lab.expect(initBad).to.throw(Error);
        done();
    });
    Lab.test('invalid options', function (done) {
        function initEmpty() {
            moonboots = new Moonboots();
        }
        Lab.expect(initEmpty).to.throw(Error);
        done();
    });
    Lab.test('invalid build directory', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ],
            buildDirectory: __dirname + '/nonexistant'
        });
        moonboots.on('ready', function () {
            var context = moonboots.htmlContext();
            Lab.expect(context.jsFileName).to.equal('app.882ddd9b.min.js');
            done();
        });
    });
    Lab.test('unreadable build js file', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            stylesheets: [
                __dirname + '/../fixtures/stylesheets/style.css'
            ],
            buildDirectory: __dirname + '/../fixtures/build1'
        });
        moonboots.on('ready', function () {
            var context = moonboots.htmlContext();
            Lab.expect(context.jsFileName).to.equal('app.882ddd9b.min.js');
            done();
        });
    });
    Lab.test('unreadable build css file', function (done) {
        moonboots = new Moonboots({
            main: __dirname + '/../fixtures/app/app.js',
            buildDirectory: __dirname + '/../fixtures/build2'
        });
        moonboots.on('ready', function () {
            var context = moonboots.htmlContext();
            Lab.expect(context.jsFileName).to.equal('app.882ddd9b.min.js');
            done();
        });
    });
});

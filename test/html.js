var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();
var Moonboots = require('..');
var moonboots;
var EXPECTED_JS_MIN_HASH = 'app.794c89f5.min.js';
var EXPECTED_CSS_MIN_HASH = 'app.38ea6c96.min.css';

lab.experiment('html with default options', function () {
    lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            jsFileName: 'app',
            cssFileName: 'app',
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
        Code.expect(context.jsFileName).to.equal(EXPECTED_JS_MIN_HASH);
        Code.expect(context.cssFileName).to.equal(EXPECTED_CSS_MIN_HASH);
        done();
    });
    lab.test('htmlSource', function (done) {
        var source = moonboots.htmlSource();
        Code.expect(source).to.equal('<!DOCTYPE html>\n<link href=\"/' + EXPECTED_CSS_MIN_HASH + '\" rel=\"stylesheet\" type=\"text/css\">\n<script src=\"/' + EXPECTED_JS_MIN_HASH + '\"></script>');
        done();
    });
});

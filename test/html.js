var Lab = require('lab');
var Moonboots = require('..');
var moonboots;
var EXPECTED_JS_MIN_HASH = 'app.794c89f5.min.js';
var EXPECTED_CSS_MIN_HASH = 'app.38ea6c96.min.css';

Lab.experiment('html with default options', function () {
    Lab.before(function (done) {
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
    Lab.test('htmlContext', function (done) {
        var context = moonboots.htmlContext();
        Lab.expect(context).to.have.keys('jsFileName', 'cssFileName');
        Lab.expect(context.jsFileName).to.equal(EXPECTED_JS_MIN_HASH);
        Lab.expect(context.cssFileName).to.equal(EXPECTED_CSS_MIN_HASH);
        done();
    });
    Lab.test('htmlSource', function (done) {
        var source = moonboots.htmlSource();
        Lab.expect(source).to.equal('<!DOCTYPE html>\n<link href=\"/' + EXPECTED_CSS_MIN_HASH + '\" rel=\"stylesheet\" type=\"text/css\">\n<script src=\"/' + EXPECTED_JS_MIN_HASH + '\"></script>');
        done();
    });
});

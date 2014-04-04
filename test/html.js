var Lab = require('lab');
var Moonboots = require('..');
var moonboots;

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
        Lab.expect(context.jsFileName).to.equal('app.882ddd9b.min.js');
        Lab.expect(context.cssFileName).to.equal('app.38ea6c96.min.css');
        done();
    });
    Lab.test('htmlSource', function (done) {
        var source = moonboots.htmlSource();
        Lab.expect(source).to.equal('<!DOCTYPE html>\n<link href=\"/app.38ea6c96.min.css\" rel=\"stylesheet\" type=\"text/css\">\n<script src=\"/app.882ddd9b.min.js\"></script>');
        done();
    });
});

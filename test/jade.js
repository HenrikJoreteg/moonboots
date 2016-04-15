var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();
var Moonboots = require('..');
var options = function (transform) {
    return {
        main: __dirname + '/../fixtures/app/appJadeImport.js',
        developmentMode: true,
        jsFileName: 'app',
        browserify: {
            transforms: [transform]
        }
    };
};


lab.experiment('Jade transform', function () {
    lab.test('ran', function (done) {
        var moonboots = new Moonboots(options('jadeify'));
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, js) {
                Code.expect(js).to.contain('"<p>All that you require to crash</p>"');
                done();
            });
        });
    });
    lab.test('ran with pretty:true', function (done) {
        var moonboots = new Moonboots(options(['jadeify', {pretty: true}]));
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, js) {
                Code.expect(js).to.contain('"\\n<p>All that you require to crash</p>"');
                done();
            });
        });
    });
});



var Lab = require('lab');
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


Lab.experiment('Jade transform', function () {
    Lab.test('ran', function (done) {
        var moonboots = new Moonboots(options('jadeify'));
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, js) {
                Lab.expect(js).to.contain('"<p>All that you require to crash</p>"');
                done();
            });
        });
    });
    Lab.test('ran with pretty:true', function (done) {
        var moonboots = new Moonboots(options(['jadeify', {pretty: true}]));
        moonboots.on('ready', function () {
            moonboots.jsSource(function (err, js) {
                Lab.expect(js).to.contain('"\\n<p>All that you require to crash</p>"');
                done();
            });
        });
    });
});



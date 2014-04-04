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
        function initBad() {
            moonboots = new Moonboots();
        }
        Lab.expect(initBad).to.throw(Error);
        done();
    });
});

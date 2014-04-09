var Lab = require('lab');
var Moonboots = require('..');
var moonboots;
var timingEvents = 0;

Lab.experiment('timingMode', function () {
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/app.js',
            timingMode: true
        };
        moonboots = new Moonboots(options);
        moonboots.on('log', function (levels) {
            if (levels.indexOf('timing') > -1) {
                timingEvents = timingEvents + 1;
            }
        });
        moonboots.on('ready', done);
    });
    Lab.test('emits timing events', function (done) {
        Lab.expect(timingEvents).to.be.above(0);
        done();
    });
});


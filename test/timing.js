var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();
var Moonboots = require('..');
var moonboots;
var timingEvents = 0;

lab.experiment('timingMode', function () {
    lab.before(function (done) {
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
    lab.test('emits timing events', function (done) {
        Code.expect(timingEvents).to.be.above(0);
        done();
    });
});


var Lab = require('lab');
var async = require('async');
var Moonboots = require('..');
var path = require('path');


Lab.test('watchify', function (done) {
    var moonboots = new Moonboots({
        main: path.join(__dirname, '/../fixtures', '/app/reqModuleFoo.js'),
        modulesDir: path.join(__dirname, '/../fixtures', '/modules2'),
        developmentMode: true,
        watchify: true
    });

    var jsSource = function (cb) {
        moonboots.jsSource(function (err, js) {
            if (err) return cb(err, null);
            Lab.expect(function evalSource() {
                eval(js);
            }).to.not.throw();
            cb(null, js);
        });
    };

    moonboots.on('ready', function () {
        async.series([jsSource, jsSource], function (err, res) {
            Lab.expect(err).to.equal(void 0);
            Lab.expect(res[0]).to.equal(res[1]);
            done();
        });
    });
});



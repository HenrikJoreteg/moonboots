var Lab = require('lab');
var async = require('async');
var Moonboots = require('..');

function arrEqual(arr) {
    if (arr.length > 0) {
        for (var i = 1; i < arr.length; i++) {
            if (arr[i] !== arr[0]) {
                return arr[i];
            }
        }
    } 
    return true;
}


Lab.experiment('Hash is the same', function () {
    function setup(done) {
        var options = {
            main: __dirname + '/../fixtures/app/appImports.js',
            jsFileName: 'app',
            minify: false
        };
        var moonboots = new Moonboots(options);
        moonboots.on('ready', function () {
            done(moonboots);
        });
    }

    Lab.test('50 times', function (done) {
        async.timesSeries(50, function (index, next) {
            setup(function (moonboots) {
                var filename = moonboots.jsFileName();
                moonboots.jsSource(function (err, js) {
                    next(null, [filename, js]);
                });
            });
        }, function (err, results) {
            var filenames = results.map(function (r) {
                return r[0];
            });
            var js = results.map(function (r) {
                return r[1];
            });
            Lab.expect(arrEqual(filenames)).to.equal(true);
            Lab.expect(arrEqual(js)).to.equal(true);
            done();
        });
    });
});

var Lab = require('lab');
var Moonboots = require('..');
var moonboots;


Lab.experiment('Jade transform', function () {
    var moonbootsRan = 0;
    Lab.before(function (done) {
        var options = {
            main: __dirname + '/../fixtures/app/appJadeImport.js',
            jsFileName: 'app',
            browserify: {
                transforms: ['jadeify']
            }
        };
        moonboots = new Moonboots(options);
        moonboots.on('ready', 
                    function () {
                        moonbootsRan++;
                        done();
                    }
        );
    });
    Lab.test('ran', function (done) {
        Lab.expect(moonbootsRan).to.equal(1);
        done();
    });
});



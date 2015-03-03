var foo = require('not-a-module');

module.exports = function () {
    var x = 1;
};

module.exports();


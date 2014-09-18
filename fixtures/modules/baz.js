var async = require('async');

module.exports = function (arr, iterator, done) {
    async.map([1, 2, 3], iterator, done);
};

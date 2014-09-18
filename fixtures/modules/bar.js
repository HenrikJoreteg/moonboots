var baz = require('./baz');
var Backbone = require('backbone');


module.exports = function () {
    baz.apply(null, arguments);
    return Backbone;
};

var Backbone = require('backbone');
var templates = require('./templates');

module.exports = {
    launch: function () {
        window.app = this;
        console.log("I RAN!");
        console.log("REQUIAB", Backbone);
        console.log(templates.main('hello'));
    }
};

module.exports.launch();

var Backbone = require('backbone');

module.exports = {
    launch: function () {
        window.app = this;
        console.log("I RAN!");
        console.log("REQUIAB", Backbone);
    }
}

module.exports.launch();

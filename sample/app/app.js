var Backbone = require('backbone');
var templates = require('templates');

module.exports = {
    launch: function () {
        window.app = this;

        $(function () {
            $('body').html(templates.main('Woo! View source to see what rendered me.'));
        });
    }
};

module.exports.launch();

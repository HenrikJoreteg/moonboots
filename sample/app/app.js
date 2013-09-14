var Backbone = require('backbone');

module.exports = {
    launch: function () {
        window.app = this;

        $(function () {
            $('body').html('Woo! View source to see what rendered me.')
        });
    }
}

module.exports.launch();

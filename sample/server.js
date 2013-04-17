var express = require('express'),
    browserApp = require('../index.js'),
    app = express();

browserApp(app);

app.listen(3000, function () {
    console.log('serving at http://localhost:3000');
});

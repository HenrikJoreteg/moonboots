# nodule

A set of conventions and tools for building, bundling and serving single page apps with node.js

## How-to

```js
var express = require('express'),
    nodule = require('nodule'),
    app = express();

nodule(app);

app.listen(3000);
```

## License

MIT

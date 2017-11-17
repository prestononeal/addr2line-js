'use strict';

const express = require('express'),
      app = express(),
      path = require('path'),
      config = require('./server/config/config');

// Express conf !
require('./server/config/express.config')(app);

// Mongoose Conf !
require('./server/config/mongoose.config')(config);

// Point static path to dist
app.use(express.static(path.join(__dirname, 'dist')));
// Catch all other routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(config.dev.port, () => {
  console.log("Listening ..");
});

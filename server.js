'use strict';

const express = require('express'),
      app = express(),
      path = require('path'),
      config = require('./server/config/config');

// Express conf !
require('./server/config/express.config')(app);

// Point static path to dist
app.use(express.static(path.join(__dirname, 'dist')));
// Catch all other routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(process.env.PORT || config.dev.port, () => {
  console.log("Listening ..");
});

'use strict';

const logger           = require('morgan'),
      fileUpload       = require('express-fileupload');

module.exports = (app) => {
    app.use(logger('dev'));
    app.use(fileUpload({
        limits: { fileSize: 50 * 1024 * 1024 }
    }));  

    //[*]Routes Configuration
    let main = require('../routes/api.js');
    app.use('/api', main);
};

'use strict';

const router = require('express').Router();
const config = require('../config/config');
const mongoose = require("mongoose");
const fs = require('fs');

let Grid = require("gridfs-stream");
let conn = mongoose.connection;
Grid.mongo = mongoose.mongo;
let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db);
  router.get('/', (req, res) => {
    res.send('API works!');
  });
  router.post('/elfs', (req, res) => {
    let part = req.files.file;
    let writeStream = gfs.createWriteStream({
      // filename: part.name,
      mode: 'w',
    });

    writeStream.on('close', (file) => {
      // checking for file
      if(!file) {
        res.status(400).send('No file received');
      }
      return res.status(200).send({
        message: 'Success',
        file: file
      });
    });
    // using callbacks is important !
    // writeStream should end the operation once all data is written to the DB 
    writeStream.write(part.data, () => {
      writeStream.end();
    });  
  });
});

module.exports = router;

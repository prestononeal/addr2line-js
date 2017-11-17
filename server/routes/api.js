'use strict';

const router = require('express').Router();
const config = require('../config/config');
const mongoose = require("mongoose");
const fs = require('fs');
const md5 = require('md5');

let Grid = require("gridfs-stream");
let conn = mongoose.connection;
Grid.mongo = mongoose.mongo;
let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db);
  router.get('/', (req, res) => {
    res.send('API works!');
  });
  router.get('/elf/:id/:addr', (req, res) => {
    console.log(`Translating address <${req.params.addr}> against file <${req.params.id}>`);

    let elfFile = gfs.files.find({id: req.params.id}).toArray((err, files) => {
      if (err) {
        console.log(`Error when finding file <${req.params.id}>: <${err}>`)
        return res.status(400).send(`Error when searching for elf file: ${err}`)
      }
      if (files.length == 0) {
        console.log(`Could not find file <${req.params.id}>. Aborting translation.`)
        return res.status(400).send(`Could not find file ${req.params.id}. Aborting translation.`)
      }
      console.log(`Found file <${req.params.id}>`);
      return res.status(200).send('Success');
    });

  });
  router.post('/elfs', (req, res) => {
    if (!req.files.file) {
      res.status(400).send('No file received');
      return;
    }
    let part = req.files.file;

    let checksum = md5(part.data);

    // Do we already have a file with this checksum? If so, return that one
    let existing = gfs.files.find({md5: checksum}).toArray((err, files) => {
      if (err) {
        return res.status(400).send(`Error when searching for existing elf file: ${err}`)
      }
      if (files.length > 0) {
        console.log(`Found existing file with md5 <${checksum}>: <${files[0]._id}>`);
        // We already stored this file. Return its info.
        return res.status(200).send({
          message: 'Success',
          file: files[0]
        })
      }

      console.log(`Creating new file with md5 <${checksum}>`)
      let writeStream = gfs.createWriteStream({
        mode: 'w',
      });
      writeStream.on('close', (file) => {
        // checking for file
        if(!file) {
          res.status(400).send('Unexpected error while saving file');
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
    })
  });
});

module.exports = router;

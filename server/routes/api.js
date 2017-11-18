'use strict';

const router = require('express').Router();
const config = require('../config/config');

const fs = require('fs-extra');
const md5 = require('md5');
const touch = require('touch');


router.get('/', (req, res) => {
  res.send('API works!');
});
router.get('/elf/:id/:addr', (req, res) => {
  console.log(`Translating address <${req.params.addr}> against file <${req.params.id}>`);

  let elfFile = gfs.files.find({_id: new ObjectID(req.params.id)}).toArray((err, files) => {
    if (err) {
      console.log(`Error when finding file <${req.params.id}>: <${err}>`)
      return res.status(400).send(`Error when searching for elf file: ${err}`)
    }
    if (files.length == 0) {
      console.log(`Could not find file <${req.params.id}>. Aborting translation.`)
      return res.status(400).send(`Could not find file ${req.params.id}. Aborting translation.`)
    }
    console.log(`Found file <${files[0]._id}>`);
    return res.status(200).send('Success');
  });

});
router.post('/elfs', (req, res) => {
  if (!req.files || !req.files.file) {
    res.status(400).send('No file received');
    return;
  }
  let part = req.files.file;

  let checksum = md5(part.data);

  // Do we already have a file with this checksum? If so, return that one
  let elfDir = `./tmp/${checksum}`
  let elfFile = `${elfDir}/${checksum}.elf`

  let created = false;
  let msg = ''; 

  let elfObj = function() {
    return res.json({
      id: checksum,
      created: created  // Indicates to the client if the new elf was created. If false, the elf already existed in the FS
    });
  }

  fs.ensureDir(elfDir)
  .then( () => {
    fs.writeFile(elfFile, part.data, { flag: 'wx' })
    .then( err => {
      created = true;
      console.log(`New elf file written: <${elfFile}>`);
      return elfObj();
    })
    .catch( err => {
      if (err.code === 'EEXIST') {
        console.log(`Elf file already exists: <${elfFile}>`);

        // Touch the old file for book keeping, but don't block the response on it
        touch(elfFile)
        .then( () => {
          console.log(`Touched <${elfFile}>`);
        })
        .catch( () => {
          console.log(`Unable to touch <${elFile}>`);
        });

        return elfObj();
      }
      msg = `Could not write file <${elfFile}>: <${JSON.stringify(err)}>`
      console.log(msg);
      return res.status(400).send(msg);
    });
  })
  .catch( err => {
    msg = `Could not ensure directory <${err}>`;
    return res.status(400).send(msg);
  })
});

module.exports = router;

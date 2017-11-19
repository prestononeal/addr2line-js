'use strict';

const router = require('express').Router();
const config = require('../config/config');

const fs = require('fs-extra');
const md5 = require('md5');
const touch = require('touch');

const Addr2Line = require('addr2line').Addr2Line;

const findRemoveSync = require('find-remove');

const elfDir = './tmp';

// TODO: remove this from the API library when configurations are better handled
function cleanUpTemp() {
  var result = findRemoveSync(elfDir, {extensions: ['.elf'], age: {seconds: 60*60}});
  if (Object.keys(result).length !== 0) {
    console.log('Cleaned up elf files:', result);
  }
}
setInterval(cleanUpTemp, 10*60*1000); // Every 10 mins (in ms), clean up files older than one hour (in seconds)

router.get('/', (req, resp) => {
  resp.send('API works!');
});
router.get('/elf/:id/:addr', (req, resp) => {
  let elfFile = `${elfDir}/${req.params.id}.elf`;
  let addresses = req.params.addr.split(',');
  console.log(`Translating addresses <${addresses}> against file <${elfFile}>`);

  let resolver = new Addr2Line([elfFile]);
  let translations = [];
  for(let i = 0; i < addresses.length; i++) {
    translations.push(resolver.resolve(addresses[i]));
  }

  Promise.all(translations)
  .then( res => {
    console.log(`Translation of <${addresses}> against file <${elfFile}>: <${JSON.stringify(res)}>`)
    return resp.json({results: res});
  });

});
router.post('/elfs', (req, resp) => {
  if (!req.files || !req.files.file) {
    resp.status(400).send('No file received');
    return;
  }
  let part = req.files.file;

  let checksum = md5(part.data);

  // Do we already have a file with this checksum? If so, return that one
  let elfFile = `${elfDir}/${checksum}.elf`

  let created = false;
  let msg = ''; 

  let elfObj = function() {
    return resp.json({
      id: checksum,
      created: created  // Indicates to the client if the new elf was created. If false, the elf already existed in the FS
    });
  }

  fs.ensureDir(elfDir)
  .then(() => {
    fs.writeFile(elfFile, part.data, { flag: 'wx' })
    .then( err => {
      created = true;
      console.log(`New elf file written: <${elfFile}>`);
      return elfObj();
    })
    .catch(err => {
      if (err.code === 'EEXIST') {
        console.log(`Elf file already exists: <${elfFile}>`);

        // Touch the old file for book keeping, but don't block the response on it
        touch(elfFile)
        .then( () => {
          console.log(`Touched <${elfFile}>`);
        })
        .catch(err => {
          console.log(`Unable to touch <${elfFile}>`, err);
        });

        return elfObj();
      }
      msg = `Could not write file <${elfFile}>: <${JSON.stringify(err)}>`
      console.log(msg);
      return resp.status(400).send(msg);
    });
  })
  .catch( err => {
    msg = `Could not ensure directory <${err}>`;
    return resp.status(400).send(msg);
  })
});

module.exports = router;

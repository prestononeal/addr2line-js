'use strict';

const router = require('express').Router();
const config = require('../config/config');

const fs = require('fs-extra');
const md5 = require('md5');
const touch = require('touch');

const Addr2Line = require('addr2line').Addr2Line;

const findRemoveSync = require('find-remove');

const elfDir = './tmp';

// TODO: remove this task from the API library when configurations are better handled
function cleanUp() {
  var result = findRemoveSync(elfDir, {extensions: ['.elf'], age: {seconds: 5*24*60*60}});
  if (Object.keys(result).length !== 0) {
    console.log('Cleaned up elf files:', result);
  }
}
// Every 1 hour (in ms), clean up files older than 5 days (in seconds)
// We should only clean up old files. If we clean up newer files, we're more likely to hit 
// race conditions with touching files after they're deleted. See touchElf for more info.
setInterval(cleanUp, 1*60*60*1000);

function touchElf(elfFile) {
  // Touch the elf file to indicate to the cleanup task that it has recently been used
  // The touch happens in a separate thread, don't assume the file has been touched after this 
  // function returns. There is a possible race condition.
  // For example:
  // 1. Elf file is attempted to be uploaded
  // 2. Elf file already exists
  // 3. We start an asynchronous touch task and return the ID to the client
  // 4. Before the touch task finishes, the cleanup task runs and deletes the elf file that was about to be touched.
  // 5. The touch task touches the deleted file, creating an empty file. 
  // TODO: a better, future approach would be to take the whole server down, delete old files, then restart the server
  touch(elfFile)
  .then( () => {
    console.log(`Touched <${elfFile}>`);
  })
  .catch(err => {
    console.log(`Unable to touch <${elfFile}>`, err);
  });
}

router.get('/', (req, resp) => {
  resp.send('API works!');
});
router.get('/elf/:id/:addr', (req, resp) => {
  let elfFile = `${elfDir}/${req.params.id}.elf`;
  let addresses = req.params.addr.split(',');
  console.log(`Translating addresses <${addresses}> against file <${elfFile}>`);

  // Make sure the file exists
  let exists = fs.existsSync(elfFile);
  if (!exists) {
    return resp.status(400).send(`Elf file with md5 <${req.params.id}> does not exists`);
  }
  touchElf(elfFile);

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
      // No need to touch the elf file since we just created it
      return elfObj();
    })
    .catch(err => {
      if (err.code === 'EEXIST') {
        console.log(`Elf file already exists: <${elfFile}>`);

        // Touch the file to refresh it
        touchElf(elfFile);

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

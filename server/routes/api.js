const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Set up mongodb connection
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/addr2line-js', {
  useMongoClient: true
});

router.get('/', (req, res) => {
    res.send('api works');
  });


/* Post new ELF files */
router.post('/elfs', (req, res) => {
  // Allow others to post an elf file to Mongo
  
});

module.exports = router;

var express = require('express');
var router = express.Router();

// Test route
router.get('/', (req, res) => {
    res.send('api works');
  });

// Post new ELF files
router.post('/elfs', (req, res) => {
  // Allow others to post an elf file to Mongo
  
});

module.exports = router;

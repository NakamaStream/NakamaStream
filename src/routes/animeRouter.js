const express = require('express');
const router = express.Router();

router.get('/anime', (req, res) => {
  res.render('anime-list');
});

module.exports = router;

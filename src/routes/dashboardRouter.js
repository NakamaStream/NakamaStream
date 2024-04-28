const express = require('express');
const router = express.Router();

router.get('/dashboard', (req, res) => {
    if (req.session.loggedin) {
      res.render('dashboard', { username: req.session.username });
    } else {
      res.redirect('/login');
    }
  });

module.exports = router;
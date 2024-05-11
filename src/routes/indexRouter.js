const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/error', (req, res) => {
  res.render('error');
})

router.get('/tos', (req, res) => {
  res.render('tos');
})

router.get('/privacy', (req, res) => {
  res.render('privacy');
})

module.exports = router;

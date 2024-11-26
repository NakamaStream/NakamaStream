const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/error', (req, res) => {
  res.render('error/error');
})

router.get('/soon', (req, res) => {
  res.render('error/soon');
})

router.get('/news', (req, res) => {
  res.render('error/soon');
})

router.get('/tos', (req, res) => {
  res.render('start/tos');
})

router.get('/privacy', (req, res) => {
  res.render('start/privacy');
})

router.get('/about/jobs', (req, res) => {
  res.render('start/jobs');
})

router.get('/donate', (req, res) => {
  res.render('start/donate');
});

router.get('/desktop', (req, res) => {
  res.render('start/Desktop');
});

router.get('/jobs/frontend', (req, res) => {
  res.redirect('https://github.com/orgs/NakamaStream/discussions/10');
});

router.get('/jobs/backend', (req, res) => {
  res.redirect('https://github.com/orgs/NakamaStream/discussions/11');
});

router.get('/jobs/moderador', (req, res) => {
  res.redirect('https://github.com/orgs/NakamaStream/discussions/12');
});

router.get('/jobs/administrador', (req, res) => {
  res.redirect('https://github.com/orgs/NakamaStream/discussions/13');
});

module.exports = router;

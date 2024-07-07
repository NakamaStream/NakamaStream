const express = require('express');
const router = express.Router();
const db = require('../services/db');

router.get('/anime', (req, res) => {
  db.query('SELECT * FROM animes', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving animes');
    } else {
      res.render('anime-list', { animes: rows });
    }
  });
});

router.get('/anime/upload', (req, res) => {
  res.render('upload-anime');
});

router.post('/anime/upload', (req, res) => {
  const { name, imageUrl, description, episodes } = req.body;
  db.query('INSERT INTO animes (name, imageUrl, description, episodes) VALUES (?, ?, ?, ?)', [name, imageUrl, description, episodes], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error uploading anime');
    } else {
      res.redirect('/anime');
    }
  });
});

router.get('/anime/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM animes WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving anime details');
    } else {
      const episodes = row[0].episodes.split(',');
      res.render('anime-detail', { anime: row[0], episodes: episodes });
    }
  });
});

module.exports = router;

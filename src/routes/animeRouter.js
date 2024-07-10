const express = require("express");
const router = express.Router();
const db = require("../services/db");
const slugify = require("slugify");

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.loggedin) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(403).send("Access denied. Admin privileges required.");
  }
};

// Function to generate a unique slug
function generateUniqueSlug(name, callback) {
  let slug = slugify(name, { lower: true, strict: true });
  let uniqueSlug = slug;
  let counter = 1;

  function checkSlug() {
    db.query(
      "SELECT id FROM animes WHERE slug = ?",
      [uniqueSlug],
      (err, results) => {
        if (err) {
          return callback(err);
        }
        if (results.length === 0) {
          callback(null, uniqueSlug);
        } else {
          uniqueSlug = `${slug}-${counter}`;
          counter++;
          checkSlug();
        }
      }
    );
  }

  checkSlug();
}

router.get("/anime", isLoggedIn, (req, res) => {
  const query = `
    SELECT a.*, COUNT(e.id) as episodeCount
    FROM animes a
    LEFT JOIN episodes e ON a.id = e.anime_id
    GROUP BY a.id
  `;
  db.query(query, (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error retrieving animes");
    } else {
      res.render("anime-list", { animes: rows, isAdmin: req.session.isAdmin });
    }
  });
});

router.get("/anime/upload", isLoggedIn, isAdmin, (req, res) => {
  res.render("upload-anime");
});

router.post("/anime/upload", isLoggedIn, isAdmin, (req, res) => {
  const { name, imageUrl, description, episodes } = req.body;
  generateUniqueSlug(name, (err, slug) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error generating slug");
    }
    db.query(
      "INSERT INTO animes (name, imageUrl, description, slug) VALUES (?, ?, ?, ?)",
      [name, imageUrl, description, slug],
      (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error uploading anime");
        } else {
          const animeId = result.insertId;
          const episodeList = episodes.split(",").map((ep) => ep.trim());
          const episodeValues = episodeList.map((ep) => [animeId, ep, ""]);

          if (episodeValues.length > 0) {
            db.query(
              "INSERT INTO episodes (anime_id, title, video_url) VALUES ?",
              [episodeValues],
              (err) => {
                if (err) {
                  console.error(err);
                  res.status(500).send("Error uploading episodes");
                } else {
                  res.redirect("/anime");
                }
              }
            );
          } else {
            res.redirect("/anime");
          }
        }
      }
    );
  });
});

router.get("/anime/:slug", isLoggedIn, (req, res) => {
  const slug = req.params.slug;
  db.query(
    "SELECT * FROM animes WHERE slug = ?",
    [slug],
    (err, animeResults) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error retrieving anime details");
      } else if (animeResults.length === 0) {
        res.status(404).send("Anime not found");
      } else {
        const anime = animeResults[0];
        db.query(
          "SELECT * FROM episodes WHERE anime_id = ?",
          [anime.id],
          (err, episodeResults) => {
            if (err) {
              console.error(err);
              res.status(500).send("Error retrieving episodes");
            } else {
              res.render("anime-detail", {
                anime: anime,
                episodes: episodeResults,
                isAdmin: req.session.isAdmin,
              });
            }
          }
        );
      }
    }
  );
});

router.get("/anime/:slug/episode/:episodeId", isLoggedIn, (req, res) => {
  const { slug, episodeId } = req.params;
  db.query(
    "SELECT a.*, e.* FROM animes a JOIN episodes e ON a.id = e.anime_id WHERE a.slug = ? AND e.id = ?",
    [slug, episodeId],
    (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error retrieving episode");
      } else if (results.length === 0) {
        res.status(404).send("Episode not found");
      } else {
        const episode = results[0];
        res.render("episode-detail", {
          anime: {
            id: episode.anime_id,
            name: episode.name,
            slug: episode.slug,
          },
          episode: episode,
          isAdmin: req.session.isAdmin,
        });
      }
    }
  );
});

router.get("/anime/:slug/upload-episode", isLoggedIn, isAdmin, (req, res) => {
  const slug = req.params.slug;
  db.query("SELECT * FROM animes WHERE slug = ?", [slug], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error retrieving anime");
    } else if (results.length === 0) {
      res.status(404).send("Anime not found");
    } else {
      res.render("episode-upload", { anime: results[0] });
    }
  });
});

router.post("/anime/:slug/upload-episode", isLoggedIn, isAdmin, (req, res) => {
  const slug = req.params.slug;
  const { title, videoUrl } = req.body;
  db.query("SELECT id FROM animes WHERE slug = ?", [slug], (err, results) => {
    if (err || results.length === 0) {
      console.error(err);
      res.status(500).send("Error retrieving anime");
    } else {
      const animeId = results[0].id;
      db.query(
        "INSERT INTO episodes (anime_id, title, video_url) VALUES (?, ?, ?)",
        [animeId, title, videoUrl],
        (err, result) => {
          if (err) {
            console.error(err);
            res.status(500).send("Error uploading episode");
          } else {
            res.redirect(`/anime/${slug}`);
          }
        }
      );
    }
  });
});

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../services/db");
const slugify = require("slugify");

// Middleware para verificar si el usuario está logueado
const isLoggedIn = (req, res, next) => {
  if (req.session.loggedin) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Middleware para verificar si el usuario es admin
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res
      .status(403)
      .send("Acceso denegado. Se requieren privilegios de administrador.");
  }
};

// Función para generar un slug único
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

// Ruta para obtener la lista de animes
router.get("/anime", isLoggedIn, (req, res) => {
  const query = `
    SELECT a.*, COUNT(e.id) as episodeCount
    FROM animes a
    LEFT JOIN episodes e ON a.id = e.anime_id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `;
  db.query(query, (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error al recuperar animes");
    } else {
      res.render("anime-list", { animes: rows, isAdmin: req.session.isAdmin });
    }
  });
});

// Ruta para la página de subida de anime
router.get("/anime/upload", isLoggedIn, isAdmin, (req, res) => {
  res.render("upload-anime");
});

// Ruta para procesar la subida de un anime
router.post("/anime/upload", isLoggedIn, isAdmin, (req, res) => {
  const { name, imageUrl, description, episodes, videoUrl } = req.body;
  generateUniqueSlug(name, (err, slug) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error al generar slug");
    }
    db.query(
      "INSERT INTO animes (name, imageUrl, description, slug) VALUES (?, ?, ?, ?)",
      [name, imageUrl, description, slug],
      (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error al subir anime");
        } else {
          const animeId = result.insertId;
          const episodeList = episodes.split(",").map((ep) => ep.trim());

          // Insertar primer episodio con URL de video
          db.query(
            "INSERT INTO episodes (anime_id, title, video_url, description) VALUES (?, ?, ?, ?)",
            [animeId, "Episodio 1", videoUrl, "Primer episodio"],
            (err) => {
              if (err) {
                console.error(err);
                res.status(500).send("Error al subir el primer episodio");
              } else {
                // Insertar episodios restantes sin URL de video
                if (episodeList.length > 1) {
                  const remainingEpisodes = episodeList
                    .slice(1)
                    .map((ep, index) => [
                      animeId,
                      `Episodio ${index + 2}`,
                      "",
                      "",
                    ]);
                  db.query(
                    "INSERT INTO episodes (anime_id, title, video_url, description) VALUES ?",
                    [remainingEpisodes],
                    (err) => {
                      if (err) {
                        console.error(err);
                        res
                          .status(500)
                          .send("Error al subir episodios restantes");
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
        }
      }
    );
  });
});

// Ruta para obtener detalles de un anime
router.get("/anime/:slug", isLoggedIn, (req, res) => {
  const slug = req.params.slug;
  db.query(
    "SELECT * FROM animes WHERE slug = ?",
    [slug],
    (err, animeResults) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error al recuperar detalles del anime");
      } else if (animeResults.length === 0) {
        res.status(404).send("Anime no encontrado");
      } else {
        const anime = animeResults[0];
        db.query(
          "SELECT * FROM episodes WHERE anime_id = ?",
          [anime.id],
          (err, episodeResults) => {
            if (err) {
              console.error(err);
              res.status(500).send("Error al recuperar episodios");
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

// Ruta para obtener detalles de un episodio
router.get("/anime/:slug/episode/:episodeId", isLoggedIn, (req, res) => {
  const { slug, episodeId } = req.params;
  db.query(
    "SELECT a.*, e.* FROM animes a JOIN episodes e ON a.id = e.anime_id WHERE a.slug = ? AND e.id = ?",
    [slug, episodeId],
    (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error al recuperar episodio");
      } else if (results.length === 0) {
        res.status(404).send("Episodio no encontrado");
      } else {
        const episode = results[0];
        const animeId = episode.anime_id;

        // Obtener los episodios siguientes
        db.query(
          "SELECT * FROM episodes WHERE anime_id = ? AND id > ? ORDER BY id ASC LIMIT 5",
          [animeId, episodeId],
          (err, nextEpisodesResults) => {
            if (err) {
              console.error(err);
              res.status(500).send("Error al recuperar episodios siguientes");
            } else {
              res.render("episode-detail", {
                anime: {
                  id: episode.anime_id,
                  name: episode.name,
                  slug: episode.slug,
                },
                episode: episode,
                nextEpisodes: nextEpisodesResults,
                isAdmin: req.session.isAdmin,
              });
            }
          }
        );
      }
    }
  );
});

// Ruta para la página de subida de episodio
router.get("/anime/:slug/upload-episode", isLoggedIn, isAdmin, (req, res) => {
  const slug = req.params.slug;
  db.query("SELECT * FROM animes WHERE slug = ?", [slug], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error al recuperar anime");
    } else if (results.length === 0) {
      res.status(404).send("Anime no encontrado");
    } else {
      res.render("episode-upload", { anime: results[0] });
    }
  });
});

// Ruta para procesar la subida de un episodio
router.post("/anime/:slug/upload-episode", isLoggedIn, isAdmin, (req, res) => {
  const slug = req.params.slug;
  const { title, videoUrl, description } = req.body;
  db.query("SELECT id FROM animes WHERE slug = ?", [slug], (err, results) => {
    if (err || results.length === 0) {
      console.error(err);
      res.status(500).send("Error al recuperar anime");
    } else {
      const animeId = results[0].id;
      db.query(
        "INSERT INTO episodes (anime_id, title, video_url, description) VALUES (?, ?, ?, ?)",
        [animeId, title, videoUrl, description],
        (err, result) => {
          if (err) {
            console.error(err);
            res.status(500).send("Error al subir episodio");
          } else {
            res.redirect(`/anime/${slug}`);
          }
        }
      );
    }
  });
});

// Ruta para agregar comentario
router.post("/anime/:slug/comment", isLoggedIn, (req, res) => {
  const animeId = req.body.animeId;
  const episodeId = req.body.episodeId || null;
  const userId = req.session.userId;
  const content = req.body.content;

  db.query(
    "INSERT INTO comments (user_id, anime_id, episode_id, content) VALUES (?, ?, ?, ?)",
    [userId, animeId, episodeId, content],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "Error al agregar comentario" });
      }
      res.json({ success: true, reload: true });
    }
  );
});

// Ruta para obtener comentarios
router.get("/anime/:slug/comments", isLoggedIn, (req, res) => {
  const animeId = req.query.animeId;
  const episodeId = req.query.episodeId || null;

  let query = `
    SELECT c.*, u.username, u.is_admin, 
    CASE 
      WHEN u.is_admin = 1 THEN 'Admin'
      ELSE 'Novato I'
    END AS user_rank
    FROM comments c
    JOIN usuarios u ON c.user_id = u.id
    WHERE c.anime_id = ?
  `;
  let params = [animeId];

  if (episodeId) {
    query += " AND c.episode_id = ?";
    params.push(episodeId);
  }

  query += " ORDER BY c.created_at DESC";

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error al obtener comentarios" });
    }
    res.json(results);
  });
});

// Ruta para agregar a favoritos
router.post("/anime/:slug/favorite", isLoggedIn, (req, res) => {
  const animeId = req.body.animeId;
  const userId = req.session.userId;
  const action = req.body.action;

  if (action === "add") {
    db.query(
      "INSERT INTO favorites (user_id, anime_id) VALUES (?, ?)",
      [userId, animeId],
      (err) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Error al agregar a favoritos" });
        }
        res.json({ success: true, message: "Anime agregado a favoritos" });
      }
    );
  } else if (action === "remove") {
    db.query(
      "DELETE FROM favorites WHERE user_id = ? AND anime_id = ?",
      [userId, animeId],
      (err) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Error al quitar de favoritos" });
        }
        res.json({ success: true, message: "Anime quitado de favoritos" });
      }
    );
  } else {
    return res.status(400).json({ success: false, message: "Acción inválida" });
  }
});

// Ruta para calificar anime
router.post("/anime/:slug/rate", isLoggedIn, (req, res) => {
  const animeId = req.body.animeId;
  const userId = req.session.userId;
  const rating = req.body.rating;

  db.query(
    "INSERT INTO ratings (user_id, anime_id, rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)",
    [userId, animeId, rating],
    (err) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Error al calificar" });
      }
      res.json({ success: true, message: "Calificación guardada" });
    }
  );
});

// Ruta para obtener datos del anime
router.get("/anime/:slug/data", isLoggedIn, (req, res) => {
  const slug = req.params.slug;
  const userId = req.session.userId;

  db.query(
    `SELECT a.*, 
     (SELECT COUNT(*) FROM favorites WHERE anime_id = a.id) AS favoriteCount,
     (SELECT AVG(rating) FROM ratings WHERE anime_id = a.id) AS averageRating,
     (SELECT COUNT(*) FROM ratings WHERE anime_id = a.id) AS ratingCount,
     (SELECT rating FROM ratings WHERE anime_id = a.id AND user_id = ?) AS userRating,
     (SELECT COUNT(*) > 0 FROM favorites WHERE anime_id = a.id AND user_id = ?) AS isFavorite
     FROM animes a WHERE a.slug = ?`,
    [userId, userId, slug],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error al obtener datos del anime" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Anime no encontrado" });
      }
      res.json(results[0]);
    }
  );
});

// Ruta para obtener animes favoritos del usuario
router.get("/api/favorite-animes", isLoggedIn, (req, res) => {
  const userId = req.session.userId;

  db.query(
    `SELECT a.id, a.name, a.imageUrl, a.slug
     FROM animes a 
     JOIN favorites f ON a.id = f.anime_id 
     WHERE f.user_id = ?`,
    [userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error al obtener animes favoritos" });
      }
      res.json(results);
    }
  );
});

// Ruta para agregar a guardados
router.post("/anime/:slug/save", isLoggedIn, (req, res) => {
  const animeId = req.body.animeId;
  const userId = req.session.userId;

  db.query(
    "INSERT INTO saved_animes (user_id, anime_id) VALUES (?, ?)",
    [userId, animeId],
    (err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Error al guardar anime" });
      }
      res.json({ success: true, message: "Anime guardado" });
    }
  );
});

// Ruta para eliminar de guardados
router.post("/anime/:slug/unsave", isLoggedIn, (req, res) => {
  const animeId = req.body.animeId;
  const userId = req.session.userId;

  db.query(
    "DELETE FROM saved_animes WHERE user_id = ? AND anime_id = ?",
    [userId, animeId],
    (err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({
            success: false,
            message: "Error al eliminar anime guardado",
          });
      }
      res.json({ success: true, message: "Anime eliminado de guardados" });
    }
  );
});

// Ruta para obtener animes guardados
router.get("/animes/api/saved-animes", isLoggedIn, (req, res) => {
  const userId = req.session.userId;

  db.query(
    `SELECT a.id, a.name, a.imageUrl, a.slug
     FROM animes a 
     JOIN saved_animes s ON a.id = s.anime_id 
     WHERE s.user_id = ?`,
    [userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error al obtener animes guardados" });
      }
      res.render("saved-anime-list", {
        animes: results,
        isAdmin: req.session.isAdmin,
      });
    }
  );
});

// Ruta para obtener el total de animes subidos
router.get("/api/total-animes", isLoggedIn, (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM animes", (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Error al obtener el total de animes" });
    }
    const total = results[0].total;
    res.json({ total });
  });
});

// Ruta para agregar comentario a un episodio
router.post("/anime/:slug/episode/:episodeId/comment", isLoggedIn, (req, res) => {
  const { slug, episodeId } = req.params;
  const userId = req.session.userId;
  const content = req.body.content;

  db.query(
    "INSERT INTO comments (user_id, anime_id, episode_id, content) VALUES (?, (SELECT id FROM animes WHERE slug = ?), ?, ?)",
    [userId, slug, episodeId, content],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "Error al agregar comentario" });
      }
      res.json({ success: true, reload: true });
    }
  );
});

// Ruta para obtener comentarios de un episodio
router.get("/anime/:slug/episode/:episodeId/comments", isLoggedIn, (req, res) => {
  const { slug, episodeId } = req.params;

  db.query(
    `SELECT c.*, u.username, u.is_admin, 
    CASE 
      WHEN u.is_admin = 1 THEN 'Admin'
      ELSE 'Novato I'
    END AS user_rank
    FROM comments c
    JOIN usuarios u ON c.user_id = u.id
    WHERE c.episode_id = ?`,
    [episodeId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Error al obtener comentarios" });
      }
      res.json(results);
    }
  );
});

module.exports = router;

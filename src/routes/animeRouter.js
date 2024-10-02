const express = require("express");
const router = express.Router();
const db = require("../services/db");
const slugify = require("slugify");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../public/uploads/");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.loggedin) {
    db.query(
      "SELECT id, username, profile_image_url, is_admin FROM usuarios WHERE id = ?",
      [req.session.userId],
      (err, results) => {
        if (err || results.length === 0) {
          res.redirect("/login");
        } else {
          req.session.user = results[0];
          next();
        }
      }
    );
  } else {
    res.redirect("/login");
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res
      .status(403)
      .send("Acceso denegado. Se requieren privilegios de administrador.");
  }
};

// Function to generate unique slug
function generateUniqueSlug(categorySlug, name, callback) {
  let slug = `${categorySlug}-${slugify(name, { lower: true, strict: true })}`;
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

// Route to get list of animes
router.get("/anime", isLoggedIn, (req, res) => {
  const query = `
    SELECT a.*, c.name as category_name, COUNT(e.id) as episodeCount
    FROM animes a
    LEFT JOIN episodes e ON a.id = e.anime_id
    LEFT JOIN anime_categories c ON a.category_id = c.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `;
  db.query(query, (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error al recuperar animes");
    } else {
      // Fetch user information
      db.query(
        "SELECT username, profile_image_url FROM usuarios WHERE id = ?",
        [req.session.userId],
        (userErr, userResults) => {
          if (userErr) {
            console.error(userErr);
            res.status(500).send("Error al recuperar información del usuario");
          } else {
            const user = userResults[0] || {};
            res.render("anime/anime-list", {
              animes: rows,
              isAdmin: req.session.isAdmin,
              user: req.session.user,
              username: user.username,
              profile_image_url: user.profile_image_url,
            });
          }
        }
      );
    }
  });
});

// Route to get recent animes
router.get("/api/recent-animes", (req, res) => {
  const query = `
      SELECT a.*, c.name as category_name FROM animes a
      LEFT JOIN anime_categories c ON a.category_id = c.id
      ORDER BY a.created_at DESC
      LIMIT 5
  `;
  db.query(query, (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error al recuperar animes recientes");
    } else {
      res.json(rows);
    }
  });
});

// Route for anime upload page
router.get("/anime/upload", isLoggedIn, isAdmin, (req, res) => {
  db.query("SELECT id, name FROM anime_categories", (err, categories) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error al obtener categorías");
    }
    res.render("anime/upload-anime", { categories });
  });
});

// Route to process anime upload
router.post("/anime/upload", isLoggedIn, isAdmin, (req, res) => {
  const {
    name,
    imageUrl,
    description,
    episodes,
    videoUrl,
    categoryId,
    releaseDate,
  } = req.body;

  db.query(
    "SELECT slug FROM anime_categories WHERE id = ?",
    [categoryId],
    (err, results) => {
      if (err || results.length === 0) {
        console.error(err);
        return res.status(500).send("Error al obtener la categoría");
      }

      const categorySlug = results[0].slug;

      generateUniqueSlug(categorySlug, name, (err, slug) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error al generar slug");
        }
        db.query(
          "INSERT INTO animes (name, imageUrl, description, slug, category_id, release_date) VALUES (?, ?, ?, ?, ?, ?)",
          [name, imageUrl, description, slug, categoryId, releaseDate],
          (err, result) => {
            if (err) {
              console.error(err);
              res.status(500).send("Error al subir anime");
            } else {
              const animeId = result.insertId;
              const episodeList = episodes.split(",").map((ep) => ep.trim());

              // Insert first episode with video URL
              db.query(
                "INSERT INTO episodes (anime_id, episode_number, title, video_url, description) VALUES (?, ?, ?, ?, ?)",
                [animeId, 1, "Episodio 1", videoUrl, "Primer episodio"],
                (err) => {
                  if (err) {
                    console.error(err);
                    res.status(500).send("Error al subir el primer episodio");
                  } else {
                    // Insert remaining episodes without video URL
                    if (episodeList.length > 1) {
                      const remainingEpisodes = episodeList
                        .slice(1)
                        .map((ep, index) => [
                          animeId,
                          index + 2,
                          `Episodio ${index + 2}`,
                          "",
                          "",
                        ]);
                      db.query(
                        "INSERT INTO episodes (anime_id, episode_number, title, video_url, description) VALUES ?",
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
    }
  );
});

// Route to get anime details and views
router.get("/anime/:slug", isLoggedIn, (req, res) => {
  const slug = req.params.slug;

  db.query(
    "SELECT a.*, c.name as category_name FROM animes a LEFT JOIN anime_categories c ON a.category_id = c.id WHERE a.slug = ?",
    [slug],
    (err, animeResults) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error al recuperar detalles del anime");
      } else if (animeResults.length === 0) {
        res.status(404).send("Anime no encontrado");
      } else {
        const anime = animeResults[0];

        // Incrementar el contador de vistas
        db.query(
          "INSERT INTO anime_views (anime_id, views) VALUES (?, 1) ON DUPLICATE KEY UPDATE views = views + 1",
          [anime.id],
          (err) => {
            if (err) {
              console.error("Error al actualizar vistas:", err);
            }

            // Obtener el número actual de vistas
            db.query(
              "SELECT views FROM anime_views WHERE anime_id = ?",
              [anime.id],
              (err, viewResults) => {
                if (err) {
                  console.error("Error al obtener vistas:", err);
                }
                const views = viewResults[0] ? viewResults[0].views : 0;

                // Obtener episodios del anime
                db.query(
                  "SELECT * FROM episodes WHERE anime_id = ? ORDER BY episode_number ASC",
                  [anime.id],
                  (err, episodeResults) => {
                    if (err) {
                      console.error(err);
                      res.status(500).send("Error al recuperar episodios");
                    } else {
                      // Obtener información del usuario
                      db.query(
                        "SELECT username, profile_image_url, is_admin FROM usuarios WHERE id = ?",
                        [req.session.userId],
                        (userErr, userResults) => {
                          if (userErr) {
                            console.error(userErr);
                            res
                              .status(500)
                              .send(
                                "Error al recuperar información del usuario"
                              );
                          } else {
                            const user = userResults[0] || {};
                            res.render("anime/anime-detail", {
                              anime: anime,
                              episodes: episodeResults,
                              views: views,
                              isAdmin: user.is_admin,
                              user: {
                                username: user.username,
                                profile_image_url: user.profile_image_url,
                                isAdmin: user.is_admin,
                              },
                            });
                          }
                        }
                      );
                    }
                  }
                );
              }
            );
          }
        );
      }
    }
  );
});

// Route to delete an anime
router.post("/admin/animes/delete/:animeId", async (req, res) => {
  const animeId = req.params.animeId;

  try {
    // Eliminar registros en la tabla watched_animes asociados a los episodios del anime
    await db.query(
      `DELETE wa FROM watched_animes wa 
             JOIN episodes e ON wa.episode_id = e.id 
             WHERE e.anime_id = ?`,
      [animeId]
    );

    // Eliminar registros en anime_views asociados al anime
    await db.query("DELETE FROM anime_views WHERE anime_id = ?", [animeId]);

    // Eliminar registros en saved_animes asociados al anime
    await db.query("DELETE FROM saved_animes WHERE anime_id = ?", [animeId]);

    // Eliminar calificaciones (ratings) asociadas al anime
    await db.query("DELETE FROM ratings WHERE anime_id = ?", [animeId]);

    // Eliminar favoritos asociados al anime
    await db.query("DELETE FROM favorites WHERE anime_id = ?", [animeId]);

    // Eliminar registros en comment_reports asociados a los comentarios del anime
    await db.query(
      `DELETE cr FROM comment_reports cr 
             JOIN comments c ON cr.comment_id = c.id 
             WHERE c.anime_id = ?`,
      [animeId]
    );

    // Eliminar comentarios asociados al anime
    await db.query("DELETE FROM comments WHERE anime_id = ?", [animeId]);

    // Eliminar episodios asociados al anime
    await db.query("DELETE FROM episodes WHERE anime_id = ?", [animeId]);

    // Finalmente, eliminar el anime
    await db.query("DELETE FROM animes WHERE id = ?", [animeId]);

    // Si todo va bien, responder con éxito
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting anime:", error);
    res.json({ success: false, message: "No se pudo eliminar el anime." });
  }
});

// Route to get user's watched animes
router.get("/api/watched-animes", isLoggedIn, (req, res) => {
  const userId = req.session.userId;

  db.query(
    `SELECT a.id, a.name, a.imageUrl, a.slug, w.watched_at, e.title as episode_title, e.episode_number, e.id as episode_id
     FROM animes a 
     JOIN watched_animes w ON a.id = w.anime_id 
     JOIN episodes e ON w.episode_id = e.id
     WHERE w.user_id = ?
     ORDER BY w.watched_at DESC
     LIMIT 10`,
    [userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error al obtener animes vistos" });
      }
      res.json(results);
    }
  );
});

// Route to get anime views
router.get("/api/anime/:id/views", (req, res) => {
  const animeId = req.params.id;
  db.query(
    "SELECT views FROM anime_views WHERE anime_id = ?",
    [animeId],
    (err, results) => {
      if (err) {
        console.error("Error al obtener vistas:", err);
        res.status(500).json({ error: "Error al obtener vistas" });
      } else {
        const views = results[0] ? results[0].views : 0;
        res.json({ views: views });
      }
    }
  );
});

// Route to get animes by category
router.get("/anime/category/:categorySlug", isLoggedIn, (req, res) => {
  const categorySlug = req.params.categorySlug;
  const query = `
    SELECT a.*, c.name as category_name, COUNT(e.id) as episodeCount
    FROM animes a
    LEFT JOIN episodes e ON a.id = e.anime_id
    JOIN anime_categories c ON a.category_id = c.id
    WHERE c.slug = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `;
  db.query(query, [categorySlug], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error al recuperar animes");
    } else {
      // Fetch user information
      db.query(
        "SELECT username, profile_image_url FROM usuarios WHERE id = ?",
        [req.session.userId],
        (userErr, userResults) => {
          if (userErr) {
            console.error(userErr);
            res.status(500).send("Error al recuperar información del usuario");
          } else {
            const user = userResults[0] || {};
            res.render("anime/category-anime-list", {
              animes: rows,
              category: rows[0] ? rows[0].category_name : "Categoría",
              isAdmin: req.session.isAdmin,
              user: req.session.user,
              username: user.username,
              profile_image_url: user.profile_image_url,
            });
          }
        }
      );
    }
  });
});

// Route to get episode details
router.get("/anime/:slug/episode/:episodeNumber", isLoggedIn, (req, res) => {
  const { slug, episodeNumber } = req.params;
  const userId = req.session.userId;

  db.query(
    `SELECT a.*, e.*, c.name as category_name 
     FROM animes a 
     JOIN episodes e ON a.id = e.anime_id 
     LEFT JOIN anime_categories c ON a.category_id = c.id 
     WHERE a.slug = ? AND e.episode_number = ?`,
    [slug, episodeNumber],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error al recuperar episodio");
      }
      if (results.length === 0) {
        return res.status(404).send("Episodio no encontrado");
      }

      const episode = results[0];
      const animeId = episode.anime_id;

      // Query to get next episodes
      db.query(
        "SELECT * FROM episodes WHERE anime_id = ? AND episode_number > ? ORDER BY episode_number ASC LIMIT 5",
        [animeId, episodeNumber],
        (err, nextEpisodesResults) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .send("Error al recuperar episodios siguientes");
          }

          // Fetch user information
          db.query(
            "SELECT username, profile_image_url, is_admin FROM usuarios WHERE id = ?",
            [userId],
            (userErr, userResults) => {
              if (userErr) {
                console.error(userErr);
                return res
                  .status(500)
                  .send("Error al recuperar información del usuario");
              }

              const user = userResults[0] || {};

              // Register watched anime
              db.query(
                `INSERT INTO watched_animes (user_id, anime_id, episode_id) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE watched_at = CURRENT_TIMESTAMP`,
                [userId, animeId, episode.id],
                (watchErr) => {
                  if (watchErr) {
                    console.error(
                      "Error al registrar visualización:",
                      watchErr
                    );
                  }

                  // Render the episode details page
                  res.render("anime/episode-detail", {
                    anime: {
                      id: episode.anime_id,
                      name: episode.name,
                      slug: episode.slug,
                      category_name: episode.category_name,
                    },
                    episode: episode,
                    nextEpisodes: nextEpisodesResults,
                    isAdmin: user.is_admin,
                    user: {
                      username: user.username,
                      profile_image_url: user.profile_image_url,
                      isAdmin: user.is_admin,
                    },
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Route for episode upload page
router.get("/anime/:slug/upload-episode", isLoggedIn, isAdmin, (req, res) => {
  const slug = req.params.slug;
  db.query("SELECT * FROM animes WHERE slug = ?", [slug], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error al recuperar anime");
    } else if (results.length === 0) {
      res.status(404).send("Anime no encontrado");
    } else {
      res.render("anime/episode-upload", { anime: results[0] });
    }
  });
});

// Route to process episode upload
router.post("/anime/:slug/upload-episode", isLoggedIn, isAdmin, (req, res) => {
  const slug = req.params.slug;
  const { title, videoUrl, description } = req.body;
  db.query("SELECT id FROM animes WHERE slug = ?", [slug], (err, results) => {
    if (err || results.length === 0) {
      console.error(err);
      res.status(500).send("Error al recuperar anime");
    } else {
      const animeId = results[0].id;
      // Obtener el número del último episodio
      db.query(
        "SELECT MAX(episode_number) as lastEpisode FROM episodes WHERE anime_id = ?",
        [animeId],
        (err, result) => {
          if (err) {
            console.error(err);
            res.status(500).send("Error al obtener el último episodio");
          } else {
            const nextEpisodeNumber = (result[0].lastEpisode || 0) + 1;
            db.query(
              "INSERT INTO episodes (anime_id, episode_number, title, video_url, description) VALUES (?, ?, ?, ?, ?)",
              [animeId, nextEpisodeNumber, title, videoUrl, description],
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
        }
      );
    }
  });
});

// Route to add comment
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

// Route to get comments
router.get("/anime/:slug/comments", isLoggedIn, (req, res) => {
  const animeId = req.query.animeId;
  const episodeId = req.query.episodeId || null;

  let query = `
    SELECT c.*, u.username, u.is_admin, u.profile_image_url,
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

// Route to add to favorites
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

// Route to rate anime
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

// Route to get anime data
router.get("/anime/:slug/data", isLoggedIn, (req, res) => {
  const slug = req.params.slug;
  const userId = req.session.userId;

  db.query(
    `SELECT a.*, c.name as category_name,
     (SELECT COUNT(*) FROM favorites WHERE anime_id = a.id) AS favoriteCount,
     (SELECT AVG(rating) FROM ratings WHERE anime_id = a.id) AS averageRating,
     (SELECT COUNT(*) FROM ratings WHERE anime_id = a.id) AS ratingCount,
     (SELECT rating FROM ratings WHERE anime_id = a.id AND user_id = ?) AS userRating,
     (SELECT COUNT(*) > 0 FROM favorites WHERE anime_id = a.id AND user_id = ?) AS isFavorite,
     (SELECT COUNT(*) > 0 FROM saved_animes WHERE anime_id = a.id AND user_id = ?) AS isSaved
     FROM animes a
     LEFT JOIN anime_categories c ON a.category_id = c.id
     WHERE a.slug = ?`,
    [userId, userId, userId, slug],
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

// Route to get user's favorite animes
router.get("/api/favorite-animes", isLoggedIn, (req, res) => {
  const userId = req.session.userId;

  db.query(
    `SELECT a.id, a.name, a.imageUrl, a.slug, c.name as category_name
     FROM animes a 
     JOIN favorites f ON a.id = f.anime_id 
     LEFT JOIN anime_categories c ON a.category_id = c.id
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

// Route to toggle save for later
router.post("/anime/:slug/toggle-save", isLoggedIn, (req, res) => {
  const animeId = req.body.animeId;
  const userId = req.session.userId;

  db.query(
    "SELECT * FROM saved_animes WHERE user_id = ? AND anime_id = ?",
    [userId, animeId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Error al procesar la solicitud" });
      }

      if (results.length > 0) {
        // Anime is already saved, so remove it
        db.query(
          "DELETE FROM saved_animes WHERE user_id = ? AND anime_id = ?",
          [userId, animeId],
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({
                success: false,
                message: "Error al quitar de guardados",
              });
            }
            res.json({
              success: true,
              message: "Anime eliminado de guardados",
              isSaved: false,
            });
          }
        );
      } else {
        // Anime is not saved, so save it
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
            res.json({
              success: true,
              message: "Anime guardado para más tarde",
              isSaved: true,
            });
          }
        );
      }
    }
  );
});

// Route to get saved animes
router.get("/animes/api/saved-animes", isLoggedIn, (req, res) => {
  const userId = req.session.userId;

  // First, fetch the user's profile image URL
  db.query(
    "SELECT profile_image_url FROM usuarios WHERE id = ?",
    [userId],
    (userErr, userResults) => {
      if (userErr) {
        console.error("Error fetching user data:", userErr);
        return res.status(500).render("error/error", {
          error: "Error al obtener datos del usuario",
          username: req.session.username,
          isAdmin: req.session.isAdmin,
        });
      }

      const profileImageUrl =
        userResults[0]?.profile_image_url || "/placeholder.svg";

      // Then fetch the saved animes
      const query = `
        SELECT a.id, a.name, a.imageUrl, a.slug, c.name as category_name
        FROM animes a 
        JOIN saved_animes s ON a.id = s.anime_id 
        LEFT JOIN anime_categories c ON a.category_id = c.id
        WHERE s.user_id = ?
      `;

      db.query(query, [userId], (err, results) => {
        if (err) {
          console.error("Error fetching saved animes:", err);
          return res.status(500).render("error/error", {
            error: "Error al obtener animes guardados",
            username: req.session.username,
            isAdmin: req.session.isAdmin,
          });
        }

        res.render("anime/saved-anime-list", {
          animes: results,
          isAdmin: req.session.isAdmin,
          username: req.session.username,
          profileImageUrl: profileImageUrl,
          title: "Animes Guardados",
        });
      });
    }
  );
});

// Route to get total animes uploaded
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

// Route to add comment to an episode
router.post(
  "/anime/:slug/episode/:episodeNumber/comment",
  isLoggedIn,
  (req, res) => {
    const { slug, episodeNumber } = req.params;
    const userId = req.session.userId;
    const content = req.body.content;

    db.query(
      "INSERT INTO comments (user_id, anime_id, episode_id, content) VALUES (?, (SELECT id FROM animes WHERE slug = ?), (SELECT id FROM episodes WHERE anime_id = (SELECT id FROM animes WHERE slug = ?) AND episode_number = ?), ?)",
      [userId, slug, slug, episodeNumber, content],
      (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error al agregar comentario" });
        }
        res.json({ success: true, reload: true });
      }
    );
  }
);

// Route to get comments for an episode
router.get(
  "/anime/:slug/episode/:episodeNumber/comments",
  isLoggedIn,
  (req, res) => {
    const { slug, episodeNumber } = req.params;

    db.query(
      `SELECT c.*, u.username, u.is_admin, u.profile_image_url,
    CASE 
      WHEN u.is_admin = 1 THEN 'Admin'
      ELSE 'Novato I'
    END AS user_rank
    FROM comments c
    JOIN usuarios u ON c.user_id = u.id
    JOIN episodes e ON c.episode_id = e.id
    JOIN animes a ON e.anime_id = a.id
    WHERE a.slug = ? AND e.episode_number = ?`,
      [slug, episodeNumber],
      (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error al obtener comentarios" });
        }
        res.json(results);
      }
    );
  }
);

// Route to get user information
router.get("/api/user/:username", isLoggedIn, (req, res) => {
  const username = req.params.username;
  db.query(
    "SELECT id, username, email, profile_image_url, IFNULL(bio, '') as bio FROM usuarios WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error al obtener información del usuario" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.json(results[0]);
    }
  );
});

// Route for user profile
router.get("/profile/:username", isLoggedIn, (req, res) => {
  const username = req.params.username;
  db.query(
    `SELECT u.id, u.username, u.email, u.profile_image_url, u.banner_image_url, IFNULL(u.bio, '') as bio,
     (SELECT COUNT(*) FROM favorites WHERE user_id = u.id) as favorite_count,
     (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count
     FROM usuarios u WHERE u.username = ?`,
    [username],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error al obtener información del usuario");
      }
      if (results.length === 0) {
        return res.status(404).send("Usuario no encontrado");
      }
      const user = results[0];

      // Get user's favorite animes
      db.query(
        `SELECT a.id, a.name, a.imageUrl, a.slug, c.name as category_name
         FROM animes a 
         JOIN favorites f ON a.id = f.anime_id 
         LEFT JOIN anime_categories c ON a.category_id = c.id
         WHERE f.user_id = ?
         LIMIT 5`,
        [user.id],
        (err, favoriteAnimes) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Error al obtener animes favoritos");
          }

          res.render("users/user-profile", {
            user: user,
            favoriteAnimes: favoriteAnimes,
            isOwnProfile: req.session.username === username,
          });
        }
      );
    }
  );
});

// Route to update user's bio
router.post("/profile/update-bio", isLoggedIn, (req, res) => {
  const userId = req.session.userId;
  const { bio } = req.body;

  db.query(
    "UPDATE usuarios SET bio = ? WHERE id = ?",
    [bio, userId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Error al actualizar la bio" });
      }
      res.json({ success: true, message: "Bio actualizada correctamente" });
    }
  );
});

// New route for profile image upload
router.post(
  "/profile/update-profile-image",
  isLoggedIn,
  upload.single("profileImage"),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    const userId = req.session.userId;
    const profileImageUrl = `/uploads/${req.file.filename}`;

    db.query(
      "UPDATE usuarios SET profile_image_url = ? WHERE id = ?",
      [profileImageUrl, userId],
      (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, error: "Error updating profile image" });
        }

        // Update the session with the new profile image URL
        req.session.profileImageUrl = profileImageUrl;

        res.json({
          success: true,
          message: "Profile image updated successfully",
          profileImageUrl: profileImageUrl,
        });
      }
    );
  }
);

// New route for banner image upload
router.post(
  "/profile/update-banner-image",
  isLoggedIn,
  upload.single("bannerImage"),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    const userId = req.session.userId;
    const bannerImageUrl = `/uploads/${req.file.filename}`;

    db.query(
      "UPDATE usuarios SET banner_image_url = ? WHERE id = ?",
      [bannerImageUrl, userId],
      (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, error: "Error updating banner image" });
        }
        res.json({
          success: true,
          message: "Banner image updated successfully",
          bannerImageUrl: bannerImageUrl,
        });
      }
    );
  }
);

module.exports = router;

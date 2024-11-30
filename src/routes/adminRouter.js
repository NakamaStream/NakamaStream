const express = require("express");
const router = express.Router();
const db = require("../services/db");
const moment = require("moment");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

let announcement = {
  message: "",
  expiration: null,
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(403).render("error/accessDenied", { username: req.session.username });
  }

  db.query(
    "SELECT is_admin FROM usuarios WHERE id = ?",
    [req.session.userId],
    (err, results) => {
      if (err) {
        console.error("Error al verificar permisos de administrador:", err);
        return res.status(500).render("error/error");
      }

      if (results.length === 0 || !results[0].is_admin) {
        return res.status(403).render("error/accessDenied", { username: req.session.username });
      }

      next();
    }
  );
};

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  db.query(
    "SELECT id FROM usuarios WHERE id = ?",
    [req.session.userId],
    (err, results) => {
      if (err) {
        console.error("Error al verificar inicio de sesión:", err);
        return res.status(500).render("error/error");
      }

      if (results.length === 0) {
        return res.redirect("/login");
      }

      next();
    }
  );
};

// Routes for comment management
router.get("/admin/comments", isAdmin, (req, res) => {
  res.render("admin/comment-admin", { username: req.session.username });
});

// Route for anime admin page
router.get("/admin/animes", isAdmin, (req, res) => {
  db.query("SELECT * FROM animes ORDER BY created_at DESC", (err, animes) => {
    if (err) {
      console.error("Error fetching animes:", err);
      return res.status(500).render("error/error", {
        error: "Internal server error",
        username: req.session.username,
      });
    }
    res.render("admin/admin-animes", {
      animes: animes || [],
      username: req.session.username,
    });
  });
});

// Route to delete an anime
router.post("/admin/animes/delete/:animeId", isAdmin, async (req, res) => {
  const animeId = req.params.animeId;

  try {
    // Delete associated records in saved_animes
    await db.query("DELETE FROM saved_animes WHERE anime_id = ?", [animeId]);

    // Delete associated ratings
    await db.query("DELETE FROM ratings WHERE anime_id = ?", [animeId]);

    // Delete associated favorites
    await db.query("DELETE FROM favorites WHERE anime_id = ?", [animeId]);

    // Delete associated episodes
    await db.query("DELETE FROM episodes WHERE anime_id = ?", [animeId]);

    // Delete associated comments
    await db.query("DELETE FROM comments WHERE anime_id = ?", [animeId]);

    // Finally, delete the anime
    await db.query("DELETE FROM animes WHERE id = ?", [animeId]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting anime:", error);
    res.json({ success: false, message: "No se pudo eliminar el anime." });
  }
});

// Route for editing anime
router.get("/admin/animes/edit/:id", isAdmin, (req, res) => {
  const animeId = req.params.id;
  db.query("SELECT * FROM animes WHERE id = ?", [animeId], (err, results) => {
    if (err) {
      console.error("Error fetching anime:", err);
      return res.status(500).render("error/error", {
        error: "Internal server error",
        username: req.session.username,
      });
    }
    if (results.length === 0) {
      return res.status(404).render("error/error", {
        error: "Anime not found",
        username: req.session.username,
      });
    }
    res.render("anime/edit-anime", {
      anime: results[0],
      username: req.session.username,
    });
  });
});

// Route for updating anime
router.post(
  "/admin/animes/update/:id",
  isAdmin,
  upload.single("cover_image"),
  (req, res) => {
    const animeId = req.params.id;
    const { name, description, release_date, status } = req.body;
    let cover_image = req.body.current_cover_image;

    if (req.file) {
      cover_image = `/uploads/${req.file.filename}`;
    }

    db.query(
      "UPDATE animes SET name = ?, description = ?, release_date = ?, status = ?, cover_image = ? WHERE id = ?",
      [name, description, release_date, status, cover_image, animeId],
      (err, result) => {
        if (err) {
          console.error("Error updating anime:", err);
          return res.status(500).render("error/error", {
            error: "Internal server error",
            username: req.session.username,
          });
        }
        res.redirect("/admin/animes");
      }
    );
  }
);

// API routes
router.get("/api/animes", isAdmin, (req, res) => {
  db.query("SELECT id, name FROM animes ORDER BY name", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results);
  });
});

router.get("/api/comments", isAdmin, (req, res) => {
  const { animeId, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT c.id, c.content, c.created_at, u.username, u.is_admin as user_rank, a.name as anime_name, e.title as episode_number
    FROM comments c
    JOIN usuarios u ON c.user_id = u.id
    JOIN episodes e ON c.episode_id = e.id
    JOIN animes a ON e.anime_id = a.id
  `;
  const queryParams = [];

  if (animeId) {
    query += " WHERE a.id = ?";
    queryParams.push(animeId);
  }

  query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
  queryParams.push(parseInt(limit), offset);

  db.query(query, queryParams, (err, comments) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }

    let countQuery =
      "SELECT COUNT(*) as count FROM comments c JOIN episodes e ON c.episode_id = e.id";
    if (animeId) {
      countQuery += " WHERE e.anime_id = ?";
    }
    db.query(countQuery, animeId ? [animeId] : [], (err, countResult) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }

      const totalComments = countResult[0].count;

      res.json({
        comments,
        totalPages: Math.ceil(totalComments / limit),
        currentPage: parseInt(page),
      });
    });
  });
});

router.delete("/api/comments/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM comments WHERE id = ?", [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json({ success: true });
  });
});

router.put("/api/comments/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  db.query(
    "UPDATE comments SET content = ? WHERE id = ?",
    [content, id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json({ success: true });
    }
  );
});

// User registration and login routes
router.get("/register", (req, res) => {
  res.render("users/register");
});

router.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const createdAt = new Date();
  const sql = `INSERT INTO usuarios (username, email, password, created_at, is_admin) VALUES (?, ?, ?, ?, ?)`;
  db.query(
    sql,
    [username, email, password, createdAt, false],
    (err, result) => {
      if (err) {
        console.error("Error al registrar el usuario:", err.message);
        if (err.code === "ER_NO_DEFAULT_FOR_FIELD") {
          res.render("users/register", {
            error: "Por favor, proporciona una contraseÃ±a.",
          });
        } else {
          res.redirect("/register");
        }
        return;
      }
      console.log("Usuario registrado correctamente");
      res.redirect("/login");
    }
  );
});

router.get("/login", (req, res) => {
  res.render("users/login");
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const sql = `SELECT *, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS time_created, is_admin FROM usuarios WHERE username = ? AND password = ?`;
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error("Error al iniciar sesiÃ³n:", err.message);
      res.redirect("/login");
      return;
    }
    if (results.length > 0) {
      req.session.loggedin = true;
      req.session.userId = results[0].id;
      req.session.username = username;
      req.session.email = results[0].email;
      req.session.createdAt = results[0].created_at;
      req.session.timeCreated = results[0].time_created;
      req.session.isAdmin = results[0].is_admin;
      res.redirect("/anime");
    } else {
      res.send(
        'Credenciales incorrectas. <a href="/login">Volver al inicio de sesiÃ³n</a>'
      );
    }
  });
});

// Ruta de cierre de sesión
router.get("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
})

// Profile routes
router.get("/profile", isLoggedIn, (req, res) => {
  const userId = req.session.userId;
  db.query("SELECT * FROM usuarios WHERE id = ?", [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user data:", err);
      return res.status(500).render("error/error", {
        error: "Internal server error",
        username: req.session.username,
      });
    }

    if (results.length === 0) {
      return res.status(404).render("error/error", {
        error: "User not found",
        username: req.session.username,
      });
    }

    const user = results[0];
    const createdAtFormatted = moment(user.created_at).format(
      "DD/MM/YYYY HH:mm:ss"
    );
    const timeCreatedFormatted = moment
      .duration(moment().diff(moment(user.created_at)))
      .humanize();

    res.render("users/profiles", {
      username: user.username,
      email: user.email,
      createdAtFormatted,
      timeCreatedFormatted,
      isAdmin: user.is_admin === 1,
      profileImageUrl: user.profile_image_url || "/placeholder-user.jpg",
      bannerImageUrl: user.banner_image_url || "/placeholder-banner.jpg",
      bio: user.bio || "",
    });
  });
});

router.post(
  "/profile/update-info",
  isLoggedIn,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
  ]),
  (req, res) => {
    const { newUsername, email, currentPassword, newPassword, bio } = req.body;
    const userId = req.session.userId;

    if (!newUsername || !email) {
      return res
        .status(400)
        .json({ error: "Nombre de usuario y email son requeridos" });
    }

    let updateFields = { username: newUsername, email: email };
    let updateValues = [newUsername, email];

    if (bio !== undefined) {
      updateFields.bio = bio;
      updateValues.push(bio);
    }

    if (req.files) {
      if (req.files["profileImage"] && req.files["profileImage"][0]) {
        updateFields.profile_image_url = `/uploads/${req.files["profileImage"][0].filename}`;
        updateValues.push(updateFields.profile_image_url);
      }
      if (req.files["bannerImage"] && req.files["bannerImage"][0]) {
        updateFields.banner_image_url = `/uploads/${req.files["bannerImage"][0].filename}`;
        updateValues.push(updateFields.banner_image_url);
      }
    }

    const updateUser = () => {
      updateValues.push(userId);
      const updateQuery = `UPDATE usuarios SET ${Object.keys(updateFields)
        .map((field) => `${field} = ?`)
        .join(", ")} WHERE id = ?`;

      db.query(updateQuery, updateValues, (err, results) => {
        if (err) {
          console.error("Error al actualizar la informaciÃ³n del usuario:", err);
          return res
            .status(500)
            .json({ error: "Error al actualizar la informaciÃ³n del usuario" });
        }

        req.session.username = newUsername;
        req.session.email = email;
        res.json({
          success: true,
          message: "Perfil actualizado correctamente",
        });
      });
    };

    if (currentPassword) {
      db.query(
        "SELECT password FROM usuarios WHERE id = ?",
        [userId],
        (err, results) => {
          if (err) {
            console.error("Error al obtener la contraseÃ±a actual:", err);
            return res
              .status(500)
              .json({ error: "Error interno del servidor" });
          }

          if (results.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
          }

          if (results[0].password !== currentPassword) {
            return res
              .status(400)
              .json({ error: "ContraseÃ±a actual incorrecta" });
          }

          if (newPassword) {
            updateFields.password = newPassword;
            updateValues.push(newPassword);
          }

          updateUser();
        }
      );
    } else {
      updateUser();
    }
  }
);

// Admin panel routes
router.get("/admin/panel", isAdmin, (req, res) => {
  db.query("SELECT * FROM usuarios", (err, users) => {
    if (err) {
      console.error("Error al obtener la lista de usuarios:", err);
      return res.render("admin/admin", {
        error: "Error al obtener la lista de usuarios",
        username: req.session.username,
      });
    }

    res.render("admin/admin", { users, req, username: req.session.username });
  });
});

router.post("/admin/delete-user", isAdmin, (req, res) => {
  const userId = req.body.userId;

  db.query(
    "SELECT is_admin FROM usuarios WHERE id = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error(
          "Error al verificar si el usuario es administrador:",
          err
        );
        return res.render("error/error", { username: req.session.username });
      }

      if (results.length > 0 && results[0].is_admin) {
        return res.render("error/adminError", {
          username: req.session.username,
        });
      }

      db.query("DELETE FROM usuarios WHERE id = ?", [userId], (err, result) => {
        if (err) {
          console.error("Error al eliminar el usuario:", err);
          return res.render("error/error", { username: req.session.username });
        }

        res.redirect("/admin/panel");
      });
    }
  );
});

router.post("/admin/ban-user", isAdmin, (req, res) => {
  const userId = req.body.userId;
  const banType = req.body.banType;
  const banDuration = req.body.banDuration;

  db.query(
    "SELECT is_admin FROM usuarios WHERE id = ?",
    [userId],
    (err, result) => {
      if (err) {
        console.error("Error al verificar el rol del usuario:", err);
        return res.render("error/error", { username: req.session.username });
      }

      if (result.length > 0 && result[0].is_admin) {
        return res.render("error/adminError", {
          username: req.session.username,
        });
      }

      if (banType === "temporary") {
        db.query(
          "UPDATE usuarios SET banned = ?, ban_expiration = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?",
          [true, banDuration, userId],
          (err, result) => {
            if (err) {
              console.error("Error al banear al usuario:", err);
              return res.redirect("/admin/error");
            }

            res.redirect("/admin/panel");
          }
        );
      } else {
        db.query(
          "UPDATE usuarios SET banned = ?, ban_expiration = NULL WHERE id = ?",
          [true, userId],
          (err, result) => {
            if (err) {
              console.error("Error al banear al usuario:", err);
              return res.redirect("/admin/error");
            }

            res.redirect("/admin/panel");
          }
        );
      }
    }
  );
});

router.post("/admin/promote-user", isAdmin, (req, res) => {
  const userId = req.body.userId;

  db.query(
    "UPDATE usuarios SET is_admin = ? WHERE id = ?",
    [true, userId],
    (err, result) => {
      if (err) {
        console.error("Error al promover al usuario como administrador:", err);
        return res.redirect("/admin/panel");
      }

      res.redirect("/admin/panel");
    }
  );
});

router.post("/admin/update-user", isAdmin, (req, res) => {
  const { userId, username, email, password } = req.body;

  db.query(
    "UPDATE usuarios SET username = ?, email = ?, password = ? WHERE id = ?",
    [username, email, password, userId],
    (err, result) => {
      if (err) {
        console.error("Error al actualizar la informaciÃ³n del usuario:", err);
        return res.redirect("/admin/panel");
      }

      res.redirect("/admin/panel");
    }
  );
});

router.post("/admin/add-admin", isAdmin, (req, res) => {
  const { username, email, password } = req.body;
  const createdAt = new Date();

  db.query(
    "INSERT INTO usuarios (username, email, password, created_at, is_admin) VALUES (?, ?, ?, ?, ?)",
    [username, email, password, createdAt, true],
    (err, result) => {
      if (err) {
        console.error("Error al agregar el usuario administrador:", err);
        return res.redirect("/admin/panel");
      }

      res.redirect("/admin/panel");
    }
  );
});

router.post("/admin/unban-user", isAdmin, (req, res) => {
  const userId = req.body.userId;

  db.query(
    "UPDATE usuarios SET banned = ?, ban_expiration = NULL WHERE id = ?",
    [false, userId],
    (err, result) => {
      if (err) {
        console.error("Error al desbanear al usuario:", err);
        return res.redirect("/admin/panel");
      }

      res.redirect("/admin/panel");
    }
  );
});

router.post("/admin/demote-user", isAdmin, (req, res) => {
  const userId = req.body.userId;

  db.query(
    "UPDATE usuarios SET is_admin = ? WHERE id = ?",
    [false, userId],
    (err, result) => {
      if (err) {
        console.error(
          "Error al quitar el rol de administrador al usuario:",
          err
        );
        return res.redirect("/admin/panel");
      }

      res.redirect("/admin/panel");
    }
  );
});

router.post("/set-announcement", isAdmin, (req, res) => {
  try {
    const { message, duration } = req.body;
    if (!message || !duration) {
      return res
        .status(400)
        .json({ success: false, error: "Message and duration are required." });
    }

    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + parseInt(duration));

    announcement.message = message;
    announcement.expiration = expiration;

    res.json({ success: true });
  } catch (error) {
    console.error("Error setting announcement:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

router.get("/get-announcement", (req, res) => {
  const now = new Date();
  if (announcement.expiration && now <= announcement.expiration) {
    res.json({ message: announcement.message });
  } else {
    res.json({ message: null });
  }
});

// New route for /admin/episodes
router.get("/admin/episodes", isAdmin, (req, res) => {
  // First, fetch all animes
  db.query("SELECT id, name FROM animes ORDER BY name", (animeErr, animes) => {
    if (animeErr) {
      console.error("Error fetching animes:", animeErr);
      return res.status(500).render("error/error", {
        error: "Internal server error",
        username: req.session.username,
      });
    }

    // Then, fetch all episodes with anime names
    db.query(
      "SELECT e.*, a.name as anime_name FROM episodes e JOIN animes a ON e.anime_id = a.id ORDER BY a.name, e.episode_number",
      (episodeErr, episodes) => {
        if (episodeErr) {
          console.error("Error fetching episodes:", episodeErr);
          return res.status(500).render("error/error", {
            error: "Internal server error",
            username: req.session.username,
          });
        }
        res.render("admin/episodes", {
          episodes: episodes || [],
          animes: animes || [],
          username: req.session.username,
        });
      }
    );
  });
});

// Route for editing episodes
router.get("/admin/edit-episode", isAdmin, (req, res) => {
  db.query("SELECT id, name FROM animes ORDER BY name", (err, animes) => {
    if (err) {
      console.error("Error fetching animes:", err);
      return res.status(500).render("error/error", {
        error: "Internal server error",
        username: req.session.username,
      });
    }
    res.render("admin/edit-episode", {
      animes: animes || [],
      username: req.session.username,
    });
  });
});

// API route to get episodes for a specific anime
router.get("/api/animes/:id/episodes", isAdmin, (req, res) => {
  const animeId = req.params.id;
  db.query(
    "SELECT id, title, episode_number FROM episodes WHERE anime_id = ? ORDER BY episode_number",
    [animeId],
    (err, episodes) => {
      if (err) {
        console.error("Error fetching episodes:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json(episodes);
    }
  );
});

// API route to get episode details
router.get("/api/episodes/:id", isAdmin, (req, res) => {
  const episodeId = req.params.id;
  db.query(
    "SELECT * FROM episodes WHERE id = ?",
    [episodeId],
    (err, results) => {
      if (err) {
        console.error("Error fetching episode details:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "Episode not found" });
      }
      res.json(results[0]);
    }
  );
});

// Route to handle episode update or creation
router.post("/admin/edit-episode", isAdmin, express.json(), (req, res) => {
  //console.log("Received data:", req.body); // Debug log

  const { episodeId, animeId, title, episodeNumber, videoUrl, description } = req.body;

  // Convert empty strings to null for optional fields
  const sanitizedDescription = description || null;

  // Debug logs
  console.log("Parsed values:", {
    episodeId,
    animeId,
    title,
    episodeNumber,
    videoUrl,
    description: sanitizedDescription
  });

  // Validate required fields
  if (!animeId) {
    return res.status(400).json({ success: false, message: "El anime es requerido" });
  }
  if (!title) {
    return res.status(400).json({ success: false, message: "El tÃ­tulo es requerido" });
  }
  if (!episodeNumber) {
    return res.status(400).json({ success: false, message: "El nÃºmero de episodio es requerido" });
  }
  if (!videoUrl) {
    return res.status(400).json({ success: false, message: "La URL del video es requerida" });
  }

  // Ensure episodeNumber is a number
  const parsedEpisodeNumber = parseInt(episodeNumber, 10);
  if (isNaN(parsedEpisodeNumber)) {
    return res.status(400).json({ success: false, message: "El nÃºmero de episodio debe ser un nÃºmero vÃ¡lido" });
  }

  if (episodeId) {
    // Update existing episode
    db.query(
      "UPDATE episodes SET anime_id = ?, title = ?, episode_number = ?, video_url = ?, description = ? WHERE id = ?",
      [animeId, title, parsedEpisodeNumber, videoUrl, sanitizedDescription, episodeId],
      (err, result) => {
        if (err) {
          console.error("Error updating episode:", err);
          return res.status(500).json({
            success: false,
            message: "Error al actualizar el episodio",
            error: err.message
          });
        }
        res.json({ success: true, message: "Episodio actualizado correctamente" });
      }
    );
  } else {
    // Insert new episode
    db.query(
      "INSERT INTO episodes (anime_id, title, episode_number, video_url, description) VALUES (?, ?, ?, ?, ?)",
      [animeId, title, parsedEpisodeNumber, videoUrl, sanitizedDescription],
      (err, result) => {
        if (err) {
          console.error("Error creating new episode:", err);
          return res.status(500).json({
            success: false,
            message: "Error al crear el episodio",
            error: err.message
          });
        }
        res.json({ success: true, message: "Episodio creado correctamente" });
      }
    );
  }
});

// Route to delete an episode
router.post("/admin/delete-episode/:id", isAdmin, (req, res) => {
  const episodeId = req.params.id;
  db.query("DELETE FROM episodes WHERE id = ?", [episodeId], (err, result) => {
    if (err) {
      console.error("Error deleting episode:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error deleting episode" });
    }
    res.json({ success: true, message: "Episode deleted successfully" });
  });
});

module.exports = router;

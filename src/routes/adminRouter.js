const express = require("express");
const router = express.Router();
const db = require("../services/db");
const moment = require("moment");

let announcement = {
  message: "",
  expiration: null,
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(403).render('error/accessDenied');
  }
};

// Existing routes...

// New routes for comment management
router.get("/admin/comments", isAdmin, (req, res) => {
  res.render("admin/comment-admin");
});

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

// Existing routes...

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
            error: "Por favor, proporciona una contraseña.",
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
      console.error("Error al iniciar sesión:", err.message);
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
        'Credenciales incorrectas. <a href="/login">Volver al inicio de sesión</a>'
      );
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

router.get("/profile", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const { username, email, createdAt, timeCreated, isAdmin } = req.session;
  const createdAtFormatted = moment(createdAt).format("DD/MM/YYYY HH:mm:ss");
  const timeCreatedFormatted = moment
    .utc(timeCreated * 1000)
    .format("HH:mm:ss");
  res.render("users/profiles", {
    username,
    email,
    createdAtFormatted,
    timeCreatedFormatted,
    isAdmin,
  });
});

router.post("/profile/update-username", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const { newUsername } = req.body;
  const userId = req.session.userId;

  db.query(
    "UPDATE usuarios SET username = ? WHERE id = ?",
    [newUsername, userId],
    (err, results) => {
      if (err) {
        console.error("Error al actualizar el nombre de usuario:", err);
        return res.redirect("/profile");
      }

      req.session.username = newUsername;
      res.redirect("/profile");
    }
  );
});

router.post("/profile/update-password", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

  db.query(
    "SELECT password FROM usuarios WHERE id = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("Error al obtener la contraseña actual:", err);
        return res.redirect("/profile");
      }

      if (results.length === 0) {
        return res.render("users/profiles", {
          error: "No se encontró el usuario.",
        });
      }

      const currentPasswordHash = results[0].password;
      if (currentPassword !== currentPasswordHash) {
        return res.render("users/profiles", {
          error: "La contraseña actual es incorrecta.",
        });
      }

      db.query(
        "UPDATE usuarios SET password = ? WHERE id = ?",
        [newPassword, userId],
        (err, results) => {
          if (err) {
            console.error("Error al actualizar la contraseña:", err);
            return res.redirect("/profile");
          }

          res.redirect("/profile");
        }
      );
    }
  );
});

router.get("/admin/panel", isAdmin, (req, res) => {
  db.query("SELECT * FROM usuarios", (err, users) => {
    if (err) {
      console.error("Error al obtener la lista de usuarios:", err);
      return res.render("admin/admin", {
        error: "Error al obtener la lista de usuarios",
      });
    }

    res.render("admin/admin", { users, req });
  });
});

router.post("/admin/delete-user", isAdmin, (req, res) => {
  const userId = req.body.userId;
  db.query("DELETE FROM usuarios WHERE id = ?", [userId], (err, result) => {
    if (err) {
      console.error("Error al eliminar el usuario:", err);
      return res.redirect("/admin/panel");
    }

    res.redirect("/admin/panel");
  });
});

router.post("/admin/ban-user", isAdmin, (req, res) => {
  const userId = req.body.userId;
  const banType = req.body.banType;
  const banDuration = req.body.banDuration;

  if (banType === "temporary") {
    db.query(
      "UPDATE usuarios SET banned = ?, ban_expiration = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?",
      [true, banDuration, userId],
      (err, result) => {
        if (err) {
          console.error("Error al banear al usuario:", err);
          return res.redirect("/admin/panel");
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
          return res.redirect("/admin/panel");
        }

        res.redirect("/admin/panel");
      }
    );
  }
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
        console.error("Error al actualizar la información del usuario:", err);
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

module.exports = router;

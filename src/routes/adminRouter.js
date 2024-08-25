// authRouter.js
const express = require("express");
const router = express.Router();
const db = require("../services/db");
const moment = require("moment");

let announcement = {
  message: '',
  expiration: null
};

// Ruta de registro (GET)
router.get("/register", (req, res) => {
  res.render("register");
});

// Ruta de registro (POST)
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
          res.render("register", {
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

// Ruta de inicio de sesión (GET)
router.get("/login", (req, res) => {
  res.render("login");
});

// Ruta de inicio de sesión (POST)
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
      req.session.isAdmin = results[0].is_admin; // Guardar el valor de is_admin en la sesión
      res.redirect("/anime");
    } else {
      res.send(
        'Credenciales incorrectas. <a href="/login">Volver al inicio de sesión</a>'
      );
    }
  });
});

// Ruta de cierre de sesión
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Ruta del perfil de usuario
router.get("/profile", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const { username, email, createdAt, timeCreated, isAdmin } = req.session;
  const createdAtFormatted = moment(createdAt).format("DD/MM/YYYY HH:mm:ss");
  const timeCreatedFormatted = moment
    .utc(timeCreated * 1000)
    .format("HH:mm:ss");
  res.render("profiles", {
    username,
    email,
    createdAtFormatted,
    timeCreatedFormatted,
    isAdmin,
  });
});

// Ruta para actualizar el nombre de usuario
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

// Ruta para actualizar la contraseña
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
        return res.render("profiles", {
          error: "No se encontró el usuario.",
        });
      }

      const currentPasswordHash = results[0].password;
      if (currentPassword !== currentPasswordHash) {
        return res.render("profiles", {
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

// Ruta para el panel de administrador
router.get("/admin/panel", (req, res) => {
  // Verificar si el usuario es administrador
  if (req.session.isAdmin) {
    // Obtener la lista de usuarios
    db.query("SELECT * FROM usuarios", (err, users) => {
      if (err) {
        console.error("Error al obtener la lista de usuarios:", err);
        return res.render("admin", {
          error: "Error al obtener la lista de usuarios",
        });
      }

      res.render("admin", { users, req });
    });
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/anime");
  }
});

// Ruta para eliminar un usuario
router.post("/admin/delete-user", (req, res) => {
  // Verificar si el usuario es administrador
  if (req.session.isAdmin) {
    const userId = req.body.userId;
    db.query("DELETE FROM usuarios WHERE id = ?", [userId], (err, result) => {
      if (err) {
        console.error("Error al eliminar el usuario:", err);
        return res.redirect("/admin");
      }

      res.redirect("/admin/panel");
    });
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/anime");
  }
});

// Ruta para banear un usuario
router.post("/admin/ban-user", (req, res) => {
  // Verificar si el usuario es administrador
  if (req.session.isAdmin) {
    const userId = req.body.userId;
    const banType = req.body.banType; // Tipo de ban (temporal o permanente)
    const banDuration = req.body.banDuration; // Duración del ban en días (solo para ban temporal)

    // Actualizar el estado del usuario
    if (banType === "temporary") {
      // Ban temporal
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
      // Ban permanente
      db.query(
        "UPDATE usuarios SET banned = ?, ban_expiration = NULL WHERE id = ?",
        [true, userId],
        (err, result) => {
          if (err) {
            console.error("Error al banear al usuario:", err);
            return res.redirect("/admin/panel");
        }

        res.redirect("/admin/panel");
      });
    }
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/admin/panel");
  }
});

// Ruta para promover a un usuario como administrador
router.post("/admin/promote-user", (req, res) => {
  // Verificar si el usuario actual es administrador
  if (req.session.isAdmin) {
    const userId = req.body.userId;

    // Actualizar el usuario como administrador
    db.query(
      "UPDATE usuarios SET is_admin = ? WHERE id = ?",
      [true, userId],
      (err, result) => {
        if (err) {
          console.error(
            "Error al promover al usuario como administrador:",
            err
          );
          return res.redirect("/admin/panel");
        }

        res.redirect("/admin/panel");
      }
    );
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/anime");
  }
});

// Ruta para actualizar la información de un usuario
router.post("/admin/update-user", (req, res) => {
  // Verificar si el usuario es administrador
  if (req.session.isAdmin) {
    const { userId, username, email, password } = req.body;

    // Actualizar la información del usuario
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
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/anime");
  }
});

// Ruta para agregar un usuario administrador
router.post("/admin/add-admin", (req, res) => {
  // Verificar si el usuario actual es administrador
  if (req.session.isAdmin) {
    const { username, email, password } = req.body;
    const createdAt = new Date();

    // Insertar el nuevo usuario administrador
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
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/anime");
  }
});
// Ruta para desbanear a un usuario
router.post("/admin/unban-user", (req, res) => {
  // Verificar si el usuario es administrador
  if (req.session.isAdmin) {
    const userId = req.body.userId;

    // Actualizar el estado del usuario para desbanearlo
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
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/anime");
  }
});

// Ruta para quitar el rol de administrador a un usuario
router.post("/admin/demote-user", (req, res) => {
  // Verificar si el usuario actual es administrador
  if (req.session.isAdmin) {
    const userId = req.body.userId;

    // Actualizar el usuario para quitarle el rol de administrador
    db.query(
      "UPDATE usuarios SET is_admin = ? WHERE id = ?",
      [false, userId],
      (err, result) => {
        if (err) {
          console.error("Error al quitar el rol de administrador al usuario:", err);
          return res.redirect("/admin/panel");
        }

        res.redirect("/admin/panel");
      }
    );
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/anime");
  }
});

router.post('/set-announcement', (req, res) => {
  try {
    const { message, duration } = req.body;
    if (!message || !duration) {
      return res.status(400).json({ success: false, error: 'Message and duration are required.' });
    }

    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + parseInt(duration));

    announcement.message = message;
    announcement.expiration = expiration;

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting announcement:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/get-announcement', (req, res) => {
  const now = new Date();
  if (announcement.expiration && now <= announcement.expiration) {
    res.json({ message: announcement.message });
  } else {
    res.json({ message: null });
  }
});

module.exports = router;
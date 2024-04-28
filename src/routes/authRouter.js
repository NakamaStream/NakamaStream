// authRouter.js
const express = require("express");
const router = express.Router();
const db = require("../services/db");
const moment = require("moment");

// Ruta de registro (GET)
router.get("/register", (req, res) => {
  res.render("register");
});

// Ruta de registro (POST)
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const createdAt = new Date();
  const sql = `INSERT INTO usuarios (username, email, password, created_at) VALUES (?, ?, ?, ?)`;
  db.query(sql, [username, email, password, createdAt], (err, result) => {
    if (err) {
      console.error("Error al registrar el usuario:", err.message);
      if (err.code === 'ER_NO_DEFAULT_FOR_FIELD') {
        res.render('register', { error: 'Por favor, proporciona una contraseña.' });
      } else {
        res.redirect("/register");
      }
      return;
    }
    console.log("Usuario registrado correctamente");
    res.redirect("/login");
  });
});

// Ruta de inicio de sesión (GET)
router.get("/login", (req, res) => {
  res.render("login");
});

// Ruta de inicio de sesión (POST)
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const sql = `SELECT *, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS time_created FROM usuarios WHERE username = ? AND password = ?`;
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
      res.redirect("/dashboard");
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

  const { username, email, createdAt, timeCreated } = req.session;
  const createdAtFormatted = moment(createdAt).format("DD/MM/YYYY HH:mm:ss");
  const timeCreatedFormatted = moment.utc(timeCreated * 1000).format("HH:mm:ss");
  res.render("profiles", { username, email, createdAtFormatted, timeCreatedFormatted });
});

// Ruta para actualizar el nombre de usuario
router.post('/profile/update-username', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const { newUsername } = req.body;
  const userId = req.session.userId;

  db.query(
    'UPDATE usuarios SET username = ? WHERE id = ?',
    [newUsername, userId],
    (err, results) => {
      if (err) {
        console.error('Error al actualizar el nombre de usuario:', err);
        return res.redirect('/profile');
      }

      req.session.username = newUsername;
      res.redirect('/profile');
    }
  );
});

// Ruta para actualizar la contraseña
router.post('/profile/update-password', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

  db.query(
    'SELECT password FROM usuarios WHERE id = ?',
    [userId],
    (err, results) => {
      if (err) {
        console.error('Error al obtener la contraseña actual:', err);
        return res.redirect('/profile');
      }

      if (results.length === 0) {
        return res.render('profiles', { error: 'No se encontró el usuario.' });
      }

      const currentPasswordHash = results[0].password;
      if (currentPassword !== currentPasswordHash) {
        return res.render('profiles', { error: 'La contraseña actual es incorrecta.' });
      }

      db.query(
        'UPDATE usuarios SET password = ? WHERE id = ?',
        [newPassword, userId],
        (err, results) => {
          if (err) {
            console.error('Error al actualizar la contraseña:', err);
            return res.redirect('/profile');
          }

          res.redirect('/profile');
        }
      );
    }
  );
});

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Ruta de registro (GET)
router.get("/register", (req, res) => {
  res.render("register");
});

// Ruta de registro (POST)
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const sql = `INSERT INTO usuarios (username, email, password) VALUES (?, ?, ?)`;
  db.query(sql, [username, email, password], (err, result) => {
    if (err) {
      console.error("Error al registrar el usuario:", err.message);
      res.redirect("/register");
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
  const sql = `SELECT * FROM usuarios WHERE username = ? AND password = ?`;
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error("Error al iniciar sesión:", err.message);
      res.redirect("/login");
      return;
    }
    if (results.length > 0) {
      req.session.loggedin = true;
      req.session.username = username;
      req.session.email = results[0].email; // Guarda el correo electrónico en la sesión
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

  const { username, email, createdAt } = req.session;
  res.render("profiles", { username, email, createdAt });
});


// Ruta para actualizar el nombre de usuario
router.post('/profile/update', (req, res) => {
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
module.exports = router;

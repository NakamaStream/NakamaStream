const express = require("express");
const router = express.Router();
const db = require("../services/db");

router.get("/settings", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const userId = req.session.userId;
  db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
    if (err) {
      console.error("Error al obtener los datos del usuario:", err);
      return res.redirect("/dashboard");
    }

    const user = results[0];
    res.render("settings", { user });
  });
});

router.post("/settings", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const { username, email, password } = req.body;
  const userId = req.session.userId;

  db.query(
    "UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?",
    [username, email, password, userId],
    (err, results) => {
      if (err) {
        console.error("Error al actualizar los datos del usuario:", err);
        return res.redirect("/settings");
      }

      req.session.username = username;
      res.redirect("/profile");
    }
  );
});

// Ruta para actualizar el nombre de usuario
router.post("/settings/update-username", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const { newUsername } = req.body;
  const userId = req.session.userId;

  db.query(
    "UPDATE users SET username = ? WHERE id = ?",
    [newUsername, userId],
    (err, results) => {
      if (err) {
        console.error("Error al actualizar el nombre de usuario:", err);
        return res.redirect("/settings");
      }

      req.session.username = newUsername;
      res.redirect("/profile");
    }
  );
});

module.exports = router;

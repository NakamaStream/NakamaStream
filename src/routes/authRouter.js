const express = require("express");
const router = express.Router();
const db = require("../services/db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const path = require("path");
const yaml = require("js-yaml");
const fs = require("fs");
const crypto = require('crypto');

// Ruta de registro (GET)
router.get("/register", (req, res) => {
  res.render("register");
});

// Ruta de registro (POST)
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const createdAt = new Date();
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Verificar si ya existen 3 o más cuentas desde la misma IP
  const checkIpSql = "SELECT COUNT(*) AS count FROM usuarios WHERE ip_address = ?";
  db.query(checkIpSql, [ipAddress], (err, results) => {
    if (err) {
      console.error("Error al verificar la IP:", err);
      return res.redirect("/register");
    }

    if (results[0].count >= 3) {
      return res.render("register", { error: "Se ha excedido el límite de cuentas permitidas desde esta IP." });
    }

    // Encriptar la contraseña
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error("Error al encriptar la contraseña:", err);
        return res.redirect("/register");
      }

      const sql = `INSERT INTO usuarios (username, email, password, created_at, is_admin, ip_address) VALUES (?, ?, ?, ?, ?, ?)`;
      db.query(sql, [username, email, hashedPassword, createdAt, false, ipAddress], (err, result) => {
        if (err) {
          console.error("Error al registrar el usuario:", err.message);
          if (err.code === "ER_NO_DEFAULT_FOR_FIELD") {
            res.render("register", { error: "Por favor, proporciona una contraseña." });
          } else {
            res.redirect("/register");
          }
          return;
        }
        console.log("Usuario registrado correctamente");
        res.redirect("/login");
      });
    });
  });
});

// Ruta de inicio de sesión (GET)
router.get("/login", (req, res) => {
  try {
    const captchaPath = path.join(__dirname, "..", "config", "captcha.yml");
    const captchaData = yaml.load(fs.readFileSync(captchaPath, "utf8"));
    const words = captchaData.words;
    const randomIndex = Math.floor(Math.random() * words.length);
    const captchaPhrase = words[randomIndex];
    req.session.captchaPhrase = captchaPhrase;

    res.render("login", { captchaPhrase: captchaPhrase });
  } catch (e) {
    console.log(e);
    res.status(500).send("Error al cargar el captcha.");
  }
});

// Ruta de inicio de sesión (POST)
router.post("/login", (req, res) => {
  const { username, password, captchaInput } = req.body;
  const sql = "SELECT *, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS time_created, is_admin, banned, ban_expiration FROM usuarios WHERE username = ?";

  if (captchaInput !== req.session.captchaPhrase) {
    return res.render("login", {
      errorMessage: "Captcha incorrecto.",
      captchaPhrase: req.session.captchaPhrase, // Asegurarse de pasar captchaPhrase
    });
  }

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("Error al iniciar sesión:", err.message);
      return res.render("login", {
        errorMessage: "Error al iniciar sesión. Inténtalo de nuevo.",
        captchaPhrase: req.session.captchaPhrase, // Asegurarse de pasar captchaPhrase
      });
    }

    if (results.length > 0) {
      const { password: hashedPassword, banned, ban_expiration } = results[0];

      // Verificar la contraseña encriptada
      bcrypt.compare(password, hashedPassword, (err, match) => {
        if (err) {
          console.error("Error al verificar la contraseña:", err);
          return res.render("login", {
            errorMessage: "Error al verificar la contraseña. Inténtalo de nuevo.",
            captchaPhrase: req.session.captchaPhrase, // Asegurarse de pasar captchaPhrase
          });
        }

        if (match) {
          // El usuario está baneado
          if (banned) {
            if (ban_expiration > new Date()) {
              // Usuario baneado temporalmente
              const banExpirationFormatted = moment(ban_expiration).format("DD/MM/YYYY HH:mm:ss");
              return res.render("banned", {
                message: "Has sido baneado temporalmente.",
                banExpirationFormatted,
              });
            } else {
              // Usuario baneado permanentemente
              return res.render("banned", {
                message: "Has sido baneado permanentemente.",
                banExpirationFormatted: null,
              });
            }
          }

          // El usuario está autorizado
          req.session.loggedin = true;
          req.session.userId = results[0].id;
          req.session.username = username;
          req.session.email = results[0].email;
          req.session.createdAt = results[0].created_at;
          req.session.timeCreated = results[0].time_created;
          req.session.isAdmin = results[0].is_admin;
          res.redirect("/dashboard");
        } else {
          res.render("login", {
            errorMessage: "Credenciales incorrectas.",
            captchaPhrase: req.session.captchaPhrase, // Asegurarse de pasar captchaPhrase
          });
        }
      });
    } else {
      res.render("login", {
        errorMessage: "Credenciales incorrectas.",
        captchaPhrase: req.session.captchaPhrase, // Asegurarse de pasar captchaPhrase
      });
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
  const timeCreatedFormatted = moment.utc(timeCreated * 1000).format("HH:mm:ss");

  // Obtener el hash MD5 del correo electrónico para Gravatar
  const emailHash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}`;

  // Verificar el estado de baneado del usuario
  db.query(
    "SELECT banned, ban_expiration FROM usuarios WHERE id = ?",
    [req.session.userId],
    (err, results) => {
      if (err) {
        console.error("Error al obtener el estado de baneado:", err);
        return res.redirect("/dashboard");
      }

      let banned = false;
      let banExpirationFormatted = null;
      if (results.length > 0) {
        const { banned: isBanned, ban_expiration } = results[0];
        banned = isBanned;
        if (isBanned && ban_expiration > new Date()) {
          banExpirationFormatted = moment(ban_expiration).format("DD/MM/YYYY HH:mm:ss");
        }
      }

      res.render("profiles", {
        username,
        email,
        createdAtFormatted,
        timeCreatedFormatted,
        isAdmin,
        banned,
        banExpirationFormatted,
        gravatarUrl
      });
    }
  );
});

// Ruta para actualizar la información del usuario
router.post("/profile/update-info", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const { newUsername, email, currentPassword, newPassword } = req.body;
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
        return res.render("profiles", { error: "No se encontró el usuario." });
      }

      const currentPasswordHash = results[0].password;
      bcrypt.compare(currentPassword, currentPasswordHash, (err, match) => {
        if (err) {
          console.error("Error al verificar la contraseña actual:", err);
          return res.redirect("/profile");
        }

        if (!match) {
          return res.render("profiles", { error: "La contraseña actual es incorrecta." });
        }

        // Encriptar la nueva contraseña
        bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
          if (err) {
            console.error("Error al encriptar la nueva contraseña:", err);
            return res.redirect("/profile");
          }

          db.query(
            "UPDATE usuarios SET username = ?, email = ?, password = ? WHERE id = ?",
            [newUsername, email, hashedPassword, userId],
            (err, results) => {
              if (err) {
                console.error("Error al actualizar la información del usuario:", err);
                return res.redirect("/profile");
              }

              req.session.username = newUsername;
              req.session.email = email; // Actualiza el email en la sesión también
              res.redirect("/profile");
            }
          );
        });
      });
    }
  );
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
          return res.redirect("/admin");
        }

        res.redirect("/admin");
      }
    );
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/dashboard");
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../services/db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const path = require("path");
const yaml = require("js-yaml");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

// Configuración de multer para almacenar archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./src/public/uploads/";
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

// Ruta de registro (GET)
router.get("/register", (req, res) => {
  res.render("users/register");
});

// Ruta de registro (POST)
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const createdAt = new Date();
  const ipAddress =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  // Verificar si ya existen 3 o más cuentas desde la misma IP
  const checkIpSql =
    "SELECT COUNT(*) AS count FROM usuarios WHERE ip_address = ?";
  db.query(checkIpSql, [ipAddress], (err, results) => {
    if (err) {
      console.error("Error al verificar la IP:", err);
      return res.redirect("/register");
    }

    if (results[0].count >= 3) {
      return res.render("users/register", {
        error: "Se ha excedido el límite de cuentas permitidas desde esta IP.",
      });
    }

    // Encriptar la contraseña
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error("Error al encriptar la contraseña:", err);
        return res.redirect("/register");
      }

      const sql = `INSERT INTO usuarios (username, email, password, created_at, is_admin, ip_address) VALUES (?, ?, ?, ?, ?, ?)`;
      db.query(
        sql,
        [username, email, hashedPassword, createdAt, false, ipAddress],
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

    res.render("users/login", { captchaPhrase: captchaPhrase });
  } catch (e) {
    console.log(e);
    res.status(500).send("Error al cargar el captcha.");
  }
});

// Ruta de inicio de sesión (POST)
router.post("/login", (req, res) => {
  const { username, password, captchaInput } = req.body;
  const sql =
    "SELECT *, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS time_created, is_admin, banned, ban_expiration FROM usuarios WHERE username = ?";

  if (captchaInput !== req.session.captchaPhrase) {
    return res.render("users/login", {
      errorMessage: "Captcha incorrecto.",
      captchaPhrase: req.session.captchaPhrase,
    });
  }

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("Error al iniciar sesión:", err.message);
      return res.render("users/login", {
        errorMessage: "Error al iniciar sesión. Inténtalo de nuevo.",
        captchaPhrase: req.session.captchaPhrase,
      });
    }

    if (results.length > 0) {
      const { password: hashedPassword, banned, ban_expiration } = results[0];

      // Verificar la contraseña encriptada
      bcrypt.compare(password, hashedPassword, (err, match) => {
        if (err) {
          console.error("Error al verificar la contraseña:", err);
          return res.render("users/login", {
            errorMessage:
              "Error al verificar la contraseña. Inténtalo de nuevo.",
            captchaPhrase: req.session.captchaPhrase,
          });
        }

        if (match) {
          // El usuario está baneado
          if (banned) {
            if (ban_expiration > new Date()) {
              // Usuario baneado temporalmente
              const banExpirationFormatted = moment(ban_expiration).format(
                "DD/MM/YYYY HH:mm:ss"
              );
              return res.render("users/banned", {
                message: "Has sido baneado temporalmente.",
                banExpirationFormatted,
              });
            } else {
              // Usuario baneado permanentemente
              return res.render("users/banned", {
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
          res.redirect("/anime");
        } else {
          res.render("users/login", {
            errorMessage: "Credenciales incorrectas.",
            captchaPhrase: req.session.captchaPhrase,
          });
        }
      });
    } else {
      res.render("users/login", {
        errorMessage: "Credenciales incorrectas.",
        captchaPhrase: req.session.captchaPhrase,
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
router.get("/profile/:username", (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect("/login");
  }

  const username = req.params.username;
  const isOwnProfile = req.session.username === username;

  db.query(
    `SELECT u.id, u.username, u.email, u.created_at, u.is_admin, u.banned, u.ban_expiration, 
            u.profile_image, u.banner_image, IFNULL(u.bio, '') as bio,
            TIMESTAMPDIFF(SECOND, u.created_at, NOW()) AS time_created,
            (SELECT COUNT(*) FROM favorites WHERE user_id = u.id) as favorite_count,
            (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count
     FROM usuarios u WHERE u.username = ?`,
    [username],
    (err, results) => {
      if (err) {
        console.error("Error al obtener información del usuario:", err);
        return res.status(500).send("Error al obtener información del usuario");
      }

      if (results.length === 0) {
        return res.status(404).send("Usuario no encontrado");
      }

      const user = results[0];
      const createdAtFormatted = moment(user.created_at).format(
        "DD/MM/YYYY HH:mm:ss"
      );
      const timeCreatedFormatted = moment
        .utc(user.time_created * 1000)
        .format("HH:mm:ss");

      // Obtener el hash MD5 del correo electrónico para Gravatar
      const emailHash = crypto
        .createHash("md5")
        .update(user.email.trim().toLowerCase())
        .digest("hex");
      const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}`;

      let banExpirationFormatted = null;
      if (user.banned && user.ban_expiration > new Date()) {
        banExpirationFormatted = moment(user.ban_expiration).format(
          "DD/MM/YYYY HH:mm:ss"
        );
      }

      // Obtener los animes favoritos del usuario
      db.query(
        `SELECT a.id, a.name, a.imageUrl, a.slug
         FROM animes a 
         JOIN favorites f ON a.id = f.anime_id 
         WHERE f.user_id = ?
         LIMIT 5`,
        [user.id],
        (err, favoriteAnimes) => {
          if (err) {
            console.error("Error al obtener animes favoritos:", err);
            return res.status(500).send("Error al obtener animes favoritos");
          }

          res.render("users/profiles", {
            user: user,
            username: user.username,
            email: user.email,
            createdAtFormatted,
            timeCreatedFormatted,
            isAdmin: user.is_admin,
            banned: user.banned,
            banExpirationFormatted,
            gravatarUrl,
            profileImageUrl:
              user.profile_image ||
              "https://avatars.githubusercontent.com/u/168317328?s=200&v=4",
            bannerImageUrl:
              user.banner_image ||
              "https://github.com/NakamaStream/Resources/blob/main/NakamaStream.png?raw=true",
            bio: user.bio,
            favoriteAnimes: favoriteAnimes,
            isOwnProfile: isOwnProfile,
          });
        }
      );
    }
  );
});

// Ruta para actualizar la información del usuario
router.post(
  "/profile/update-info",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
  ]),
  (req, res) => {
    if (!req.session.loggedin) {
      return res.redirect("/login");
    }

    const { newUsername, email, currentPassword, newPassword, bio } = req.body;
    const userId = req.session.userId;

    let updateFields = { username: newUsername, email: email, bio: bio };
    let updateValues = [newUsername, email, bio];

    if (req.files["profileImage"]) {
      updateFields.profile_image =
        "/uploads/" + req.files["profileImage"][0].filename;
      updateValues.push(updateFields.profile_image);
    }
    if (req.files["bannerImage"]) {
      updateFields.banner_image =
        "/uploads/" + req.files["bannerImage"][0].filename;
      updateValues.push(updateFields.banner_image);
    }

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
        bcrypt.compare(currentPassword, currentPasswordHash, (err, match) => {
          if (err) {
            console.error("Error al verificar la contraseña actual:", err);
            return res.redirect("/profile");
          }

          if (!match) {
            return res.render("users/profiles", {
              error: "La contraseña actual es incorrecta.",
            });
          }

          // Encriptar la nueva contraseña
          bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
            if (err) {
              console.error("Error al encriptar la nueva contraseña:", err);
              return res.redirect("/profile");
            }

            updateFields.password = hashedPassword;
            updateValues.push(hashedPassword);
            updateValues.push(userId);

            const updateQuery = `UPDATE usuarios SET ${Object.keys(updateFields)
              .map((field) => `${field} = ?`)
              .join(", ")} WHERE id = ?`;

            db.query(updateQuery, updateValues, (err, results) => {
              if (err) {
                console.error(
                  "Error al actualizar la información del usuario:",
                  err
                );
                return res.redirect("/profile");
              }

              req.session.username = newUsername;
              req.session.email = email;
              res.redirect("/profile/" + newUsername);
            });
          });
        });
      }
    );
  }
);

// Ruta para actualizar la bio del usuario
router.post("/profile/update-bio", (req, res) => {
  if (!req.session.loggedin) {
    return res.status(401).json({ success: false, message: "No autorizado" });
  }

  const userId = req.session.userId;
  const { bio } = req.body;

  db.query(
    "UPDATE usuarios SET bio = ? WHERE id = ?",
    [bio, userId],
    (err, result) => {
      if (err) {
        console.error("Error al actualizar la bio:", err);
        return res
          .status(500)
          .json({ success: false, message: "Error al actualizar la bio" });
      }
      res.json({ success: true, message: "Bio actualizada correctamente" });
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
          console.error(
            "Error al quitar el rol de administrador al usuario:",
            err
          );
          return res.redirect("/admin");
        }

        res.redirect("/admin");
      }
    );
  } else {
    // Si el usuario no es administrador, redirigir al dashboard
    res.redirect("/anime");
  }
});

module.exports = router;

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const moment = require("moment");
const multer = require("multer");
const fs = require("fs");

const indexRouter = require("./src/routes/indexRouter");
const authRouter = require("./src/routes/authRouter");
const adminRouter = require("./src/routes/adminRouter");
const animeRouter = require("./src/routes/animeRouter");
const healthCheckRouter = require("./src/routes/healthCheckRouter");
const botapiRouter = require("./src/routes/botapiRouter");

const db = require("./src/services/db");

const app = express();

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

// Configuración de sesión mejorada
app.use(
  session({
    secret: "tu_secreto",
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware para renovar la sesión en cada petición
app.use((req, res, next) => {
  if (req.session.userId) {
    req.session.touch(); // Renueva la sesión
  }
  next();
});

app.use((req, res, next) => {
  if (req.session.loggedin && req.path === "/") {
    return res.redirect("/anime");
  }
  next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  "/src/public/css",
  express.static("src/public/css", { "Content-Type": "text/css" })
);
app.use(
  "/src/public/js",
  express.static("src/public/js", { "Content-Type": "text/javascript" })
);
app.use("/uploads", express.static(path.join(__dirname, "src/public/uploads")));

// Middleware para verificar el estado de baneado del usuario
app.use((req, res, next) => {
  if (req.path !== "/login" && req.path !== "/check-ban") {
    db.query(
      "SELECT banned, ban_expiration FROM usuarios WHERE id = ?",
      [req.session.userId || 0],
      (err, results) => {
        if (err) {
          console.error("Error al obtener el estado de baneado:", err);
          return res.redirect("/anime");
        }

        if (results.length > 0) {
          const { banned, ban_expiration } = results[0];
          if (banned) {
            if (ban_expiration > new Date()) {
              const banExpirationFormatted = moment(ban_expiration).format(
                "DD/MM/YYYY HH:mm:ss"
              );
              return res.render("banned", {
                message: "Has sido baneado temporalmente.",
                banExpirationFormatted,
              });
            } else {
              return res.render("banned", {
                message: "Has sido baneado permanentemente.",
                banExpirationFormatted: null,
              });
            }
          }
        }

        next();
      }
    );
  } else {
    next();
  }
});

app.use("/", indexRouter);
app.use("/", animeRouter);
app.use("/", authRouter);
app.use("/", adminRouter);
app.use("/", healthCheckRouter);
app.use("/", botapiRouter);

// Ruta de perfil
app.get("/profile", async (req, res) => {
  const userId = req.session.userId;

  try {
    const [results] = await db.query("SELECT * FROM usuarios WHERE id = ?", [userId]);

    if (results.length === 0) {
      return res.status(404).send("Usuario no encontrado");
    }

    const user = results[0];
    res.render("profiles", {
      username: user.username,
      email: user.email,
      createdAtFormatted: moment(user.created_at).format("DD/MM/YYYY"),
      timeCreatedFormatted: moment(user.created_at).fromNow(),
      isAdmin: user.is_admin,
      profileImageUrl: user.profile_image || '',
      bannerImageUrl: user.banner_image || '',
    });
  } catch (err) {
    console.error("Error al obtener el perfil:", err);
    return res.status(500).send("Error al cargar el perfil");
  }
});

// Ruta para actualizar el perfil
app.post(
  "/profile/update-info",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const { newUsername, email } = req.body;
    const userId = req.session.userId;

    let updateFields = { username: newUsername, email: email };
    let updateValues = [newUsername, email];

    if (req.files['profileImage']) {
      updateFields.profile_image = '/uploads/' + req.files['profileImage'][0].filename;
      updateValues.push(updateFields.profile_image);
    }

    if (req.files['bannerImage']) {
      updateFields.banner_image = '/uploads/' + req.files['bannerImage'][0].filename;
      updateValues.push(updateFields.banner_image);
    }

    updateValues.push(userId);

    const updateQuery = `UPDATE usuarios SET ${Object.keys(updateFields).map(field => `${field} = ?`).join(', ')} WHERE id = ?`;

    try {
      await db.query(updateQuery, updateValues);
      res.redirect('/profile');
    } catch (err) {
      console.error('Error al actualizar el perfil:', err);
      return res.status(500).send('Error al actualizar el perfil');
    }
  }
);

// Ruta para actualizar la contraseña
app.post('/profile/update-password', async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req.session.userId;

  if (newPassword !== confirmNewPassword) {
    return res.status(400).send('Las nuevas contraseñas no coinciden');
  }

  try {
    const [results] = await db.query('SELECT password FROM usuarios WHERE id = ?', [userId]);

    if (results.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    const user = results[0];
    if (currentPassword !== user.password) {  // En producción, usa bcrypt para comparar
      return res.status(400).send('La contraseña actual es incorrecta');
    }

    // En producción, usa bcrypt para hashear la nueva contraseña
    await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [newPassword, userId]);
    res.redirect('/profile');
  } catch (err) {
    console.error('Error al actualizar la contraseña:', err);
    return res.status(500).send('Error al cambiar la contraseña');
  }
});

// Nuevas rutas de anime
app.get("/anime/:id", async (req, res) => {
  const animeId = req.params.id;
  try {
    const [animeResults] = await db.query(
      "SELECT * FROM animes WHERE id = ?",
      [animeId]
    );

    if (animeResults.length === 0) {
      return res.status(404).send("Anime no encontrado");
    }

    const anime = animeResults[0];

    const [episodeResults] = await db.query(
      "SELECT * FROM episodes WHERE anime_id = ?",
      [animeId]
    );

    anime.episodes = episodeResults;
    res.render("anime-detail", { anime });
  } catch (err) {
    console.error("Error al obtener el anime:", err);
    return res.status(500).send("Error al cargar el anime");
  }
});

app.get("/anime/:id/upload-episode", async (req, res) => {
  const animeId = req.params.id;
  try {
    const [results] = await db.query("SELECT * FROM animes WHERE id = ?", [animeId]);

    if (results.length === 0) {
      return res.status(404).send("Anime no encontrado");
    }

    const anime = results[0];
    res.render("episode-upload", { anime });
  } catch (err) {
    console.error("Error al obtener el anime:", err);
    return res.status(500).send("Error al cargar la página de subida de episodio");
  }
});

app.post("/anime/:id/upload-episode", async (req, res) => {
  const animeId = req.params.id;
  const { title, videoUrl } = req.body;

  try {
    await db.query(
      "INSERT INTO episodes (anime_id, title, video_url) VALUES (?, ?, ?)",
      [animeId, title, videoUrl]
    );
    res.redirect(`/anime/${animeId}`);
  } catch (err) {
    console.error("Error al subir el episodio:", err);
    return res.status(500).send("Error al subir el episodio");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto http://localhost:${PORT}/`);
});

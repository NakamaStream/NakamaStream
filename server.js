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

// Middleware de carga con multer
const upload = multer({ storage: storage });

app.use(
  session({
    secret: "tu_secreto",
    resave: true,
    saveUninitialized: true,
  })
);

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
app.get("/profile", (req, res) => {
  const userId = req.session.userId;

  db.query("SELECT * FROM usuarios WHERE id = ?", [userId], (err, results) => {
    if (err) {
      console.error("Error al obtener el perfil:", err);
      return res.status(500).send("Error al cargar el perfil");
    }

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
      profileImageUrl:
        user.profile_image || "https://avatars.githubusercontent.com/u/168317328?s=200&v=4",
      bannerImageUrl: user.banner_image || "https://github.com/NakamaStream/Resources/blob/main/NakamaStream.png?raw=true",
    });
  });
});

// Ruta para actualizar el perfil
app.post(
  "/profile/update-info",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
  ]),
  (req, res) => {
    const { newUsername, email, currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    let profileImageUrl = null;
    let bannerImageUrl = null;

    if (req.files["profileImage"]) {
      profileImageUrl = "/uploads/" + req.files["profileImage"][0].filename;
    }
    if (req.files["bannerImage"]) {
      bannerImageUrl = "/uploads/" + req.files["bannerImage"][0].filename;
    }

    // Actualiza la base de datos con la nueva información, incluyendo las URLs de las imágenes
    db.query(
      "UPDATE usuarios SET username = ?, email = ?, profile_image = ?, banner_image = ? WHERE id = ?",
      [newUsername, email, profileImageUrl, bannerImageUrl, userId],
      (err, result) => {
        if (err) {
          console.error("Error al actualizar el perfil:", err);
          return res.status(500).send("Error al actualizar el perfil");
        }
        res.redirect("/profile");
      }
    );
  }
);

// Ruta para actualizar las imágenes del perfil
app.post(
  "/profile/update-images",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
  ]),
  (req, res) => {
    const userId = req.session.userId;

    let profileImageUrl = null;
    let bannerImageUrl = null;

    if (req.files["profileImage"]) {
      profileImageUrl = "/uploads/" + req.files["profileImage"][0].filename;
    }
    if (req.files["bannerImage"]) {
      bannerImageUrl = "/uploads/" + req.files["bannerImage"][0].filename;
    }

    // Actualiza la base de datos con la nueva información, incluyendo las URLs de las imágenes
    db.query(
      "UPDATE usuarios SET profile_image = ?, banner_image = ? WHERE id = ?",
      [profileImageUrl, bannerImageUrl, userId],
      (err, result) => {
        if (err) {
          console.error("Error al actualizar las imágenes del perfil:", err);
          return res
            .status(500)
            .send("Error al actualizar las imágenes del perfil");
        }
        res.redirect("/profile");
      }
    );
  }
);

// Nuevas rutas de anime
app.get("/anime/:id", (req, res) => {
  const animeId = req.params.id;
  db.query(
    "SELECT * FROM animes WHERE id = ?",
    [animeId],
    (err, animeResults) => {
      if (err) {
        console.error("Error al obtener el anime:", err);
        return res.status(500).send("Error al cargar el anime");
      }

      if (animeResults.length === 0) {
        return res.status(404).send("Anime no encontrado");
      }

      const anime = animeResults[0];

      db.query(
        "SELECT * FROM episodes WHERE anime_id = ?",
        [animeId],
        (err, episodeResults) => {
          if (err) {
            console.error("Error al obtener los episodios:", err);
            return res.status(500).send("Error al cargar los episodios");
          }

          anime.episodes = episodeResults;
          res.render("anime-detail", { anime });
        }
      );
    }
  );
});

app.get("/anime/:id/upload-episode", (req, res) => {
  const animeId = req.params.id;
  db.query("SELECT * FROM animes WHERE id = ?", [animeId], (err, results) => {
    if (err) {
      console.error("Error al obtener el anime:", err);
      return res
        .status(500)
        .send("Error al cargar la página de subida de episodio");
    }

    if (results.length === 0) {
      return res.status(404).send("Anime no encontrado");
    }

    const anime = results[0];
    res.render("episode-upload", { anime });
  });
});

app.post("/anime/:id/upload-episode", (req, res) => {
  const animeId = req.params.id;
  const { title, videoUrl } = req.body;

  db.query(
    "INSERT INTO episodes (anime_id, title, video_url) VALUES (?, ?, ?)",
    [animeId, title, videoUrl],
    (err, result) => {
      if (err) {
        console.error("Error al subir el episodio:", err);
        return res.status(500).send("Error al subir el episodio");
      }

      res.redirect(`/anime/${animeId}`);
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto http://localhost:${PORT}/`);
});

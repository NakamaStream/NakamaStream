// server.js

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const moment = require("moment");
const multer = require("multer");
const fs = require("fs");
const http = require("http");
const cookieSession = require("cookie-session");

const indexRouter = require("./src/routes/indexRouter");
const authRouter = require("./src/routes/authRouter");
const adminRouter = require("./src/routes/adminRouter");
const animeRouter = require("./src/routes/animeRouter");
const botapiRouter = require("./src/routes/botapiRouter");

const db = require("./src/services/db");

const app = express();
const server = http.createServer(app);

// Configuración de Multer mejorada
const fileFilter = (req, file, cb) => {
  // Lista de tipos MIME permitidos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "src/public/uploads/");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Sanitizar nombre de archivo
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + sanitizedName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite
    files: 1 // máximo 1 archivo por subida
  }
});

// Middleware de manejo de errores para Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande' });
    }
    return res.status(400).json({ error: 'Error en la subida de archivo' });
  }
  next(error);
});

// Configuración de la sesión con cookies
app.use(
  cookieSession({
    name: "session",
    keys: ["Jdk@gl311adf"], // Claves para encriptar la cookie
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
  })
);

// Middleware para renovar la sesión basado en la actividad
const sessionRenewalTime = 15 * 60 * 1000; // 15 minutos

app.use((req, res, next) => {
  if (req.session.userId) {
    const now = Date.now();

    // Renueva la sesión si la última actividad fue hace más de 15 minutos
    if (!req.session.lastActivity || now - req.session.lastActivity > sessionRenewalTime) {
      req.session.lastActivity = now; // Actualiza el tiempo de última actividad
    }
  }
  next();
});

// Redirect logged-in users from /login and /register to anime page
app.use((req, res, next) => {
  if (req.session.loggedin && (req.path === "/login" || req.path === "/register")) {
    return res.redirect("/anime");
  }
  next();
});

// Redirect logged-in users from home to anime page
app.use((req, res, next) => {
  if (req.session.loggedin && req.path === "/") {
    return res.redirect("/anime");
  }
  next();
});

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Static file serving
app.use(
  "/src/public/css",
  express.static("src/public/css", { "Content-Type": "text/css" })
);
app.use(
  "/src/public/js",
  express.static("src/public/js", { "Content-Type": "text/javascript" })
);
app.use("/uploads", express.static(path.join(__dirname, "src/public/uploads")));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use("/favicons", express.static(path.join(__dirname, "src/public/favicons")));

// Ban check middleware
app.use((req, res, next) => {
  if (
    req.session.userId &&
    req.path !== "/login" &&
    req.path !== "/check-ban"
  ) {
    const now = new Date();
    const checkBanInterval = 5 * 60 * 1000; // 5 minutos

    if (
      !req.session.banStatus ||
      now - req.session.lastBanCheck > checkBanInterval
    ) {
      db.query(
        "SELECT banned, ban_expiration FROM usuarios WHERE id = ?",
        [req.session.userId],
        (err, results) => {
          if (err) {
            console.error("Error al obtener el estado de baneado:", err);
            return res.render("error/error");
          }

          if (results.length > 0) {
            const { banned, ban_expiration } = results[0];
            req.session.banStatus = { banned, ban_expiration };
            req.session.lastBanCheck = now;

            if (banned) {
              const banExpirationFormatted = ban_expiration
                ? moment(ban_expiration).format("DD/MM/YYYY HH:mm:ss")
                : null;

              return res.render("banned", {
                message: ban_expiration
                  ? "Has sido baneado temporalmente."
                  : "Has sido baneado permanentemente.",
                banExpirationFormatted,
              });
            }
          }

          next();
        }
      );
    } else {
      const { banned, ban_expiration } = req.session.banStatus;

      if (banned) {
        const banExpirationFormatted = ban_expiration
          ? moment(ban_expiration).format("DD/MM/YYYY HH:mm:ss")
          : null;

        return res.render("banned", {
          message: ban_expiration
            ? "Has sido baneado temporalmente."
            : "Has sido baneado permanentemente.",
          banExpirationFormatted,
        });
      }

      next();
    }
  } else {
    next();
  }
});

app.post("/logout", (req, res) => {
  req.session = null; // Destruye la sesión al hacer logout
  res.redirect("/login");
});

// Routes
app.use("/", indexRouter);
app.use("/", animeRouter);
app.use("/", authRouter);
app.use("/", adminRouter);
app.use("/", botapiRouter);

// Middleware para manejar rutas no encontradas
app.use((req, res, next) => {
  res.status(404).render('error/404');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto http://localhost:${PORT}/`);
});

module.exports = app;

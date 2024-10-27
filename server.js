// server.js

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const moment = require("moment");
const multer = require("multer");
const fs = require("fs");
const http = require("http");

const indexRouter = require("./src/routes/indexRouter");
const authRouter = require("./src/routes/authRouter");
const adminRouter = require("./src/routes/adminRouter");
const animeRouter = require("./src/routes/animeRouter");
const healthCheckRouter = require("./src/routes/healthCheckRouter");
const botapiRouter = require("./src/routes/botapiRouter");

const db = require("./src/services/db");

const app = express();
const server = http.createServer(app);

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "src/public/uploads/");
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

// Configuración de la sesión
const sessionMiddleware = session({
  secret: "Jdk@gl311adf",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días (ajusta según tus necesidades)
  },
});


app.use(sessionMiddleware);

// Middleware para renovar la sesión basado en la actividad
const sessionRenewalTime = 15 * 60 * 1000; // 15 minutos

app.use((req, res, next) => {
  if (req.session.userId) {
    const now = Date.now();

    // Renueva la sesión si la última actividad fue hace más de 15 minutos
    if (!req.session.lastActivity || now - req.session.lastActivity > sessionRenewalTime) {
      req.session.touch(); // Renueva la sesión
    }
    
    req.session.lastActivity = now; // Actualiza el tiempo de última actividad
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
  req.session.destroy((err) => {
    if (err) {
      return console.log(err);
    }
    res.redirect("/login");
  });
});

// Routes
app.use("/", indexRouter);
app.use("/", animeRouter);
app.use("/", authRouter);
app.use("/", adminRouter);
app.use("/", healthCheckRouter);
app.use("/", botapiRouter);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto http://localhost:${PORT}/`);
});

module.exports = app;

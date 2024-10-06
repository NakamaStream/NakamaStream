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
const newsRouter = require("./src/routes/newsRouter");

const db = require("./src/services/db");

const app = express();

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

// Session configuration
app.use(
  session({
    secret: "tu_secreto",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  })
);

// Middleware to renew session on each request
app.use((req, res, next) => {
  if (req.session.userId) {
    req.session.touch();
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
app.use("/src/public/css", express.static("src/public/css", { "Content-Type": "text/css" }));
app.use("/src/public/js", express.static("src/public/js", { "Content-Type": "text/javascript" }));
app.use("/uploads", express.static(path.join(__dirname, "src/public/uploads")));

// Ban check middleware
app.use((req, res, next) => {
  if (req.session.userId && req.path !== "/login" && req.path !== "/check-ban") {
    const now = new Date();
    const checkBanInterval = 5 * 60 * 1000; // 5 minutos

    if (!req.session.banStatus || now - req.session.lastBanCheck > checkBanInterval) {
      db.query(
        "SELECT banned, ban_expiration, banned_by FROM usuarios WHERE id = ?",
        [req.session.userId],
        (err, results) => {
          if (err) {
            console.error("Error al obtener el estado de baneado:", err);
            return res.render("error/error");
          }

          if (results.length > 0) {
            const { banned, ban_expiration, banned_by } = results[0];
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
                bannedBy: banned_by || "Desconocido" // Asegúrate de que bannedBy esté definido
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
          bannedBy: req.session.banStatus.banned_by || "Desconocido" // Asegúrate de que bannedBy esté definido
        });
      }

      next();
    }
  } else {
    next();
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
      if(err) {
          return console.log(err);
      }
      res.redirect('/login');
  });
});

// Routes
app.use("/", indexRouter);
app.use("/", animeRouter);
app.use("/", authRouter);
app.use("/", adminRouter);
app.use("/", healthCheckRouter);
app.use("/", botapiRouter);
app.use("/", newsRouter);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto http://localhost:${PORT}/`);
});

module.exports = app;

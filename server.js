// server.js

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const moment = require("moment");
const multer = require("multer");
const fs = require("fs");
const http = require("http");
const cookieSession = require("cookie-session");
const morgan = require("morgan"); // Importamos morgan para el sistema de logs

const indexRouter = require("./src/routes/indexRouter");
const authRouter = require("./src/routes/authRouter");
const adminRouter = require("./src/routes/adminRouter");
const animeRouter = require("./src/routes/animeRouter");
const healthCheckRouter = require("./src/routes/healthCheckRouter");
const botapiRouter = require("./src/routes/botapiRouter");

const db = require("./src/services/db");

const app = express();
const server = http.createServer(app);

// Array para almacenar los logs en memoria
let logData = [];

// Tiempo de inactividad para limpiar los logs (en milisegundos)
const logClearTimeout = 5 * 60 * 1000; // 5 minutos de inactividad
let clearLogsTimer = null;

// Middleware de Morgan para registrar todas las solicitudes HTTP
app.use(
  morgan("combined", {
    stream: {
      write: (message) => {
        logData.push(`[${new Date().toISOString()}] ${message.trim()}`);
        if (logData.length > 1000) logData.shift();
      },
    },
  })
);

// Redefine `console.log` para también almacenar mensajes en `logData`
const originalConsoleLog = console.log;
console.log = (message, ...optionalParams) => {
  const logMessage = `[${new Date().toISOString()}] ${message} ${optionalParams.join(" ")}`;
  logData.push(logMessage);
  if (logData.length > 1000) logData.shift();
  originalConsoleLog(message, ...optionalParams);
};

// Función para limpiar logs después de inactividad
function resetLogClearTimer() {
  if (clearLogsTimer) clearTimeout(clearLogsTimer);
  clearLogsTimer = setTimeout(() => {
    logData = [];
  }, logClearTimeout);
}

// Middleware de verificación de administrador
function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next(); // Permitir el acceso si el usuario es administrador
  } else {
    res.render("error/accessDenied", { username: req.session.username });
  }
}

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

// Ruta para ver los logs en memoria, protegida con el middleware de verificación de administrador
app.get("/admin/logs", isAdmin, (req, res) => {
  res.render("admin/logs", { logs: logData.slice().reverse() });
  resetLogClearTimer(); // Resetea el temporizador cuando alguien accede a /logs
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

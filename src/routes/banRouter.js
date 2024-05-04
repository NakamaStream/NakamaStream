const express = require('express');
const db = require("../services/db");
const moment = require('moment');
const router = express.Router();

router.use((req, res, next) => {
    if (req.path !== "/login" && req.path !== "/check-ban") {
      db.query(
        "SELECT banned, ban_expiration FROM usuarios WHERE id = ?",
        [req.session.userId || 0],
        (err, results) => {
          if (err) {
            console.error("Error al obtener el estado de baneado:", err);
            return res.redirect("/dashboard");
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

  module.exports = router;

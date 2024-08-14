// Nota: Este router es exclusivo para el bot oficial de Discord de NakamaStream. 
// Si estás utilizando nuestro código fuente y planeas desplegar tu propia plataforma de Discord, 
// puedes omitir este router comentándolo con // aquí y en el archivo server.js.

const express = require("express");
const router = express.Router();
const db = require("../services/db");

router.get("/api/registered-users", (req, res) => {
  const sql = "SELECT COUNT(*) AS userCount FROM usuarios";
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error al obtener la cantidad de usuarios registrados:", err);
      return res.status(500).json({ error: "Error al obtener la cantidad de usuarios registrados." });
    }

    const userCount = results[0].userCount;
    res.json({ userCount });
  });
});

module.exports = router;

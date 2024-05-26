const express = require('express');
const router = express.Router();
const db = require("../services/db");

router.get('/api/health', async (req, res) => {
    let dbStatus, apiStatus;
  
    try {
      await db.query('SELECT 1');
      dbStatus = 'OK';
    } catch (error) {
      console.error('Error al conectar a la base de datos:', error);
      dbStatus = 'Error';
    }
  
    try {
      const response = await fetch('http://ruta-de-tu-api');
      if (response.ok) {
        apiStatus = 'OK';
      } else {
        apiStatus = 'Error';
      }
    } catch (error) {
      console.error('Error al conectar a la API:', error);
      apiStatus = 'Error';
    }
  
    res.status(200).json({ db: dbStatus, api: apiStatus });
});   

module.exports = router;
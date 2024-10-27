const express = require('express');
const router = express.Router();
const db = require("../services/db");
const axios = require('axios'); // Importa Axios

router.get('/api/health', async (req, res) => {
    let dbStatus, apiStatuses = [];
    const apiUrls = ['http://localhost:3000/api/favorite-animes', 'http://localhost:3000/api/total-animes']; // Agrega aquí todas las URLs de las APIs

    // Verificar estado de la base de datos
    try {
        await db.query('SELECT 1');
        dbStatus = 'OK';
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
        dbStatus = 'Error';
    }

    // Verificar estado de cada API usando Axios
    for (const url of apiUrls) {
        try {
            const response = await axios.get(url);

            apiStatuses.push({
                url: url,
                status: response.status === 200 ? 'OK' : 'Error'
            });
        } catch (error) {
            console.error(`Error al conectar a la API ${url}:`, error);
            apiStatuses.push({
                url: url,
                status: 'Error'
            });
        }
    }

    res.status(200).json({ db: dbStatus, apis: apiStatuses });
});

module.exports = router;

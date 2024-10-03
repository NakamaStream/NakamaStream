const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 4000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Nueva ruta para obtener la página de releases
app.get('/releases', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'releases.html'));
});

// Ruta de API para obtener información de los releases desde GitHub
app.get('/api/releases', async (req, res) => {
    try {
        const response = await axios.get('https://api.github.com/repos/NakamaStream/NakamaStream/releases');
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener la información de los releases');
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 4000;

// Configura EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Asegúrate de que tus archivos EJS estén en esta carpeta

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
    res.render('index'); // Renderiza index.ejs
});

// Nueva ruta para obtener la página de releases
app.get('/releases', (req, res) => {
    res.render('releases'); // Renderiza releases.ejs
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
    console.log('\n=======================================================');
    console.log('🚀 ¡Servidor de mantenimiento iniciado con éxito! 🚀');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log('📂 GitHub Source: https://github.com/NakamaStream/NakamaStream/tree/main/maintenance');
    console.log('=======================================================\n');
});

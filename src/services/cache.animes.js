const cache = {}; // Caché en memoria
const CACHE_DURATION = 2 * 24 * 60 * 60 * 1000; // Duración de la caché (2 días)

// Middleware de caché
function cacheAnimes(key) {
    return (req, res, next) => {
        if (cache[key] && cache[key].timestamp > Date.now() - CACHE_DURATION) {
            console.log("Cache hit: ", key);
            return res.json(cache[key].data); // Devuelve los datos cacheados
        }

        // Sobrescribir res.send para guardar en caché solo si la respuesta es JSON
        res.sendResponse = res.send;
        res.send = (body) => {
            // Solo cachear si la respuesta es un JSON válido
            try {
                const isJsonResponse = body && body.startsWith("{") || body.startsWith("[");
                if (isJsonResponse) {
                    cache[key] = {
                        timestamp: Date.now(),
                        data: JSON.parse(body), // Guarda la respuesta parseada en la caché
                    };
                }
            } catch (e) {
                console.error("Error al parsear JSON para la caché", e);
            }
            res.sendResponse(body); // Envía la respuesta original
        };
        next();
    };
}


module.exports = cacheAnimes;

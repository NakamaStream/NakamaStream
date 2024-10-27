const mysql = require('mysql');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
require('console.table'); // Asegúrate de requerir console.table

// Define la ruta para el archivo de configuración
const configPath = path.join(__dirname, '..', 'config', 'database.yml');

// Función para cargar la configuración de la base de datos
function loadConfig() {
  try {
    return yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('\x1b[31mError al cargar la configuración desde el archivo:\x1b[0m', error.message);
    process.exit(1); // Sale de la aplicación si falla la carga de la configuración
  }
}

// Inicializa la conexión a la base de datos
function initializeDatabase(config) {
  const db = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.name,
    charset: "utf8mb4",
  });

  db.connect((err) => {
    if (err) {
      console.error('\x1b[31mError de conexión a la base de datos:\x1b[0m', err.message);
      process.exit(1); // Sale de la aplicación si falla la conexión
    }

    console.log('\x1b[32mConexión a la base de datos establecida\x1b[0m');
    logDatabaseInfo(config);
    fetchTableInfo(db); // Llama a la función para obtener la información de las tablas
  });

  // Maneja errores de conexión
  db.on('error', (err) => {
    console.error('\x1b[31mError en la base de datos:\x1b[0m', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('\x1b[31mIntentando reconectar a la base de datos...\x1b[0m');
      initializeDatabase(config); // Reinitializa la conexión
    } else {
      throw err; // Vuelve a lanzar el error para otros tipos
    }
  });

  return db; // Devuelve la conexión a la base de datos
}

// Registra la información de la base de datos
function logDatabaseInfo(config) {
  console.log('\x1b[33mInformación de la base de datos:\x1b[0m');
  console.log('\x1b[33mHost:\x1b[0m', config.host);
  console.log('\x1b[33mUsuario:\x1b[0m', config.user);
  console.log('\x1b[33mNombre de la base de datos:\x1b[0m', config.name);
}

// Obtiene y registra la información de las tablas
function fetchTableInfo(db) {
  db.query('SHOW TABLES', (err, results) => {
    if (err) {
      console.error('\x1b[31mError al obtener la información de las tablas:\x1b[0m', err.message);
      return;
    }

    // Transformar resultados para usar con console.table
    const tables = results.map(table => ({
      '': table[`Tables_in_${db.config.database}`]
    }));

    console.log('\x1b[33mTablas en la base de datos:\x1b[0m');
    console.table(tables); // Muestra las tablas en formato tabular
  });
}

// Carga la configuración e inicializa la base de datos
const config = loadConfig();
const db = initializeDatabase(config);

// Exporta la conexión a la base de datos
module.exports = db;
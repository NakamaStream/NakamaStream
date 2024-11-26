const mysql = require('mysql');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
require('console.table');

const configPath = path.join(__dirname, '..', 'config', 'database.yml');

function loadConfig() {
  try {
    return yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('\x1b[31m╔═══════════════════════════════════════════════╗');
    console.error('\x1b[31m║ Error al cargar la configuración del archivo  ║');
    console.error('\x1b[31m╚═══════════════════════════════════════════════╝');
    console.error('\x1b[31m', error.message);
    process.exit(1);
  }
}

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
      console.error('\x1b[31m╔═══════════════════════════════════════════════╗');
      console.error('\x1b[31m║     Error de conexión a la base de datos      ║');
      console.error('\x1b[31m╚═══════════════════════════════════════════════╝');
      console.error('\x1b[31m', err.message);
      process.exit(1);
    }

    console.log('\x1b[32m╔═══════════════════════════════════════════════╗');
    console.log('\x1b[32m║   Conexión a la base de datos establecida     ║');
    console.log('\x1b[32m╚═══════════════════════════════════════════════╝');
    logDatabaseInfo(config);
    fetchTableInfo(db);
  });

  db.on('error', (err) => {
    console.error('\x1b[31m╔═══════════════════════════════════════════════╗');
    console.error('\x1b[31m║         Error en la base de datos             ║');
    console.error('\x1b[31m╚═══════════════════════════════════════════════╝');
    console.error('\x1b[31m', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('\x1b[33m╔═══════════════════════════════════════════════╗');
      console.error('\x1b[33m║  Intentando reconectar a la base de datos...  ║');
      console.error('\x1b[33m╚═══════════════════════════════════════════════╝');
      initializeDatabase(config);
    } else {
      throw err;
    }
  });

  return db;
}

function logDatabaseInfo(config) {
  console.log('\x1b[36m╔═══════════════════════════════════════════════╗');
  console.log('\x1b[36m║       Información de la base de datos         ║');
  console.log('\x1b[36m╚═══════════════════════════════════════════════╝');
  console.table([
    { 'Propiedad': 'Host', 'Valor': config.host },
    { 'Propiedad': 'Usuario', 'Valor': config.user },
    { 'Propiedad': 'Nombre de la base de datos', 'Valor': config.name }
  ]);
}

function fetchTableInfo(db) {
  db.query('SHOW TABLES', (err, results) => {
    if (err) {
      console.error('\x1b[31m╔═══════════════════════════════════════════════╗');
      console.error('\x1b[31m║ Error al obtener la información de las tablas ║');
      console.error('\x1b[31m╚═══════════════════════════════════════════════╝');
      console.error('\x1b[31m', err.message);
      return;
    }

    const tables = results.map(table => ({
      'Tabla': table[`Tables_in_${db.config.database}`]
    }));

    console.log('\x1b[36m╔═══════════════════════════════════════════════╗');
    console.log('\x1b[36m║         Tablas en la base de datos            ║');
    console.log('\x1b[36m╚═══════════════════════════════════════════════╝');
    console.table(tables);
  });
}

const config = loadConfig();
const db = initializeDatabase(config);

module.exports = db;

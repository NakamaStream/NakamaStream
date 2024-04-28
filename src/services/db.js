const mysql = require('mysql');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'database.yml');

try {
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

  const db = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.name
  });

  db.connect((err) => {
    if (err) {
      console.error('\x1b[31mError de conexión a la base de datos:\x1b[0m', err.message);
      return;
    }
    console.log('\x1b[32mConexión a la base de datos establecida\x1b[0m');
    console.log('\x1b[33mInformación de la base de datos:\x1b[0m');
    console.log('\x1b[33mHost:\x1b[0m', config.host);
    console.log('\x1b[33mUsuario:\x1b[0m', config.user);
    console.log('\x1b[33mBase de datos:\x1b[0m', config.name);

    // Consulta para obtener información sobre el uso de memoria
    db.query('SHOW VARIABLES LIKE "innodb_buffer_pool_size"', (err, results) => {
      if (err) {
        console.error('\x1b[31mError al obtener información de memoria:\x1b[0m', err.message);
        return;
      }
      const memorySize = results[0].Value / (1024 * 1024); // Convertir bytes a megabytes
      console.log('\x1b[33mTamaño del buffer de la pool de InnoDB (MB):\x1b[0m', memorySize);
    });
  });

  module.exports = db;
} catch (error) {
  console.error('\x1b[31mError al cargar la configuración desde el archivo:\x1b[0m', error.message);
}

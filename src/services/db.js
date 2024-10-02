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
      console.error('\x1b[31mDatabase connection error:\x1b[0m', err.message);
      return;
    }
    console.log('\x1b[32mDatabase connection established\x1b[0m');
    console.log('\x1b[33mDatabase information:\x1b[0m');
    console.log('\x1b[33mHost:\x1b[0m', config.host);
    console.log('\x1b[33mUser:\x1b[0m', config.user);
    console.log('\x1b[33mDatabase name:\x1b[0m', config.name);

    // Query to get memory usage information
    db.query('SHOW VARIABLES LIKE "innodb_buffer_pool_size"', (err, results) => {
      if (err) {
        console.error('\x1b[31mError getting memory information:\x1b[0m', err.message);
        return;
      }
      const memorySize = results[0].Value / (1024 * 1024); // Convert bytes to megabytes
      console.log('\x1b[33mInnoDB buffer pool size (MB):\x1b[0m', memorySize);
    });
  });

  // Handle errors during the connection
  db.on('error', (err) => {
    console.error('\x1b[31mDatabase error:\x1b[0m', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('\x1b[31mAttempting to reconnect to the database...\x1b[0m');
      db.connect();
    } else {
      throw err;
    }
  });

  module.exports = db;
} catch (error) {
  console.error('\x1b[31mError loading configuration from file:\x1b[0m', error.message);
}
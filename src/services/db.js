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

const createTableQueries = {
  usuarios: `CREATE TABLE IF NOT EXISTS usuarios (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_admin TINYINT(1) DEFAULT 0,
    banned TINYINT(1) DEFAULT 0,
    ban_expiration DATETIME DEFAULT NULL,
    ip_address TEXT DEFAULT NULL,
    profile_image_url TEXT DEFAULT 'https://raw.githubusercontent.com/NakamaStream/Resources/refs/heads/main/NakamStream-logo.jpg',
    banner_image_url TEXT DEFAULT NULL,
    last_login DATETIME DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    is_muted TINYINT(1) DEFAULT 0,
    is_private TINYINT(1) DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  animes: `CREATE TABLE IF NOT EXISTS animes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    imageUrl TEXT NOT NULL,
    description TEXT NOT NULL,
    episodes INT DEFAULT 0,
    slug TEXT DEFAULT NULL,
    category TEXT NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    category_id INT DEFAULT NULL,
    release_date DATE DEFAULT NULL,
    status TEXT DEFAULT NULL,
    cover_image TEXT DEFAULT NULL,
    is_featured TINYINT(1) DEFAULT 0,
    featured_image_url TEXT DEFAULT NULL,
    upload_date TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  anime_categories: `
    CREATE TABLE IF NOT EXISTS anime_categories (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      anime_id INT DEFAULT NULL,
      FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    
    INSERT IGNORE INTO anime_categories (name, slug, anime_id) VALUES 
      ('Acción', 'accion', NULL),
      ('Aventura', 'aventura', NULL),
      ('Comedia', 'comedia', NULL),
      ('Drama', 'drama', NULL),
      ('Fantasía', 'fantasia', NULL),
      ('Ciencia ficción', 'ciencia-ficcion', NULL),
      ('Slice of life', 'slice-of-life', NULL),
      ('Romance', 'romance', NULL),
      ('Misterio', 'misterio', NULL),
      ('Supernatural', 'supernatural', NULL),
      ('Horror', 'horror', NULL),
      ('Psicológico', 'psicologico', NULL),
      ('Deportes', 'deportes', NULL),
      ('Música', 'musica', NULL),
      ('Mecha', 'mecha', NULL),
      ('Histórico', 'historico', NULL),
      ('Shounen', 'shounen', NULL),
      ('Shoujo', 'shoujo', NULL),
      ('Seinen', 'seinen', NULL),
      ('Josei', 'josei', NULL),
      ('Latino', 'latino', NULL),
      ('Castellano', 'castellano', NULL);`,

  categories: `CREATE TABLE IF NOT EXISTS categories (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  episodes: `CREATE TABLE IF NOT EXISTS episodes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    anime_id INT NOT NULL,
    episode_number INT DEFAULT NULL,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    views INT DEFAULT 0,
    description TEXT DEFAULT NULL,
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  comments: `CREATE TABLE IF NOT EXISTS comments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    anime_id INT NOT NULL,
    episode_id INT DEFAULT NULL,
    content TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    report_count INT DEFAULT 0,
    is_deleted TINYINT(1) DEFAULT 0,
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  anime_views: `CREATE TABLE IF NOT EXISTS anime_views (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    anime_id INT NOT NULL,
    views INT DEFAULT 0,
    user_id INT DEFAULT NULL,
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  favorites: `CREATE TABLE IF NOT EXISTS favorites (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    anime_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  password_reset_tokens: `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token TEXT NOT NULL,
    expiration BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  ratings: `CREATE TABLE IF NOT EXISTS ratings (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    anime_id INT DEFAULT NULL,
    rating INT DEFAULT NULL CHECK (rating >= 1 AND rating <= 5),
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  saved_animes: `CREATE TABLE IF NOT EXISTS saved_animes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    anime_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  watched_animes: `CREATE TABLE IF NOT EXISTS watched_animes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    anime_id INT NOT NULL,
    watched_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    episode_id INT DEFAULT NULL,
    episode_number INT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
};

async function verifyAndCreateTables(db) {
  return new Promise((resolve, reject) => {
    console.log('\x1b[33m║      Verificando y creando tablas...          ║');

    // Grupos de tablas que pueden crearse en paralelo
    const tableGroups = [
      // Grupo 1: Tablas base sin dependencias
      ['usuarios', 'animes', 'categories'],
      
      // Grupo 2: Tablas que dependen del primer grupo
      ['anime_categories', 'episodes'],
      
      // Grupo 3: Tablas que dependen de los grupos anteriores
      ['comments', 'anime_views', 'favorites', 'password_reset_tokens', 'ratings', 'saved_animes', 'watched_animes']
    ];

    // Función para crear un grupo de tablas en paralelo
    const createTableGroup = async (tables) => {
      const promises = tables.map(tableName => {
        return new Promise((resolveTable, rejectTable) => {
          const query = createTableQueries[tableName];
          db.query(query, (err) => {
            if (err) {
              console.error(`\x1b[31mError en tabla ${tableName}:`, err.message);
              rejectTable(err);
              return;
            }
            console.log(`\x1b[32mTabla ${tableName} ✓`);
            resolveTable();
          });
        });
      });

      await Promise.all(promises);
    };

    // Procesar grupos secuencialmente
    (async () => {
      try {
        for (const group of tableGroups) {
          await createTableGroup(group);
        }
        console.log('\x1b[32m║      Todas las tablas verificadas ✓           ║');
        resolve();
      } catch (error) {
        reject(error);
      }
    })();
  });
}

function initializeDatabase(config) {
  const db = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.name,
    charset: "utf8mb4",
    multipleStatements: true // Habilitamos múltiples consultas
  });

  db.connect(async (err) => {
    if (err) {
      console.error('\x1b[31m║     Error de conexión a la base de datos      ║');
      console.error('\x1b[31m', err.message);
      process.exit(1);
    }

    console.log('\x1b[32m║   Conexión a la base de datos establecida     ║');
    logDatabaseInfo(config);
    
    try {
      await verifyAndCreateTables(db);
      fetchTableInfo(db);
    } catch (error) {
      console.error('\x1b[31mError durante la verificación:', error.message);
      process.exit(1);
    }
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

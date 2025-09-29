const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Andres1997@localhost:5432/checklist',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Crear tablas si no existen
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_data (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        FOREIGN KEY(username) REFERENCES users(username)
      )
    `);
    
    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    console.error('Error inicializando base de datos:', err);
  }
}

// Inicializar base de datos al arrancar
initDatabase();

// RUTAS API

// Registrar usuario
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
    res.json({ success: true, message: 'Usuario registrado con éxito' });
  } catch (err) {
    if (err.code === '23505') { // Código de error para constraint unique
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    
    res.json({ success: true, username: result.rows[0].username });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener datos del usuario
app.get('/api/userdata/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const result = await pool.query('SELECT data FROM user_data WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.json({ sections: [] }); // Datos por defecto
    }
    
    res.json(result.rows[0].data);
  } catch (err) {
    console.error('Error obteniendo datos:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Guardar datos del usuario
app.post('/api/userdata/:username', async (req, res) => {
  const { username } = req.params;
  const userData = req.body;
  
  try {
    const existingUser = await pool.query('SELECT id FROM user_data WHERE username = $1', [username]);
    
    if (existingUser.rows.length > 0) {
      // Actualizar
      await pool.query('UPDATE user_data SET data = $1 WHERE username = $2', [JSON.stringify(userData), username]);
    } else {
      // Insertar
      await pool.query('INSERT INTO user_data (username, data) VALUES ($1, $2)', [username, JSON.stringify(userData)]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error guardando datos:', err);
    res.status(500).json({ error: 'Error al guardar' });
  }
});

// Servir index.html en la ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta de salud para verificar que el servidor funciona
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

// Cerrar conexiones al terminar
process.on('SIGINT', async () => {
  console.log('Cerrando conexiones...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Cerrando conexiones...');
  await pool.end();
  process.exit(0);
});
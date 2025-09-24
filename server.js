const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Servir archivos estáticos

// Crear/abrir base de datos
const db = new sqlite3.Database('checklist.db');

// Crear tablas si no existen
db.serialize(() => {
  // Tabla de usuarios
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  // Tabla de datos de usuario (reemplaza localStorage)
  db.run(`CREATE TABLE IF NOT EXISTS user_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY(username) REFERENCES users(username)
  )`);
});

// RUTAS API

// Registrar usuario
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
    [username, password], 
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'El usuario ya existe' });
        }
        return res.status(500).json({ error: 'Error del servidor' });
      }
      res.json({ success: true, message: 'Usuario registrado con éxito' });
    }
  );
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', 
    [username, password], 
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error del servidor' });
      }
      if (!row) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }
      res.json({ success: true, username: row.username });
    }
  );
});

// Obtener datos del usuario
app.get('/api/userdata/:username', (req, res) => {
  const { username } = req.params;
  
  db.get('SELECT data FROM user_data WHERE username = ?', 
    [username], 
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error del servidor' });
      }
      if (!row) {
        return res.json({ sections: [] }); // Datos por defecto
      }
      res.json(JSON.parse(row.data));
    }
  );
});

// Guardar datos del usuario
app.post('/api/userdata/:username', (req, res) => {
  const { username } = req.params;
  const userData = req.body;
  
  const dataString = JSON.stringify(userData);
  
  db.get('SELECT id FROM user_data WHERE username = ?', [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error del servidor' });
    }
    
    if (row) {
      // Actualizar
      db.run('UPDATE user_data SET data = ? WHERE username = ?', 
        [dataString, username], 
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error al guardar' });
          }
          res.json({ success: true });
        }
      );
    } else {
      // Insertar
      db.run('INSERT INTO user_data (username, data) VALUES (?, ?)', 
        [username, dataString], 
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error al guardar' });
          }
          res.json({ success: true });
        }
      );
    }
  });
});

// Servir index.html en la ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:3000`);
});

// Cerrar base de datos al terminar
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Conexión a base de datos cerrada.');
    process.exit(0);
  });
});
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;
const BASE_URL = 'https://generador-qr-ay1e.onrender.com';

// Usuario autorizado
const USER = 'admin';
const PASS = 'qr2024';

// Sesión
app.use(session({
  secret: 'claveSecreta123',
  resave: false,
  saveUninitialized: true
}));

// Middleware de autenticación
app.use((req, res, next) => {
  const isPublic =
    req.path === '/login' ||
    req.path === '/logout' ||
    req.path.startsWith('/public') ||
    req.path.startsWith('/uploads') ||
    /^\/perfil\/\d+$/.test(req.path); // permite ver perfil sin login

  if (isPublic || req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
});

// Multer para subir fotos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

const db = new sqlite3.Database('./hospital.db');
db.run(`CREATE TABLE IF NOT EXISTS personal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT,
  telefono TEXT,
  sector TEXT,
  guardia TEXT,
  foto TEXT
)`);

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', express.urlencoded({ extended: true }), (req, res) => {
  const { username, password } = req.body;
  if (username === USER && password === PASS) {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.send('<h3>Usuario o contraseña incorrectos</h3><a href="/login">Volver</a>');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Registrar y generar QR
app.post('/registrar', upload.single('foto'), (req, res) => {
  const { nombre, telefono, sector, guardia } = req.body;
  const fotoPath = `/uploads/${req.file.filename}`;

  db.run(`INSERT INTO personal (nombre, telefono, sector, guardia, foto)
          VALUES (?, ?, ?, ?, ?)`,
    [nombre, telefono, sector, guardia, fotoPath],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Error al registrar' });
      }

      const perfilUrl = `${BASE_URL}/perfil/${this.lastID}`;

      QRCode.toDataURL(perfilUrl, (err, qr) => {
        if (err) {
          return res.status(500).json({ error: 'Error al generar QR' });
        }

        res.json({ qr });
      });
    });
});

// Ver perfil
app.get('/perfil/:id', (req, res) => {
  const id = req.params.id;

  db.get(`SELECT * FROM personal WHERE id = ?`, [id], (err, row) => {
    if (err || !row) {
      return res.send('Perfil no encontrado');
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Perfil de ${row.nombre}</title>
        <style>
          body {
            font-family: 'Segoe UI', sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
          }
          .card {
            max-width: 400px;
            margin: auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          img {
            max-width: 100%;
            border-radius: 8px;
            margin-bottom: 15px;
          }
          h2 {
            margin-bottom: 10px;
            color: #2c3e50;
          }
          p {
            margin: 5px 0;
            font-size: 16px;
          }
          .acciones {
            margin-top: 20px;
          }
          button {
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <img src="${row.foto}" alt="Foto de ${row.nombre}" />
          <h2>${row.nombre}</h2>
          <p><strong>Teléfono:</strong> ${row.telefono}</p>
          <p><strong>Sector:</strong> ${row.sector}</p>
          <p><strong>Guardia:</strong> ${row.guardia}</p>
          <div class="acciones">
            <button onclick="window.print()">🖨️ Imprimir</button>
          </div>
        </div>
      </body>
      </html>
    `);
  });
});

// Exportar a Excel
app.get('/exportar', (req, res) => {
  db.all(`SELECT * FROM personal`, [], (err, rows) => {
    if (err) {
      return res.status(500).send('Error al obtener los datos');
    }

    let csv = 'ID,Nombre,Teléfono,Sector,Guardia,Foto\n';
    rows.forEach(row => {
      csv += `${row.id},"${row.nombre}","${row.telefono}","${row.sector}","${row.guardia}","${row.foto}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=personal_qr.csv');
    res.send(csv);
  });
});

// Historial de registros
app.get('/historial', (req, res) => {
  db.all(`SELECT * FROM personal ORDER BY id DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).send('Error al obtener el historial');
    }

    let html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Historial de Registros</title>
        <style>
          body {
            font-family: 'Segoe UI', sans-serif;
            background-color: #f9f9f9;
            padding: 20px;
          }
          h2 {
            text-align: center;
            color: #2c3e50;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 10px;
            text-align: center;
          }
          th {
            background-color: #3498db;
            color: white;
          }
          img {
            max-width: 80px;
            border-radius: 4px;
          }
          a {
            color: #3498db;
            text-decoration: none;
            font-weight: bold;
          }
          a:hover {
            text-decoration: underline;
          }
          .volver {
            display: block;
            margin-top: 30px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h2>Historial de Registros</h2>
        <table>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Sector</th>
            <th>Guardia</th>
            <th>Foto</th>
            <th>QR</th>
          </tr>
    `;

    rows.forEach(row => {
      const perfilUrl = `${BASE_URL}/perfil/${row.id}`;
      html += `
        <tr>
          <td>${row.id}</td>
          <td>${row.nombre}</td>
          <td>${row.telefono}</td>
          <td>${row.sector}</td>
          <td>${row.guardia}</td>
          <td><img src="${row.foto}" alt="Foto"></td>
          <td><a href="${perfilUrl}" target="_blank">Ver QR</a></td>
        </tr>
      `;
    });

    html += `
        </table>
        <div class="volver">
          <a href="/">← Volver al formulario</a>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

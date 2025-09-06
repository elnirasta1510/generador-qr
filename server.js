const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Base pública de Render
const BASE_URL = 'https://generador-qr-ay1e.onrender.com';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('./hospital.db');

// Crear tabla si no existe
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

// Registro y generación de QR
app.post('/registrar', (req, res) => {
  const { nombre, telefono, sector, guardia, foto } = req.body;

  db.run(`INSERT INTO personal (nombre, telefono, sector, guardia, foto)
          VALUES (?, ?, ?, ?, ?)`,
    [nombre, telefono, sector, guardia, foto],
    function (err) {
      if (err) {
        return res.send('Error al registrar');
      }

      const perfilUrl = `${BASE_URL}/perfil/${this.lastID}`;

      QRCode.toDataURL(perfilUrl, (err, qr) => {
        if (err) {
          return res.send('Error al generar QR');
        }

        res.send(`
          <h2>QR generado para ${nombre}</h2>
          <img src="${qr}" />
          <p><a href="${perfilUrl}" target="_blank">Ver perfil</a></p>
          <p><a href="/">Volver</a></p>
        `);
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
      <h2>Perfil de ${row.nombre}</h2>
      <p><strong>Teléfono:</strong> ${row.telefono}</p>
      <p><strong>Sector:</strong> ${row.sector}</p>
      <p><strong>Guardia:</strong> ${row.guardia}</p>
      <img src="${row.foto}" alt="Foto de ${row.nombre}" width="200" />
      <p><a href="/">Volver</a></p>
    `);
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// URL pública de Render
const BASE_URL = 'https://generador-qr-ay1e.onrender.com';

// Configurar almacenamiento de fotos
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
      <h2>Perfil de ${row.nombre}</h2>
      <p><strong>Teléfono:</strong> ${row.telefono}</p>
      <p><strong>Sector:</strong> ${row.sector}</p>
      <p><strong>Guardia:</strong> ${row.guardia}</p>
      <img src="${row.foto}" alt="Foto de ${row.nombre}" width="200" />
      <p><a href="/">Volver</a></p>
    `);
  });
});
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
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

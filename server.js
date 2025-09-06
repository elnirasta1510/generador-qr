const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const QRCode = require('qrcode');
const path = require('path');

const app = express();
const db = new sqlite3.Database('personas.db');
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Crear tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT,
  telefono TEXT,
  sector TEXT,
  foto_url TEXT
)`);

// Ruta para registrar persona
app.post('/registrar', upload.single('foto'), (req, res) => {
  const { nombre, telefono, sector } = req.body;
  const foto_url = req.file ? `/uploads/${req.file.filename}` : '';

  db.run(`INSERT INTO personas (nombre, telefono, sector, foto_url) VALUES (?, ?, ?, ?)`,
    [nombre, telefono, sector, foto_url],
    function (err) {
      if (err) return res.status(500).send('Error al guardar');

      const perfilUrl = `http://localhost:3000/perfil/${this.lastID}`;
      QRCode.toDataURL(perfilUrl, (err, qr) => {
        if (err) return res.status(500).send('Error al generar QR');
        res.send({ id: this.lastID, qr, perfilUrl });
      });
    });
});

// Ruta para ver perfil
app.get('/perfil/:id', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM personas WHERE id = ?`, [id], (err, row) => {
    if (err || !row) return res.status(404).send('No encontrado');

    res.send(`
      <h1>${row.nombre}</h1>
      <p>Teléfono: ${row.telefono}</p>
      <p>Sector: ${row.sector}</p>
      <img src="${row.foto_url}" alt="Foto" style="max-width:200px">
    `);
  });
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));

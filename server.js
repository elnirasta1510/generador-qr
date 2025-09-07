const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Configuración básica
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Sesión
app.use(session({
  secret: 'clave-secreta',
  resave: false,
  saveUninitialized: true
}));

// 🔐 Middleware de protección con excepción para /perfil/:id
app.use((req, res, next) => {
  const publicPaths = [
    '/login',
    '/logout',
    '/exportar',
    '/',
  ];

  const isPublic =
    publicPaths.includes(req.path) ||
    req.path.startsWith('/public') ||
    req.path.startsWith('/uploads') ||
    /^\/perfil\/\d+$/.test(req.path); // permite /perfil/123

  if (isPublic || req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
});

// 🧪 Ruta de prueba para mostrar perfil
app.get('/perfil/:id', (req, res) => {
  const id = req.params.id;
  // Simulación de datos del profesional
  const profesional = {
    nombre: 'Dra. Ana Torres',
    sector: 'Pediatría',
    foto: `/uploads/ana.jpg`,
    turno: 'Lunes a Viernes - 8:00 a 14:00'
  };

  res.send(`
    <html>
      <head>
        <title>Perfil Profesional</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .card { border: 1px solid #ccc; padding: 20px; max-width: 400px; margin: auto; }
          img { max-width: 100%; height: auto; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>${profesional.nombre}</h2>
          <p><strong>Sector:</strong> ${profesional.sector}</p>
          <p><strong>Turno:</strong> ${profesional.turno}</p>
          <img src="${profesional.foto}" alt="Foto del profesional" />
        </div>
      </body>
    </html>
  `);
});

// 🧑‍💻 Rutas protegidas (ejemplo)
app.get('/dashboard', (req, res) => {
  if (req.session.loggedIn) {
    res.send('Bienvenido al panel');
  } else {
    res.redirect('/login');
  }
});

// 🟢 Login básico
app.get('/login', (req, res) => {
  res.send(`
    <form method="POST" action="/login">
      <input name="usuario" placeholder="Usuario" required />
      <input name="clave" type="password" placeholder="Clave" required />
      <button type="submit">Ingresar</button>
    </form>
  `);
});

app.post('/login', (req, res) => {
  const { usuario, clave } = req.body;
  if (usuario === 'admin' && clave === '1234') {
    req.session.loggedIn = true;
    res.redirect('/dashboard');
  } else {
    res.send('Credenciales incorrectas');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// 🟣 Inicio
app.get('/', (req, res) => {
  res.send('<h1>Inicio del sistema QR</h1>');
});

// 🟡 Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});

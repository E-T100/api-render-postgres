const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Endpoint de salud
app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'API funcionando en Render' });
});

// Endpoint solicitado
app.get('/api/productos', async (req, res) => {
  try {
	const r = await pool.query('SELECT * FROM productos');
    res.json(r.rows);
  } catch (e) {
    console.error('Error en /api/productos:', e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
});

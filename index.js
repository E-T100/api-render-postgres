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

// Productos
app.get('/api/productos', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM productos');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM clientes');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Órdenes
app.get('/api/ordenes', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM ordenes');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Check tables
app.get('/api/check-tables', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public'
      ORDER BY table_name
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SIEMPRE AL FINAL
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
});

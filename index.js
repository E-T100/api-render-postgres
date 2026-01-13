const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// Validación de entorno
if (!process.env.DATABASE_URL) {
  console.error("❌ Falta la variable de entorno DATABASE_URL");
  process.exit(1);
}

// Conexión a PostgreSQL (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ============================
   ENDPOINT DE SALUD
============================ */
app.get("/", (req, res) => {
  res.json({ ok: true, mensaje: "API funcionando en Render" });
});

/* ============================
   GET PRODUCTOS
============================ */
app.get("/api/productos", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM productos ORDER BY id_producto"
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ============================
   POST PRODUCTOS
============================ */
app.post("/api/productos", async (req, res) => {
  const { nombre, descripcion, precio, stock, id_categoria } = req.body;

  // Validaciones
  if (!nombre || typeof nombre !== "string") {
    return res.status(400).json({
      ok: false,
      error: "El campo 'nombre' es obligatorio"
    });
  }

  if (typeof precio !== "number") {
    return res.status(400).json({
      ok: false,
      error: "El campo 'precio' debe ser numérico"
    });
  }

  if (!Number.isInteger(stock)) {
    return res.status(400).json({
      ok: false,
      error: "El campo 'stock' debe ser entero (ej. 10)"
    });
  }

  try {
    const r = await pool.query(
      `
      INSERT INTO productos
      (nombre, descripcion, precio, stock, id_categoria)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [nombre, descripcion || null, precio, stock, id_categoria || null]
    );

    res.status(201).json({
      ok: true,
      producto: r.rows[0]
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ============================
   GET CLIENTES
============================ */
app.get("/api/clientes", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM clientes ORDER BY id_cliente"
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================
   POST CLIENTES
============================ */
app.post("/api/clientes", async (req, res) => {
  const { nombre, email, direccion, telefono } = req.body;

  if (!nombre) {
    return res.status(400).json({
      ok: false,
      error: "El campo 'nombre' es obligatorio"
    });
  }

  try {
    const r = await pool.query(
      `
      INSERT INTO clientes
      (nombre, email, direccion, telefono)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [nombre, email || null, direccion || null, telefono || null]
    );

    res.status(201).json({
      ok: true,
      cliente: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================
   GET ORDENES
============================ */
app.get("/api/ordenes", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM ordenes ORDER BY id_orden"
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================
   POST ORDENES
============================ */
app.post("/api/ordenes", async (req, res) => {
  const { tipo_orden, id_cliente } = req.body;

  if (!tipo_orden) {
    return res.status(400).json({
      ok: false,
      error: "El campo 'tipo_orden' es obligatorio"
    });
  }

  try {
    const r = await pool.query(
      `
      INSERT INTO ordenes
      (tipo_orden, id_cliente)
      VALUES ($1, $2)
      RETURNING *
      `,
      [tipo_orden, id_cliente || null]
    );

    res.status(201).json({
      ok: true,
      orden: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================
   CHECK TABLES (DEBUG)
============================ */
app.get("/api/check-tables", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================
   SERVIDOR
============================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API escuchando en puerto ${PORT}`);
});

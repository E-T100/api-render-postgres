const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// Validación básica
if (!process.env.DATABASE_URL) {
  console.error("❌ Falta la variable de entorno DATABASE_URL");
}

// Conexión a Postgres (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper: respuestas de error consistentes
function handleError(res, endpoint, err) {
  console.error(`❌ Error en ${endpoint}:`, err.message);
  return res.status(500).json({ error: err.message });
}

// Endpoint de salud
app.get("/", (req, res) => {
  res.json({ ok: true, mensaje: "API funcionando en Render" });
});

/* =========================
   GET: PRODUCTOS / CLIENTES / ORDENES
========================= */

// Productos
app.get("/api/productos", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM productos ORDER BY id_producto");
    res.json(r.rows);
  } catch (err) {
    return handleError(res, "/api/productos", err);
  }
});

// Clientes
app.get("/api/clientes", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM clientes ORDER BY id_cliente");
    res.json(r.rows);
  } catch (err) {
    return handleError(res, "/api/clientes", err);
  }
});

// Órdenes
app.get("/api/ordenes", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM ordenes ORDER BY id_orden");
    res.json(r.rows);
  } catch (err) {
    return handleError(res, "/api/ordenes", err);
  }
});

/* =========================
   POST: PRODUCTOS / CLIENTES / ORDENES
========================= */

// POST /api/productos
// Body esperado: { nombre, descripcion?, precio, stock, id_categoria? }
app.post("/api/productos", async (req, res) => {
  try {
    const { nombre, descripcion = null, precio, stock, id_categoria = null } =
      req.body;

    // Validaciones mínimas (según NOT NULL)
    if (!nombre || precio === undefined || stock === undefined) {
      return res.status(400).json({
        error:
          "Faltan campos obligatorios: nombre, precio, stock (descripcion e id_categoria son opcionales).",
      });
    }

    const r = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [nombre, descripcion, precio, stock, id_categoria]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    return handleError(res, "/api/productos [POST]", err);
  }
});

// POST /api/clientes
// Body esperado: { nombre, email?, direccion?, telefono? }
app.post("/api/clientes", async (req, res) => {
  try {
    const { nombre, email = null, direccion = null, telefono = null } = req.body;

    if (!nombre) {
      return res.status(400).json({
        error: "Falta campo obligatorio: nombre (email, direccion, telefono son opcionales).",
      });
    }

    // Nota: email es UNIQUE, así que si mandas un email repetido va a fallar.
    const r = await pool.query(
      `INSERT INTO clientes (nombre, email, direccion, telefono)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [nombre, email, direccion, telefono]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    return handleError(res, "/api/clientes [POST]", err);
  }
});

// POST /api/ordenes
// Body esperado: { tipo_orden, id_cliente? }
app.post("/api/ordenes", async (req, res) => {
  try {
    const { tipo_orden, id_cliente = null } = req.body;

    if (!tipo_orden) {
      return res.status(400).json({
        error: "Falta campo obligatorio: tipo_orden (id_cliente es opcional).",
      });
    }

    const r = await pool.query(
      `INSERT INTO ordenes (tipo_orden, id_cliente)
       VALUES ($1, $2)
       RETURNING *;`,
      [tipo_orden, id_cliente]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    return handleError(res, "/api/ordenes [POST]", err);
  }
});

/* =========================
   UTIL: CHECK TABLES + CHECK COLUMNS
========================= */

// Check tables (qué tablas existen)
app.get("/api/check-tables", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    res.json(result.rows);
  } catch (err) {
    return handleError(res, "/api/check-tables", err);
  }
});

// Check columns por tabla: /api/check-columns/:tabla
app.get("/api/check-columns/:tabla", async (req, res) => {
  try {
    const { tabla } = req.params;

    const result = await pool.query(
      `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position;
      `,
      [tabla]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Tabla '${tabla}' no existe o no tiene columnas.` });
    }

    res.json(result.rows);
  } catch (err) {
    return handleError(res, "/api/check-columns/:tabla", err);
  }
});

// ✅ Siempre al final
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
});

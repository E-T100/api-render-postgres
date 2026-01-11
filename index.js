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

// =========================
// POST: Crear PRODUCTO
// Body esperado: { nombre, descripcion?, precio, stock, id_categoria? }
// =========================
app.post("/api/productos", async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, id_categoria } = req.body;

    // Validaciones mínimas según tus columnas:
    // nombre (NOT NULL), precio (NOT NULL), stock (NOT NULL)
    if (!nombre || precio === undefined || stock === undefined) {
      return res.status(400).json({
        error: "Faltan campos requeridos: nombre, precio, stock",
      });
    }

    const q = `
      INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      nombre,
      descripcion ?? null,
      precio,
      stock,
      id_categoria ?? null,
    ];

    const r = await pool.query(q, values);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("Error en POST /api/productos:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// =========================
// POST: Crear CLIENTE
// Body esperado: { nombre, email?, direccion?, telefono? }
// =========================
app.post("/api/clientes", async (req, res) => {
  try {
    const { nombre, email, direccion, telefono } = req.body;

    // En tu tabla: nombre es NOT NULL; email/direccion/telefono pueden ser null
    if (!nombre) {
      return res.status(400).json({
        error: "Falta campo requerido: nombre",
      });
    }

    const q = `
      INSERT INTO clientes (nombre, email, direccion, telefono)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [
      nombre,
      email ?? null,
      direccion ?? null,
      telefono ?? null,
    ];

    const r = await pool.query(q, values);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    // Si email tiene UNIQUE, aquí caerá cuando repitas email
    console.error("Error en POST /api/clientes:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// =========================
// POST: Crear ORDEN
// Body esperado: { tipo_orden, id_cliente }
// =========================
app.post("/api/ordenes", async (req, res) => {
  try {
    const { tipo_orden, id_cliente } = req.body;

    // En tu tabla: tipo_orden es NOT NULL
    if (!tipo_orden) {
      return res.status(400).json({ error: "Falta campo requerido: tipo_orden" });
    }

    // id_cliente es nullable, pero si lo mandas debe existir el cliente (FK)
    if (id_cliente !== undefined && id_cliente !== null) {
      const check = await pool.query(
        "SELECT 1 FROM clientes WHERE id_cliente = $1",
        [id_cliente]
      );
      if (check.rowCount === 0) {
        return res.status(400).json({
          error: "id_cliente no existe en clientes (violación de FK)",
        });
      }
    }

    const q = `
      INSERT INTO ordenes (tipo_orden, id_cliente)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const values = [tipo_orden, id_cliente ?? null];

    const r = await pool.query(q, values);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("Error en POST /api/ordenes:", e.message);
    res.status(500).json({ error: e.message });
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

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

// ---------- Helpers ----------
function badRequest(res, msg) {
  return res.status(400).json({ ok: false, error: msg });
}

// ---------- Endpoint de salud ----------
app.get("/", (req, res) => {
  res.json({ ok: true, mensaje: "API funcionando en Render" });
});

// ---------- Check tables ----------
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
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- Check columns (por tabla) ----------
app.get("/api/check-columns/:table", async (req, res) => {
  const table = req.params.table;

  // Whitelist simple (evita SQL injection por nombre de tabla)
  const allowed = new Set(["productos", "clientes", "ordenes", "categorias"]);
  if (!allowed.has(table)) return badRequest(res, `Tabla no permitida: ${table}`);

  try {
    const result = await pool.query(
      `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
      `,
      [table]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- GET: Productos ----------
app.get("/api/productos", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM productos ORDER BY id_producto;");
    res.json(r.rows);
  } catch (e) {
    console.error("Error en /api/productos:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- GET: Clientes ----------
app.get("/api/clientes", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM clientes ORDER BY id_cliente;");
    res.json(r.rows);
  } catch (e) {
    console.error("Error en /api/clientes:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- GET: Órdenes ----------
app.get("/api/ordenes", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM ordenes ORDER BY id_orden;");
    res.json(r.rows);
  } catch (e) {
    console.error("Error en /api/ordenes:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// =====================================================
// ===================== POSTs ==========================
// =====================================================

// ---------- POST: Crear cliente ----------
// Tabla clientes (según tu captura):
// id_cliente (PK), nombre (NOT NULL), email (NULL), direccion (NULL), telefono (NULL)
app.post("/api/clientes", async (req, res) => {
  const { nombre, email = null, direccion = null, telefono = null } = req.body;

  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return badRequest(res, "El campo 'nombre' es obligatorio (string).");
  }

  try {
    const r = await pool.query(
      `
      INSERT INTO clientes (nombre, email, direccion, telefono)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
      [nombre.trim(), email, direccion, telefono]
    );

    res.status(201).json({ ok: true, cliente: r.rows[0] });
  } catch (e) {
    console.error("Error POST /api/clientes:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- POST: Crear orden ----------
// Tabla ordenes (según tu captura):
// id_orden (PK), tipo_orden (NOT NULL), id_cliente (NULL)
app.post("/api/ordenes", async (req, res) => {
  const { tipo_orden, id_cliente = null } = req.body;

  if (!tipo_orden || typeof tipo_orden !== "string" || !tipo_orden.trim()) {
    return badRequest(res, "El campo 'tipo_orden' es obligatorio (string).");
  }

  // id_cliente puede ser null, pero si viene, que sea número
  const idClienteParsed =
    id_cliente === null || id_cliente === undefined || id_cliente === ""
      ? null
      : Number(id_cliente);

  if (idClienteParsed !== null && Number.isNaN(idClienteParsed)) {
    return badRequest(res, "Si envías 'id_cliente', debe ser un número o null.");
  }

  try {
    // (Opcional) si quieres validar que exista el cliente cuando viene id_cliente:
    if (idClienteParsed !== null) {
      const exists = await pool.query(
        "SELECT 1 FROM clientes WHERE id_cliente = $1 LIMIT 1;",
        [idClienteParsed]
      );
      if (exists.rowCount === 0) {
        return badRequest(res, `No existe el cliente con id_cliente=${idClienteParsed}`);
      }
    }

    const r = await pool.query(
      `
      INSERT INTO ordenes (tipo_orden, id_cliente)
      VALUES ($1, $2)
      RETURNING *;
      `,
      [tipo_orden.trim(), idClienteParsed]
    );

    res.status(201).json({ ok: true, orden: r.rows[0] });
  } catch (e) {
    console.error("Error POST /api/ordenes:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- POST: Crear producto ----------
// Asumiendo estructura típica por lo que ya te devolvió /api/productos:
// id_producto (PK), nombre, precio, existencia
app.post("/api/productos", async (req, res) => {
  const { nombre, precio, existencia } = req.body;

  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return badRequest(res, "El campo 'nombre' es obligatorio (string).");
  }

  const precioNum = Number(precio);
  if (Number.isNaN(precioNum)) {
    return badRequest(res, "El campo 'precio' debe ser numérico (ej. 25.5).");
  }

  const existenciaNum = Number(existencia);
  if (!Number.isInteger(existenciaNum)) {
    return badRequest(res, "El campo 'existencia' debe ser entero (ej. 50).");
  }

  try {
    const r = await pool.query(
      `
      INSERT INTO productos (nombre, precio, existencia)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [nombre.trim(), precioNum, existenciaNum]
    );

    res.status(201).json({ ok: true, producto: r.rows[0] });
  } catch (e) {
    console.error("Error POST /api/productos:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ✅ Siempre al final
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
});

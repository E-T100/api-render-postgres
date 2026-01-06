const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Validación básica (en Render conviene fallar rápido)
if (!process.env.DATABASE_URL) {
  console.error("❌ Falta la variable de entorno DATABASE_URL");
  // En Render es mejor detener el proceso si no hay DB
  // (si lo prefieres, comenta la siguiente línea)
  // process.exit(1);
}

// ✅ Conexión a Postgres (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Opcional, pero ayuda en cloud
  keepAlive: true,
});

// Endpoint de salud
app.get("/", (req, res) => {
  res.json({ ok: true, mensaje: "API funcionando en Render" });
});

// Productos
app.get("/api/productos", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM productos ORDER BY 1");
    res.json(r.rows);
  } catch (e) {
    console.error("Error en /api/productos:", e);
    res.status(500).json({ error: e.message });
  }
});

// Clientes
app.get("/api/clientes", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM clientes ORDER BY 1");
    res.json(r.rows);
  } catch (e) {
    console.error("Error en /api/clientes:", e);
    res.status(500).json({ error: e.message });
  }
});

// Órdenes
app.get("/api/ordenes", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM ordenes ORDER BY 1");
    res.json(r.rows);
  } catch (e) {
    console.error("Error en /api/ordenes:", e);
    res.status(500).json({ error: e.message });
  }
});

// ✅ Check tables: qué tablas existen en public
app.get("/api/check-tables", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/check-tables:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Check columns: qué columnas tiene una tabla (clientes/ordenes/productos/etc.)
app.get("/api/check-columns/:tabla", async (req, res) => {
  const tabla = (req.params.tabla || "").trim();

  // Validación para evitar inyección en nombre de tabla
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tabla)) {
    return res.status(400).json({ error: "Nombre de tabla inválido" });
  }

  try {
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
      return res.status(404).json({ error: `Tabla '${tabla}' no existe o no tiene columnas` });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(`Error en /api/check-columns/${tabla}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ SIEMPRE AL FINAL
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
});

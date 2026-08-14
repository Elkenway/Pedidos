const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const { generarPdfPedido } = require('./lib/pdfPedido');

const app  = express();
const PORT = 3000;

const pool = new Pool({
  host:     'localhost',
  port:     5432,
  database: 'castano_living',
  user:     'postgres',
  password: '1459',
});

pool.on('connect', (client) => {
  client.query("SET client_encoding TO 'UTF8'");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const METODOS_VALIDOS = ['efectivo', 'datafono', 'transferencia'];

// ── POST /api/login ──
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos.' });

  try {
    const result = await pool.query(
      'SELECT id, nombre, rol FROM usuarios WHERE nombre_usuario = $1 AND contrasena = $2',
      [username, password]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });

    const user = result.rows[0];
    res.json({ success: true, name: user.nombre, id: user.id, rol: user.rol });
  } catch (err) {
    console.error('Error /api/login:', err.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// ── GET /api/productos ──
app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM (
        SELECT DISTINCT ON (nombre) id, nombre, precio, disponible, cantidad
        FROM productos
        ORDER BY nombre ASC, id ASC
      ) sub
      ORDER BY disponible DESC, nombre ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error /api/productos:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener productos.' });
  }
});

// ── POST /api/productos  (admin: agregar) ──
app.post('/api/productos', async (req, res) => {
  const { nombre, precio, cantidad, disponible } = req.body;
  if (!nombre || !nombre.trim())
    return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
  if (precio === undefined || isNaN(parseFloat(precio)) || parseFloat(precio) < 0)
    return res.status(400).json({ success: false, message: 'El precio debe ser un número válido.' });
  if (cantidad === undefined || isNaN(parseInt(cantidad)) || parseInt(cantidad) < 0)
    return res.status(400).json({ success: false, message: 'La cantidad debe ser un número válido.' });

  try {
    const result = await pool.query(
      'INSERT INTO productos (nombre, precio, cantidad, disponible) VALUES ($1, $2, $3, $4) RETURNING id',
      [nombre.trim(), parseFloat(precio), parseInt(cantidad), disponible !== false]
    );
    res.json({ success: true, message: 'Producto agregado.', id: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ success: false, message: 'Ya existe un producto con ese nombre.' });
    console.error('Error POST /api/productos:', err.message);
    res.status(500).json({ success: false, message: 'Error al agregar el producto.' });
  }
});

// ── PUT /api/productos/:id  (admin: modificar) ──
app.put('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, disponible, cantidad } = req.body;
  if (!nombre || !nombre.trim())
    return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
  if (precio === undefined || isNaN(parseFloat(precio)) || parseFloat(precio) < 0)
    return res.status(400).json({ success: false, message: 'El precio debe ser un número válido.' });
  if (cantidad === undefined || isNaN(parseInt(cantidad)) || parseInt(cantidad) < 0)
    return res.status(400).json({ success: false, message: 'La cantidad debe ser un número válido.' });

  try {
    await pool.query(
      'UPDATE productos SET nombre = $1, precio = $2, disponible = $3, cantidad = $4 WHERE id = $5',
      [nombre.trim(), parseFloat(precio), disponible, parseInt(cantidad), id]
    );
    res.json({ success: true, message: 'Producto actualizado.' });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ success: false, message: 'Ya existe otro producto con ese nombre.' });
    console.error('Error PUT /api/productos:', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar el producto.' });
  }
});

// ── DELETE /api/productos/:id  (admin: eliminar) ──
app.delete('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM productos WHERE id = $1', [id]);
    if (result.rowCount === 0)
      return res.status(404).json({ success: false, message: 'El producto no existe.' });
    res.json({ success: true, message: 'Producto eliminado.' });
  } catch (err) {
    console.error('Error DELETE /api/productos:', err.message);
    res.status(500).json({ success: false, message: 'Error al eliminar el producto.' });
  }
});

// ── POST /api/ventas ──
// Registra una venta: valida y bloquea stock, descuenta inventario,
// guarda el pedido con sus datos de entrega y metodo de pago.
// Ya NO cobra tarjeta — el pago se hace por fuera (datafono/efectivo/transferencia).
app.post('/api/ventas', async (req, res) => {
  const { amount, items, userId, delivery, metodoPago, referencia } = req.body;

  if (!delivery || !delivery.name || !delivery.address || !delivery.city || !delivery.phone)
    return res.status(400).json({ success: false, message: 'Los datos de entrega están incompletos.' });

  if (!items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ success: false, message: 'El carrito está vacío.' });

  if (!METODOS_VALIDOS.includes(metodoPago))
    return res.status(400).json({ success: false, message: 'Método de pago inválido.' });

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0)
    return res.status(400).json({ success: false, message: 'Monto inválido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar y bloquear stock de cada producto (FOR UPDATE) antes de registrar
    for (const item of items) {
      const prodRes = await client.query(
        'SELECT nombre, cantidad, disponible FROM productos WHERE id = $1 FOR UPDATE',
        [item.id]
      );
      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Uno de los productos ya no existe.' });
      }
      const prod = prodRes.rows[0];
      if (!prod.disponible || prod.cantidad < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `No hay stock suficiente de "${prod.nombre}". Disponible: ${prod.cantidad}.`
        });
      }
    }

    // Descontar stock
    for (const item of items) {
      await client.query('UPDATE productos SET cantidad = cantidad - $1 WHERE id = $2', [item.quantity, item.id]);
    }

    // Crear el pedido — numero_pedido lo asigna la secuencia automáticamente
    const pedidoResult = await client.query(
      `INSERT INTO pedidos (usuario_id, nombre_destinatario, direccion, ciudad, telefono, notas, metodo_pago, referencia_pago, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, numero_pedido`,
      [userId || null, delivery.name, delivery.address, delivery.city, delivery.phone, delivery.notes || '', metodoPago, referencia || null, amountNum]
    );
    const pedido = pedidoResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedido.id, item.id, item.name, item.price, item.quantity]
      );
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Venta registrada con éxito.',
      orderNumber: pedido.numero_pedido,
      orderId: pedido.id
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error /api/ventas — ROLLBACK ejecutado:', err.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
});

// ── GET /api/ventas ──
// Para el panel de administración: lista todas las ventas
// (las haga el vendedor o el admin) con quién la hizo y sus items.
app.get('/api/ventas', async (req, res) => {
  try {
    const pedidosRes = await pool.query(`
      SELECT p.id, p.numero_pedido, p.nombre_destinatario, p.direccion, p.ciudad, p.telefono,
             p.notas, p.total, p.metodo_pago, p.referencia_pago, p.fecha_pedido, p.estado,
             u.nombre AS vendedor_nombre
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.fecha_pedido DESC
    `);

    const itemsRes = await pool.query(
      'SELECT pedido_id, nombre_producto, precio_unitario, cantidad FROM pedido_items ORDER BY id ASC'
    );

    const itemsByPedido = {};
    itemsRes.rows.forEach(item => {
      if (!itemsByPedido[item.pedido_id]) itemsByPedido[item.pedido_id] = [];
      itemsByPedido[item.pedido_id].push(item);
    });

    const ventas = pedidosRes.rows.map(p => ({ ...p, items: itemsByPedido[p.id] || [] }));
    res.json({ success: true, data: ventas });

  } catch (err) {
    console.error('Error /api/ventas GET:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener las ventas.' });
  }
});

// ── GET /api/ventas/:id/pdf ──
// Genera el comprobante en PDF de un pedido puntual. No se restringe
// por rol: lo puede pedir quien acaba de hacer la venta (vendedor o
// admin, desde la pantalla de éxito) o el admin reimprimiendo desde
// el panel de Ventas.
app.get('/api/ventas/:id/pdf', async (req, res) => {
  const { id } = req.params;
  try {
    const pedidoRes = await pool.query(`
      SELECT p.*, u.nombre AS vendedor_nombre
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (pedidoRes.rows.length === 0)
      return res.status(404).json({ success: false, message: 'El pedido no existe.' });

    const itemsRes = await pool.query(
      'SELECT nombre_producto, precio_unitario, cantidad FROM pedido_items WHERE pedido_id = $1 ORDER BY id ASC',
      [id]
    );

    const venta = { ...pedidoRes.rows[0], items: itemsRes.rows };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="pedido-${venta.numero_pedido}.pdf"`);
    generarPdfPedido(venta, res);

  } catch (err) {
    console.error('Error /api/ventas/:id/pdf:', err.message);
    res.status(500).json({ success: false, message: 'Error al generar el PDF.' });
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ┌──────────────────────────────────────┐');
  console.log('  │        CASTANO LIVING - SERVER       │');
  console.log('  │  http://localhost:' + PORT + '                │');
  console.log('  └──────────────────────────────────────┘');
  console.log('');
});

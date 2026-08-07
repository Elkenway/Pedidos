const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app  = express();
const PORT = 3000;

const pool = new Pool({
  host:     'localhost',
  port:     5432,
  database: 'castano_living',
  user:     'postgres',
  password: '1459',
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos.' });

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

// GET /api/productos
app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, precio, disponible, cantidad FROM productos ORDER BY disponible DESC, nombre ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error /api/productos:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener productos.' });
  }
});

// PUT /api/productos/:id  (solo admin)
app.put('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { precio, disponible, cantidad } = req.body;

  if (precio === undefined || disponible === undefined || cantidad === undefined)
    return res.status(400).json({ success: false, message: 'Faltan campos.' });

  try {
    await pool.query(
      'UPDATE productos SET precio = $1, disponible = $2, cantidad = $3 WHERE id = $4',
      [parseFloat(precio), disponible, parseInt(cantidad), id]
    );
    res.json({ success: true, message: 'Producto actualizado.' });
  } catch (err) {
    console.error('Error PUT /api/productos:', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar producto.' });
  }
});

// GET /api/tarjetas
app.get('/api/tarjetas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nombre_titular, numero_tarjeta, fecha_vencimiento, codigo_seguridad, cantidad_disponible FROM pagos_tarjeta_credito ORDER BY id ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error /api/tarjetas:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener tarjetas.' });
  }
});

// POST /api/pago  — con transacción y ROLLBACK
app.post('/api/pago', async (req, res) => {
  const { cardHolder, cardNumber, expirationDate, securityCode, amount, items } = req.body;

  if (!cardHolder || !cardNumber || !expirationDate || !securityCode || !amount)
    return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0)
    return res.status(400).json({ success: false, message: 'Monto inválido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Buscar tarjeta
    const cardResult = await client.query(
      `SELECT id, cantidad_disponible FROM pagos_tarjeta_credito
       WHERE nombre_titular = $1 AND numero_tarjeta = $2
         AND fecha_vencimiento = $3 AND codigo_seguridad = $4`,
      [cardHolder, cardNumber, expirationDate, securityCode]
    );

    if (cardResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Datos de tarjeta inválidos.' });
    }

    const tarjeta = cardResult.rows[0];
    const saldo   = parseFloat(tarjeta.cantidad_disponible);

    if (saldo < amountNum) {
      await client.query('ROLLBACK');
      return res.status(402).json({
        success: false,
        message: `Fondos insuficientes. Saldo disponible: $${saldo.toLocaleString('es-CO')}`
      });
    }

    // Descontar saldo de la tarjeta
    await client.query(
      'UPDATE pagos_tarjeta_credito SET cantidad_disponible = $1 WHERE id = $2',
      [saldo - amountNum, tarjeta.id]
    );

    // Descontar stock por cada producto del carrito
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          'UPDATE productos SET cantidad = GREATEST(0, cantidad - $1) WHERE id = $2',
          [item.quantity, item.id]
        );
      }
    }

    await client.query('COMMIT');

    const orderNum = Math.floor(Math.random() * 900000) + 100000;
    res.json({ success: true, message: 'Pago realizado con éxito.', orderNumber: orderNum });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error /api/pago — ROLLBACK ejecutado:', err.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  } finally {
    client.release();
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

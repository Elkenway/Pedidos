/* ============================================
   CASTANO LIVING | app.js
   Sin tarjeta simulada. El pago se registra
   (efectivo / datafono / transferencia), no se
   procesa. Incluye panel de Ventas para admin.
   ============================================ */

let currentUser = null;
let cart = [];

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id + '-page').classList.add('active');
}
function fmtPrice(n) { return Number(n).toLocaleString('es-CO'); }

function getIcon(nombre) {
  const n = nombre.toLowerCase();
  if (n.includes('silla'))          return '🪑';
  if (n.includes('comedor'))        return '🍽️';
  if (n.includes('mesa de centro')) return '☕';
  if (n.includes('jard'))           return '🌿';
  if (n.includes('mesa alta'))      return '🍺';
  if (n.includes('mesa'))           return '🪵';
  if (n.includes('cama'))           return '🛏️';
  if (n.includes('sofacama'))       return '🛌';
  if (n.includes('sof'))            return '🛋️';
  if (n.includes('esquinero'))      return '🪞';
  if (n.includes('accesorio'))      return '🖼️';
  return '📦';
}

function showMsg(elementId, msg, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = msg;
  el.className = 'payment-msg ' + type;
  el.style.display = 'block';
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 3000);
}
function hideMsg(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

// ── NAV ──
document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('btn-go-store').addEventListener('click', async () => {
  await loadProducts();
  showPage('store');
});
document.getElementById('btn-go-admin').addEventListener('click', () => {
  loadAdminProducts();
  showPage('admin');
});
document.getElementById('btn-go-ventas').addEventListener('click', () => {
  loadVentas();
  showPage('ventas');
});

function setNavUser(name, rol) {
  document.getElementById('nav-username').textContent = name;
  document.getElementById('nav-user').style.display = 'flex';
  const adminOnly = (rol === 'admin') ? 'inline-block' : 'none';
  document.getElementById('btn-go-admin').style.display  = adminOnly;
  document.getElementById('btn-go-ventas').style.display = adminOnly;
}

function logout() {
  currentUser = null;
  cart = [];
  localStorage.removeItem('cl_session');
  document.getElementById('nav-user').style.display = 'none';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').style.display = 'none';
  showPage('login');
}

// ════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════
document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('login-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl    = document.getElementById('login-error');

  if (!username || !password) {
    errEl.textContent = 'Por favor ingresa usuario y contraseña.';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res  = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      errEl.textContent = data.message || 'Usuario o contraseña incorrectos.';
      errEl.style.display = 'block';
      return;
    }

    currentUser = { id: data.id, name: data.name, rol: data.rol };
    localStorage.setItem('cl_session', JSON.stringify(currentUser));
    errEl.style.display = 'none';
    setNavUser(data.name, data.rol);
    await loadProducts();
    showPage('store');

  } catch (err) {
    errEl.textContent = 'No se pudo conectar. Verifica que Node.js esté corriendo.';
    errEl.style.display = 'block';
    console.error('Login error:', err);
  }
}

// ════════════════════════════════════════════
// PRODUCTOS
// ════════════════════════════════════════════
let allProducts = [];

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '<div class="loading-products">Cargando productos...</div>';
  try {
    const res  = await fetch('/api/productos');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    allProducts = data.data;
    document.getElementById('search-bar').value = '';
    renderProducts(allProducts);
  } catch (err) {
    grid.innerHTML = `<div class="loading-products" style="color:var(--cl-error)">Error: ${err.message}</div>`;
  }
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';
  if (products.length === 0) {
    grid.innerHTML = '<div class="loading-products">No se encontraron productos.</div>';
    return;
  }
  products.forEach(p => {
    const enStock = p.disponible && parseInt(p.cantidad) > 0;
    const icon    = getIcon(p.nombre);
    const card    = document.createElement('div');
    card.className = 'product-card' + (enStock ? '' : ' unavailable');
    card.innerHTML = `
      <div class="product-icon">${icon}</div>
      <div class="product-name">${p.nombre}</div>
      <div class="product-price">$${fmtPrice(p.precio)} <span>USD</span></div>
      <span class="product-badge ${enStock ? 'badge-available' : 'badge-unavailable'}">
        ${enStock ? `Disponible (${p.cantidad})` : 'Sin stock'}
      </span>
      ${enStock
        ? `<button class="btn-add" data-id="${p.id}" data-name="${p.nombre}" data-price="${p.precio}" data-icon="${icon}">+ Agregar</button>`
        : ''}
    `;
    grid.appendChild(card);
  });
  grid.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.id, btn.dataset.name, parseFloat(btn.dataset.price), btn.dataset.icon);
    });
  });
}

document.getElementById('search-bar').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  renderProducts(q ? allProducts.filter(p => p.nombre.toLowerCase().includes(q)) : allProducts);
});

// ════════════════════════════════════════════
// CARRITO — agrupado por producto
// ════════════════════════════════════════════
function addToCart(id, name, price, icon) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id, name, price, icon, quantity: 1 });
  }
  renderCart();
}

function renderCart() {
  const el          = document.getElementById('cart-items');
  const totalEl     = document.getElementById('cart-total');
  const countEl     = document.getElementById('cart-count');
  const checkoutBtn = document.getElementById('btn-checkout');
  const totalItems  = cart.reduce((s, i) => s + i.quantity, 0);
  const total       = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  countEl.textContent  = totalItems;
  totalEl.textContent  = fmtPrice(total);
  checkoutBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    el.innerHTML = '<p class="cart-empty">Tu carrito está vacío</p>';
    return;
  }

  el.innerHTML = '';
  cart.forEach((item, idx) => {
    const d = document.createElement('div');
    d.className = 'cart-item';
    d.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-name">${item.icon} ${item.name}</span>
        <span class="cart-item-unit">$${fmtPrice(item.price)} c/u</span>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" data-idx="${idx}" data-action="minus">−</button>
        <span class="qty-num">${item.quantity}</span>
        <button class="qty-btn" data-idx="${idx}" data-action="plus">+</button>
      </div>
      <span class="cart-item-price">$${fmtPrice(item.price * item.quantity)}</span>
      <button class="cart-item-remove" data-idx="${idx}" title="Eliminar">×</button>
    `;
    el.appendChild(d);
  });

  el.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (btn.dataset.action === 'plus') {
        cart[idx].quantity += 1;
      } else {
        cart[idx].quantity -= 1;
        if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      }
      renderCart();
    });
  });

  el.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(parseInt(btn.dataset.idx), 1);
      renderCart();
    });
  });
}

document.getElementById('btn-checkout').addEventListener('click', () => {
  if (cart.length === 0) return;
  renderSummary();
  hideMsg('checkout-msg');
  showPage('checkout');
});

// ════════════════════════════════════════════
// CHECKOUT — entrega + metodo de pago (sin tarjeta)
// ════════════════════════════════════════════
document.getElementById('btn-back-store').addEventListener('click', () => showPage('store'));

function renderSummary() {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const el    = document.getElementById('summary-items');
  el.innerHTML = '';
  cart.forEach(item => {
    const d = document.createElement('div');
    d.className = 'summary-item';
    d.innerHTML = `
      <span class="item-name">${item.icon} ${item.name}${item.quantity > 1 ? ` <small>×${item.quantity}</small>` : ''}</span>
      <span class="item-price">$${fmtPrice(item.price * item.quantity)}</span>
    `;
    el.appendChild(d);
  });
  document.getElementById('summary-total').textContent = fmtPrice(total);
}

// Mostrar el campo de referencia solo si el metodo es transferencia
document.querySelectorAll('input[name="metodo-pago"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const group = document.getElementById('referencia-group');
    const selected = document.querySelector('input[name="metodo-pago"]:checked').value;
    group.style.display = (selected === 'transferencia') ? 'block' : 'none';
  });
});

document.getElementById('btn-confirm-sale').addEventListener('click', confirmSale);

async function confirmSale() {
  hideMsg('checkout-msg');

  const deliveryName    = document.getElementById('d-name').value.trim();
  const deliveryAddress = document.getElementById('d-address').value.trim();
  const deliveryCity    = document.getElementById('d-city').value.trim();
  const deliveryPhone   = document.getElementById('d-phone').value.trim();
  const deliveryNotes   = document.getElementById('d-notes').value.trim();
  const metodoPago      = document.querySelector('input[name="metodo-pago"]:checked').value;
  const referencia      = document.getElementById('p-referencia').value.trim();
  const total           = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  if (!deliveryName)    { showMsg('checkout-msg', 'Ingresa el nombre del destinatario.'); return; }
  if (!deliveryAddress) { showMsg('checkout-msg', 'Ingresa la dirección de entrega.'); return; }
  if (!deliveryCity)    { showMsg('checkout-msg', 'Ingresa la ciudad.'); return; }
  if (!deliveryPhone)   { showMsg('checkout-msg', 'Ingresa el teléfono de contacto.'); return; }

  const btn = document.getElementById('btn-confirm-sale');
  btn.disabled    = true;
  btn.textContent = 'Registrando...';

  try {
    const res  = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:     total,
        userId:     currentUser ? currentUser.id : null,
        metodoPago: metodoPago,
        referencia: referencia,
        items:      cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        delivery: {
          name:    deliveryName,
          address: deliveryAddress,
          city:    deliveryCity,
          phone:   deliveryPhone,
          notes:   deliveryNotes
        }
      })
    });
    const data = await res.json();

    if (!data.success) {
      showMsg('checkout-msg', data.message);
      return;
    }

    document.getElementById('success-order-num').textContent = '#' + data.orderNumber;
    buildSuccessDelivery({ name: deliveryName, address: deliveryAddress, city: deliveryCity, phone: deliveryPhone, notes: deliveryNotes });
    buildSuccessDetail(total);
    document.getElementById('btn-print-receipt').onclick = () => {
      window.open(`/api/ventas/${data.orderId}/pdf`, '_blank');
    };
    showPage('success');

  } catch (err) {
    showMsg('checkout-msg', 'Error de conexión con el servidor.');
    console.error('confirmSale error:', err);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Confirmar venta';
  }
}

function buildSuccessDelivery(d) {
  const el = document.getElementById('success-delivery');
  el.innerHTML = `
    <div class="delivery-summary-title">Datos de entrega</div>
    <div class="delivery-row"><span>Destinatario</span><b>${d.name}</b></div>
    <div class="delivery-row"><span>Dirección</span><b>${d.address}</b></div>
    <div class="delivery-row"><span>Ciudad</span><b>${d.city}</b></div>
    <div class="delivery-row"><span>Teléfono</span><b>${d.phone}</b></div>
    ${d.notes ? `<div class="delivery-row"><span>Notas</span><b>${d.notes}</b></div>` : ''}
  `;
}

function buildSuccessDetail(total) {
  const el = document.getElementById('success-detail');
  el.innerHTML = '';
  cart.forEach(item => {
    const r = document.createElement('div');
    r.className = 'detail-row';
    r.innerHTML = `<span>${item.icon} ${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}</span><span>$${fmtPrice(item.price * item.quantity)}</span>`;
    el.appendChild(r);
  });
  const tot = document.createElement('div');
  tot.className = 'detail-row';
  tot.style.cssText = 'border-top:2px solid var(--cl-warm);margin-top:4px;padding-top:8px;';
  tot.innerHTML = `<span><b>Total</b></span><span>$${fmtPrice(total)}</span>`;
  el.appendChild(tot);
}

document.getElementById('btn-new-order').addEventListener('click', async () => {
  cart = [];
  renderCart();
  ['d-name','d-address','d-city','d-phone','d-notes','p-referencia'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelector('input[name="metodo-pago"][value="efectivo"]').checked = true;
  document.getElementById('referencia-group').style.display = 'none';
  await loadProducts();
  showPage('store');
});

// ════════════════════════════════════════════
// VENTAS — panel para el admin
// ════════════════════════════════════════════
document.getElementById('btn-back-store-ventas').addEventListener('click', async () => {
  await loadProducts();
  showPage('store');
});

const METODO_LABELS = {
  efectivo: '💵 Efectivo',
  datafono: '💳 Datáfono',
  transferencia: '🏦 Transferencia'
};

async function loadVentas() {
  const container  = document.getElementById('ventas-list');
  const summaryBar = document.getElementById('ventas-summary');
  container.innerHTML = '<div class="loading-products">Cargando ventas...</div>';
  summaryBar.innerHTML = '';

  try {
    const res  = await fetch('/api/ventas');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    const ventas = data.data;
    const totalVendido = ventas.reduce((s, v) => s + parseFloat(v.total), 0);

    summaryBar.innerHTML = `
      <div><span class="vs-label">Ventas registradas</span><br><span class="vs-value">${ventas.length}</span></div>
      <div><span class="vs-label">Total vendido</span><br><span class="vs-value">$${fmtPrice(totalVendido)}</span></div>
    `;

    if (ventas.length === 0) {
      container.innerHTML = '<div class="ventas-empty">Todavía no se han registrado ventas.</div>';
      return;
    }

    container.innerHTML = '';
    ventas.forEach(v => {
      const fecha = new Date(v.fecha_pedido).toLocaleString('es-CO', {
        day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
      });
      const metodoLabel = METODO_LABELS[v.metodo_pago] || v.metodo_pago;

      const card = document.createElement('div');
      card.className = 'venta-card';
      card.innerHTML = `
        <div class="venta-header">
          <div>
            <div class="venta-order-num">#${v.numero_pedido}</div>
            <div class="venta-date">${fecha}</div>
          </div>
          <div class="venta-header-right">
            <div class="venta-badges">
              <span class="venta-badge badge-vendedor">Vendido por ${v.vendedor_nombre || 'usuario eliminado'}</span>
              <span class="venta-badge badge-metodo">${metodoLabel}</span>
            </div>
            <button class="btn-print-venta" data-id="${v.id}">🖨️ Imprimir</button>
          </div>
        </div>
        <div class="venta-delivery">
          <div class="delivery-row"><span>Cliente</span><b>${v.nombre_destinatario}</b></div>
          <div class="delivery-row"><span>Dirección</span><b>${v.direccion}, ${v.ciudad}</b></div>
          <div class="delivery-row"><span>Teléfono</span><b>${v.telefono}</b></div>
          ${v.referencia_pago ? `<div class="delivery-row"><span>Referencia</span><b>${v.referencia_pago}</b></div>` : ''}
          ${v.notas ? `<div class="delivery-row"><span>Notas</span><b>${v.notas}</b></div>` : ''}
        </div>
        <div class="venta-items">
          ${v.items.map(it => `
            <div class="venta-item-row">
              <span>${getIcon(it.nombre_producto)} ${it.nombre_producto} ×${it.cantidad}</span>
              <span>$${fmtPrice(it.precio_unitario * it.cantidad)}</span>
            </div>
          `).join('')}
        </div>
        <div class="venta-total-row"><span>Total</span><span>$${fmtPrice(v.total)}</span></div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-print-venta').forEach(btn => {
      btn.addEventListener('click', () => {
        window.open(`/api/ventas/${btn.dataset.id}/pdf`, '_blank');
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="ventas-empty" style="color:var(--cl-error)">Error: ${err.message}</div>`;
  }
}

// ════════════════════════════════════════════
// ADMIN — CRUD completo de productos
// ════════════════════════════════════════════
document.getElementById('btn-back-store-admin').addEventListener('click', async () => {
  await loadProducts();
  showPage('store');
});

async function loadAdminProducts() {
  const tbody = document.getElementById('admin-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading-products">Cargando...</td></tr>';
  try {
    const res  = await fetch('/api/productos');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    tbody.innerHTML = '';
    data.data.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-name">${getIcon(p.nombre)} <input type="text" class="admin-input-full" value="${p.nombre}" data-field="nombre"></td>
        <td><input type="number" class="admin-input" value="${p.precio}" min="0" step="0.01" data-field="precio"></td>
        <td><input type="number" class="admin-input" value="${p.cantidad}" min="0" step="1" data-field="cantidad"></td>
        <td class="td-center">
          <label class="toggle">
            <input type="checkbox" ${p.disponible ? 'checked' : ''} data-field="disponible">
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <div class="admin-actions">
            <button class="btn-save-row" data-id="${p.id}">Guardar</button>
            <button class="btn-delete-row" data-id="${p.id}">Eliminar</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-save-row').forEach(btn => {
      btn.addEventListener('click', () => saveProduct(btn.dataset.id, btn));
    });
    tbody.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteProduct(btn));
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--cl-error);padding:1rem">Error: ${err.message}</td></tr>`;
  }
}

async function saveProduct(id, btn) {
  const row        = btn.closest('tr');
  const nombre     = row.querySelector('[data-field="nombre"]').value.trim();
  const precio     = row.querySelector('[data-field="precio"]').value;
  const cantidad   = row.querySelector('[data-field="cantidad"]').value;
  const disponible = row.querySelector('[data-field="disponible"]').checked;

  if (!nombre) {
    const original = btn.textContent;
    btn.textContent = 'Falta el nombre';
    btn.style.background = 'var(--cl-error)';
    setTimeout(() => { btn.textContent = original; btn.style.background = ''; }, 2000);
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    const res  = await fetch(`/api/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precio, cantidad, disponible })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    btn.textContent      = 'Guardado';
    btn.style.background = '#2d6a4f';
    setTimeout(() => {
      btn.textContent      = 'Guardar';
      btn.style.background = '';
      btn.disabled          = false;
    }, 2000);

  } catch (err) {
    btn.textContent      = err.message || 'Error';
    btn.style.background = 'var(--cl-error)';
    setTimeout(() => {
      btn.textContent      = 'Guardar';
      btn.style.background = '';
      btn.disabled          = false;
    }, 2500);
  }
}

function confirmDeleteProduct(btn) {
  if (btn.dataset.confirming === 'true') {
    deleteProduct(btn.dataset.id, btn);
    return;
  }
  btn.dataset.confirming = 'true';
  btn.dataset.original   = btn.textContent;
  btn.textContent        = '¿Confirmar?';
  btn.classList.add('confirming');

  setTimeout(() => {
    if (btn.dataset.confirming === 'true') {
      btn.dataset.confirming = 'false';
      btn.textContent        = btn.dataset.original;
      btn.classList.remove('confirming');
    }
  }, 3000);
}

async function deleteProduct(id, btn) {
  btn.disabled    = true;
  btn.textContent = 'Eliminando...';
  try {
    const res  = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    btn.closest('tr').remove();
  } catch (err) {
    btn.textContent        = 'Error';
    btn.dataset.confirming = 'false';
    btn.classList.remove('confirming');
    setTimeout(() => {
      btn.textContent = 'Eliminar';
      btn.disabled    = false;
    }, 2000);
  }
}

document.getElementById('btn-add-product').addEventListener('click', addNewProduct);

async function addNewProduct() {
  const nombre     = document.getElementById('new-name').value.trim();
  const precio     = document.getElementById('new-price').value;
  const cantidad   = document.getElementById('new-stock').value;
  const disponible = document.getElementById('new-disponible').checked;

  if (!nombre)                                   { showMsg('add-product-msg', 'El nombre es obligatorio.'); return; }
  if (!precio || parseFloat(precio) < 0)         { showMsg('add-product-msg', 'Ingresa un precio válido.'); return; }
  if (cantidad === '' || parseInt(cantidad) < 0) { showMsg('add-product-msg', 'Ingresa una cantidad válida.'); return; }

  const btn = document.getElementById('btn-add-product');
  btn.disabled    = true;
  btn.textContent = 'Agregando...';

  try {
    const res  = await fetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precio: parseFloat(precio), cantidad: parseInt(cantidad), disponible })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    showMsg('add-product-msg', 'Producto agregado correctamente.', 'success');
    document.getElementById('new-name').value  = '';
    document.getElementById('new-price').value = '';
    document.getElementById('new-stock').value = '';
    document.getElementById('new-disponible').checked = true;

    loadAdminProducts();

  } catch (err) {
    showMsg('add-product-msg', err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = '+ Agregar producto';
  }
}

// ════════════════════════════════════════════
// INIT — restaurar sesión al recargar la página
// ════════════════════════════════════════════
(async () => {
  renderCart();
  const saved = localStorage.getItem('cl_session');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      currentUser = user;
      setNavUser(user.name, user.rol);
      await loadProducts();
      showPage('store');
    } catch (e) {
      localStorage.removeItem('cl_session');
    }
  }
})();

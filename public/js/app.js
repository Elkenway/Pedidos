/* ============================================
   CASTANO LIVING | app.js
   v3.1 — Sesión persistente, refresh admin,
           carrito agrupado, búsqueda, roles
   ============================================ */

let currentUser = null;
let cart = [];

// ── Utilidades ──
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id + '-page').classList.add('active');
}
function fmtPrice(n) { return Number(n).toLocaleString('es-CO'); }
function maskCard(num) { return '**** **** **** ' + num.slice(-4); }

function getIcon(nombre) {
  const n = nombre.toLowerCase();
  if (n.includes('silla'))          return '🪑';
  if (n.includes('comedor'))        return '🍽️';
  if (n.includes('mesa de centro')) return '☕';
  if (n.includes('mesa de jardín')) return '🌿';
  if (n.includes('mesa alta'))      return '🍺';
  if (n.includes('mesa'))           return '🪵';
  if (n.includes('cama'))           return '🛏️';
  if (n.includes('sofacama'))       return '🛌';
  if (n.includes('sofá'))           return '🛋️';
  if (n.includes('esquinero'))      return '🪞';
  if (n.includes('accesorio'))      return '🖼️';
  return '📦';
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

function setNavUser(name, rol) {
  document.getElementById('nav-username').textContent = name;
  document.getElementById('nav-user').style.display = 'flex';
  document.getElementById('btn-go-admin').style.display = (rol === 'admin') ? 'inline-block' : 'none';
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
//  LOGIN
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
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      errEl.textContent = data.message || 'Usuario o contraseña incorrectos.';
      errEl.style.display = 'block';
      return;
    }

    currentUser = { id: data.id, name: data.name, rol: data.rol };

    // Guardar sesión para que persista al recargar
    localStorage.setItem('cl_session', JSON.stringify(currentUser));

    errEl.style.display = 'none';
    setNavUser(data.name, data.rol);
    await loadProducts();
    await loadDemoCards();
    showPage('store');

  } catch (err) {
    errEl.textContent = 'No se pudo conectar. Verifica que Node.js esté corriendo.';
    errEl.style.display = 'block';
    console.error('Login error:', err);
  }
}

// ════════════════════════════════════════════
//  PRODUCTOS
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
    const icon = getIcon(p.nombre);
    const card = document.createElement('div');
    card.className = 'product-card' + (p.disponible ? '' : ' unavailable');
    card.innerHTML = `
      <div class="product-icon">${icon}</div>
      <div class="product-name">${p.nombre}</div>
      <div class="product-price">$${fmtPrice(p.precio)} <span>USD</span></div>
      <span class="product-badge ${p.disponible ? 'badge-available' : 'badge-unavailable'}">
        ${p.disponible ? `Disponible (${p.cantidad})` : 'Sin stock'}
      </span>
      ${p.disponible
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

// ── BÚSQUEDA ──
document.getElementById('search-bar').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  renderProducts(q ? allProducts.filter(p => p.nombre.toLowerCase().includes(q)) : allProducts);
});

// ════════════════════════════════════════════
//  CARRITO — agrupado por producto
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

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const total      = cart.reduce((s, i) => s + i.price * i.quantity, 0);

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
  showPage('payment');
});

// ════════════════════════════════════════════
//  TARJETAS DE PRUEBA — desde la BD
// ════════════════════════════════════════════
async function loadDemoCards() {
  const container = document.getElementById('demo-cards-list');
  container.innerHTML = '<div class="loading-products">Cargando...</div>';

  try {
    const res  = await fetch('/api/tarjetas');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    container.innerHTML = '';
    data.data.forEach(t => {
      const saldo = parseFloat(t.cantidad_disponible);
      const label = saldo < 100 ? 'Sin fondos ✗' : 'Válida ✓';
      const row   = document.createElement('div');
      row.className = 'demo-card-row';
      row.innerHTML = `
        <span class="dl">${t.nombre_titular}</span>
        <span class="dv"
          data-holder="${t.nombre_titular}"
          data-num="${t.numero_tarjeta}"
          data-exp="${t.fecha_vencimiento}"
          data-cvv="${t.codigo_seguridad}">
          ${maskCard(t.numero_tarjeta)} <small style="color:var(--cl-mid)">${label}</small>
        </span>
      `;
      container.appendChild(row);
    });

    container.querySelectorAll('.dv').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('p-holder').value = el.dataset.holder;
        document.getElementById('p-number').value = el.dataset.num.replace(/(.{4})/g, '$1 ').trim();
        document.getElementById('p-exp').value    = el.dataset.exp;
        document.getElementById('p-cvv').value    = el.dataset.cvv;
        updateCardVisual();
        validateCardNum(); validateExp(); validateCvv();
      });
    });

  } catch (err) {
    container.innerHTML = '<div style="color:var(--cl-error);font-size:12px">Error al cargar tarjetas.</div>';
  }
}

// ════════════════════════════════════════════
//  PAGO
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

function updateCardVisual() {
  const holder = document.getElementById('p-holder').value || 'NOMBRE TITULAR';
  const num    = document.getElementById('p-number').value || '•••• •••• •••• ••••';
  const exp    = document.getElementById('p-exp').value    || 'MM/AA';
  document.getElementById('card-holder-display').textContent = holder.toUpperCase().slice(0, 22);
  document.getElementById('card-display').textContent        = num;
  document.getElementById('card-exp-display').textContent    = exp;
}

document.getElementById('p-holder').addEventListener('input', updateCardVisual);
document.getElementById('p-number').addEventListener('input', function () { formatCardNum(this); updateCardVisual(); });
document.getElementById('p-exp').addEventListener('input',    function () { formatExpDate(this); updateCardVisual(); });
document.getElementById('p-cvv').addEventListener('input',    function () { formatCvv(this); });

function formatCardNum(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 16) v = v.slice(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
  validateCardNum();
}
function formatExpDate(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 4) v = v.slice(0, 4);
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  input.value = v;
  validateExp();
}
function formatCvv(input) {
  input.value = input.value.replace(/\D/g, '').slice(0, 3);
  validateCvv();
}

function luhn(n) {
  let s = 0, even = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i], 10);
    if (even) { d *= 2; if (d > 9) d -= 9; }
    s += d; even = !even;
  }
  return s % 10 === 0;
}

function setField(inputId, iconId, helpId, valid, msg) {
  document.getElementById(inputId).className = valid ? 'valid' : 'invalid';
  const icon = document.getElementById(iconId);
  icon.textContent = valid ? '✓' : '✗';
  icon.className = 'field-icon show ' + (valid ? 'valid-icon' : 'invalid-icon');
  if (helpId) { const h = document.getElementById(helpId); h.textContent = msg || ''; h.className = 'field-help' + (valid ? '' : ' error'); }
}
function clearField(inputId, iconId, helpId) {
  document.getElementById(inputId).className = '';
  document.getElementById(iconId).className  = 'field-icon';
  if (helpId) { const h = document.getElementById(helpId); h.textContent = ''; h.className = 'field-help'; }
}

function validateCardNum() {
  const raw = document.getElementById('p-number').value.replace(/\s/g, '');
  if (!raw) { clearField('p-number','icon-number','help-number'); return false; }
  if (raw.length < 16) { setField('p-number','icon-number','help-number', false, 'El número debe tener 16 dígitos'); return false; }
  if (!luhn(raw))      { setField('p-number','icon-number','help-number', false, 'Número de tarjeta inválido'); return false; }
  setField('p-number','icon-number','help-number', true, ''); return true;
}
function validateExp() {
  const v = document.getElementById('p-exp').value;
  if (!v || v.length < 5) { clearField('p-exp','icon-exp','help-exp'); return false; }
  const [m, y] = v.split('/').map(Number);
  const now = new Date(), cm = now.getMonth() + 1, cy = now.getFullYear() % 100;
  if (!m || !y || m < 1 || m > 12) { setField('p-exp','icon-exp','help-exp', false, 'Mes inválido (01–12)'); return false; }
  if (y < cy || (y === cy && m < cm)) { setField('p-exp','icon-exp','help-exp', false, 'Tarjeta vencida'); return false; }
  setField('p-exp','icon-exp','help-exp', true, ''); return true;
}
function validateCvv() {
  const v = document.getElementById('p-cvv').value;
  if (!v) { clearField('p-cvv','icon-cvv','help-cvv'); return false; }
  if (v.length < 3) { setField('p-cvv','icon-cvv','help-cvv', false, 'CVV debe tener 3 dígitos'); return false; }
  setField('p-cvv','icon-cvv','help-cvv', true, ''); return true;
}

document.getElementById('btn-pay').addEventListener('click', processPayment);

async function processPayment() {
  const holder = document.getElementById('p-holder').value.trim();
  const numRaw = document.getElementById('p-number').value.replace(/\s/g, '');
  const exp    = document.getElementById('p-exp').value;
  const cvv    = document.getElementById('p-cvv').value;
  const total  = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  if (!holder)            { alert('Por favor ingresa el nombre del titular.'); return; }
  if (!validateCardNum()) { alert('Número de tarjeta inválido.'); return; }
  if (!validateExp())     { alert('Fecha de vencimiento inválida o tarjeta vencida.'); return; }
  if (!validateCvv())     { alert('Código CVV inválido.'); return; }

  document.getElementById('btn-pay').disabled    = true;
  document.getElementById('btn-pay').textContent = 'Procesando...';

  try {
    const res  = await fetch('/api/pago', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        cardHolder:     holder,
        cardNumber:     numRaw,
        expirationDate: exp,
        securityCode:   cvv,
        amount:         total,
        items:          cart.map(i => ({ id: i.id, quantity: i.quantity }))
      })
    });
    const data = await res.json();

    if (!data.success) { alert('❌ ' + data.message); return; }

    document.getElementById('success-order-num').textContent = '#' + data.orderNumber;
    buildSuccessDetail(total);
    showPage('success');

  } catch (err) {
    alert('Error de conexión con el servidor.');
    console.error('processPayment error:', err);
  } finally {
    document.getElementById('btn-pay').disabled    = false;
    document.getElementById('btn-pay').textContent = 'Pagar ahora';
  }
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
  tot.innerHTML = `<span><b>Total pagado</b></span><span>$${fmtPrice(total)}</span>`;
  el.appendChild(tot);
}

document.getElementById('btn-new-order').addEventListener('click', async () => {
  cart = [];
  renderCart();
  ['p-holder','p-number','p-exp','p-cvv'].forEach(id => document.getElementById(id).value = '');
  ['number','exp','cvv'].forEach(f => clearField('p-' + f, 'icon-' + f, 'help-' + f));
  updateCardVisual();
  await loadProducts();
  showPage('store');
});

// ════════════════════════════════════════════
//  ADMIN — gestión de productos
// ════════════════════════════════════════════

// Al volver desde admin recarga los productos con los cambios aplicados
document.getElementById('btn-back-store-admin').addEventListener('click', async () => {
  await loadProducts();
  showPage('store');
});

async function loadAdminProducts() {
  const tbody = document.getElementById('admin-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading-products">Cargando productos...</td></tr>';

  try {
    const res  = await fetch('/api/productos');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    tbody.innerHTML = '';
    data.data.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-name">${getIcon(p.nombre)} ${p.nombre}</td>
        <td><input type="number" class="admin-input" value="${p.precio}" min="0" step="0.01" data-field="precio"></td>
        <td><input type="number" class="admin-input" value="${p.cantidad}" min="0" step="1" data-field="cantidad"></td>
        <td class="td-center">
          <label class="toggle">
            <input type="checkbox" ${p.disponible ? 'checked' : ''} data-field="disponible">
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td><button class="btn-save-row" data-id="${p.id}">Guardar</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-save-row').forEach(btn => {
      btn.addEventListener('click', () => saveProduct(btn.dataset.id, btn));
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--cl-error);padding:1rem">Error: ${err.message}</td></tr>`;
  }
}

async function saveProduct(id, btn) {
  const row        = btn.closest('tr');
  const precio     = row.querySelector('[data-field="precio"]').value;
  const cantidad   = row.querySelector('[data-field="cantidad"]').value;
  const disponible = row.querySelector('[data-field="disponible"]').checked;

  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    const res  = await fetch(`/api/productos/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ precio, cantidad, disponible })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    btn.textContent       = '✓ Guardado';
    btn.style.background  = '#2d6a4f';
    btn.style.borderColor = '#2d6a4f';
    setTimeout(() => {
      btn.textContent       = 'Guardar';
      btn.style.background  = '';
      btn.style.borderColor = '';
      btn.disabled          = false;
    }, 2000);

  } catch (err) {
    btn.textContent      = 'Error';
    btn.style.background = 'var(--cl-error)';
    setTimeout(() => {
      btn.textContent      = 'Guardar';
      btn.style.background = '';
      btn.disabled         = false;
    }, 2000);
  }
}

// ════════════════════════════════════════════
//  INIT — restaurar sesión al recargar página
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
      await loadDemoCards();
      showPage('store');
    } catch (e) {
      localStorage.removeItem('cl_session');
    }
  }
})();

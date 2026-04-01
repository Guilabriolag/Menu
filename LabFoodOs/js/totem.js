/* ========================================
   LABFOOD OS — totem.js
   Interface pública: cardápio + carrinho + checkout
   ======================================== */

const totem = {
  activeCat: 'Todos',
  cartOpen: false,

  /* ── HTML BUILDER ─────────────── */
  buildHTML() {
    const setup = STATE.setup;
    const prods = STATE.prods.filter(p => p.active);
    const cats  = ['Todos', ...new Set(prods.map(p => p.cat))];

    if (!setup.storeOpen) {
      return `<div class="totem-wrap"><div class="totem-closed">🔒 Estabelecimento fechado no momento</div></div>`;
    }

    return `
      <div class="totem-wrap">
        <div class="totem-hero">
          <h2>${setup.storeName || 'LabFood OS'}</h2>
          <p>Escolha seus itens e finalize o pedido</p>
        </div>

        <div class="cat-tabs" id="cat-tabs">
          ${cats.map(c => `
            <button class="cat-tab ${c === this.activeCat ? 'active' : ''}"
              onclick="totem.setCategory('${c}')">${c}</button>
          `).join('')}
        </div>

        <div class="prod-grid" id="prod-grid">
          ${this._renderProds(prods)}
        </div>
      </div>

      <div id="cart-overlay" style="display:none">
        ${this._cartHTML()}
      </div>`;
  },

  _renderProds(prodsAll) {
    const prods = this.activeCat === 'Todos'
      ? prodsAll
      : prodsAll.filter(p => p.cat === this.activeCat);

    if (!prods.length) return `<p style="color:var(--dim);padding:24px 0">Nenhum item nesta categoria.</p>`;

    return prods.map(p => `
      <div class="prod-card" onclick="totem.addToCart('${p.id}')">
        <div class="prod-card-img">${p.emoji || '🍽️'}</div>
        <div class="prod-card-body">
          <div class="prod-card-name">${p.name}</div>
          <div class="prod-card-desc">${p.desc || ''}</div>
          <div class="prod-card-footer">
            <span class="prod-price">${app.fmt(p.price)}</span>
            <button class="prod-add">+</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  _cartHTML() {
    const items = STATE.cart;
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    const itemsHTML = items.length === 0
      ? `<div class="cart-empty">🛒<br>Seu carrinho está vazio</div>`
      : items.map(i => `
          <div class="cart-item">
            <span style="font-size:18px">${i.emoji}</span>
            <span class="cart-item-name">${i.name}</span>
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="totem.changeQty('${i.id}', -1)">−</button>
              <span>${i.qty}</span>
              <button class="qty-btn" onclick="totem.changeQty('${i.id}', 1)">+</button>
            </div>
            <span class="cart-item-price">${app.fmt(i.price * i.qty)}</span>
          </div>
        `).join('');

    return `
      <div class="cart-overlay" onclick="if(event.target===this) totem.toggleCart()">
        <div class="cart-panel">
          <div class="cart-header">
            <h3>🛒 Carrinho</h3>
            <button class="cart-close" onclick="totem.toggleCart()">✕</button>
          </div>
          <div class="cart-items">${itemsHTML}</div>
          ${items.length > 0 ? `
            <div class="cart-footer">
              <div class="cart-total">
                <span>Total</span>
                <span>${app.fmt(total)}</span>
              </div>
              <div class="checkout-form">
                <h3>📋 Dados do pedido</h3>
                <div class="form-group">
                  <label>Nome / Mesa</label>
                  <input class="input" id="co-name" placeholder="ex: João / Mesa 5">
                </div>
                <div class="form-group">
                  <label>Observação (opcional)</label>
                  <input class="input" id="co-note" placeholder="ex: sem cebola">
                </div>
                <button class="btn btn-primary" style="width:100%" onclick="totem.checkout()">
                  Confirmar Pedido →
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>`;
  },

  /* ── INIT ─────────────────────── */
  init() {
    this._updateFab();
  },

  /* ── ACTIONS ──────────────────── */
  setCategory(cat) {
    this.activeCat = cat;
    const prods = STATE.prods.filter(p => p.active);

    // Update tabs
    document.querySelectorAll('.cat-tab').forEach(el => {
      el.classList.toggle('active', el.textContent === cat);
    });

    // Re-render grid
    const grid = document.getElementById('prod-grid');
    if (grid) grid.innerHTML = this._renderProds(prods);
  },

  addToCart(prodId) {
    const prod = STATE.prods.find(p => p.id === prodId);
    if (!prod) return;

    const existing = STATE.cart.find(i => i.id === prodId);
    if (existing) {
      existing.qty++;
    } else {
      STATE.cart.push({ ...prod, qty: 1 });
    }

    this._updateFab();
    app.toast(`+ ${prod.name}`);
  },

  changeQty(prodId, delta) {
    const idx = STATE.cart.findIndex(i => i.id === prodId);
    if (idx === -1) return;
    STATE.cart[idx].qty += delta;
    if (STATE.cart[idx].qty <= 0) STATE.cart.splice(idx, 1);
    this._updateCart();
    this._updateFab();
  },

  toggleCart() {
    this.cartOpen = !this.cartOpen;
    const overlay = document.getElementById('cart-overlay');
    if (!overlay) return;

    if (this.cartOpen) {
      overlay.innerHTML = this._cartHTML();
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  },

  _updateCart() {
    const overlay = document.getElementById('cart-overlay');
    if (overlay && this.cartOpen) {
      overlay.innerHTML = this._cartHTML();
      overlay.style.display = 'flex';
    }
  },

  _updateFab() {
    const total = STATE.cart.reduce((s, i) => s + i.qty, 0);
    const cnt   = document.getElementById('cartCount');
    if (cnt) cnt.textContent = total;
  },

  checkout() {
    if (!STATE.cart.length) { app.toast('Carrinho vazio', 'red'); return; }

    const name = document.getElementById('co-name')?.value.trim() || 'Balcão';
    const note = document.getElementById('co-note')?.value.trim() || '';
    const total = STATE.cart.reduce((s, i) => s + i.price * i.qty, 0);

    const order = STATE.newOrder([...STATE.cart], total, name, note);
    STATE.cart = [];

    this.toggleCart();
    this._updateFab();
    app.toast(`✅ Pedido ${order.id} recebido!`, 'green');
  },
};

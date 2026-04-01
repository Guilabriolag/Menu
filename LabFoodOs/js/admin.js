/* ========================================
   LABFOOD OS — admin.js
   Painel administrativo completo:
   Dashboard | Pedidos | Produtos | Keys | Config
   ======================================== */

const admin = {
  tab: 'dash',

  /* ── SHELL ────────────────────── */
  buildHTML() {
    const role = STATE.user?.role;
    const tabs = [
      { id: 'dash',   icon: '📊', label: 'Dashboard',  roles: ['A','C'] },
      { id: 'orders', icon: '📋', label: 'Pedidos',     roles: ['A','C'] },
      { id: 'prods',  icon: '🍔', label: 'Produtos',    roles: ['A'] },
      { id: 'keys',   icon: '🔑', label: 'Acessos',     roles: ['A'] },
      { id: 'conf',   icon: '⚙️', label: 'Config',      roles: ['A'] },
    ].filter(t => t.roles.includes(role));

    return `
      <div class="admin-layout">
        <nav class="sidebar">
          <div class="sidebar-logo">LABFOOD<br>ADMIN</div>
          ${tabs.map(t => `
            <button class="nav-btn ${t.id === this.tab ? 'active' : ''}"
              onclick="admin.setTab('${t.id}')">
              <span>${t.icon}</span>
              <span>${t.label}</span>
            </button>
          `).join('')}
          <div class="sidebar-spacer"></div>
          <button class="nav-btn" onclick="app.render('totem')">
            <span>👁️</span><span>Ver Totem</span>
          </button>
        </nav>
        <div class="admin-content" id="admin-content"></div>
      </div>`;
  },

  init() {
    this.setTab(this.tab);
  },

  setTab(id) {
    this.tab = id;
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${id}'`));
    });
    const content = document.getElementById('admin-content');
    if (!content) return;

    const map = {
      dash:   () => this._tabDash(),
      orders: () => this._tabOrders(),
      prods:  () => this._tabProds(),
      keys:   () => this._tabKeys(),
      conf:   () => this._tabConf(),
    };
    content.innerHTML = (map[id] || (() => '<div class="tab-panel"><h2>Em breve</h2></div>'))();
  },

  /* ════════════════════════════════
     TAB: DASHBOARD
     ════════════════════════════════ */
  _tabDash() {
    const orders = STATE.todayOrders();
    const rev    = STATE.todayRevenue();
    const novos  = orders.filter(o => o.status === 'novo').length;
    const prontos = orders.filter(o => o.status === 'pronto').length;

    const lastOrders = STATE.orders.slice(0, 8);

    return `
      <div class="tab-panel">
        <h2>Dashboard</h2>
        <p class="tab-subtitle">Resumo do dia — atualizado em tempo real</p>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Receita Hoje</div>
            <div class="stat-val gold">${app.fmt(rev)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pedidos Hoje</div>
            <div class="stat-val">${orders.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Aguardando</div>
            <div class="stat-val cyan">${novos}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Prontos</div>
            <div class="stat-val green">${prontos}</div>
          </div>
        </div>

        <h3 style="font-family:var(--font-head);font-size:15px;margin-bottom:12px">Últimos Pedidos</h3>
        <div class="orders-wrap">
          <div class="order-row" style="color:var(--dim);font-size:11px;letter-spacing:.5px;text-transform:uppercase">
            <span>ID</span><span>Itens</span><span>Valor</span><span>Hora</span><span>Status</span>
          </div>
          ${lastOrders.length === 0
            ? `<p style="color:var(--dim);padding:20px 0;font-size:13px">Nenhum pedido ainda.</p>`
            : lastOrders.map(o => this._orderRow(o)).join('')
          }
        </div>
      </div>`;
  },

  _orderRow(o) {
    const statusMap = {
      novo:      '<span class="badge badge-cyan">novo</span>',
      preparo:   '<span class="badge badge-gold">preparo</span>',
      pronto:    '<span class="badge badge-green">pronto</span>',
      entregue:  '<span class="badge badge-dim">entregue</span>',
    };
    const itensStr = o.items.map(i => `${i.qty}x ${i.name}`).join(', ').slice(0, 45);

    return `
      <div class="order-row">
        <span class="order-id">${o.id}</span>
        <span class="order-items">${itensStr}${o.name ? ` · <em style="color:var(--dim)">${o.name}</em>` : ''}</span>
        <span class="order-val">${app.fmt(o.total)}</span>
        <span style="color:var(--dim)">${app.fmtDate(o.ts)}</span>
        <span>${statusMap[o.status] || o.status}</span>
      </div>`;
  },

  /* ════════════════════════════════
     TAB: PEDIDOS
     ════════════════════════════════ */
  _tabOrders() {
    const orders = STATE.orders.slice(0, 50);
    const filters = ['Todos', 'novo', 'preparo', 'pronto', 'entregue'];

    return `
      <div class="tab-panel">
        <h2>Pedidos</h2>
        <p class="tab-subtitle">Gerencie e atualize o status dos pedidos</p>

        <div class="cat-tabs" style="margin-bottom:20px">
          ${filters.map(f => `
            <button class="cat-tab ${f === 'Todos' ? 'active' : ''}"
              onclick="admin.filterOrders('${f}', this)">${f}</button>
          `).join('')}
        </div>

        <div id="orders-list">
          ${orders.length === 0
            ? `<p style="color:var(--dim);padding:20px 0;font-size:13px">Nenhum pedido registrado.</p>`
            : orders.map(o => this._orderCard(o)).join('')
          }
        </div>
      </div>`;
  },

  _orderCard(o) {
    const next = { novo: 'preparo', preparo: 'pronto', pronto: 'entregue' };
    const nextLabel = { novo: '→ Em Preparo', preparo: '→ Pronto', pronto: '→ Entregue' };
    const statusColors = { novo: 'cyan', preparo: 'gold', pronto: 'green', entregue: 'dim' };

    return `
      <div class="card" style="margin-bottom:10px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start" id="ord-${o.id}">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <strong style="font-family:var(--font-head)">${o.id}</strong>
            <span class="badge badge-${statusColors[o.status] || 'dim'}">${o.status}</span>
            <span style="color:var(--dim);font-size:11px">${app.fmtDate(o.ts)}</span>
          </div>
          <div style="font-size:12px;color:var(--dim);margin-bottom:4px">
            ${o.items.map(i => `${i.qty}× ${i.name}`).join(' · ')}
          </div>
          ${o.name ? `<div style="font-size:12px;color:var(--cyan)">👤 ${o.name}</div>` : ''}
          ${o.note ? `<div style="font-size:12px;color:var(--gold);margin-top:2px">📝 ${o.note}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <strong style="color:var(--gold)">${app.fmt(o.total)}</strong>
          ${next[o.status] ? `
            <button class="btn btn-primary btn-sm"
              onclick="admin.advanceOrder('${o.id}', '${next[o.status]}')">
              ${nextLabel[o.status]}
            </button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="admin.deleteOrder('${o.id}')">🗑</button>
        </div>
      </div>`;
  },

  filterOrders(status, btn) {
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const orders = status === 'Todos'
      ? STATE.orders.slice(0, 50)
      : STATE.orders.filter(o => o.status === status).slice(0, 50);

    const list = document.getElementById('orders-list');
    if (list) list.innerHTML = orders.map(o => this._orderCard(o)).join('') || `<p style="color:var(--dim);padding:20px 0">Nenhum pedido.</p>`;
  },

  advanceOrder(id, status) {
    STATE.updateOrderStatus(id, status);
    this.setTab('orders');
    app.toast(`Pedido ${id} → ${status}`, 'green');
  },

  deleteOrder(id) {
    if (!confirm(`Remover pedido ${id}?`)) return;
    STATE.orders = STATE.orders.filter(o => o.id !== id);
    this.setTab('orders');
  },

  /* ════════════════════════════════
     TAB: PRODUTOS
     ════════════════════════════════ */
  _tabProds() {
    const prods = STATE.prods;

    return `
      <div class="tab-panel">
        <h2>Produtos</h2>
        <p class="tab-subtitle">Gerencie o cardápio do estabelecimento</p>

        <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
          <button class="btn btn-primary" onclick="admin.openProdModal()">+ Novo Produto</button>
        </div>

        <div class="prods-wrap">
          <div class="prod-row" style="color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.5px">
            <span></span><span>Nome</span><span>Categoria</span><span>Preço</span><span>Status</span><span>Ações</span>
          </div>
          ${prods.map(p => `
            <div class="prod-row">
              <span class="prod-emoji">${p.emoji || '🍽️'}</span>
              <span class="prod-row-name">${p.name}</span>
              <span class="prod-row-cat" style="color:var(--dim)">${p.cat}</span>
              <span style="color:var(--gold)">${app.fmt(p.price)}</span>
              <span>
                <button class="toggle ${p.active ? 'on' : ''}"
                  onclick="admin.toggleProd('${p.id}')"></button>
              </span>
              <span style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-icon btn-sm" onclick="admin.openProdModal('${p.id}')">✏️</button>
                <button class="btn btn-danger btn-icon btn-sm" onclick="admin.deleteProd('${p.id}')">🗑</button>
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <div id="prod-modal"></div>`;
  },

  openProdModal(id) {
    const prod = id ? STATE.prods.find(p => p.id === id) : null;

    document.getElementById('prod-modal').innerHTML = `
      <div class="modal-bg" onclick="if(event.target===this) admin.closeProdModal()">
        <div class="modal">
          <h3>${prod ? 'Editar Produto' : 'Novo Produto'}</h3>
          <div class="form-group">
            <label>Emoji</label>
            <input class="input" id="pm-emoji" value="${prod?.emoji || ''}" placeholder="🍔" style="width:80px">
          </div>
          <div class="form-group">
            <label>Nome</label>
            <input class="input" id="pm-name" value="${prod?.name || ''}" placeholder="Nome do produto">
          </div>
          <div class="form-group">
            <label>Descrição</label>
            <input class="input" id="pm-desc" value="${prod?.desc || ''}" placeholder="Breve descrição">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Categoria</label>
              <input class="input" id="pm-cat" value="${prod?.cat || ''}" placeholder="ex: Lanches">
            </div>
            <div class="form-group">
              <label>Preço (R$)</label>
              <input class="input" id="pm-price" type="number" value="${prod?.price || ''}" placeholder="0.00" step="0.01">
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" onclick="admin.closeProdModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="admin.saveProd('${id || ''}')">
              ${prod ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </div>`;
  },

  closeProdModal() {
    const el = document.getElementById('prod-modal');
    if (el) el.innerHTML = '';
  },

  saveProd(id) {
    const emoji = document.getElementById('pm-emoji')?.value.trim();
    const name  = document.getElementById('pm-name')?.value.trim();
    const desc  = document.getElementById('pm-desc')?.value.trim();
    const cat   = document.getElementById('pm-cat')?.value.trim();
    const price = parseFloat(document.getElementById('pm-price')?.value);

    if (!name || !cat || isNaN(price)) {
      app.toast('Preencha nome, categoria e preço', 'red'); return;
    }

    let prods = STATE.prods;
    if (id) {
      prods = prods.map(p => p.id === id ? { ...p, emoji, name, desc, cat, price } : p);
      app.toast('Produto atualizado', 'gold');
    } else {
      prods.push({ id: 'p' + app.uid(), emoji, name, desc, cat, price, active: true });
      app.toast('Produto criado', 'green');
    }
    STATE.prods = prods;
    this.closeProdModal();
    this.setTab('prods');
  },

  toggleProd(id) {
    STATE.prods = STATE.prods.map(p => p.id === id ? { ...p, active: !p.active } : p);
    this.setTab('prods');
  },

  deleteProd(id) {
    if (!confirm('Remover produto?')) return;
    STATE.prods = STATE.prods.filter(p => p.id !== id);
    this.setTab('prods');
    app.toast('Produto removido', 'red');
  },

  /* ════════════════════════════════
     TAB: KEYS / ACESSOS
     ════════════════════════════════ */
  _tabKeys() {
    const keys = STATE.keys;
    const roleLabel = { A: 'Admin', C: 'Caixa' };

    return `
      <div class="tab-panel">
        <h2>Acessos</h2>
        <p class="tab-subtitle">Gerencie chaves de acesso ao painel</p>

        <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
          <button class="btn btn-primary" onclick="admin.openKeyModal()">+ Nova Chave</button>
        </div>

        <div>
          <div class="keys-row" style="color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.5px">
            <span>Chave</span><span>Nome</span><span>Perfil</span><span>Ações</span>
          </div>
          ${keys.map((k, i) => `
            <div class="keys-row">
              <span class="key-code">${k.key}</span>
              <span>${k.name}</span>
              <span>
                <span class="badge ${k.role === 'A' ? 'badge-gold' : 'badge-cyan'}">
                  ${roleLabel[k.role] || k.role}
                </span>
              </span>
              <span>
                <button class="btn btn-danger btn-sm" onclick="admin.deleteKey(${i})">Remover</button>
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <div id="key-modal"></div>`;
  },

  openKeyModal() {
    document.getElementById('key-modal').innerHTML = `
      <div class="modal-bg" onclick="if(event.target===this) admin.closeKeyModal()">
        <div class="modal">
          <h3>Nova Chave de Acesso</h3>
          <div class="form-group">
            <label>Chave (login)</label>
            <input class="input" id="km-key" placeholder="ex: GARCOM1" style="text-transform:uppercase">
          </div>
          <div class="form-group">
            <label>Nome do operador</label>
            <input class="input" id="km-name" placeholder="ex: João Silva">
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input class="input" id="km-pass" type="password" placeholder="Mínimo 4 caracteres">
          </div>
          <div class="form-group">
            <label>Perfil</label>
            <select class="input" id="km-role">
              <option value="C">Caixa</option>
              <option value="A">Admin</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" onclick="admin.closeKeyModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="admin.saveKey()">Criar</button>
          </div>
        </div>
      </div>`;
  },

  closeKeyModal() {
    const el = document.getElementById('key-modal');
    if (el) el.innerHTML = '';
  },

  saveKey() {
    const key  = document.getElementById('km-key')?.value.trim().toUpperCase();
    const name = document.getElementById('km-name')?.value.trim();
    const pass = document.getElementById('km-pass')?.value;
    const role = document.getElementById('km-role')?.value;

    if (!key || !name || pass.length < 4) {
      app.toast('Preencha todos os campos (senha mín. 4 chars)', 'red'); return;
    }
    if (STATE.keys.find(k => k.key === key)) {
      app.toast('Chave já existe', 'red'); return;
    }

    const keys = [...STATE.keys, { key, name, pass, role }];
    STATE.keys = keys;
    this.closeKeyModal();
    this.setTab('keys');
    app.toast(`Chave ${key} criada`, 'green');
  },

  deleteKey(idx) {
    const keys = STATE.keys;
    if (keys.length <= 1) { app.toast('Deve existir ao menos 1 chave', 'red'); return; }
    if (!confirm(`Remover chave ${keys[idx].key}?`)) return;
    keys.splice(idx, 1);
    STATE.keys = [...keys];
    this.setTab('keys');
  },

  /* ════════════════════════════════
     TAB: CONFIGURAÇÕES
     ════════════════════════════════ */
  _tabConf() {
    const s = STATE.setup;

    return `
      <div class="tab-panel">
        <h2>Configurações</h2>
        <p class="tab-subtitle">Dados gerais do estabelecimento</p>

        <div class="config-section">
          <h4>Estabelecimento</h4>
          <div class="form-group">
            <label>Nome do Estabelecimento</label>
            <input class="input" id="cf-name" value="${s.storeName || ''}" placeholder="ex: Moraes Grill">
          </div>
          <div class="form-group">
            <label>WhatsApp (com DDD)</label>
            <input class="input" id="cf-wa" value="${s.whatsapp || ''}" placeholder="11999999999">
          </div>
        </div>

        <div class="config-section">
          <h4>Operação</h4>
          <div class="toggle-row">
            <span>Estabelecimento Aberto</span>
            <button class="toggle ${s.storeOpen ? 'on' : ''}"
              id="tgl-open" onclick="admin.toggleConf('storeOpen')"></button>
          </div>
          <div class="toggle-row">
            <span>Modo Mesa (QR por mesa)</span>
            <button class="toggle ${s.tableMode ? 'on' : ''}"
              id="tgl-table" onclick="admin.toggleConf('tableMode')"></button>
          </div>
        </div>

        <button class="btn btn-primary" onclick="admin.saveConf()">💾 Salvar Configurações</button>
      </div>`;
  },

  toggleConf(key) {
    const s = STATE.setup;
    s[key] = !s[key];
    STATE.setup = s;
    const tgl = document.getElementById(`tgl-${key === 'storeOpen' ? 'open' : 'table'}`);
    if (tgl) tgl.classList.toggle('on', s[key]);
  },

  saveConf() {
    const s = STATE.setup;
    s.storeName = document.getElementById('cf-name')?.value.trim() || s.storeName;
    s.whatsapp  = document.getElementById('cf-wa')?.value.trim()   || s.whatsapp;
    STATE.setup = s;
    app.toast('✅ Configurações salvas', 'green');
  },
};

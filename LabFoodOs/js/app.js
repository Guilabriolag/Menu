/* ========================================
   LABFOOD OS — app.js
   Core do sistema: roteamento, auth, utilitários
   ======================================== */

const app = {
  _clicks: 0,
  _clickTimer: null,

  init() {
    this.render('totem');
  },

  /* ── EASTER EGG LOGIN ─────────── */
  secretLogin() {
    this._clicks++;
    const dot = document.getElementById('secret-dot');
    dot?.classList.toggle('active', this._clicks > 0);

    clearTimeout(this._clickTimer);
    this._clickTimer = setTimeout(() => {
      this._clicks = 0;
      dot?.classList.remove('active');
    }, 2000);

    if (this._clicks >= 5) {
      this._clicks = 0;
      dot?.classList.remove('active');
      this.render('login');
    }
  },

  /* ── ROTEADOR ─────────────────── */
  render(view) {
    const vp  = document.getElementById('viewport');
    const act = document.getElementById('header-actions');
    const fab = document.getElementById('cartFab');

    fab.style.display = 'none';

    switch (view) {
      case 'totem':
        vp.innerHTML  = totem.buildHTML();
        act.innerHTML = '';
        fab.style.display = 'flex';
        totem.init();
        break;

      case 'login':
        vp.innerHTML = this._loginHTML();
        act.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="app.render('totem')">← Voltar</button>`;
        break;

      case 'admin':
        if (!STATE.user) { this.render('login'); return; }
        vp.innerHTML = admin.buildHTML();
        act.innerHTML = `
          <span style="color:var(--dim);font-size:12px;margin-right:8px">${STATE.user.name}</span>
          <button class="btn btn-ghost btn-sm" onclick="app.logout()">Sair</button>
        `;
        admin.init();
        break;
    }
  },

  /* ── AUTH ─────────────────────── */
  _loginHTML() {
    return `
      <div class="login-wrap">
        <div class="login-card">
          <h2>🔐 Acesso Restrito</h2>
          <div class="form-group">
            <label>Chave de Acesso</label>
            <input class="input" id="ln-key" type="text" placeholder="ex: ADMIN" autocomplete="off">
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input class="input" id="ln-pass" type="password" placeholder="••••••"
              onkeydown="if(event.key==='Enter') app.doLogin()">
          </div>
          <button class="btn btn-primary" onclick="app.doLogin()">Entrar</button>
          <button class="login-back" onclick="app.render('totem')">Cancelar</button>
        </div>
      </div>`;
  },

  doLogin() {
    const k = document.getElementById('ln-key')?.value.trim().toUpperCase();
    const p = document.getElementById('ln-pass')?.value;

    const found = STATE.keys.find(x => x.key === k && x.pass === p);
    if (!found) {
      app.toast('❌ Credenciais inválidas', 'red');
      return;
    }
    STATE.user = { ...found };
    app.render('admin');
    app.toast(`✅ Bem-vindo, ${found.name}`);
  },

  logout() {
    STATE.user = null;
    this.render('totem');
    this.toast('Sessão encerrada');
  },

  /* ── TOAST ────────────────────── */
  toast(msg, type = 'gold') {
    const el = document.getElementById('toast');
    if (!el) return;
    const colors = { gold: 'var(--gold)', red: 'var(--red)', green: 'var(--green)', cyan: 'var(--cyan)' };
    el.style.borderLeftColor = colors[type] || colors.gold;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  },

  /* ── UTILS ────────────────────── */
  fmt(v) {
    return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
  },

  fmtDate(ts) {
    return new Date(ts).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  uid() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  },
};

window.onload = () => app.init();

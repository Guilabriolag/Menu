/* ============================================
   TOKENS & RESET
============================================ */
:root {
  --bg:      #080a0e;
  --panel:   #0d0f15;
  --card:    #12141c;
  --card2:   #181b26;
  --border:  #1e2130;
  --border2: #252836;
  --c1:      #ef4444;   /* vermelho Moraes */
  --c2:      #f59e0b;   /* âmbar Moraes */
  --green:   #10b981;
  --red:     #ef4444;
  --accent:  #4f6ef7;
  --text:    #e8eaf6;
  --muted:   #5a6080;
  --muted2:  #8891b0;
  --font:    'Space Grotesk', sans-serif;
  --head:    'Syne', sans-serif;
  --mono:    'Space Mono', monospace;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bot: env(safe-area-inset-bottom, 0px);
  --safe-l:   env(safe-area-inset-left, 0px);
  --safe-r:   env(safe-area-inset-right, 0px);
  --nav-h:    60px;
  --topbar-h: 56px;
}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html { height: 100%; overscroll-behavior: none; }
body {
  height: 100%; background: var(--bg); color: var(--text);
  font-family: var(--font); overflow: hidden;
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bot);
  padding-left: var(--safe-l);
  padding-right: var(--safe-r);
  -webkit-font-smoothing: antialiased;
}

/* Layout raiz */
.app { display:flex; flex-direction:column; height:100vh; height:100dvh; }

/* Topbar */
.topbar {
  height: var(--topbar-h); min-height: var(--topbar-h);
  background: var(--panel); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; padding: 0 16px; gap: 10px;
  flex-shrink: 0; z-index: 50;
}
.tb-logo {
  display: flex; align-items: center; gap: 9px;
}
.tb-badge {
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, var(--c1), #9b1c1c);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; flex-shrink: 0;
}
.tb-name {
  font-family: var(--head); font-size: .82rem; font-weight: 800;
  letter-spacing: 1.5px; line-height: 1.2;
}
.tb-sub { font-size: .55rem; letter-spacing: 2px; color: var(--c2); }
.tb-sep { flex: 1; }
.tb-status {
  font-size: .6rem; font-weight: 700; letter-spacing: 1px;
  padding: 4px 10px; border-radius: 14px; white-space: nowrap;
}
.tb-status.ab { background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.3); color: var(--green); }
.tb-status.fc { background: rgba(239,68,68,.1);  border: 1px solid rgba(239,68,68,.3);  color: var(--red); }

/* Content & Screens */
.content {
  flex: 1; overflow: hidden; position: relative;
}
.screen {
  position: absolute; inset: 0;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--nav-h) + 12px);
  display: none;
}
.screen.active { display: block; }
.screen::-webkit-scrollbar { display: none; }

/* Bottom nav */
.bottom-nav {
  height: var(--nav-h); min-height: var(--nav-h);
  background: var(--panel); border-top: 1px solid var(--border);
  display: flex; align-items: stretch;
  flex-shrink: 0; z-index: 50;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.nav-btn {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px;
  cursor: pointer; border: none; background: none;
  color: var(--muted); transition: color .15s; position: relative;
  -webkit-tap-highlight-color: transparent;
}
.nav-btn.active { color: var(--c1); }
.nav-btn.active::after {
  content: ''; position: absolute; bottom: 0; left: 20%; right: 20%;
  height: 2px; background: var(--c1); border-radius: 2px 2px 0 0;
}
.nav-icon { font-size: 1.3rem; line-height: 1; }
.nav-label { font-size: .57rem; font-weight: 700; letter-spacing: .5px; }
.nav-dot {
  position: absolute; top: 8px; right: calc(50% - 14px);
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--c1); border: 2px solid var(--panel);
  display: none;
}
.nav-dot.show { display: block; }

/* Dashboard */
.dash-hero {
  background: linear-gradient(160deg, rgba(239,68,68,.12) 0%, transparent 60%);
  padding: 20px 16px 14px;
  border-bottom: 1px solid var(--border);
}
.dash-hero-name {
  font-family: var(--head); font-size: 1.4rem; font-weight: 800;
  letter-spacing: 3px; color: var(--text); margin-bottom: 2px;
}
.dash-hero-sub { font-size: .65rem; letter-spacing: 2px; color: var(--c2); }
.dash-stats {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px; padding: 14px 16px;
}
.stat-card {
  background: var(--card); border: 1px solid var(--border2);
  border-radius: 12px; padding: 13px 10px; text-align: center;
}
.stat-num { font-family: var(--mono); font-size: 1.3rem; font-weight: 700; color: var(--c2); }
.stat-label { font-size: .58rem; color: var(--muted); margin-top: 3px; letter-spacing: .5px; text-transform: uppercase; }

.sect-title {
  font-size: .6rem; font-weight: 700; letter-spacing: 2.5px;
  color: var(--muted); text-transform: uppercase;
  padding: 14px 16px 8px;
  display: flex; align-items: center; gap: 8px;
}
.sect-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

/* Module cards */
.mod-cards { display: flex; flex-direction: column; gap: 8px; padding: 0 16px 8px; }
.mod-card {
  background: var(--card); border: 1px solid var(--border2);
  border-radius: 14px; padding: 16px;
  display: flex; align-items: center; gap: 14px;
  cursor: pointer; transition: all .15s;
}
.mod-card:active { transform: scale(.98); background: var(--card2); }
.mod-card-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem;
}
.mod-card-icon.red    { background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.2); }
.mod-card-icon.amber  { background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.2); }
.mod-card-icon.green  { background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.2); }
.mod-card-icon.purple { background: rgba(124,58,237,.12); border: 1px solid rgba(124,58,237,.2); }
.mod-card-info { flex: 1; min-width: 0; }
.mod-card-title { font-size: .88rem; font-weight: 700; margin-bottom: 3px; }
.mod-card-desc  { font-size: .72rem; color: var(--muted2); line-height: 1.4; }
.mod-card-arrow { font-size: .8rem; color: var(--muted); flex-shrink: 0; }

/* Activity */
.activity { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 6px; }
.act-item {
  background: var(--card); border: 1px solid var(--border2);
  border-radius: 10px; padding: 10px 12px;
  display: flex; align-items: center; gap: 10px;
}
.act-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.act-msg { flex: 1; font-size: .78rem; font-weight: 500; }
.act-time { font-size: .6rem; color: var(--muted); font-family: var(--mono); }

/* Cardápio tabs & editor */
.card-screen-tabs {
  display: flex; overflow-x: auto; gap: 0;
  border-bottom: 1px solid var(--border);
  padding: 0 12px; background: var(--panel);
  position: sticky; top: 0; z-index: 20;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.card-screen-tabs::-webkit-scrollbar { display: none; }
.ctab {
  padding: 11px 12px; border: none; background: none;
  color: var(--muted); font-family: var(--font); font-size: .68rem;
  font-weight: 700; cursor: pointer; white-space: nowrap;
  border-bottom: 2px solid transparent; transition: all .15s; flex-shrink: 0;
}
.ctab.active { color: var(--c1); border-bottom-color: var(--c1); }

.editor-section { padding: 14px 16px; }
.fg { margin-bottom: 14px; }
.fl { font-size: .6rem; font-weight: 700; letter-spacing: 1.8px; color: var(--muted);
      text-transform: uppercase; margin-bottom: 5px; display: block; }
.fi {
  width: 100%; padding: 11px 13px; background: var(--card);
  border: 1px solid var(--border2); border-radius: 10px;
  color: var(--text); font-family: var(--font); font-size: .88rem;
  outline: none; -webkit-appearance: none;
}
.fi:focus { border-color: var(--c1); }
.fi::placeholder { color: var(--muted); }
.fr { display: flex; gap: 8px; }
.fr .fg { flex: 1; margin-bottom: 0; }
.sec-line {
  font-size: .58rem; font-weight: 700; letter-spacing: 2px;
  color: var(--muted); text-transform: uppercase;
  margin: 16px 0 10px; display: flex; align-items: center; gap: 8px;
}
.sec-line::after { content: ''; flex: 1; height: 1px; background: var(--border); }

.color-row { display: flex; gap: 8px; align-items: center; }
.color-sw {
  width: 42px; height: 42px; border-radius: 9px;
  border: 1px solid var(--border2); position: relative; overflow: hidden;
  flex-shrink: 0; cursor: pointer;
}
.color-sw input[type=color] { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.csw-bg { position: absolute; inset: 0; pointer-events: none; }
.color-tx { flex: 1; }

.tipo-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; }
.tipo-btn {
  padding: 10px 4px; border-radius: 10px; border: 1px solid var(--border2);
  background: var(--card); color: var(--muted2); font-family: var(--font);
  font-size: .62rem; font-weight: 700; cursor: pointer; text-align: center; transition: all .15s;
}
.tipo-btn.active { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.35); color: var(--c1); }
.tipo-icon { font-size: 1.3rem; display: block; margin-bottom: 3px; }

.font-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.font-btn {
  padding: 7px 12px; border-radius: 7px; border: 1px solid var(--border2);
  background: var(--card); color: var(--muted2); cursor: pointer;
  font-size: .78rem; font-weight: 600; transition: all .15s;
}
.font-btn.active { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.35); color: var(--c1); }

.logo-upload {
  border: 2px dashed var(--border2); border-radius: 10px; padding: 18px;
  text-align: center; cursor: pointer; transition: all .15s; position: relative; min-height: 80px;
  display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 6px;
}
.logo-upload:active { border-color: var(--c1); }
.logo-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.logo-preview { max-height: 60px; max-width: 100px; border-radius: 8px; display: block; margin: 0 auto; }

.cat-block {
  background: var(--card); border: 1px solid var(--border2);
  border-radius: 12px; margin-bottom: 10px; overflow: hidden;
}
.cat-header {
  padding: 12px 13px; display: flex; align-items: center; gap: 9px;
  border-bottom: 1px solid var(--border2); cursor: pointer;
}
.cat-name-inp {
  flex: 1; background: none; border: none; color: var(--text);
  font-family: var(--head); font-size: .84rem; font-weight: 700; outline: none;
}
.cat-toggle { font-size: .65rem; color: var(--muted); transition: transform .2s; }
.cat-toggle.open { transform: rotate(90deg); }
.cat-body { padding: 8px 10px; display: flex; flex-direction: column; gap: 7px; }
.cat-body.hidden { display: none; }

.prod-row {
  background: var(--card2); border: 1px solid var(--border2);
  border-radius: 9px; padding: 9px;
}
.prod-top { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 7px; }
.prod-img {
  width: 46px; height: 46px; border-radius: 8px;
  background: var(--card); border: 1px solid var(--border2);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; cursor: pointer; position: relative; overflow: hidden;
}
.prod-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.prod-img input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.prod-nome {
  flex: 1; padding: 8px 10px; background: var(--card);
  border: 1px solid var(--border2); border-radius: 7px;
  color: var(--text); font-family: var(--font); font-size: .84rem; outline: none;
}
.prod-nome:focus { border-color: var(--c1); }
.del-btn {
  width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border2);
  background: var(--card); color: var(--muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: .8rem; flex-shrink: 0;
}
.prod-bottom { display: flex; gap: 7px; align-items: center; }
.prod-desc {
  flex: 1; padding: 7px 10px; background: var(--card);
  border: 1px solid var(--border2); border-radius: 7px;
  color: var(--muted2); font-family: var(--font); font-size: .76rem;
  outline: none; resize: none; height: 38px; -webkit-appearance: none;
}
.prod-preco {
  width: 74px; padding: 7px 8px; background: var(--card);
  border: 1px solid var(--border2); border-radius: 7px;
  color: var(--green); font-family: var(--mono); font-size: .8rem;
  outline: none; text-align: right; -webkit-appearance: none;
}
.prod-preco:focus { border-color: var(--green); }
.add-item-btn {
  width: 100%; padding: 9px; border-radius: 8px;
  border: 1px dashed var(--border2); background: none;
  color: var(--muted); cursor: pointer; font-family: var(--font);
  font-size: .76rem; font-weight: 600; margin-top: 4px; transition: all .15s;
}
.add-cat-btn {
  width: 100%; padding: 12px; border-radius: 10px;
  border: 1px dashed var(--border2); background: none;
  color: var(--muted2); cursor: pointer; font-family: var(--font);
  font-size: .8rem; font-weight: 700; margin-top: 6px;
}

.dias-grid { display: flex; gap: 6px; flex-wrap: wrap; }
.dia-btn {
  width: 40px; height: 40px; border-radius: 9px;
  border: 1px solid var(--border2); background: var(--card);
  color: var(--muted); font-family: var(--font); font-size: .64rem;
  font-weight: 700; cursor: pointer; transition: all .15s;
}
.dia-btn.fechado { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: var(--red); }

.bairro-row { display: flex; gap: 7px; align-items: center; margin-bottom: 8px; }
.bairro-row input { flex: 1; }
.taxa-fi { width: 70px !important; }

.fab-area {
  position: sticky; bottom: 0; z-index: 20;
  background: linear-gradient(to top, var(--bg) 70%, transparent);
  padding: 10px 16px 14px;
  display: flex; flex-direction: column; gap: 7px;
}
.fab-row { display: flex; gap: 7px; }
.fab {
  flex: 1; padding: 13px; border-radius: 11px; border: none;
  font-family: var(--font); font-size: .78rem; font-weight: 700;
  cursor: pointer; letter-spacing: .3px; transition: all .14s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.fab:active { transform: scale(.97); }
.fab-save  { background: var(--card); border: 1px solid var(--border2); color: var(--muted2); }
.fab-qr    { background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.3); color: var(--green); }
.fab-pub   { background: rgba(79,110,247,.12); border: 1px solid rgba(79,110,247,.3); color: var(--accent); }
.fab-print { background: linear-gradient(135deg, var(--c1), #9b1c1c); color: #fff; font-weight: 800; }

/* Comanda */
.mesas-sect { padding: 12px 16px 0; }
.mesas-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 8px; padding: 0 16px 12px; margin-top: 8px;
}
.mesa-btn {
  aspect-ratio: 1; border-radius: 11px; border: 1px solid var(--border2);
  background: var(--card); color: var(--muted2);
  font-family: var(--head); font-size: .75rem; font-weight: 700;
  cursor: pointer; transition: all .15s;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
}
.mesa-btn.active  { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.35); color: var(--c1); }
.mesa-btn.ocupada { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.3); color: var(--c2); }
.mesa-n   { font-size: 1rem; line-height: 1; }
.mesa-val { font-size: .52rem; font-family: var(--mono); }

.comanda-detalhe {
  border-top: 1px solid var(--border);
  padding: 14px 16px;
}
.comanda-header-line {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
}
.comanda-mesa-title { font-family: var(--head); font-size: 1rem; font-weight: 800; flex: 1; }
.add-item-bar { display: flex; gap: 7px; margin-bottom: 12px; }
.add-item-bar .fi { flex: 1; padding: 10px 11px; }
.fi-preco-mini { width: 74px !important; font-family: var(--mono) !important; }
.add-btn-mini {
  padding: 10px 16px; border-radius: 10px; border: none;
  background: var(--c1); color: #fff; font-family: var(--font);
  font-size: .8rem; font-weight: 800; cursor: pointer; white-space: nowrap;
}
.comanda-item-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.ci {
  background: var(--card); border: 1px solid var(--border2);
  border-radius: 10px; padding: 11px 12px;
  display: flex; align-items: center; gap: 10px;
}
.ci-nome { flex: 1; font-size: .84rem; font-weight: 600; }
.ci-ctrl { display: flex; align-items: center; gap: 7px; }
.ci-ctrl-btn {
  width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--border2);
  background: var(--card2); color: var(--text); cursor: pointer;
  font-size: .9rem; display: flex; align-items: center; justify-content: center;
}
.ci-qty { font-family: var(--mono); font-size: .84rem; min-width: 18px; text-align: center; }
.ci-preco { font-family: var(--mono); font-weight: 700; color: var(--green); font-size: .82rem; }
.comanda-total-bar {
  border-top: 1px solid var(--border); padding-top: 12px;
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.ct-label { font-size: .78rem; color: var(--muted2); }
.ct-val { font-family: var(--mono); font-size: 1.25rem; font-weight: 700; color: var(--c2); }

.cat-quick { margin-bottom: 10px; }
.cat-quick-title {
  font-size: .6rem; font-weight: 700; letter-spacing: 1.5px;
  color: var(--muted); text-transform: uppercase; margin-bottom: 7px;
}
.quick-items { display: flex; flex-wrap: wrap; gap: 6px; }
.quick-item {
  display: flex; align-items: center; gap: 5px;
  background: var(--card2); border: 1px solid var(--border2);
  border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: all .15s;
}
.quick-item:active { background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); }
.quick-item-nome { font-size: .74rem; font-weight: 600; }
.quick-item-preco { font-size: .68rem; font-family: var(--mono); color: var(--c2); }

/* QR */
.qr-screen { padding: 16px; }
.qr-hero {
  background: var(--card); border: 1px solid var(--border2);
  border-radius: 16px; padding: 20px 16px;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  margin-bottom: 14px;
}
.qr-box canvas, .qr-box img { border-radius: 8px; display: block; }
.qr-stats { display: flex; gap: 20px; justify-content: center; }
.qs-stat { text-align: center; }
.qs-num { font-family: var(--mono); font-size: 1rem; font-weight: 700; color: var(--c2); }
.qs-label { font-size: .58rem; color: var(--muted); letter-spacing: .5px; margin-top: 1px; }
.qr-tip { font-size: .7rem; color: var(--muted2); text-align: center; }
.qr-loading { font-size: .78rem; color: var(--muted2); letter-spacing: 1px; text-align: center; padding: 30px 0; }
.qr-err { font-size: .78rem; color: var(--red); text-align: center; padding: 20px; }
.qr-actions { display: flex; flex-direction: column; gap: 8px; }

/* Config */
.config-screen { padding: 16px; }
.cfg-card {
  background: var(--card); border: 1px solid var(--border2);
  border-radius: 14px; padding: 16px; margin-bottom: 12px;
}
.cfg-card h4 {
  font-size: .62rem; font-weight: 700; letter-spacing: 2px;
  color: var(--muted); text-transform: uppercase; margin-bottom: 12px;
}
.cfg-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.cfg-item:last-child { border-bottom: none; padding-bottom: 0; }
.cfg-item-label { font-size: .82rem; font-weight: 600; }
.cfg-item-sub   { font-size: .68rem; color: var(--muted2); margin-top: 2px; }

.credit-hero {
  background: linear-gradient(135deg, rgba(239,68,68,.15), rgba(245,158,11,.08));
  border: 1px solid rgba(245,158,11,.2); border-radius: 14px;
  padding: 20px; text-align: center; margin-bottom: 14px;
}
.credit-num { font-family: var(--mono); font-size: 3rem; font-weight: 700; color: var(--c2); line-height: 1; }
.credit-label { font-size: .62rem; letter-spacing: 2px; color: var(--muted); margin-top: 4px; }

.pay-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 14px; }
.pay-tab {
  flex: 1; padding: 10px; text-align: center; cursor: pointer;
  font-size: .76rem; font-weight: 700; color: var(--muted);
  border-bottom: 2px solid transparent; transition: all .15s;
}
.pay-tab.active { color: var(--c2); border-bottom-color: var(--c2); }
.pay-panel { display: none; }
.pay-panel.active { display: block; }
.invoice-box {
  background: var(--card); border: 1px solid var(--border2);
  border-radius: 10px; padding: 11px 13px; font-family: var(--mono);
  font-size: .72rem; color: var(--accent); word-break: break-all;
  margin-bottom: 12px; min-height: 44px;
}

.btn {
  width: 100%; padding: 13px; border-radius: 11px; border: none;
  font-family: var(--font); font-size: .84rem; font-weight: 700;
  cursor: pointer; transition: all .14s; display: flex;
  align-items: center; justify-content: center; gap: 7px;
}
.btn:active { transform: scale(.97); }
.btn-primary { background: linear-gradient(135deg, var(--c1), #9b1c1c); color: #fff; }
.btn-secondary { background: var(--card); border: 1px solid var(--border2); color: var(--muted2); }
.btn-green { background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.3); color: var(--green); }
.btn-accent { background: rgba(79,110,247,.12); border: 1px solid rgba(79,110,247,.3); color: var(--accent); }
.btn-amber { background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.3); color: var(--c2); }
.btn-row { display: flex; gap: 8px; }
.btn-row .btn { flex: 1; }

.mt8  { margin-top: 8px; }
.mt12 { margin-top: 12px; }
.mt16 { margin-top: 16px; }

.toast {
  position: fixed; bottom: calc(var(--nav-h) + 14px); left: 50%;
  transform: translateX(-50%) translateY(40px);
  background: var(--panel); border: 1px solid var(--border2);
  border-radius: 10px; padding: 10px 18px;
  font-size: .8rem; font-weight: 600; z-index: 200;
  transition: transform .3s cubic-bezier(.32,.72,0,1), opacity .3s;
  opacity: 0; white-space: nowrap; pointer-events: none;
  max-width: calc(100vw - 32px);
}
.toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
.toast.ok   { border-color: rgba(16,185,129,.4); color: var(--green); }
.toast.err  { border-color: rgba(239,68,68,.4); color: var(--red); }
.toast.info { border-color: rgba(79,110,247,.4); color: var(--accent); }

*::-webkit-scrollbar { display: none; }

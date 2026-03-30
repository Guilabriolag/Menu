// ============================================
// CONSTANTS & STORAGE KEYS
// ============================================
const LS_CARD   = 'mg_cardapio';
const LS_CONF   = 'mg_config';
const LS_MESAS  = 'mg_mesas';
const LS_CRED   = 'mg_creditos';
const LS_ACT    = 'mg_atividade';

const TIPOS = [
  { id: 'pizzaria',   icon: '🍕', label: 'Pizzaria' },
  { id: 'lanche',     icon: '🍔', label: 'Lanchonete' },
  { id: 'restaurante',icon: '🍽', label: 'Restaurante' },
  { id: 'cafeteria',  icon: '☕', label: 'Cafeteria' },
  { id: 'sorveteria', icon: '🍦', label: 'Sorveteria' },
  { id: 'outro',      icon: '🏪', label: 'Outro' }
];
const FONTES = ['Syne', 'Space Grotesk', 'Georgia', 'monospace'];
const FONTES_LABEL = ['Moderna', 'Limpa', 'Clássica', 'Tech'];

// ============================================
// GLOBAL STATE
// ============================================
let cardapio, config, mesas, creditos, atividade;
let edTab = 'marca';
let mesaAtual = 1;
let qrCanvas = null; // para download
let payTab = 'lightning';

// ============================================
// UTILS
// ============================================
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function utf8_to_b64(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)));
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + (type || '');
  el.classList.add('show');
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => el.classList.remove('show'), 3000);
}

function log(tipo, msg) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  atividade.push({ tipo, msg, hora: `${dateStr} ${timeStr}` });
  if (atividade.length > 30) atividade.shift();
  salvar();
}

function salvar() {
  localStorage.setItem(LS_CARD,  JSON.stringify(cardapio));
  localStorage.setItem(LS_CONF,  JSON.stringify(config));
  localStorage.setItem(LS_MESAS, JSON.stringify(mesas));
  localStorage.setItem(LS_CRED,  String(creditos));
  localStorage.setItem(LS_ACT,   JSON.stringify(atividade));
}

// ============================================
// DATA LOAD & SEED
// ============================================
function carregar() {
  const seedCardapio = {
    tipo: 'restaurante',
    marca: {
      nome: 'MORAES GRILL',
      subtitulo: 'CHURRASCARIA & PETISCOS',
      whatsapp: '',
      instagram: '@moraes.grill',
      corPrimaria: '#ef4444',
      corSecundaria: '#f59e0b',
      fonte: 'Space Grotesk',
      logoBase64: ''
    },
    horario: {
      diasFechados: [1], // 0=domingo, 1=segunda, ...
      abreHora: 11, abreMinuto: 0,
      fechaHora: 23, fechaMinuto: 0
    },
    bairros: [
      { nome: 'Centro', taxa: 5 },
      { nome: 'Vila Nova', taxa: 8 },
      { nome: 'Jardim América', taxa: 10 }
    ],
    categorias: [
      { nome: 'Carnes', aberta: true, itens: [
        { nome: 'Picanha 300g', desc: 'Com farofa e vinagrete', preco: 89.90, img: '' },
        { nome: 'Fraldinha 250g', desc: 'Acompanha arroz e feijão', preco: 72.90, img: '' },
        { nome: 'Costela 400g', desc: 'Temperada com alho e ervas', preco: 84.90, img: '' },
        { nome: 'Maminha 300g', desc: 'Com chimichurri caseiro', preco: 79.90, img: '' }
      ]},
      { nome: 'Petiscos', aberta: false, itens: [
        { nome: 'Calabresa Acebolada', desc: 'Porção 300g', preco: 39.90, img: '' },
        { nome: 'Batata Frita', desc: 'Porção 300g, crocante', preco: 24.90, img: '' },
        { nome: 'Provolone Grelhado', desc: '200g com orégano', preco: 34.90, img: '' },
        { nome: 'Linguiça Toscana', desc: '250g grelhada', preco: 32.90, img: '' }
      ]},
      { nome: 'Acompanhamentos', aberta: false, itens: [
        { nome: 'Arroz c/ Feijão', desc: 'Porção individual', preco: 14.90, img: '' },
        { nome: 'Farofa', desc: 'Caseira com bacon', preco: 12.90, img: '' },
        { nome: 'Vinagrete', desc: 'Tomate, cebola, pimentão', preco: 8.90, img: '' }
      ]},
      { nome: 'Bebidas', aberta: false, itens: [
        { nome: 'Cerveja Long Neck', desc: 'Corona, Heineken, Stella', preco: 12.90, img: '' },
        { nome: 'Refrigerante Lata', desc: '350ml', preco: 6.90, img: '' },
        { nome: 'Suco Natural', desc: '500ml — laranja, limão, maracujá', preco: 14.90, img: '' },
        { nome: 'Água Mineral', desc: '500ml', preco: 4.90, img: '' }
      ]}
    ]
  };

  try { cardapio = JSON.parse(localStorage.getItem(LS_CARD)) || seedCardapio; } catch(e) { cardapio = seedCardapio; }
  try { config   = JSON.parse(localStorage.getItem(LS_CONF)) || {}; } catch(e) { config = {}; }
  try { mesas    = JSON.parse(localStorage.getItem(LS_MESAS)) || {}; } catch(e) { mesas = {}; }
  try { creditos = parseInt(localStorage.getItem(LS_CRED)) || 3; } catch(e) { creditos = 3; }
  try { atividade = JSON.parse(localStorage.getItem(LS_ACT)) || []; } catch(e) { atividade = []; }

  // defaults config
  if (!config.ghUser)    config.ghUser = 'guilabriolag';
  if (!config.slug)      config.slug = 'moraes-grill';
  if (!config.bipa)      config.bipa = 'labriolag@bipa.app';
  if (!config.precoCred) config.precoCred = 2;
}

// ============================================
// NAVEGAÇÃO
// ============================================
function showScreen(screenId) {
  // atualiza active nas screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const activeScreen = document.getElementById(`screen-${screenId}`);
  if (activeScreen) activeScreen.classList.add('active');

  // atualiza botões da bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const target = btn.getAttribute('data-screen');
    if (target === screenId) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // renderiza conteúdo específico
  if (screenId === 'dash') renderDash();
  if (screenId === 'cardapio') { renderEditorTabs(); renderEditor(); }
  if (screenId === 'comanda') { renderMesas(); renderComanda(); renderQuickCats(); }
  if (screenId === 'qr') gerarQRVivo();
  if (screenId === 'config') renderConfig();
}

// ============================================
// STATUS ABERTO/FECHADO
// ============================================
function checkStatus() {
  const h = cardapio.horario;
  const n = new Date();
  const dia = n.getDay();
  const agoraMin = n.getHours() * 60 + n.getMinutes();
  const aberto = h.diasFechados.indexOf(dia) === -1 &&
                 agoraMin >= h.abreHora*60 + h.abreMinuto &&
                 agoraMin <= h.fechaHora*60 + h.fechaMinuto;
  const el = document.getElementById('tb-status');
  el.textContent = aberto ? 'ABERTO' : 'FECHADO';
  el.className = 'tb-status ' + (aberto ? 'ab' : 'fc');
}

// ============================================
// DASHBOARD
// ============================================
function renderDash() {
  document.getElementById('stat-cred').textContent = creditos;
  const totalItens = cardapio.categorias.reduce((s,c) => s + c.itens.length, 0);
  document.getElementById('stat-itens').textContent = totalItens;
  const mesasOcup = Object.keys(mesas).filter(k => mesas[k] && mesas[k].length > 0).length;
  document.getElementById('stat-mesas').textContent = mesasOcup;

  const colors = { qr: 'var(--green)', pub: 'var(--accent)', print: 'var(--c2)', comanda: 'var(--muted2)', save: 'var(--muted)' };
  const acts = atividade.slice(-5).reverse();
  const html = acts.length ? acts.map(a => `
    <div class="act-item">
      <div class="act-dot" style="background:${colors[a.tipo] || 'var(--muted)'}"></div>
      <div class="act-msg">${esc(a.msg)}</div>
      <div class="act-time">${a.hora}</div>
    </div>
  `).join('') : '<div style="color:var(--muted);font-size:.78rem;padding:4px 0">Nenhuma atividade ainda.</div>';
  document.getElementById('activity-list').innerHTML = html;
}

// ============================================
// EDITOR CARDÁPIO
// ============================================
function switchEdTab(tab) {
  edTab = tab;
  renderEditorTabs();
  renderEditor();
}

function renderEditorTabs() {
  const tabs = document.querySelectorAll('.ctab');
  const order = ['marca', 'cardapio', 'horario', 'entrega'];
  tabs.forEach((btn, idx) => {
    btn.classList.toggle('active', order[idx] === edTab);
  });
}

function renderEditor() {
  const body = document.getElementById('ed-body');
  if (edTab === 'marca')    body.innerHTML = renderMarca();
  if (edTab === 'cardapio') body.innerHTML = renderCardapio();
  if (edTab === 'horario')  body.innerHTML = renderHorario();
  if (edTab === 'entrega')  body.innerHTML = renderEntrega();
  bindEditorEvents();
}

function renderMarca() {
  const m = cardapio.marca;
  const tipoBtns = TIPOS.map(t => `
    <button class="tipo-btn ${cardapio.tipo === t.id ? 'active' : ''}" data-tipo="${t.id}">
      <span class="tipo-icon">${t.icon}</span>${t.label}
    </button>
  `).join('');
  const logoInner = m.logoBase64
    ? `<img class="logo-preview" src="${m.logoBase64}"><br><small style="color:var(--muted);font-size:.68rem">Toque para trocar</small>`
    : '<div style="font-size:1.8rem">🖼</div><small style="color:var(--muted);font-size:.7rem">Toque para enviar logo</small>';
  const cp1 = `<div class="color-sw"><div class="csw-bg" style="background:${m.corPrimaria}"></div><input type="color" value="${m.corPrimaria}" data-path="marca.corPrimaria" id="cp1"></div>`;
  const cp2 = `<div class="color-sw"><div class="csw-bg" style="background:${m.corSecundaria}"></div><input type="color" value="${m.corSecundaria}" data-path="marca.corSecundaria" id="cp2"></div>`;
  const fontBtns = FONTES.map((f,i) => `<button class="font-btn ${m.fonte === f ? 'active' : ''}" data-fonte="${f}" style="font-family:'${f}'">${FONTES_LABEL[i]}</button>`).join('');
  return `
    <div class="sec-line">Tipo</div>
    <div class="fg"><div class="tipo-grid">${tipoBtns}</div></div>
    <div class="sec-line">Identidade</div>
    <div class="fg"><label class="fl">Logo</label><div class="logo-upload">${logoInner}<input type="file" accept="image/*" id="upload-logo"></div></div>
    <div class="fg"><label class="fl">Nome</label><input class="fi" data-path="marca.nome" value="${esc(m.nome)}"></div>
    <div class="fg"><label class="fl">Subtítulo</label><input class="fi" data-path="marca.subtitulo" value="${esc(m.subtitulo)}"></div>
    <div class="fr"><div class="fg"><label class="fl">WhatsApp</label><input class="fi" data-path="marca.whatsapp" value="${esc(m.whatsapp)}" placeholder="5511..."></div>
    <div class="fg"><label class="fl">Instagram</label><input class="fi" data-path="marca.instagram" value="${esc(m.instagram)}" placeholder="@conta"></div></div>
    <div class="sec-line">Cores</div>
    <div class="fg"><label class="fl">Cor Primária</label><div class="color-row">${cp1}<div class="color-tx"><input class="fi" data-path="marca.corPrimaria" value="${m.corPrimaria}" maxlength="7" id="ct1"></div></div></div>
    <div class="fg"><label class="fl">Cor Secundária</label><div class="color-row">${cp2}<div class="color-tx"><input class="fi" data-path="marca.corSecundaria" value="${m.corSecundaria}" maxlength="7" id="ct2"></div></div></div>
    <div class="fg"><label class="fl">Fonte</label><div class="font-grid">${fontBtns}</div></div>
  `;
}

function renderCardapio() {
  let html = '<div class="sec-line">Categorias</div>';
  cardapio.categorias.forEach((cat, ci) => {
    const itensHtml = cat.itens.map((it, ii) => {
      const imgHtml = it.img
        ? `<div class="prod-img"><img src="${it.img}"><input type="file" accept="image/*" data-cat="${ci}" data-item="${ii}" class="upload-item-img"></div>`
        : `<div class="prod-img"><span style="font-size:.9rem">📷</span><input type="file" accept="image/*" data-cat="${ci}" data-item="${ii}" class="upload-item-img"></div>`;
      return `
        <div class="prod-row">
          <div class="prod-top">
            ${imgHtml}
            <input class="prod-nome" placeholder="Nome..." data-cat="${ci}" data-item="${ii}" data-field="nome" value="${esc(it.nome)}">
            <button class="del-btn" data-cat="${ci}" data-item="${ii}" data-action="delItem">✕</button>
          </div>
          <div class="prod-bottom">
            <textarea class="prod-desc" placeholder="Descrição..." data-cat="${ci}" data-item="${ii}" data-field="desc">${esc(it.desc)}</textarea>
            <input class="prod-preco" type="number" min="0" step="0.5" data-cat="${ci}" data-item="${ii}" data-field="preco" value="${it.preco}">
          </div>
        </div>
      `;
    }).join('');
    html += `
      <div class="cat-block">
        <div class="cat-header" data-cat="${ci}">
          <span style="font-size:.9rem">📂</span>
          <input class="cat-name-inp" data-cat="${ci}" value="${esc(cat.nome)}">
          <span class="cat-toggle ${cat.aberta ? 'open' : ''}">▶</span>
          <button class="del-btn" data-cat="${ci}" data-action="delCat">✕</button>
        </div>
        <div class="cat-body ${cat.aberta ? '' : 'hidden'}">
          ${itensHtml}
          <button class="add-item-btn" data-cat="${ci}">＋ Adicionar item</button>
        </div>
      </div>
    `;
  });
  html += '<button class="add-cat-btn">＋ Nova Categoria</button><div style="height:16px"></div>';
  return html;
}

function renderHorario() {
  const h = cardapio.horario;
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const btns = dias.map((d,i) => `<button class="dia-btn ${h.diasFechados.includes(i) ? 'fechado' : ''}" data-dia="${i}">${d}</button>`).join('');
  return `
    <div class="sec-line">Dias Fechados</div>
    <div class="fg"><div class="dias-grid">${btns}</div></div>
    <div class="sec-line">Horário</div>
    <div class="fr"><div class="fg"><label class="fl">Abre (h)</label><input class="fi" type="number" min="0" max="23" data-path="horario.abreHora" value="${h.abreHora}"></div>
    <div class="fg"><label class="fl">Abre (min)</label><input class="fi" type="number" min="0" max="59" data-path="horario.abreMinuto" value="${h.abreMinuto}"></div></div>
    <div class="fr"><div class="fg"><label class="fl">Fecha (h)</label><input class="fi" type="number" min="0" max="23" data-path="horario.fechaHora" value="${h.fechaHora}"></div>
    <div class="fg"><label class="fl">Fecha (min)</label><input class="fi" type="number" min="0" max="59" data-path="horario.fechaMinuto" value="${h.fechaMinuto}"></div></div>
  `;
}

function renderEntrega() {
  const rows = cardapio.bairros.map((b,i) => `
    <div class="bairro-row">
      <input class="fi" data-bairro="${i}" data-field="nome" value="${esc(b.nome)}" placeholder="Bairro">
      <input class="fi taxa-fi" type="number" data-bairro="${i}" data-field="taxa" value="${b.taxa}" placeholder="R$">
      <button class="del-btn" data-bairro="${i}" data-action="delBairro">✕</button>
    </div>
  `).join('');
  return `
    <div class="sec-line">Taxas de Entrega</div>
    ${rows}
    <button class="add-item-btn" id="add-bairro-btn">＋ Adicionar bairro</button>
    <div style="height:16px"></div>
  `;
}

function bindEditorEvents() {
  // inputs com data-path (marca, horario)
  document.querySelectorAll('[data-path]').forEach(el => {
    el.addEventListener('input', function(e) {
      const path = this.getAttribute('data-path').split('.');
      let obj = cardapio;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      const key = path[path.length-1];
      let value = this.value;
      if (this.type === 'number') value = Number(value);
      obj[key] = value;
      if (this.type === 'color') {
        const sibling = this.previousElementSibling;
        if (sibling) sibling.style.background = value;
        const textInput = document.getElementById(this.id === 'cp1' ? 'ct1' : 'ct2');
        if (textInput) textInput.value = value;
      }
    });
  });

  // tipo
  document.querySelectorAll('.tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cardapio.tipo = btn.getAttribute('data-tipo');
      renderEditor();
    });
  });

  // fonte
  document.querySelectorAll('.font-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cardapio.marca.fonte = btn.getAttribute('data-fonte');
      renderEditor();
    });
  });

  // upload logo
  const logoInput = document.getElementById('upload-logo');
  if (logoInput) {
    logoInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { cardapio.marca.logoBase64 = ev.target.result; renderEditor(); };
      reader.readAsDataURL(file);
    });
  }

  // categorias: nome, toggle, delete, add item
  document.querySelectorAll('.cat-name-inp').forEach(inp => {
    inp.addEventListener('input', e => {
      const ci = parseInt(inp.getAttribute('data-cat'));
      cardapio.categorias[ci].nome = inp.value;
    });
  });
  document.querySelectorAll('.cat-header').forEach(header => {
    const ci = parseInt(header.getAttribute('data-cat'));
    const toggleSpan = header.querySelector('.cat-toggle');
    const body = header.nextElementSibling;
    header.addEventListener('click', e => {
      if (e.target.classList.contains('del-btn')) return;
      cardapio.categorias[ci].aberta = !cardapio.categorias[ci].aberta;
      toggleSpan.classList.toggle('open', cardapio.categorias[ci].aberta);
      body.classList.toggle('hidden', !cardapio.categorias[ci].aberta);
    });
  });
  document.querySelectorAll('[data-action="delCat"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const ci = parseInt(btn.getAttribute('data-cat'));
      if (confirm('Remover categoria?')) {
        cardapio.categorias.splice(ci, 1);
        renderEditor();
      }
    });
  });
  document.querySelectorAll('.add-item-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const ci = parseInt(btn.getAttribute('data-cat'));
      cardapio.categorias[ci].itens.push({ nome: '', desc: '', preco: 0, img: '' });
      renderEditor();
    });
  });
  // itens: nome, desc, preço, delete, upload image
  document.querySelectorAll('.prod-nome, .prod-desc, .prod-preco').forEach(field => {
    field.addEventListener('input', e => {
      const ci = parseInt(field.getAttribute('data-cat'));
      const ii = parseInt(field.getAttribute('data-item'));
      const fld = field.getAttribute('data-field');
      let value = field.value;
      if (fld === 'preco') value = parseFloat(value) || 0;
      cardapio.categorias[ci].itens[ii][fld] = value;
    });
  });
  document.querySelectorAll('[data-action="delItem"]').forEach(btn => {
    btn.addEventListener('click', e => {
      const ci = parseInt(btn.getAttribute('data-cat'));
      const ii = parseInt(btn.getAttribute('data-item'));
      cardapio.categorias[ci].itens.splice(ii, 1);
      renderEditor();
    });
  });
  document.querySelectorAll('.upload-item-img').forEach(inp => {
    inp.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const ci = parseInt(inp.getAttribute('data-cat'));
      const ii = parseInt(inp.getAttribute('data-item'));
      const reader = new FileReader();
      reader.onload = ev => {
        cardapio.categorias[ci].itens[ii].img = ev.target.result;
        renderEditor();
      };
      reader.readAsDataURL(file);
    });
  });

  // dias fechados
  document.querySelectorAll('.dia-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dia = parseInt(btn.getAttribute('data-dia'));
      const idx = cardapio.horario.diasFechados.indexOf(dia);
      if (idx === -1) cardapio.horario.diasFechados.push(dia);
      else cardapio.horario.diasFechados.splice(idx, 1);
      renderEditor();
    });
  });

  // bairros
  document.querySelectorAll('[data-bairro]').forEach(el => {
    el.addEventListener('input', e => {
      const i = parseInt(el.getAttribute('data-bairro'));
      const f = el.getAttribute('data-field');
      let val = el.value;
      if (f === 'taxa') val = parseFloat(val) || 0;
      cardapio.bairros[i][f] = val;
    });
  });
  document.querySelectorAll('[data-action="delBairro"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.getAttribute('data-bairro'));
      cardapio.bairros.splice(i, 1);
      renderEditor();
    });
  });
  const addBairroBtn = document.getElementById('add-bairro-btn');
  if (addBairroBtn) {
    addBairroBtn.addEventListener('click', () => {
      cardapio.bairros.push({ nome: '', taxa: 5 });
      renderEditor();
    });
  }

  // add categoria global
  const addCatBtn = document.querySelector('.add-cat-btn');
  if (addCatBtn) {
    addCatBtn.addEventListener('click', () => {
      cardapio.categorias.push({ nome: 'Nova Categoria', aberta: true, itens: [] });
      renderEditor();
    });
  }
}

function validarCardapio() {
  for (const cat of cardapio.categorias) {
    if (!cat.nome || cat.nome.trim() === '') {
      toast('Todas as categorias precisam de nome', 'err');
      return false;
    }
    for (const item of cat.itens) {
      if (!item.nome || item.nome.trim() === '') {
        toast(`Item sem nome na categoria ${cat.nome}`, 'err');
        return false;
      }
      if (isNaN(item.preco) || item.preco <= 0) {
        toast(`Preço inválido para ${item.nome}`, 'err');
        return false;
      }
    }
  }
  return true;
}

function salvarCard() {
  if (!validarCardapio()) return;
  salvar();
  log('save', 'Cardápio salvo');
  toast('💾 Salvo!', 'ok');
}

// ============================================
// EXPORTAÇÃO HTML (IMPRESSÃO)
// ============================================
function gerarHTMLCompleto() {
  const m = cardapio.marca;
  const c1 = m.corPrimaria;
  const c2 = m.corSecundaria;
  const h = cardapio.horario;
  const navBtns = cardapio.categorias.map((cat,ci) => `<button class="nb" onclick="sc(${ci})">${esc(cat.nome)}</button>`).join('');
  if (cardapio.bairros.length) navBtns += `<button class="nb" onclick="sc(-1)">🚗 Entrega</button>`;
  const sections = cardapio.categorias.map((cat,ci) => {
    const items = cat.itens.map(it => {
      const imgHtml = it.img ? `<img src="${it.img}" class="ii">` : '';
      return `
        <div class="ic">
          ${imgHtml}
          <div class="info">
            <div class="nm">${esc(it.nome)}</div>
            <div class="ds">${esc(it.desc)}</div>
            <div class="ft">
              <span class="pr">R$${it.preco.toFixed(2)}</span>
              ${m.whatsapp ? `<a class="pb" href="https://wa.me/${m.whatsapp}?text=${encodeURIComponent(it.nome)}">PEDIR</a>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    return `<div class="cs" id="s${ci}" style="display:${ci===0?'block':'none'}">${items}</div>`;
  }).join('');
  const bairrosHtml = cardapio.bairros.length ? `<div class="cs" id="s-1" style="display:none">${cardapio.bairros.map(b => `<div class="bc"><span>📍 ${esc(b.nome)}</span><b>+R$${b.taxa.toFixed(2)}</b></div>`).join('')}</div>` : '';
  const logoHtml = m.logoBase64 ? `<img class="logo" src="${m.logoBase64}">` : `<div class="logo-ph">${TIPOS.find(t=>t.id===cardapio.tipo)?.icon || '🍽'}</div>`;
  return `<!DOCTYPE html><html lang=pt-BR><head><meta charset=UTF-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${esc(m.nome)}</title><style>
    :root{--c1:${c1};--c2:${c2}}*{margin:0;padding:0;box-sizing:border-box}body{background:#090a0e;color:#f0f0f5;font-family:sans-serif;min-height:100vh}header{text-align:center;padding:36px 14px 16px;background:linear-gradient(180deg,${c1}18,transparent)}.logo{width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--c1);margin:0 auto 12px;display:block}.logo-ph{width:64px;height:64px;border-radius:50%;background:#1a0000;border:3px solid var(--c1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.6rem}h1{font-size:1.5rem;font-weight:900;letter-spacing:4px;color:#f0f0f5}.sub{font-size:.62rem;letter-spacing:2.5px;color:var(--c2);margin-top:5px}.badge{display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:14px;margin-top:11px;font-size:.62rem;font-weight:700}.ab{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);color:#10b981}.fc{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#ef4444}.dot{width:5px;height:5px;border-radius:50%;display:inline-block}.nav{padding:9px;display:flex;flex-wrap:wrap;gap:5px}.nb{padding:8px 12px;border-radius:9px;border:none;font-size:.68rem;font-weight:800;cursor:pointer;background:#1c1e24;color:#666}.nb.on{background:var(--c1);color:#fff}.cs{padding:7px 9px 70px}.ic{background:#141618;border-radius:10px;padding:12px;margin-bottom:7px;border:1px solid #222;display:flex;gap:9px;align-items:center}.ii{width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0}.nm{font-weight:800;font-size:.86rem;color:#f0f0f5;margin-bottom:2px}.ds{font-size:.7rem;color:#5a6080;margin-bottom:6px}.ft{display:flex;justify-content:space-between;align-items:center}.pr{font-family:monospace;font-weight:900;color:var(--c2)}.pb{background:var(--c1);color:#fff;padding:5px 11px;border-radius:6px;font-size:.64rem;font-weight:800;text-decoration:none}.bc{background:#141618;border-radius:9px;padding:12px 14px;margin-bottom:6px;border:1px solid #222;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:.84rem}.foot{text-align:center;padding:16px;color:#2a2d3a;font-size:.6rem;border-top:1px solid #1c1e24}
    </style></head><body><header>${logoHtml}<h1>${esc(m.nome)}</h1><div class="sub">${esc(m.subtitulo)}</div><div class="badge ab" id="bs"><span class="dot" id="bd" style="background:#10b981"></span> <span id="bx">...</span></div></header><div class="nav">${navBtns}</div>${sections}${bairrosHtml}<div class="foot">Cardápio · Labriolag LabSystem</div><script>
    var aH=${h.abreHora}, fH=${h.fechaHora}, fd=[${h.diasFechados.join(',')}];
    function ck(){var n=new Date(),ok=fd.indexOf(n.getDay())===-1&&n.getHours()>=aH&&n.getHours()<fH;document.getElementById("bs").className="badge "+(ok?"ab":"fc");document.getElementById("bd").style.background=ok?"#10b981":"#ef4444";document.getElementById("bx").textContent=ok?"ABERTO AGORA":"FECHADO"}
    ck();setInterval(ck,30000);
    document.querySelector(".nav").addEventListener("click",function(e){var b=e.target.closest(".nb");if(!b)return;var i=b.textContent==="🚗 Entrega"?-1:Array.from(document.querySelectorAll(".nb")).indexOf(b);document.querySelectorAll(".cs").forEach(function(s){s.style.display="none"});document.querySelectorAll(".nb").forEach(function(x,j){x.classList.toggle("on",j===Array.from(document.querySelectorAll(".nb")).indexOf(b))});var t=document.getElementById("s"+i);if(t)t.style.display="block"});
    document.querySelectorAll(".nb")[0].classList.add("on");
    <\/script></body></html>`;
}

function imprimirHTML() {
  if (creditos <= 0) {
    toast('Sem créditos! Compre em Config.', 'err');
    showScreen('config');
    return;
  }
  creditos--;
  salvar();
  log('print', 'Cardápio impresso (-1 crédito)');
  const html = gerarHTMLCompleto();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'cardapio-moraes-grill.html';
  a.click();
  toast('🖨 HTML baixado! (1 crédito)', 'ok');
}

// ============================================
// QR VIVO
// ============================================
function gerarHTMLMini(card = cardapio) {
  const m = card.marca;
  const c1 = m.corPrimaria || '#ef4444';
  const c2 = m.corSecundaria || '#f59e0b';
  const h = card.horario;
  const logoHtml = m.logoBase64
    ? `<img src="${m.logoBase64}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid ${c1};margin:0 auto 7px;display:block">`
    : `<div style="width:56px;height:56px;border-radius:50%;background:#1a0000;border:2px solid ${c1};display:flex;align-items:center;justify-content:center;margin:0 auto 7px;color:${c1};font-size:1.2rem">🍖</div>`;
  const nav = card.categorias.map((c, i) => `<button class="nb" data-i="${i}">${esc(c.nome).toUpperCase()}</button>`).join('');
  if (card.bairros.length) nav += `<button class="nb" data-i="-1">ENTREGA</button>`;
  const sections = card.categorias.map((cat, i) => {
    const items = cat.itens.map(it => {
      const imgHtml = it.img ? `<img src="${it.img}" style="width:54px;height:54px;object-fit:cover;border-radius:7px;flex-shrink:0">` : '';
      const pedir = m.whatsapp ? `<a href="https://wa.me/${m.whatsapp}?text=${encodeURIComponent(it.nome)}" style="background:${c1};color:#fff;padding:4px 9px;border-radius:5px;font-size:.62rem;font-weight:800;text-decoration:none">PEDIR</a>` : '';
      return `<div style="background:#141618;border-radius:9px;padding:10px;margin-bottom:5px;border:1px solid #222;display:flex;gap:8px;align-items:center">
        ${imgHtml}
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:.82rem;color:#f0f0f5;margin-bottom:2px">${esc(it.nome)}</div>
          ${it.desc ? `<div style="font-size:.66rem;color:#5a6080;margin-bottom:4px">${esc(it.desc)}</div>` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:monospace;color:${c2}">R$${it.preco.toFixed(2)}</b>${pedir}</div>
        </div>
      </div>`;
    }).join('');
    return `<div class="cs" id="s${i}" style="display:${i===0?'block':'none'}">${items}</div>`;
  }).join('');
  const bairrosHtml = card.bairros.length ? `<div class="cs" id="s-1" style="display:none">${card.bairros.map(b => `<div style="background:#141618;border-radius:8px;padding:10px 12px;margin-bottom:5px;border:1px solid #222;display:flex;justify-content:space-between"><span style="font-weight:700;font-size:.82rem;color:#e0e0e0">${esc(b.nome)}</span><b style="font-family:monospace;color:${c2}">+R$${b.taxa.toFixed(2)}</b></div>`).join('')}</div>` : '';
  const js = `
    var aH=${h.abreHora}, fH=${h.fechaHora}, fd=[${h.diasFechados.join(',')}];
    function ck(){var n=new Date(),ok=fd.indexOf(n.getDay())===-1&&n.getHours()>=aH&&n.getHours()<fH;var b=document.getElementById("bs");b.style.color=ok?"#10b981":"#ef4444";b.style.borderColor=ok?"rgba(16,185,129,.4)":"rgba(239,68,68,.4)";b.textContent=ok?"ABERTO":"FECHADO"}ck();setInterval(ck,60000);
    document.getElementById("nv").addEventListener("click",function(e){var b=e.target.closest("[data-i]");if(!b)return;var i=+b.dataset.i;document.querySelectorAll(".nb").forEach(function(x){x.classList.toggle("on",+x.dataset.i===i)});document.querySelectorAll(".cs").forEach(function(s){s.style.display="none"});var t=document.getElementById("s"+i);if(t)t.style.display="block"});
    document.querySelectorAll(".nb")[0].classList.add("on");
  `;
  return `<!DOCTYPE html><html lang=pt-BR><head><meta charset=UTF-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${esc(m.nome)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#090a0e;color:#f0f0f5;font-family:sans-serif;min-height:100vh}.nb{padding:6px 10px;border-radius:7px;border:none;font-size:.64rem;font-weight:800;cursor:pointer;background:#1c1e24;color:#666}.nb.on{background:${c1};color:#fff}.cs{padding:6px 8px 60px;display:none}</style></head><body><div style="text-align:center;padding:22px 12px 10px;background:linear-gradient(180deg,${c1}18,transparent)">${logoHtml}<div style="font-size:1.2rem;font-weight:900;letter-spacing:3px;color:#f0f0f5">${esc(m.nome)}</div>${m.subtitulo ? `<div style="font-size:.57rem;letter-spacing:2px;color:${c2};margin-top:3px">${esc(m.subtitulo)}</div>` : ''}<div id=bs style="display:inline-block;margin-top:8px;padding:3px 10px;border-radius:12px;font-size:.58rem;font-weight:700;border:1px solid;letter-spacing:.4px">...</div></div><div id=nv style="padding:6px;display:flex;flex-wrap:wrap;gap:4px">${nav}</div>${sections}${bairrosHtml}<div style="text-align:center;padding:12px;color:#2a2d3a;font-size:.56rem;border-top:1px solid #1c1e24">Cardapio Labriolag</div><script>${js}<\/script></body></html>`;
}

function reduzirCardapio(card) {
  const copy = JSON.parse(JSON.stringify(card));
  // remove imagens de itens
  copy.categorias.forEach(cat => {
    cat.itens.forEach(it => { it.img = ''; });
  });
  copy.marca.logoBase64 = '';
  return copy;
}

function gerarQRVivo() {
  qrCanvas = null;
  document.getElementById('download-qr-btn').disabled = true;
  const qrHero = document.getElementById('qr-hero');
  qrHero.innerHTML = '<div class="qr-loading">⚙ Calculando…</div>';

  setTimeout(() => {
    try {
      const MAX = 2953;
      let html = gerarHTMLMini(cardapio);
      let payload = 'data:text/html,' + html;
      let bytes = new TextEncoder().encode(payload).length;
      let warn = false;

      if (bytes > MAX) {
        const reduzido = reduzirCardapio(cardapio);
        html = gerarHTMLMini(reduzido);
        payload = 'data:text/html,' + html;
        bytes = new TextEncoder().encode(payload).length;
        warn = true;
      }

      if (bytes > MAX) {
        qrHero.innerHTML = `<div class="qr-err">❌ Cardápio grande demais (${bytes}/${MAX} bytes).<br>Reduza itens ou use "Publicar" + URL.</div>`;
        return;
      }

      // gerar QR
      let qrElement;
      try {
        qrElement = kjua({ text: payload, render: 'canvas', size: 256, quiet: 3, ecLevel: 'L', mode: 'Auto', fill: '#000', back: '#fff' });
      } catch (e) {
        const div = document.createElement('div');
        new QRCode(div, { text: payload, width: 256, height: 256, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.L });
        qrElement = div.querySelector('canvas') || div.querySelector('img');
      }

      const pct = Math.round(bytes / MAX * 100);
      qrHero.innerHTML = `
        <div class="qr-box" id="qr-box"></div>
        <div class="qr-stats">
          <div class="qs-stat"><div class="qs-num">${bytes}</div><div class="qs-label">bytes</div></div>
          <div class="qs-stat"><div class="qs-num">${pct}%</div><div class="qs-label">capacidade</div></div>
        </div>
        ${warn ? '<div class="qr-tip" style="color:var(--c2)">⚠️ Imagens removidas para caber</div>' : '<div class="qr-tip">✅ Abre offline · sem servidor</div>'}
      `;
      document.getElementById('qr-box').appendChild(qrElement);
      qrCanvas = document.querySelector('#qr-box canvas') || document.querySelector('#qr-box img');
      document.getElementById('download-qr-btn').disabled = false;
      log('qr', `QR Vivo gerado (${bytes} bytes)`);
    } catch (err) {
      qrHero.innerHTML = `<div class="qr-err">❌ ${err.message}</div>`;
    }
  }, 80);
}

function baixarQR() {
  if (!qrCanvas) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const src = qrCanvas;
  const sw = src.width || src.naturalWidth || 256;
  const sh = src.height || src.naturalHeight || 256;
  const P = 18, F = 62;
  canvas.width = sw + P*2;
  canvas.height = sh + P*2 + F;
  ctx.fillStyle = '#0a0c10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = cardapio.marca.corPrimaria;
  ctx.lineWidth = 2;
  ctx.strokeRect(P-4, P-4, sw+8, sh+8);
  ctx.fillStyle = '#fff';
  ctx.fillRect(P-2, P-2, sw+4, sh+4);
  if (src.tagName === 'CANVAS') ctx.drawImage(src, P, P);
  else { const img = new Image(); img.onload = () => ctx.drawImage(img, P, P); img.src = src.src; }
  const cx = canvas.width/2;
  ctx.fillStyle = cardapio.marca.corPrimaria;
  ctx.fillRect(P, sh+P+6, sw, 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0f0f5';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('MORAES GRILL', cx, sh+P+24);
  ctx.fillStyle = cardapio.marca.corSecundaria;
  ctx.font = '10px sans-serif';
  ctx.fillText('Escaneie para ver o cardapio', cx, sh+P+40);
  ctx.fillStyle = '#2a2d3a';
  ctx.font = '9px monospace';
  ctx.fillText('data:text/html · Labriolag', cx, sh+P+56);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'qr-moraes-grill.png';
  a.click();
  toast('📲 QR salvo!', 'ok');
}

// ============================================
// PUBLICAR GITHUB
// ============================================
async function publicarGH() {
  const token = config.ghToken;
  const user = config.ghUser || 'guilabriolag';
  const slug = config.slug || 'moraes-grill';
  if (!token) {
    toast('Configure o token GitHub em Config.', 'err');
    showScreen('config');
    return;
  }
  toast('🐙 Publicando…', 'info');
  const html = gerarHTMLCompleto();
  const content = utf8_to_b64(html);
  const url = `https://api.github.com/repos/${user}/${slug}/contents/index.html`;
  try {
    let sha = null;
    try {
      const r = await fetch(url, { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } });
      if (r.ok) {
        const d = await r.json();
        sha = d.sha;
      }
    } catch (e) {}
    const body = { message: `LabSystem Moraes: ${new Date().toLocaleString('pt-BR')}`, content };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      const pubUrl = `https://${user}.github.io/${slug}/`;
      log('pub', `Publicado em ${pubUrl}`);
      toast(`✅ Publicado! ${pubUrl}`, 'ok');
    } else {
      const err = await res.json();
      toast(`❌ ${err.message || res.status}`, 'err');
    }
  } catch (ex) {
    toast(`❌ Erro: ${ex.message}`, 'err');
  }
}

// ============================================
// COMANDA
// ============================================
function renderMesas() {
  let html = '';
  for (let i = 1; i <= 16; i++) {
    const itens = mesas[i] || [];
    const total = itens.reduce((s, x) => s + x.preco * x.qty, 0);
    const ocup = itens.length > 0;
    html += `<button class="mesa-btn ${mesaAtual === i ? 'active' : ''} ${ocup ? 'ocupada' : ''}" data-mesa="${i}">
      <span class="mesa-n">${i}</span>
      <span class="mesa-val">${ocup ? 'R$'+total.toFixed(0) : 'Livre'}</span>
    </button>`;
  }
  document.getElementById('mesas-grid').innerHTML = html;
  const ocups = Object.keys(mesas).some(k => mesas[k] && mesas[k].length > 0);
  document.getElementById('nav-dot-comanda').classList.toggle('show', ocups);
}

function selMesa(n) {
  mesaAtual = n;
  renderMesas();
  renderComanda();
  renderQuickCats();
}

function renderComanda() {
  document.getElementById('comanda-title').textContent = `Mesa ${mesaAtual}`;
  const itens = mesas[mesaAtual] || [];
  let total = 0;
  const html = itens.map((it, i) => {
    total += it.preco * it.qty;
    return `
      <div class="ci">
        <span class="ci-nome">${esc(it.nome)}</span>
        <div class="ci-ctrl">
          <button class="ci-ctrl-btn" data-ctrl="qty" data-idx="${i}" data-delta="-1">−</button>
          <span class="ci-qty">${it.qty}</span>
          <button class="ci-ctrl-btn" data-ctrl="qty" data-idx="${i}" data-delta="1">+</button>
        </div>
        <span class="ci-preco">R$${it.preco.toFixed(2)}</span>
      </div>
    `;
  }).join('');
  document.getElementById('comanda-items').innerHTML = html || '<div style="color:var(--muted);font-size:.78rem;padding:8px 0">Mesa vazia.</div>';
  document.getElementById('ct-val').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

  // bind qty buttons
  document.querySelectorAll('[data-ctrl="qty"]').forEach(btn => {
    btn.removeEventListener('click', qtyHandler);
    btn.addEventListener('click', qtyHandler);
  });
}

function qtyHandler(e) {
  const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
  const delta = parseInt(e.currentTarget.getAttribute('data-delta'));
  chgQty(idx, delta);
}

function chgQty(idx, delta) {
  if (!mesas[mesaAtual]) return;
  const item = mesas[mesaAtual][idx];
  item.qty += delta;
  if (item.qty <= 0) mesas[mesaAtual].splice(idx, 1);
  salvar();
  renderMesas();
  renderComanda();
}

function renderQuickCats() {
  const html = cardapio.categorias.map(cat => {
    const items = cat.itens.map(it => `
      <div class="quick-item" data-nome="${esc(it.nome)}" data-preco="${it.preco}">
        <span class="quick-item-nome">${esc(it.nome)}</span>
        <span class="quick-item-preco">R$${it.preco.toFixed(2)}</span>
      </div>
    `).join('');
    return `<div class="cat-quick"><div class="cat-quick-title">${esc(cat.nome)}</div><div class="quick-items">${items}</div></div>`;
  }).join('');
  document.getElementById('quick-cats').innerHTML = html;
  document.querySelectorAll('.quick-item').forEach(el => {
    el.removeEventListener('click', quickAddHandler);
    el.addEventListener('click', quickAddHandler);
  });
}

function quickAddHandler(e) {
  const target = e.currentTarget;
  const nome = target.getAttribute('data-nome');
  const preco = parseFloat(target.getAttribute('data-preco'));
  quickAdd(nome, preco);
}

function quickAdd(nome, preco) {
  if (!mesas[mesaAtual]) mesas[mesaAtual] = [];
  const existing = mesas[mesaAtual].find(x => x.nome === nome && x.preco === preco);
  if (existing) existing.qty++;
  else mesas[mesaAtual].push({ nome, preco, qty: 1 });
  salvar();
  renderMesas();
  renderComanda();
  toast(`+ ${nome}`, 'ok');
}

function addItemComanda() {
  const nome = document.getElementById('ci-nome').value.trim();
  const preco = parseFloat(document.getElementById('ci-preco').value) || 0;
  if (!nome) { toast('Informe o item.', 'err'); return; }
  if (preco <= 0) { toast('Preço deve ser maior que zero.', 'err'); return; }
  if (!mesas[mesaAtual]) mesas[mesaAtual] = [];
  const existing = mesas[mesaAtual].find(x => x.nome === nome && x.preco === preco);
  if (existing) existing.qty++;
  else mesas[mesaAtual].push({ nome, preco, qty: 1 });
  document.getElementById('ci-nome').value = '';
  document.getElementById('ci-preco').value = '';
  salvar();
  renderMesas();
  renderComanda();
}

function gerarConta(mesa, itens, total) {
  const m = cardapio.marca;
  const c1 = m.corPrimaria;
  const linhas = itens.map(it => `
    <tr>
      <td>${esc(it.nome)}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">R$${it.preco.toFixed(2)}</td>
      <td style="text-align:right;font-weight:900">R$${(it.preco * it.qty).toFixed(2)}</td>
    </tr>
  `).join('');
  return `<!DOCTYPE html><html><head><meta charset=UTF-8><title>Conta Mesa ${mesa}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;padding:16px;font-size:13px;max-width:380px}h2{text-align:center;letter-spacing:3px;font-size:.9rem;margin-bottom:2px}h3{text-align:center;color:${c1};font-size:.7rem;letter-spacing:2px;margin-bottom:12px}.sep{border:none;border-top:1px dashed #ccc;margin:8px 0}table{width:100%;border-collapse:collapse}th{padding:4px 0;border-bottom:1px solid #ccc;font-size:.65rem;text-align:left}td{padding:4px 0;font-size:.78rem}.tot{text-align:right;font-size:1.1rem;font-weight:900;margin-top:10px;color:${c1}}.foot{margin-top:12px;font-size:.6rem;text-align:center;color:#999}@media print{@page{margin:4mm}}</style></head><body><h2>${esc(m.nome).toUpperCase()}</h2><h3>MESA ${mesa} · CONTA</h3><hr class=sep><table><tr><th>Item</th><th style="text-align:center">Qtd</th><th style="text-align:right">Un.</th><th style="text-align:right">Total</th></tr>${linhas}</table><hr class=sep><div class=tot>TOTAL: R$ ${total.toFixed(2)}</div><div class=foot>${new Date().toLocaleString('pt-BR')} · Labriolag</div></body></html>`;
}

function fecharConta() {
  if (creditos <= 0) { toast('Sem créditos!', 'err'); showScreen('config'); return; }
  const itens = mesas[mesaAtual] || [];
  if (!itens.length) { toast('Mesa vazia.', 'err'); return; }
  const total = itens.reduce((s, x) => s + x.preco * x.qty, 0);
  creditos--;
  salvar();
  log('comanda', `Mesa ${mesaAtual} fechada — R$${total.toFixed(2)}`);
  const html = gerarConta(mesaAtual, itens, total);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `conta-mesa-${mesaAtual}.html`;
  a.click();
  mesas[mesaAtual] = [];
  salvar();
  renderMesas();
  renderComanda();
  toast(`🖨 Conta impressa! Mesa ${mesaAtual} liberada.`, 'ok');
}

// ============================================
// CONFIGURAÇÕES
// ============================================
function renderConfig() {
  document.getElementById('cfg-credit-num').textContent = creditos;
  document.getElementById('cfg-gh-token').value = config.ghToken || '';
  document.getElementById('cfg-gh-user').value = config.ghUser || 'guilabriolag';
  document.getElementById('cfg-slug').value = config.slug || 'moraes-grill';
  document.getElementById('cfg-bipa').value = config.bipa || 'labriolag@bipa.app';
  document.getElementById('cfg-pix').value = config.pix || '';
  document.getElementById('cfg-preco').value = config.precoCred || 2;
  document.getElementById('pix-key-disp').textContent = config.pix || '—';
  atualizarTotal();
}

function salvarConfig() {
  config.ghToken   = document.getElementById('cfg-gh-token').value.trim();
  config.ghUser    = document.getElementById('cfg-gh-user').value.trim() || 'guilabriolag';
  config.slug      = document.getElementById('cfg-slug').value.trim() || 'moraes-grill';
  config.bipa      = document.getElementById('cfg-bipa').value.trim();
  config.pix       = document.getElementById('cfg-pix').value.trim();
  config.precoCred = parseFloat(document.getElementById('cfg-preco').value) || 2;
  salvar();
  toast('⚙ Configurações salvas!', 'ok');
}

function switchPayTab(tab) {
  payTab = tab;
  document.querySelectorAll('.pay-tab').forEach((btn, idx) => {
    btn.classList.toggle('active', (idx === 0 && tab === 'lightning') || (idx === 1 && tab === 'pix'));
  });
  document.querySelectorAll('.pay-panel').forEach((panel, idx) => {
    panel.classList.toggle('active', (idx === 0 && tab === 'lightning') || (idx === 1 && tab === 'pix'));
  });
}

function atualizarTotal() {
  const qty = parseInt(document.getElementById('pay-qty')?.value) || 1;
  const preco = config.precoCred || 2;
  const el = document.getElementById('pay-total-label');
  if (el) el.textContent = `${qty} crédito${qty>1?'s':''} = R$ ${(qty*preco).toFixed(2)}`;
}

async function gerarInvoice() {
  const qty = parseInt(document.getElementById('pay-qty').value) || 1;
  const preco = (config.precoCred || 2) * qty;
  const bipa = config.bipa || 'labriolag@bipa.app';
  const box = document.getElementById('invoice-box');
  box.textContent = '⏳ Gerando invoice…';
  try {
    const sats = Math.ceil(preco * 1000);
    const [user, domain] = bipa.split('@');
    const res = await fetch(`https://${domain}/.well-known/lnurlp/${user}`);
    const lnurl = await res.json();
    const inv = await fetch(`${lnurl.callback}?amount=${sats*1000}`);
    const d = await inv.json();
    if (d.pr) {
      box.innerHTML = `<div style="word-break:break-all;margin-bottom:8px;font-size:.68rem">${d.pr}</div>
        <button id="lightning-confirm-btn" style="background:var(--c2);border:none;color:#000;padding:7px 14px;border-radius:7px;font-weight:800;font-size:.74rem;cursor:pointer;width:100%">✅ Já paguei (${qty} créditos)</button>`;
      document.getElementById('lightning-confirm-btn')?.addEventListener('click', confirmarLightning);
    } else {
      box.innerHTML = `<div>❌ Erro. Tente PIX.</div>`;
    }
  } catch (ex) {
    box.innerHTML = `<div style="color:var(--c2);margin-bottom:8px">⚠️ LNURL offline. Confirme manualmente:</div>
      <button id="lightning-confirm-btn" style="background:var(--c2);border:none;color:#000;padding:7px 14px;border-radius:7px;font-weight:800;font-size:.74rem;cursor:pointer;width:100%">✅ Confirmar pagamento</button>`;
    document.getElementById('lightning-confirm-btn')?.addEventListener('click', confirmarLightning);
  }
}

function confirmarLightning() {
  const qty = parseInt(document.getElementById('pay-qty')?.value) || 1;
  creditos += qty;
  salvar();
  document.getElementById('cfg-credit-num').textContent = creditos;
  log('print', `⚡ +${qty} créditos Lightning`);
  toast(`⚡ +${qty} créditos adicionados!`, 'ok');
  document.getElementById('invoice-box').textContent = 'Créditos adicionados!';
}

function confirmarPIX() {
  const qty = parseInt(document.getElementById('pay-qty-pix')?.value) || 1;
  const obs = document.getElementById('pix-obs')?.value;
  log('print', `🏦 PIX enviado: ${qty} créditos (${obs})`);
  toast('PIX enviado! Aguardando aprovação.', 'info');
  if (document.getElementById('pix-obs')) document.getElementById('pix-obs').value = '';
}

// ============================================
// EVENT BINDING
// ============================================
function bindGlobalEvents() {
  // Navegação via botões (cards, nav, etc)
  document.querySelectorAll('[data-screen]').forEach(el => {
    el.addEventListener('click', (e) => {
      const screen = el.getAttribute('data-screen');
      if (screen) showScreen(screen);
    });
  });
  document.querySelectorAll('.mod-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const screen = card.getAttribute('data-screen');
      if (screen) showScreen(screen);
    });
  });
  document.querySelectorAll('.ctab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchEdTab(tab);
    });
  });
  document.getElementById('save-card-btn')?.addEventListener('click', salvarCard);
  document.getElementById('print-html-btn')?.addEventListener('click', imprimirHTML);
  document.getElementById('publish-gh-btn')?.addEventListener('click', publicarGH);
  document.getElementById('publish-qr-btn')?.addEventListener('click', () => { showScreen('qr'); gerarQRVivo(); });
  document.getElementById('download-qr-btn')?.addEventListener('click', baixarQR);
  document.getElementById('fechar-conta-btn')?.addEventListener('click', fecharConta);
  document.getElementById('add-item-manual-btn')?.addEventListener('click', addItemComanda);
  document.getElementById('save-config-btn')?.addEventListener('click', salvarConfig);
  document.querySelectorAll('.pay-tab').forEach((tab, idx) => {
    tab.addEventListener('click', () => switchPayTab(idx === 0 ? 'lightning' : 'pix'));
  });
  document.getElementById('generate-invoice-btn')?.addEventListener('click', gerarInvoice);
  document.getElementById('confirm-lightning-btn')?.addEventListener('click', confirmarLightning);
  document.getElementById('confirm-pix-btn')?.addEventListener('click', confirmarPIX);
  // atualização total no campo qty
  document.getElementById('pay-qty')?.addEventListener('input', atualizarTotal);

  // eventos de mesa
  document.getElementById('mesas-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.mesa-btn');
    if (btn) {
      const mesa = parseInt(btn.getAttribute('data-mesa'));
      if (!isNaN(mesa)) selMesa(mesa);
    }
  });
}

// ============================================
// INICIALIZAÇÃO
// ============================================
function init() {
  carregar();
  checkStatus();
  setInterval(checkStatus, 60000);
  renderDash();
  bindGlobalEvents();
  // primeira exibição
  showScreen('dash');
}

init();

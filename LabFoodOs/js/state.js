/* ========================================
   LABFOOD OS — state.js
   Banco de dados local (localStorage) com
   sistema de eventos para UI reativa.
   ======================================== */

const STATE = (() => {
  const KEYS = {
    PRODS:  'lab_prods',
    ORDERS: 'lab_orders',
    SETUP:  'lab_setup',
    KEYS:   'lab_keys',
  };

  const _listeners = {};

  function _load(k, def) {
    try { return JSON.parse(localStorage.getItem(k)) ?? def; }
    catch { return def; }
  }

  function _save(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
    _emit(k);
  }

  function _emit(k) {
    (_listeners[k] || []).forEach(fn => fn());
    (_listeners['*'] || []).forEach(fn => fn(k));
  }

  function on(k, fn) {
    if (!_listeners[k]) _listeners[k] = [];
    _listeners[k].push(fn);
  }

  /* ── DEFAULTS ─────────────── */
  const DEFAULTS = {
    prods: [
      { id: 'p1', name: 'X-Burguer Clássico', cat: 'Lanches', price: 28.90, emoji: '🍔', desc: 'Pão brioche, blend artesanal, queijo prato, alface, tomate', active: true },
      { id: 'p2', name: 'Pizza Margherita', cat: 'Pizzas', price: 42.00, emoji: '🍕', desc: 'Molho de tomate, mussarela fior di latte, manjericão', active: true },
      { id: 'p3', name: 'Frango Grelhado', cat: 'Pratos', price: 35.00, emoji: '🍗', desc: 'Filé grelhado, arroz, feijão, salada', active: true },
      { id: 'p4', name: 'Suco Natural', cat: 'Bebidas', price: 9.90, emoji: '🥤', desc: 'Laranja, limão ou maracujá', active: true },
      { id: 'p5', name: 'Coca-Cola 350ml', cat: 'Bebidas', price: 6.00, emoji: '🥫', desc: 'Gelada', active: true },
      { id: 'p6', name: 'Brownie', cat: 'Sobremesas', price: 12.00, emoji: '🍫', desc: 'Chocolate meio amargo com nozes', active: true },
    ],
    orders: [],
    setup: { storeName: 'LabFood OS', whatsapp: '', storeOpen: true, tableMode: false },
    keys: [
      { key: 'ADMIN', pass: '1234', role: 'A', name: 'Administrador' },
      { key: 'CAIXA', pass: '0000', role: 'C', name: 'Caixa' },
    ],
  };

  /* ── PUBLIC API ───────────── */
  return {
    KEYS,

    /* Products */
    get prods()  { return _load(KEYS.PRODS,  DEFAULTS.prods);  },
    set prods(v) { _save(KEYS.PRODS, v);  },

    /* Orders */
    get orders()  { return _load(KEYS.ORDERS, DEFAULTS.orders); },
    set orders(v) { _save(KEYS.ORDERS, v); },

    /* Setup */
    get setup()  { return _load(KEYS.SETUP,  DEFAULTS.setup);  },
    set setup(v) { _save(KEYS.SETUP, v);  },

    /* Access Keys */
    get keys()  { return _load(KEYS.KEYS,   DEFAULTS.keys);   },
    set keys(v) { _save(KEYS.KEYS, v);   },

    /* Auth */
    user: null,

    /* Cart (session only, não persiste) */
    cart: [],

    /* Helpers */
    newOrder(items, total, name, note) {
      const o = {
        id: 'OS-' + Date.now().toString(36).toUpperCase(),
        ts: Date.now(),
        items,
        total,
        name: name || 'Balcão',
        note: note || '',
        status: 'novo', // novo | preparo | pronto | entregue
      };
      const arr = this.orders;
      arr.unshift(o);
      this.orders = arr;
      return o;
    },

    updateOrderStatus(id, status) {
      const arr = this.orders.map(o => o.id === id ? { ...o, status } : o);
      this.orders = arr;
    },

    todayOrders() {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      return this.orders.filter(o => o.ts >= start.getTime());
    },

    todayRevenue() {
      return this.todayOrders().reduce((s, o) => s + o.total, 0);
    },

    on,
  };
})();

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  LAB-X v8 — Cloudflare Worker                                       ║
 * ║  Motor de Data Intelligence + Cardápio Digital                      ║
 * ║  LABRIOLAG Holding · labriolag.shop                                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * NOVOS ENDPOINTS v8 (Cobrança por QR Code — R$ 2,50/ativação):
 *
 * ─── AUTENTICADOS (X-API-Key) ──────────────────────────────────────────
 *   POST /cardapio/salvar        → Salva/atualiza cardápio da loja (sem cobrar)
 *   POST /cardapio/ativar-qr     → Ativa QR público (consome 1 qrCredit)
 *   GET  /cardapio/meu           → Retorna cardápio + status de ativação
 *   GET  /cardapio/qr-url        → Retorna URL pública do cardápio
 *
 * ─── PÚBLICOS (sem autenticação) ───────────────────────────────────────
 *   GET  /menu/:lojaId           → Cardápio público (somente se qrAtivado=true)
 *
 * ESTRUTURA DO KV:
 *   auth:{apiKey}               → Perfil (owner, tier, credits, qrCredits, ...)
 *   cardapio:{apiKey}           → JSON completo do cardápio (qrAtivado flag)
 *   cardapio_slug:{slug}        → apiKey do dono (índice reverso)
 *   qr_log:{apiKey}:{ts}        → Log de cada ativação de QR (auditoria)
 */

// ─── CORS ──────────────────────────────────────────────────────────────────
function corsHeaders(env, request) {
  const allowed = env.ALLOWED_ORIGIN || '*';
  const origin  = request.headers.get('Origin') || '';
  const useOrigin = (allowed === '*') ? '*' : (origin === allowed ? origin : allowed);
  return {
    'Access-Control-Allow-Origin':  useOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Admin-Secret',
    'Content-Type': 'application/json',
  };
}

// ─── TTL ───────────────────────────────────────────────────────────────────
const TTL = {
  BCB:      60 * 60 * 4,
  IBGE:     60 * 60 * 24,
  ANALISE:  60 * 60 * 24 * 90,
  RATE:     60,
  CARDAPIO: 60 * 60 * 24 * 365, // 1 ano
};

const BCB = { SELIC: 11, IPCA: 433, IBCBR: 24363, CAMBIO: 1 };

const BOUNDS = {
  SELIC:        { min: 2.0,   max: 15.0  },
  IPCA:         { min: 0.0,   max: 1.5   },
  IBCBR:        { min: 95.0,  max: 145.0 },
  empresas_pop: { min: 0.005, max: 0.12  },
};

const minmax = (v, min, max) => Math.max(0, Math.min(1, (v - min) / (max - min)));
const clamp  = v => Math.max(0, Math.min(10, v));
const r2     = v => Number(v.toFixed(2));
const avg    = arr => arr.reduce((s, v) => s + v, 0) / arr.length;

function ok(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}
function err(message, status = 400, headers = {}) {
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

// ─── AUTH ──────────────────────────────────────────────────────────────────
async function getAuth(env, apiKey) {
  if (!apiKey || !apiKey.startsWith('sk_lab_')) return null;
  const raw = await env.LABX_KV.get(`auth:${apiKey}`).catch(() => null);
  if (!raw) return null;
  return JSON.parse(raw);
}

async function checkRateLimit(env, apiKey) {
  const key   = `rate:${apiKey}:${Math.floor(Date.now() / 60000)}`;
  const count = parseInt(await env.LABX_KV.get(key).catch(() => '0')) || 0;
  if (count >= 30) return false;
  await env.LABX_KV.put(key, String(count + 1), { expirationTtl: TTL.RATE });
  return true;
}

// ─── BCB / IBGE (mantidos do v6) ──────────────────────────────────────────
async function fetchBCB(serie) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/1?formato=json`;
  const r = await fetch(url, { cf: { cacheTtl: TTL.BCB, cacheEverything: true } });
  if (!r.ok) throw new Error(`BCB ${serie}: ${r.status}`);
  const d = await r.json();
  return d[d.length - 1];
}

async function fetchIBGEEmpresas(cod) {
  const url = `https://apisidra.ibge.gov.br/values/t/6321/n6/${cod}/v/allxp/p/last%201/f/u`;
  const r = await fetch(url, { cf: { cacheTtl: TTL.IBGE, cacheEverything: true } });
  if (!r.ok) throw new Error(`IBGE Empresas: ${r.status}`);
  const d = await r.json();
  const row = d.find(x => x.V && x.V !== '-') || d[1];
  return row ? parseInt(row.V.replace(/\./g, ''), 10) || 0 : 0;
}

async function fetchIBGEPessoal(cod) {
  const url = `https://apisidra.ibge.gov.br/values/t/6579/n6/${cod}/v/allxp/p/last%201/f/u`;
  const r = await fetch(url, { cf: { cacheTtl: TTL.IBGE, cacheEverything: true } });
  if (!r.ok) throw new Error(`IBGE Pessoal: ${r.status}`);
  const d = await r.json();
  const row = d.find(x => x.V && x.V !== '-') || d[1];
  return row ? parseInt(row.V.replace(/\./g, ''), 10) || 0 : 0;
}

async function fetchIBGEPopulacao(cod) {
  const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${cod}`);
  if (!r.ok) return { nome: 'Município', pop: 50000 };
  const m = await r.json();
  return { nome: m.nome || 'Município', pop: 50000 };
}

// ─── MOTOR VETORIAL 16D (mantido do v6) ───────────────────────────────────
function calcularVetores({ renda, cnpjs, populacao, pib, modo = 1.0, bcbData = {}, ibgeData = {} }) {
  const { selic = 10.5, ipca = 0.44, ibcbr = 118 } = bcbData;
  const rN = Math.min(renda / 5000, 1);
  const dN = Math.min(cnpjs / 200, 1);
  const pN = Math.min(populacao / 500000, 1);
  const gN = Math.min(pib / 200, 1);
  const selicN = minmax(selic, BOUNDS.SELIC.min, BOUNDS.SELIC.max);
  const ipcaN  = minmax(ipca,  0, 1.5);
  const ibcN   = minmax(ibcbr, BOUNDS.IBCBR.min, BOUNDS.IBCBR.max);
  const sat = dN > 0.7 ? (dN - 0.7) * 3 : 0;
  const liq = (rN + gN) / 2;
  const inovFator = ibcN > 0.5 ? 1.1 : 0.9;
  const N = clamp((gN * 8 + pN * 2) * modo);
  const S = clamp((dN * 5 + (ibgeData.pessoal ? Math.min(ibgeData.pessoal / 50000, 1) : dN) * 3 + rN * 2) * modo);
  const L = clamp(((1 - sat) * 6 + liq * 3 + ibcN * 1) * modo);
  const O = clamp((rN * 4 + gN * 4 + (1 - selicN) * 2) * modo);
  const NE = clamp(((N + L) / 2 * 0.9) * modo);
  const SE = clamp((gN * 6 + ibcN * 2 + rN * 2) * 0.9 * modo);
  const SO = clamp((sat * 4 + selicN * 4 + (1 - liq) * 2) * 0.8 * modo);
  const NO = clamp(((N + O) / 2 * 0.9) * modo);
  const NNE = clamp(((NE + N) / 2 * 0.85) * modo);
  const ENE = clamp((liq * 6 + pN * 2 + (1 - ipcaN) * 2) * 0.8 * modo);
  const ESE = clamp((dN * 4 + rN * 3 + ibcN * 3) * 0.8 * modo);
  const SSE = clamp(((ibcN * 7 + (1 - ipcaN) * 3) * 0.85) * modo);
  const SSO = clamp((selicN * 5 + sat * 3 + (1 - gN) * 2) * 0.8 * modo);
  const OSO = clamp((sat * 8 + dN * 2) * 0.8 * modo);
  const ONO = clamp(((NO + NE) / 2 * inovFator * 0.85) * modo);
  const NNO = clamp(((N * 0.5 + pN * 3 + ibcN * 1.5) * 0.8) * modo);
  const vetores = { N:r2(N),S:r2(S),L:r2(L),O:r2(O),NE:r2(NE),SE:r2(SE),SO:r2(SO),NO:r2(NO),NNE:r2(NNE),ENE:r2(ENE),ESE:r2(ESE),SSE:r2(SSE),SSO:r2(SSO),OSO:r2(OSO),ONO:r2(ONO),NNO:r2(NNO) };
  const card = [N,S,L,O]; const cola = [NE,SE,SO,NO]; const sub = [NNE,ENE,ESE,SSE,SSO,OSO,ONO,NNO];
  const iac = r2(avg(card)*0.5+avg(cola)*0.3+avg(sub)*0.2);
  const entries = Object.entries(vetores);
  const dom = [...entries].sort((a,b)=>b[1]-a[1])[0][0];
  const neg = entries.filter(([,v])=>v<4).map(([k])=>k);
  const crit = entries.filter(([k,v])=>['N','S','L','O','NE','SE','SO','NO'].includes(k)&&v<5).map(([k])=>k);
  const mediaGeral = r2(avg(Object.values(vetores)));
  return { vetores, iac, dom, neg, crit, mediaGeral };
}

// ─── SLUG GENERATOR ────────────────────────────────────────────────────────
function gerarSlug(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);
}

// ══════════════════════════════════════════════════════════════════════════
//  HANDLER PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const CH  = corsHeaders(env, request);

    // OPTIONS (preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CH });
    }

    // ── GET /health ────────────────────────────────────────────────────────
    if (url.pathname === '/health') {
      return ok({ status: 'ok', version: 'v8', ts: new Date().toISOString() }, 200, CH);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ROTA PÚBLICA — Cardápio do cliente (via QR Code)
    //  GET /menu/:lojaId
    // ══════════════════════════════════════════════════════════════════════
    if (url.pathname.startsWith('/menu/') && request.method === 'GET') {
      const lojaId = url.pathname.replace('/menu/', '').trim();
      if (!lojaId) return err('ID de loja não informado', 400, CH);

      // Busca pelo slug → encontra apiKey
      const apiKeyDono = await env.LABX_KV.get(`cardapio_slug:${lojaId}`).catch(() => null);
      if (!apiKeyDono) return err('Cardápio não encontrado', 404, CH);

      const raw = await env.LABX_KV.get(`cardapio:${apiKeyDono}`).catch(() => null);
      if (!raw) return err('Cardápio não encontrado', 404, CH);

      const cardapio = JSON.parse(raw);

      // v8: QR Code só é acessível após ativação paga
      if (!cardapio.qrAtivado) {
        return err('Este cardápio ainda não foi ativado. O comerciante precisa ativar o QR Code no painel.', 402, {
          ...CH, 'Cache-Control': 'no-store',
        });
      }

      // Nunca expõe a apiKey na resposta pública
      const { _apiKey, ...publico } = cardapio;
      return ok({ ...publico, ts: new Date().toISOString() }, 200, {
        ...CH,
        // Cache de 30s no browser — atualização quase em tempo real
        'Cache-Control': 'public, max-age=30',
      });
    }

    // ── GET /feed ──────────────────────────────────────────────────────────
    if (url.pathname === '/feed' && request.method === 'GET') {
      try {
        const cached = await env.LABX_KV.get('feed:macro:v6').catch(() => null);
        if (cached) return ok({ ...JSON.parse(cached), cached: true }, 200, CH);
        const [s, i, b, c] = await Promise.all([
          fetchBCB(BCB.SELIC), fetchBCB(BCB.IPCA), fetchBCB(BCB.IBCBR), fetchBCB(BCB.CAMBIO),
        ]);
        const feed = { selic: s, ipca: i, ibcbr: b, cambio: c, capturedAt: new Date().toISOString() };
        await env.LABX_KV.put('feed:macro:v6', JSON.stringify(feed), { expirationTtl: TTL.BCB });
        return ok(feed, 200, CH);
      } catch (e) {
        return err('BCB indisponível: ' + e.message, 503, CH);
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ROTA PÚBLICA — POST /pedido/enviar  (v8.1)
    //  Chamada pelo menu.html — identifica loja pelo slug, grava no KV
    //  e devolve o telefone do lojista para o WhatsApp ser aberto no client
    // ══════════════════════════════════════════════════════════════════════
    if (url.pathname === '/pedido/enviar' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body) return err('Payload inválido', 400, CH);

      const { slug, itens, identificacao, total, obs } = body;
      if (!slug)           return err('slug obrigatório', 400, CH);
      if (!itens?.length)  return err('Carrinho vazio', 400, CH);
      if (!identificacao?.trim()) return err('Informe o nome ou número da mesa', 400, CH);

      // Resolve loja pelo slug
      const donoKey = await env.LABX_KV.get(`cardapio_slug:${slug}`).catch(() => null);
      if (!donoKey) return err('Loja não encontrada', 404, CH);

      const cardapioRaw = await env.LABX_KV.get(`cardapio:${donoKey}`).catch(() => null);
      if (!cardapioRaw) return err('Cardápio não encontrado', 404, CH);

      const cardapio = JSON.parse(cardapioRaw);

      // Bloqueia pedido se QR não ativado
      if (!cardapio.qrAtivado) {
        return err('Esta loja ainda não ativou o sistema de pedidos.', 403, CH);
      }

      // Monta e persiste o pedido (TTL 7 dias — base para painel v8.2)
      const pedidoId = `PED-${Date.now().toString(36).toUpperCase()}`;
      const pedido = {
        id:           pedidoId,
        slug,
        nomeLoja:     cardapio.nomeLoja,
        identificacao: identificacao.trim(),
        itens,          // [{ nome, preco, qty }]
        total,
        obs:          obs?.trim() || '',
        status:       'novo',
        criadoEm:     new Date().toISOString(),
      };

      await env.LABX_KV.put(
        `pedidos:${donoKey}:${Date.now()}`,
        JSON.stringify(pedido),
        { expirationTtl: 60 * 60 * 24 * 7 }
      );

      // Devolve telefone para o menu.html montar o link wa.me
      return ok({
        ok:       true,
        pedidoId,
        telefone: cardapio.telefone || '',
        nomeLoja: cardapio.nomeLoja,
      }, 201, CH);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ROTAS ADMIN
    // ══════════════════════════════════════════════════════════════════════
    const adminSecret = request.headers.get('X-Admin-Secret');
    if (url.pathname.startsWith('/admin/')) {
      if (!env.LABX_ADMIN_SECRET || adminSecret !== env.LABX_ADMIN_SECRET) {
        return err('Não autorizado', 401, CH);
      }

      // POST /admin/keys — cria nova chave
      if (url.pathname === '/admin/keys' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { owner = 'Anônimo', tier = 'starter', credits = 5, qrCredits = 0 } = body;
        const key = `sk_lab_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        // v8: qrCredits separado de credits (motor 16D)
        const profile = { owner, tier, credits, qrCredits, active: true, createdAt: new Date().toISOString(), usageTotal: 0 };
        const slugIndex = `keys:idx:${Date.now()}`;
        await env.LABX_KV.put(`auth:${key}`, JSON.stringify(profile), { expirationTtl: TTL.CARDAPIO });
        await env.LABX_KV.put(slugIndex, key, { expirationTtl: TTL.CARDAPIO });
        return ok({ ok: true, key, profile }, 201, CH);
      }

      // GET /admin/keys
      if (url.pathname === '/admin/keys' && request.method === 'GET') {
        const list = await env.LABX_KV.list({ prefix: 'keys:idx:' });
        const keys = await Promise.all(list.keys.map(async k => {
          const apiKey = await env.LABX_KV.get(k.name).catch(() => null);
          if (!apiKey) return null;
          const raw = await env.LABX_KV.get(`auth:${apiKey}`).catch(() => null);
          if (!raw) return null;
          return { key: apiKey, ...JSON.parse(raw) };
        }));
        return ok({ keys: keys.filter(Boolean) }, 200, CH);
      }

      // PATCH /admin/keys/:key
      if (url.pathname.startsWith('/admin/keys/sk_lab_') && request.method === 'PATCH') {
        const key = url.pathname.replace('/admin/keys/', '');
        const raw = await env.LABX_KV.get(`auth:${key}`).catch(() => null);
        if (!raw) return err('Chave não encontrada', 404, CH);
        const profile = JSON.parse(raw);
        const body = await request.json().catch(() => ({}));
        if (body.credits   !== undefined) profile.credits   = (profile.credits   || 0) + body.credits;
        if (body.qrCredits !== undefined) profile.qrCredits = (profile.qrCredits || 0) + body.qrCredits;
        if (body.tier      !== undefined) profile.tier      = body.tier;
        if (body.active    !== undefined) profile.active    = body.active;
        await env.LABX_KV.put(`auth:${key}`, JSON.stringify(profile), { expirationTtl: TTL.CARDAPIO });
        return ok({ ok: true, profile }, 200, CH);
      }

      // DELETE /admin/keys/:key
      if (url.pathname.startsWith('/admin/keys/sk_lab_') && request.method === 'DELETE') {
        const key = url.pathname.replace('/admin/keys/', '');
        const raw = await env.LABX_KV.get(`auth:${key}`).catch(() => null);
        if (!raw) return err('Chave não encontrada', 404, CH);
        const profile = JSON.parse(raw);
        profile.active = false;
        await env.LABX_KV.put(`auth:${key}`, JSON.stringify(profile), { expirationTtl: TTL.CARDAPIO });
        return ok({ ok: true, revoked: key }, 200, CH);
      }

      // GET /admin/stats
      if (url.pathname === '/admin/stats' && request.method === 'GET') {
        const list = await env.LABX_KV.list({ prefix: 'keys:idx:' });
        let totalCreditsUsed = 0, totalKeys = 0, activeKeys = 0, cardapios = 0;
        await Promise.all(list.keys.map(async k => {
          const apiKey = await env.LABX_KV.get(k.name).catch(() => null);
          if (!apiKey) return;
          const raw = await env.LABX_KV.get(`auth:${apiKey}`).catch(() => null);
          if (!raw) return;
          const p = JSON.parse(raw);
          totalKeys++;
          if (p.active) activeKeys++;
          totalCreditsUsed += p.usageTotal || 0;
          const c = await env.LABX_KV.get(`cardapio:${apiKey}`).catch(() => null);
          if (c) cardapios++;
        }));
        return ok({ totalKeys, activeKeys, totalCreditsUsed, cardapios, ts: new Date().toISOString() }, 200, CH);
      }

      return err('Rota admin não encontrada', 404, CH);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ROTAS AUTENTICADAS (X-API-Key)
    // ══════════════════════════════════════════════════════════════════════
    const apiKey = request.headers.get('X-API-Key');
    const profile = await getAuth(env, apiKey);

    if (!profile)        return err('API Key inválida. Obtenha sua chave em labriolag.shop', 401, CH);
    if (!profile.active) return err('API Key revogada. Entre em contato com a Labriolag Holding.', 403, CH);

    const withinLimit = await checkRateLimit(env, apiKey);
    if (!withinLimit) return err('Rate limit: máximo 30 requisições/minuto.', 429, CH);

    // ── GET /me ────────────────────────────────────────────────────────────
    if (url.pathname === '/me') {
      const cardapioRaw = await env.LABX_KV.get(`cardapio:${apiKey}`).catch(() => null);
      const temCardapio = !!cardapioRaw;
      let slugAtual = null;
      let qrAtivado = false;
      if (temCardapio) {
        const cd = JSON.parse(cardapioRaw);
        slugAtual = cd.slug || null;
        qrAtivado = cd.qrAtivado || false;
      }
      return ok({
        owner: profile.owner, tier: profile.tier,
        credits: profile.credits,
        qrCredits: profile.qrCredits ?? 0,   // créditos de QR Code
        usageTotal: profile.usageTotal || 0, active: profile.active,
        temCardapio, slugAtual, qrAtivado,
      }, 200, CH);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CARDÁPIO — POST /cardapio/salvar
    // ══════════════════════════════════════════════════════════════════════
    if (url.pathname === '/cardapio/salvar' && request.method === 'POST') {
      // Tier mínimo: basic ou superior para salvar cardápio
      const tiersPermitidos = ['basic', 'pro', 'enterprise'];
      if (!tiersPermitidos.includes(profile.tier)) {
        return err(`Tier "${profile.tier}" não permite cardápio. Faça upgrade para Basic ou superior.`, 403, CH);
      }

      const body = await request.json().catch(() => ({}));
      const { nomeLoja, descricao, telefone, endereco, instagram, corPrimaria, logo, horarios, categorias, entrega, slug: slugSolicitado } = body;

      if (!nomeLoja) return err('nomeLoja é obrigatório', 400, CH);

      // Gera ou mantém slug
      const cardapioExistente = await env.LABX_KV.get(`cardapio:${apiKey}`).catch(() => null);
      let slug = slugSolicitado
        ? gerarSlug(slugSolicitado)
        : (cardapioExistente ? JSON.parse(cardapioExistente).slug : gerarSlug(nomeLoja));

      // Garante unicidade do slug
      const slugDono = await env.LABX_KV.get(`cardapio_slug:${slug}`).catch(() => null);
      if (slugDono && slugDono !== apiKey) {
        // Slug já ocupado por outro — adiciona sufixo
        slug = slug + '-' + Date.now().toString(36).slice(-4);
      }

      const cardapio = {
        nomeLoja, descricao: descricao || '', telefone: telefone || '',
        endereco: endereco || '', instagram: instagram || '',
        corPrimaria: corPrimaria || '#ff4040', logo: logo || '',
        horarios: horarios || {}, categorias: categorias || [],
        entrega: entrega || { ativa: false, taxas: [] },
        slug, updatedAt: new Date().toISOString(), ownedBy: profile.owner,
        // v8: preserva flag de ativação — salvar NÃO cobra crédito
        qrAtivado:   cardapioExistente ? (JSON.parse(cardapioExistente).qrAtivado || false) : false,
        qrAtivadoEm: cardapioExistente ? (JSON.parse(cardapioExistente).qrAtivadoEm || null) : null,
      };

      await env.LABX_KV.put(`cardapio:${apiKey}`, JSON.stringify(cardapio), { expirationTtl: TTL.CARDAPIO });
      await env.LABX_KV.put(`cardapio_slug:${slug}`, apiKey, { expirationTtl: TTL.CARDAPIO });

      const menuUrl = `${new URL(request.url).origin}/menu/${slug}`;
      return ok({
        ok: true, slug, menuUrl,
        updatedAt: cardapio.updatedAt,
        qrAtivado: cardapio.qrAtivado,
        qrCredits: profile.qrCredits ?? 0,
      }, 200, CH);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CARDÁPIO — POST /cardapio/ativar-qr  (v8 — consome 1 qrCredit)
    // ══════════════════════════════════════════════════════════════════════
    if (url.pathname === '/cardapio/ativar-qr' && request.method === 'POST') {
      const tiersPermitidos = ['basic', 'pro', 'enterprise'];
      if (!tiersPermitidos.includes(profile.tier)) {
        return err(`Tier "${profile.tier}" não permite cardápio. Faça upgrade para Basic ou superior.`, 403, CH);
      }

      const cardapioRaw = await env.LABX_KV.get(`cardapio:${apiKey}`).catch(() => null);
      if (!cardapioRaw) {
        return err('Nenhum cardápio salvo. Salve o cardápio antes de ativar o QR Code.', 400, CH);
      }

      const cardapio = JSON.parse(cardapioRaw);

      // Se já está ativo, não cobra de novo
      if (cardapio.qrAtivado) {
        const origin = env.ALLOWED_ORIGIN || new URL(request.url).origin;
        return ok({
          ok: true,
          jaAtivado: true,
          slug: cardapio.slug,
          menuUrl: `${origin}/menu/${cardapio.slug}`,
          qrCredits: profile.qrCredits ?? 0,
          msg: 'QR Code já estava ativo. Nenhum crédito consumido.',
        }, 200, CH);
      }

      // Verifica saldo de qrCredits
      const qrCredits = profile.qrCredits ?? 0;
      if (qrCredits < 1) {
        return err(
          `Saldo de QR Code insuficiente (atual: ${qrCredits}). ` +
          `Adquira mais créditos em labriolag.shop — cada ativação custa R$ 2,50.`,
          402, CH
        );
      }

      // Debita 1 qrCredit e ativa o cardápio
      profile.qrCredits = qrCredits - 1;
      profile.lastQrAt  = new Date().toISOString();
      cardapio.qrAtivado   = true;
      cardapio.qrAtivadoEm = new Date().toISOString();

      await env.LABX_KV.put(`auth:${apiKey}`,          JSON.stringify(profile), { expirationTtl: TTL.CARDAPIO });
      await env.LABX_KV.put(`cardapio:${apiKey}`,       JSON.stringify(cardapio), { expirationTtl: TTL.CARDAPIO });
      // Log de auditoria (TTL 2 anos)
      await env.LABX_KV.put(
        `qr_log:${apiKey}:${Date.now()}`,
        JSON.stringify({ slug: cardapio.slug, activatedAt: cardapio.qrAtivadoEm, owner: profile.owner }),
        { expirationTtl: 60 * 60 * 24 * 730 }
      );

      const origin  = env.ALLOWED_ORIGIN || new URL(request.url).origin;
      const menuUrl = `${origin}/menu/${cardapio.slug}`;
      return ok({
        ok: true,
        slug: cardapio.slug,
        menuUrl,
        qrCredits: profile.qrCredits,
        activatedAt: cardapio.qrAtivadoEm,
        msg: '✅ QR Code ativado! 1 crédito consumido (R$ 2,50).',
      }, 200, CH);
    }

    // ── GET /cardapio/meu ──────────────────────────────────────────────────
    if (url.pathname === '/cardapio/meu' && request.method === 'GET') {
      const raw = await env.LABX_KV.get(`cardapio:${apiKey}`).catch(() => null);
      if (!raw) return ok({ existe: false, qrCredits: profile.qrCredits ?? 0 }, 200, CH);
      const cd = JSON.parse(raw);
      return ok({ existe: true, qrCredits: profile.qrCredits ?? 0, ...cd }, 200, CH);
    }

    // ── GET /cardapio/qr-url ───────────────────────────────────────────────
    if (url.pathname === '/cardapio/qr-url' && request.method === 'GET') {
      const raw = await env.LABX_KV.get(`cardapio:${apiKey}`).catch(() => null);
      if (!raw) return err('Nenhum cardápio configurado.', 404, CH);
      const { slug } = JSON.parse(raw);
      const origin = env.ALLOWED_ORIGIN || new URL(request.url).origin;
      return ok({ slug, menuUrl: `${origin}/menu/${slug}` }, 200, CH);
    }

    // ── IBGE ───────────────────────────────────────────────────────────────
    if (url.pathname.startsWith('/ibge/') && request.method === 'GET') {
      const cod = url.pathname.replace('/ibge/', '').trim();
      if (!/^\d{7}$/.test(cod)) return err('Código IBGE inválido (7 dígitos)', 400, CH);
      const cacheKey = `ibge:${cod}`;
      if (env.LABX_KV) {
        const cached = await env.LABX_KV.get(cacheKey).catch(() => null);
        if (cached) return ok({ ...JSON.parse(cached), cached: true }, 200, CH);
      }
      try {
        const [empR, pesR, popR] = await Promise.allSettled([
          fetchIBGEEmpresas(cod), fetchIBGEPessoal(cod), fetchIBGEPopulacao(cod),
        ]);
        const data = {
          codMunicipio: cod,
          nome: popR.status==='fulfilled' ? popR.value.nome : 'Município',
          populacao: popR.status==='fulfilled' ? popR.value.pop : 50000,
          empresas: empR.status==='fulfilled' ? empR.value : null,
          pessoal: pesR.status==='fulfilled' ? pesR.value : null,
          fonte: 'IBGE CEMPRE/SIDRA', capturedAt: new Date().toISOString(),
        };
        if (env.LABX_KV) await env.LABX_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: TTL.IBGE });
        return ok(data, 200, CH);
      } catch (e) { return err('IBGE SIDRA indisponível: ' + e.message, 503, CH); }
    }

    // ── POST /calcular ─────────────────────────────────────────────────────
    if (url.pathname === '/calcular' && request.method === 'POST') {
      if (profile.credits <= 0) {
        return err(`Créditos esgotados. Tier: ${profile.tier}. Adquira mais em labriolag.shop`, 402, CH);
      }
      const body = await request.json().catch(() => ({}));
      const { renda=0, cnpjs=0, populacao=50000, pib=35, modo=1.0, codMunicipio } = body;
      let bcbData={}, ibgeData={};
      const [bcbRes, ibgeRes] = await Promise.allSettled([
        (async () => {
          const c = await env.LABX_KV.get('feed:macro:v6').catch(() => null);
          if (c) { const d=JSON.parse(c); return { selic:+d.selic.valor, ipca:+d.ipca.valor, ibcbr:+d.ibcbr.valor }; }
          const [s,i,b] = await Promise.all([fetchBCB(BCB.SELIC),fetchBCB(BCB.IPCA),fetchBCB(BCB.IBCBR)]);
          return { selic:+s.valor, ipca:+i.valor, ibcbr:+b.valor };
        })(),
        codMunicipio && /^\d{7}$/.test(codMunicipio) ? (async () => {
          const c = await env.LABX_KV.get(`ibge:${codMunicipio}`).catch(() => null);
          if (c) return JSON.parse(c);
          const [empR,pesR] = await Promise.allSettled([fetchIBGEEmpresas(codMunicipio),fetchIBGEPessoal(codMunicipio)]);
          return { empresas:empR.status==='fulfilled'?empR.value:null, pessoal:pesR.status==='fulfilled'?pesR.value:null };
        })() : Promise.resolve({}),
      ]);
      if (bcbRes.status==='fulfilled') bcbData=bcbRes.value;
      if (ibgeRes.status==='fulfilled') ibgeData=ibgeRes.value;
      const resultado = calcularVetores({ renda:Number(renda), cnpjs:Number(cnpjs), populacao:Number(populacao), pib:Number(pib), modo:Number(modo), bcbData, ibgeData });
      profile.credits -= 1;
      profile.usageTotal = (profile.usageTotal||0)+1;
      profile.lastUsedAt = new Date().toISOString();
      await env.LABX_KV.put(`auth:${apiKey}`, JSON.stringify(profile), { expirationTtl: TTL.CARDAPIO });
      resultado.creditsRestantes = profile.credits;
      return ok(resultado, 200, CH);
    }

    // ── POST /salvar / GET /historico / GET+DELETE /analise/:id ───────────
    if (url.pathname === '/salvar' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const id = body.id || `LAB-${Date.now().toString(36).toUpperCase()}`;
      await env.LABX_KV.put(`analise:${apiKey}:${id}`, JSON.stringify({...body, id, savedAt:new Date().toISOString()}), { expirationTtl: TTL.ANALISE });
      return ok({ ok:true, id }, 200, CH);
    }

    if (url.pathname === '/historico') {
      const list = await env.LABX_KV.list({ prefix: `analise:${apiKey}:` });
      const ids  = list.keys.map(k => k.name.replace(`analise:${apiKey}:`, ''));
      const meta = await Promise.all(ids.slice(0,50).map(async id => {
        const raw = await env.LABX_KV.get(`analise:${apiKey}:${id}`).catch(()=>null);
        if (!raw) return null;
        const d = JSON.parse(raw);
        return { id:d.id, name:d.name, timestamp:d.timestamp, results:d.results };
      }));
      return ok({ total:ids.length, analyses:meta.filter(Boolean) }, 200, CH);
    }

    if (url.pathname.startsWith('/analise/') && request.method === 'GET') {
      const id = url.pathname.replace('/analise/', '');
      const raw = await env.LABX_KV.get(`analise:${apiKey}:${id}`).catch(()=>null);
      if (!raw) return err('Análise não encontrada', 404, CH);
      return ok(JSON.parse(raw), 200, CH);
    }

    if (url.pathname.startsWith('/analise/') && request.method === 'DELETE') {
      const id = url.pathname.replace('/analise/', '');
      await env.LABX_KV.delete(`analise:${apiKey}:${id}`);
      return ok({ ok:true, deleted:id }, 200, CH);
    }

    return err('Rota não encontrada', 404, CH);
  },
};

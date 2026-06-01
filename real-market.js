// ═══════════════════════════════════════════════════════
// UNISBA VIRTUAL MARKET — REAL MARKET ENGINE v2.0
// real-market.js
//
// LOAD ORDER: setelah macro-engine.js (paling akhir)
//
// Fitur:
//   ① Saham bank & sektor Indonesia REAL (BBRI, BBCA, BMRI, BSI, dll)
//      via Yahoo Finance proxy (gratis, tanpa API key)
//   ② Kurs USD/IDR REAL via exchangerate-api (key sudah dikonfigurasi)
//   ③ Berita ekonomi Indonesia REAL via RSS Google News + CNBC Indonesia
//   ④ Semua data real mempengaruhi harga saham per-prodi secara otomatis
//   ⑤ Widget "Pasar Nyata" menampilkan harga saham bank Indonesia live
//   ⑥ Indeks IHSG real (proxy via ^JKSE) mempengaruhi semua saham sekaligus
// ═══════════════════════════════════════════════════════

'use strict';

// ════════════════════════════════════════════════════════
// §1. KONFIGURASI
// ════════════════════════════════════════════════════════

const REAL_MKT = {

  // ── Kurs API (exchangerate-api, key dari user) ──────
  EXCHANGE_KEY:  '165c0b01ff52586f75d4a2fd',
  EXCHANGE_URL:  'https://v6.exchangerate-api.com/v6/165c0b01ff52586f75d4a2fd/latest/USD',
  EXCHANGE_FALLBACK: 'https://open.er-api.com/v6/latest/USD',

  // ── Yahoo Finance proxy (CORS gratis) ───────────────
  // yfapi.net adalah proxy publik untuk Yahoo Finance data
  YF_PROXY: 'https://query1.finance.yahoo.com/v8/finance/chart/',
  YF_PROXY2: 'https://query2.finance.yahoo.com/v8/finance/chart/',

  // ── Interval refresh ────────────────────────────────
  STOCK_FETCH_INTERVAL:  3 * 60 * 1000,   // saham real tiap 3 menit
  NEWS_FETCH_INTERVAL:   5 * 60 * 1000,   // berita tiap 5 menit
  EXCHANGE_FETCH_INTERVAL: 5 * 60 * 1000, // kurs tiap 5 menit (override macro-engine)

  // ── Saham Indonesia Real ─────────────────────────────
  // Ticker Yahoo Finance → nama → sektor → dampak ke prodi UNISBA
  REAL_STOCKS: [
    // ── Bank BUMN (Bank Negara / Pemerintah) ─────────────────────
    { ticker: 'BBRI.JK',  name: 'Bank BRI',             sector: 'bank',     affectedProdi: ['EKOP','MNJM','AKNT'] },
    { ticker: 'BBCA.JK',  name: 'Bank BCA',             sector: 'bank',     affectedProdi: ['EKOP','MNJM','AKNT'] },
    { ticker: 'BMRI.JK',  name: 'Bank Mandiri',         sector: 'bank',     affectedProdi: ['EKOP','MNJM','AKNT'] },
    { ticker: 'BBNI.JK',  name: 'Bank BNI',             sector: 'bank',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'BBTL.JK',  name: 'Bank Tabungan Negara', sector: 'bank',     affectedProdi: ['EKOP','MNJM'] },

    // ── Bank Konvensional Swasta Besar ────────────────────────────
    { ticker: 'BNGA.JK',  name: 'Bank CIMB Niaga',      sector: 'bank',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'BNLI.JK',  name: 'Bank Permata',         sector: 'bank',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'BDMN.JK',  name: 'Bank Danamon',         sector: 'bank',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'PNBN.JK',  name: 'Bank Panin',           sector: 'bank',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'MAYA.JK',  name: 'Bank Mayapada',        sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'NISP.JK',  name: 'Bank OCBC NISP',       sector: 'bank',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'MEGA.JK',  name: 'Bank Mega',            sector: 'bank',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'BKSW.JK',  name: 'Bank QNB Indonesia',   sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'BNBA.JK',  name: 'Bank Bumi Arta',       sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'BACA.JK',  name: 'Bank Capital Indonesia',sector: 'bank',    affectedProdi: ['EKOP'] },
    { ticker: 'AGRO.JK',  name: 'Bank Raya (BRI Agro)', sector: 'bank',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'BMAS.JK',  name: 'Bank Maspion',         sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'NOBU.JK',  name: 'Bank Nationalnobu',    sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'DNAR.JK',  name: 'Bank Oke Indonesia',   sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'BGTG.JK',  name: 'Bank Ganesha',         sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'MCOR.JK',  name: 'Bank China Construction',sector:'bank',    affectedProdi: ['EKOP'] },
    { ticker: 'SDRA.JK',  name: 'Bank Woori Saudara',   sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'INPC.JK',  name: 'Bank Artha Graha',     sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'BBYB.JK',  name: 'Bank Neo Commerce',    sector: 'bank',     affectedProdi: ['EKOP','TKIN'] },
    { ticker: 'ARTO.JK',  name: 'Bank Jago',            sector: 'bank',     affectedProdi: ['EKOP','TKIN'] },
    { ticker: 'BVIC.JK',  name: 'Bank Victoria',        sector: 'bank',     affectedProdi: ['EKOP'] },
    { ticker: 'PNBS.JK',  name: 'Bank Panin Dubai Syariah',sector:'syariah',affectedProdi: ['EKOP','PDDK'] },

    // ── Bank Syariah ──────────────────────────────────────────────
    { ticker: 'BRIS.JK',  name: 'Bank BSI',             sector: 'syariah',  affectedProdi: ['EKOP','PDDK','MNJM'] },
    { ticker: 'BTPS.JK',  name: 'Bank BTPN Syariah',    sector: 'syariah',  affectedProdi: ['EKOP','PDDK'] },

    // ── Bank Pembangunan Daerah (BPD) ─────────────────────────────
    { ticker: 'BJBR.JK',  name: 'Bank BJB (Jabar Banten)',sector:'bpd',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'BJTM.JK',  name: 'Bank Jatim',           sector: 'bpd',     affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'BDKI.JK',  name: 'Bank DKI',             sector: 'bpd',     affectedProdi: ['EKOP'] },
    { ticker: 'BBKP.JK',  name: 'Bank Bukopin (KB Bukopin)',sector:'bank',  affectedProdi: ['EKOP','MNJM'] },
    { ticker: 'BSWD.JK',  name: 'Bank Of India Indonesia',sector:'bank',    affectedProdi: ['EKOP'] },
    { ticker: 'NAGA.JK',  name: 'Bank Mitraniaga',      sector: 'bank',     affectedProdi: ['EKOP'] },

    // ── Bank Digital / Fintech ────────────────────────────────────
    { ticker: 'BBHI.JK',  name: 'Allo Bank',            sector: 'digital',  affectedProdi: ['EKOP','TKIN'] },
    { ticker: 'SEEA.JK',  name: 'Bank Saqu (SeaBank)',  sector: 'digital',  affectedProdi: ['EKOP','TKIN'] },

    // ── Sektor Properti & Konstruksi ─────────────────────────────
    { ticker: 'WIKA.JK',  name: 'Wijaya Karya',         sector: 'konstruksi', affectedProdi: ['TKSP','MTEK'] },
    { ticker: 'PTPP.JK',  name: 'PP (Persero)',          sector: 'konstruksi', affectedProdi: ['TKSP'] },
    { ticker: 'ADHI.JK',  name: 'Adhi Karya',            sector: 'konstruksi', affectedProdi: ['TKSP','TKIN'] },

    // ── Farmasi ───────────────────────────────────────────────────
    { ticker: 'KLBF.JK',  name: 'Kalbe Farma',          sector: 'farmasi',  affectedProdi: ['FARM','KDOK'] },
    { ticker: 'SIDO.JK',  name: 'Industri Jamu Sido',   sector: 'farmasi',  affectedProdi: ['FARM'] },
    { ticker: 'KAEF.JK',  name: 'Kimia Farma',           sector: 'farmasi',  affectedProdi: ['FARM','KDOK'] },

    // ── Telekomunikasi & Teknologi ────────────────────────────────
    { ticker: 'TLKM.JK',  name: 'Telkom Indonesia',     sector: 'telko',    affectedProdi: ['KOMM','MTEK'] },
    { ticker: 'EXCL.JK',  name: 'XL Axiata',             sector: 'telko',    affectedProdi: ['KOMM'] },

    // ── Indeks IHSG ───────────────────────────────────────────────
    { ticker: '^JKSE',    name: 'IHSG',                  sector: 'index',    affectedProdi: null },
  ],

  // ── RSS Berita Indonesia ─────────────────────────────
  // Semua berita ekonomi Indonesia real
  NEWS_FEEDS: [
    // Google News RSS (tidak perlu API key, CORS via proxy)
    'https://news.google.com/rss/search?q=ekonomi+indonesia+saham&hl=id&gl=ID&ceid=ID:id',
    'https://news.google.com/rss/search?q=rupiah+IHSG+bank+indonesia&hl=id&gl=ID&ceid=ID:id',
    'https://news.google.com/rss/search?q=inflasi+suku+bunga+indonesia&hl=id&gl=ID&ceid=ID:id',
  ],

  // Proxy untuk menghindari CORS pada RSS feed
  CORS_PROXIES: [
    'https://api.rss2json.com/v1/api.json?rss_url=',
    'https://rss.app/feeds-v1.1/',   // fallback
  ],

  // ── Mapping kata kunci berita → dampak ke prodi ─────
  NEWS_KEYWORDS: {
    // Kata kunci → { stockId, direction, strength }
    'bank': { stocks: ['EKOP','MNJM','AKNT'], direction: 1 },
    'bri':  { stocks: ['EKOP','MNJM','AKNT'], direction: 1 },
    'bca':  { stocks: ['EKOP','MNJM','AKNT'], direction: 1 },
    'mandiri': { stocks: ['EKOP','MNJM','AKNT'], direction: 1 },
    'bsi':  { stocks: ['EKOP','PDDK','MNJM'], direction: 1 },
    'syariah': { stocks: ['PDDK','MNJM','EKOP'], direction: 1 },
    'rupiah': { stocks: null, direction: -1 }, // semua saham
    'ihsg': { stocks: null, direction: 1 },
    'inflasi': { stocks: ['EKOP','AKNT','MNJM'], direction: -1 },
    'suku bunga': { stocks: ['EKOP','AKNT'], direction: -1 },
    'farmasi': { stocks: ['FARM','KDOK'], direction: 1 },
    'obat': { stocks: ['FARM','KDOK'], direction: 1 },
    'kesehatan': { stocks: ['KDOK','FARM'], direction: 1 },
    'konstruksi': { stocks: ['TKSP','MTEK','TKIN'], direction: 1 },
    'infrastruktur': { stocks: ['TKSP','TKIN'], direction: 1 },
    'teknik': { stocks: ['TKSP','TKIN','MTEK'], direction: 1 },
    'telkom': { stocks: ['KOMM','MTEK'], direction: 1 },
    'digital': { stocks: ['KOMM','MTEK','TKIN'], direction: 1 },
    'hukum': { stocks: ['HUKM'], direction: 1 },
    'regulasi': { stocks: ['HUKM','EKOP'], direction: 1 },
    'pendidikan': { stocks: ['PDDK','PSIK'], direction: 1 },
    'kampus': { stocks: ['PDDK','PSIK'], direction: 1 },
    'krisis': { stocks: null, direction: -1, strength: 2.0 },
    'resesi': { stocks: null, direction: -1, strength: 2.0 },
    'stagflasi': { stocks: null, direction: -1, strength: 1.8 },
    'recovery': { stocks: null, direction: 1, strength: 1.5 },
    'pertumbuhan': { stocks: null, direction: 1 },
    'ekspor': { stocks: ['EKOP','TKIN'], direction: 1 },
    'impor': { stocks: ['FARM','MTEK'], direction: -1 },
    'melemah': { stocks: null, direction: -1 },
    'menguat': { stocks: null, direction: 1 },
    'naik': { stocks: null, direction: 1, strength: 0.5 },
    'turun': { stocks: null, direction: -1, strength: 0.5 },
    'anjlok': { stocks: null, direction: -1, strength: 1.5 },
    'rebound': { stocks: null, direction: 1, strength: 1.5 },
    'bi rate': { stocks: ['EKOP','MNJM','AKNT'], direction: -1 },
    'bi 7-day': { stocks: ['EKOP','MNJM','AKNT'], direction: -1 },
    'pmi': { stocks: ['TKIN','MTEK'], direction: 1 },
    'manufaktur': { stocks: ['TKIN','MTEK'], direction: 1 },
  },

  // ── Sentimen keywords ───────────────────────────────
  BULLISH_WORDS: ['naik','menguat','positif','rebound','rally','all time high','ath','profit','laba','surplus','tumbuh','meningkat','optimis','recovery','hijau','bullish'],
  BEARISH_WORDS: ['turun','melemah','negatif','anjlok','crash','koreksi','rugi','defisit','krisis','resesi','merah','bearish','jatuh','tertekan','stagflasi'],
};

// ════════════════════════════════════════════════════════
// §2. STATE
// ════════════════════════════════════════════════════════

const realMarketState = {
  // Harga saham real Indonesia (dari Yahoo Finance)
  realPrices: {},        // { 'BBRI.JK': { price, change, changePct, prevClose, volume, name } }
  realPricesPrev: {},    // snapshot sebelumnya untuk hitung delta

  // IHSG
  ihsg: { value: 0, change: 0, changePct: 0 },

  // Kurs real (dari exchangerate-api, override macroState)
  usdIdr: 0,
  usdIdrPrev: 0,

  // Berita real Indonesia
  realNews: [],          // [{ title, source, url, publishedAt, sentiment, impactedProdi }]
  newsLastFetch: 0,
  newsApplied: new Set(), // URL yang sudah diaplikasikan ke pasar

  // Status
  stockFetchStatus: 'loading',
  newsFetchStatus: 'idle',
  lastStockFetch: 0,
  fetchErrors: 0,

  // Widget visible
  widgetVisible: false,
};

// ════════════════════════════════════════════════════════
// §3. FETCH KURS REAL — OVERRIDE MACRO ENGINE
// ════════════════════════════════════════════════════════

async function fetchRealExchangeRate() {
  const urls = [REAL_MKT.EXCHANGE_URL, REAL_MKT.EXCHANGE_FALLBACK];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();

      let idr = null;
      if (data.conversion_rates?.IDR) idr = data.conversion_rates.IDR;   // v6 api
      else if (data.rates?.IDR)        idr = data.rates.IDR;               // open.er-api

      if (!idr || idr < 10000 || idr > 30000) continue;

      const prev = realMarketState.usdIdr || idr;
      realMarketState.usdIdrPrev = prev;
      realMarketState.usdIdr     = Math.round(idr);

      // Sync ke macroState (override nilai macro-engine.js)
      if (typeof macroState !== 'undefined') {
        macroState.usdIdrPrev = macroState.usdIdr;
        macroState.usdIdr     = realMarketState.usdIdr;
        if (!macroState.usdIdrOpen) macroState.usdIdrOpen = realMarketState.usdIdr;
        macroState.usdIdrChange = ((macroState.usdIdr - macroState.usdIdrPrev) / macroState.usdIdrPrev) * 100;
        macroState.usdIdrDaily  = ((macroState.usdIdr - macroState.usdIdrOpen)  / macroState.usdIdrOpen)  * 100;
        macroState.lastFetch    = Date.now();
        macroState.fetchStatus  = 'ok';
        if (typeof _updateZone === 'function')       _updateZone();
        if (typeof _checkMacroNews === 'function')   _checkMacroNews();
        if (typeof _updateMacroWidget === 'function') _updateMacroWidget();
        if (typeof _flashRateWidget === 'function')  _flashRateWidget();
      }

      console.log(`✅ [RealMarket] USD/IDR REAL: Rp${realMarketState.usdIdr.toLocaleString('id-ID')}`);
      return true;
    } catch(e) { continue; }
  }
  return false;
}

// ════════════════════════════════════════════════════════
// §4. FETCH HARGA SAHAM INDONESIA REAL (Yahoo Finance)
// ════════════════════════════════════════════════════════

async function fetchRealStockPrices() {
  realMarketState.stockFetchStatus = 'loading';
  _updateRealWidget();

  // Batch tickers (kecuali ^JKSE diambil terpisah)
  const tickers = REAL_MKT.REAL_STOCKS.map(s => s.ticker);
  const results = {};
  let successCount = 0;

  // Yahoo Finance tidak punya CORS header, pakai allorigins atau corsproxy
  // Strategy: fetch satu-satu dengan AbortSignal timeout pendek
  const PROXY_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
  const PROXY_BASE2 = 'https://query2.finance.yahoo.com/v8/finance/chart/';

  for (const stock of REAL_MKT.REAL_STOCKS) {
    try {
      // URL Yahoo Finance dengan parameter minimal
      const params = new URLSearchParams({
        interval: '1d',
        range: '2d',         // 2 hari untuk dapat prev close
        includePrePost: false,
      });

      let data = null;
      let price = null, prevClose = null, volume = null;

      // Coba via allorigins proxy (CORS bypass gratis)
      const yf_url = `${PROXY_BASE}${encodeURIComponent(stock.ticker)}?${params}`;
      const proxy_url = `https://api.allorigins.win/get?url=${encodeURIComponent(yf_url)}`;

      try {
        const res = await fetch(proxy_url, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const wrapper = await res.json();
          data = JSON.parse(wrapper.contents || '{}');
        }
      } catch(e1) {
        // Coba proxy2 (query2.finance)
        try {
          const yf_url2 = `${PROXY_BASE2}${encodeURIComponent(stock.ticker)}?${params}`;
          const proxy2 = `https://api.allorigins.win/get?url=${encodeURIComponent(yf_url2)}`;
          const res2 = await fetch(proxy2, { signal: AbortSignal.timeout(6000) });
          if (res2.ok) {
            const w2 = await res2.json();
            data = JSON.parse(w2.contents || '{}');
          }
        } catch(e2) { /* skip */ }
      }

      // Parse Yahoo Finance response
      if (data?.chart?.result?.[0]) {
        const result = data.chart.result[0];
        const meta   = result.meta;
        price     = meta.regularMarketPrice || meta.previousClose;
        prevClose = meta.chartPreviousClose || meta.previousClose;
        volume    = meta.regularMarketVolume || 0;

        if (price && price > 0) {
          const change    = price - prevClose;
          const changePct = prevClose ? (change / prevClose) * 100 : 0;

          results[stock.ticker] = {
            price:     Math.round(price),
            prevClose: Math.round(prevClose || price),
            change:    Math.round(change),
            changePct: parseFloat(changePct.toFixed(2)),
            volume,
            name: stock.name,
            sector: stock.sector,
          };

          if (stock.ticker === '^JKSE') {
            realMarketState.ihsg = {
              value:     Math.round(price),
              change:    Math.round(change),
              changePct: parseFloat(changePct.toFixed(2)),
            };
          }

          successCount++;
        }
      }

    } catch(e) {
      // Skip stock yang gagal diambil
    }
  }

  // Simpan hasil
  realMarketState.realPricesPrev = { ...realMarketState.realPrices };
  realMarketState.realPrices = results;
  realMarketState.lastStockFetch = Date.now();
  realMarketState.stockFetchStatus = successCount > 0 ? 'ok' : 'error';
  realMarketState.fetchErrors = successCount > 0 ? 0 : realMarketState.fetchErrors + 1;

  if (successCount > 0) {
    console.log(`✅ [RealMarket] ${successCount}/${REAL_MKT.REAL_STOCKS.length} saham real berhasil diambil`);
    // Aplikasikan dampak ke pasar virtual
    _applyRealStockImpact();
    _updateRealWidget();
    return true;
  } else {
    console.warn('[RealMarket] Gagal ambil data saham real — pasar virtual tetap berjalan mandiri');
    _updateRealWidget();
    return false;
  }
}

// ════════════════════════════════════════════════════════
// §5. APLIKASIKAN DAMPAK SAHAM REAL KE PASAR VIRTUAL
// ════════════════════════════════════════════════════════

function _applyRealStockImpact() {
  if (typeof state === 'undefined' || !state.prices) return;

  const prices   = realMarketState.realPrices;
  const prevPrices = realMarketState.realPricesPrev;

  // Kumpulkan dampak per prodi dari saham real
  const prodiImpact = {}; // { prodiId: totalImpact }

  for (const stock of REAL_MKT.REAL_STOCKS) {
    const curr = prices[stock.ticker];
    const prev = prevPrices[stock.ticker];
    if (!curr) continue;

    // Hitung perubahan harga real (% antara fetch terakhir)
    let realChangePct = curr.changePct / 100; // daily change

    // Jika ada data fetch sebelumnya, hitung perubahan incremental
    if (prev) {
      realChangePct = (curr.price - prev.price) / prev.price;
    }

    // Scale down: perubahan harian saham real → dampak kecil ke pasar virtual
    // Faktor 0.15 = dampak 15% dari pergerakan saham nyata
    const scaledImpact = realChangePct * 0.15;

    // Tentukan prodi yang terdampak
    const affectedProdi = stock.affectedProdi || STOCKS?.map(s => s.id); // null = semua

    if (affectedProdi) {
      for (const prodiId of affectedProdi) {
        prodiImpact[prodiId] = (prodiImpact[prodiId] || 0) + scaledImpact;
      }
    } else {
      // Semua prodi (IHSG)
      if (typeof STOCKS !== 'undefined') {
        STOCKS.forEach(s => {
          prodiImpact[s.id] = (prodiImpact[s.id] || 0) + scaledImpact * 0.5; // lebih lemah untuk index
        });
      }
    }
  }

  // Aplikasikan ke pendingNewsImpact (akan diambil oleh market tick)
  if (!state.pendingNewsImpact) state.pendingNewsImpact = {};
  for (const [prodiId, impact] of Object.entries(prodiImpact)) {
    if (Math.abs(impact) > 0.0001) {
      state.pendingNewsImpact[prodiId] = (state.pendingNewsImpact[prodiId] || 0) + impact;
    }
  }

  // Aplikasikan IHSG ke semua saham jika IHSG berubah signifikan
  if (realMarketState.ihsg.changePct !== 0) {
    const ihsgImpact = (realMarketState.ihsg.changePct / 100) * 0.10;
    if (Math.abs(ihsgImpact) > 0.001 && typeof STOCKS !== 'undefined') {
      STOCKS.forEach(s => {
        state.pendingNewsImpact[s.id] = (state.pendingNewsImpact[s.id] || 0) + ihsgImpact;
      });

      // Munculkan toast IHSG jika perubahan signifikan
      if (Math.abs(realMarketState.ihsg.changePct) >= 0.5) {
        _triggerIhsgNews(realMarketState.ihsg);
      }
    }
  }
}

// ════════════════════════════════════════════════════════
// §6. FETCH BERITA INDONESIA REAL
// ════════════════════════════════════════════════════════

async function fetchRealIndonesiaNews() {
  realMarketState.newsFetchStatus = 'loading';
  const newItems = [];

  for (const feedUrl of REAL_MKT.NEWS_FEEDS) {
    try {
      // rss2json.com — konversi RSS ke JSON dengan CORS
      const apiUrl = `${REAL_MKT.CORS_PROXIES[0]}${encodeURIComponent(feedUrl)}`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const data = await res.json();
      const items = data.items || [];

      for (const item of items.slice(0, 8)) { // max 8 berita per feed
        if (!item.title) continue;

        // Cek duplikat
        const itemKey = item.link || item.title;
        if (realMarketState.newsApplied.has(itemKey)) continue;

        // Analisa sentimen judul berita
        const { sentiment, impact, impactedProdi } = _analyzeNewsTitle(item.title + ' ' + (item.description || ''));

        newItems.push({
          title: _cleanNewsTitle(item.title),
          source: item.author || _extractDomain(item.link),
          url: item.link,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          sentiment,
          impact,
          impactedProdi,
          _key: itemKey,
        });
      }
    } catch(e) {
      // Feed gagal, coba feed berikutnya
      continue;
    }
  }

  if (newItems.length === 0) {
    realMarketState.newsFetchStatus = 'idle';
    return false;
  }

  // Sort by publishedAt terbaru
  newItems.sort((a, b) => b.publishedAt - a.publishedAt);

  // Simpan ke state
  realMarketState.realNews = [...newItems, ...realMarketState.realNews].slice(0, 30);
  realMarketState.newsLastFetch = Date.now();
  realMarketState.newsFetchStatus = 'ok';

  // Aplikasikan berita baru ke pasar virtual
  for (const item of newItems.slice(0, 3)) { // max 3 berita baru per fetch
    _applyRealNewsToMarket(item);
    realMarketState.newsApplied.add(item._key);
  }

  // Update panel berita di UI
  _updateRealNewsPanel();

  console.log(`✅ [RealMarket] ${newItems.length} berita real Indonesia diambil`);
  return true;
}

// ── Analisa sentimen judul berita ─────────────────────

function _analyzeNewsTitle(text) {
  const lower = text.toLowerCase();
  let sentiment = 'neutral';
  let impactScore = 0;
  let impactedProdi = null;
  let strength = 1.0;

  // Cek sentimen
  const bullishCount = REAL_MKT.BULLISH_WORDS.filter(w => lower.includes(w)).length;
  const bearishCount = REAL_MKT.BEARISH_WORDS.filter(w => lower.includes(w)).length;

  if (bullishCount > bearishCount) {
    sentiment = 'bullish';
    impactScore = 0.015 + (bullishCount * 0.005);
  } else if (bearishCount > bullishCount) {
    sentiment = 'bearish';
    impactScore = -(0.015 + (bearishCount * 0.005));
  }

  // Cari keyword untuk menentukan prodi terdampak
  const affectedStocks = new Set();
  for (const [keyword, mapping] of Object.entries(REAL_MKT.NEWS_KEYWORDS)) {
    if (lower.includes(keyword)) {
      strength = Math.max(strength, mapping.strength || 1.0);
      if (mapping.stocks) {
        mapping.stocks.forEach(s => affectedStocks.add(s));
      } else {
        // semua prodi
        affectedStocks.clear();
        affectedStocks.add('_all_');
        break;
      }
    }
  }

  impactScore *= strength;

  if (affectedStocks.size > 0) {
    impactedProdi = affectedStocks.has('_all_') ? null : [...affectedStocks];
  } else if (Math.abs(impactScore) > 0) {
    // Tidak ada keyword spesifik → dampak ke semua saham tapi sangat kecil
    impactedProdi = null;
    impactScore *= 0.3;
  }

  return { sentiment, impact: parseFloat(impactScore.toFixed(4)), impactedProdi };
}

// ── Aplikasikan berita real ke pasar virtual ──────────

function _applyRealNewsToMarket(newsItem) {
  if (!newsItem.impact || Math.abs(newsItem.impact) < 0.001) return;
  if (typeof state === 'undefined') return;

  if (!state.pendingNewsImpact) state.pendingNewsImpact = {};

  // Tentukan saham yang terdampak
  const targetStocks = newsItem.impactedProdi
    ? newsItem.impactedProdi
    : (typeof STOCKS !== 'undefined' ? STOCKS.map(s => s.id) : []);

  targetStocks.forEach(id => {
    state.pendingNewsImpact[id] = (state.pendingNewsImpact[id] || 0) + newsItem.impact;
  });

  // Masukkan ke news feed virtual
  if (state.recentNews) {
    const ts = newsItem.publishedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const prodiLabel = newsItem.impactedProdi ? newsItem.impactedProdi.join(', ') : 'Semua Saham';

    state.recentNews.unshift({
      text: `🌏 [REAL] ${newsItem.title}`,
      stock: newsItem.impactedProdi?.[0] || null,
      type: newsItem.sentiment,
      impact: newsItem.impact,
      ts,
      source: newsItem.source,
      isReal: true,
    });
    if (state.recentNews.length > 25) state.recentNews.pop();
  }

  // Render ulang news panel
  if (typeof renderNewsTicker === 'function') renderNewsTicker();
  if (typeof renderNewsPanel  === 'function') renderNewsPanel();

  // Toast untuk berita real yang signifikan
  if (Math.abs(newsItem.impact) >= 0.025 && typeof showToast === 'function') {
    const icon = newsItem.sentiment === 'bullish' ? '📈' : newsItem.sentiment === 'bearish' ? '📉' : '📰';
    showToast(
      `${icon} Berita Indonesia Real`,
      newsItem.title.length > 80 ? newsItem.title.slice(0, 80) + '…' : newsItem.title,
      newsItem.sentiment === 'bullish' ? 'success' : newsItem.sentiment === 'bearish' ? 'error' : 'info',
      8000
    );
  }
}

// ── Trigger news dari IHSG ────────────────────────────

function _triggerIhsgNews(ihsg) {
  const isUp   = ihsg.changePct > 0;
  const bigMove = Math.abs(ihsg.changePct) >= 1.5;

  const newsText = bigMove
    ? `🚨 IHSG ${isUp ? 'melonjak' : 'anjlok'} ${Math.abs(ihsg.changePct).toFixed(2)}% ke ${ihsg.value.toLocaleString('id-ID')} — pasar virtual bereaksi!`
    : `📊 IHSG ${isUp ? 'naik' : 'turun'} ${Math.abs(ihsg.changePct).toFixed(2)}% (${ihsg.value.toLocaleString('id-ID')}) — sentimen pasar ${isUp ? 'menguat' : 'melemah'}`;

  if (typeof state !== 'undefined' && state.recentNews) {
    const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    state.recentNews.unshift({
      text: newsText,
      stock: null,
      type: isUp ? 'bullish' : 'bearish',
      impact: ihsg.changePct / 100 * 0.15,
      ts,
      isReal: true,
    });
    if (state.recentNews.length > 25) state.recentNews.pop();
  }

  if (typeof renderNewsTicker === 'function') renderNewsTicker();
  if (typeof renderNewsPanel  === 'function') renderNewsPanel();

  if (typeof showToast === 'function') {
    showToast(
      isUp ? '📈 IHSG Real' : '📉 IHSG Real',
      newsText.replace(/^[🚨📊]\s*/, ''),
      isUp ? 'success' : 'error',
      6000
    );
  }
}

// ════════════════════════════════════════════════════════
// §7. HELPER FUNCTIONS
// ════════════════════════════════════════════════════════

function _cleanNewsTitle(title) {
  // Hapus nama sumber yang sering muncul di akhir judul Google News
  return title
    .replace(/\s*[-–|]\s*[A-Za-z0-9\. ]+$/, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim();
}

function _extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch(e) {
    return 'Indonesia News';
  }
}

// ════════════════════════════════════════════════════════
// §8. WIDGET "PASAR NYATA INDONESIA"
// ════════════════════════════════════════════════════════

function _injectRealWidget() {
  if (document.getElementById('real-market-widget')) return;

  // Temukan lokasi inject — setelah macro-widget atau sebelum dashboard-content
  const macroWidget = document.getElementById('macro-widget');
  const dashContent = document.querySelector('.dashboard-content');
  if (!macroWidget && !dashContent) return;

  const widget = document.createElement('div');
  widget.id = 'real-market-widget';
  widget.style.cssText = `
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-subtle);
    padding: 8px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    flex-wrap: wrap;
    overflow-x: auto;
    scrollbar-width: none;
    position: relative;
    z-index: 9;
  `;

  widget.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;opacity:0.7;font-size:10px;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;flex-shrink:0">
      🇮🇩 PASAR NYATA
    </div>
    <div id="real-ihsg" style="display:flex;align-items:center;gap:5px;flex-shrink:0;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid var(--border-subtle)">
      <span style="color:var(--text-muted);font-size:10px">IHSG</span>
      <span id="real-ihsg-val" style="color:var(--gold);font-weight:700">—</span>
      <span id="real-ihsg-chg" style="font-size:10px;color:var(--text-muted)">—</span>
    </div>
    <div id="real-stocks-row" style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none">
      <!-- Injected by JS -->
    </div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-shrink:0">
      <div id="real-news-latest" style="font-size:10px;color:var(--text-muted);max-width:280px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
        ⏳ Memuat berita…
      </div>
      <span id="real-fetch-status" style="font-size:10px;color:var(--text-muted)">⏳</span>
      <button onclick="_manualRefreshRealMarket()" title="Refresh data nyata" style="
        width:22px;height:22px;border-radius:6px;background:transparent;
        border:1px solid var(--border-subtle);color:var(--text-muted);
        cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;
      ">↺</button>
    </div>
  `;

  // Insert setelah macro-widget
  if (macroWidget) {
    macroWidget.parentNode.insertBefore(widget, macroWidget.nextSibling);
  } else if (dashContent) {
    dashContent.parentNode.insertBefore(widget, dashContent);
  }

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #real-market-widget { transition: opacity 0.3s; }
    #real-market-widget::-webkit-scrollbar { display: none; }
    .real-stock-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 7px; border-radius: 6px; flex-shrink: 0;
      background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle);
      cursor: default; transition: background 0.2s;
    }
    .real-stock-chip:hover { background: rgba(255,255,255,0.08); }
    .real-stock-chip .ticker { color: var(--text-muted); font-size: 10px; }
    .real-stock-chip .rprice { font-weight: 600; }
    .real-stock-chip .rchg   { font-size: 10px; }
    #real-market-news-panel {
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-elevated, var(--bg-card));
    }
    .real-news-item {
      padding: 8px 14px; border-bottom: 1px solid var(--border-subtle);
      cursor: pointer; transition: background 0.15s;
    }
    .real-news-item:hover { background: rgba(255,255,255,0.04); }
    .real-news-badge {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 1px 5px; border-radius: 4px; font-size: 10px;
      font-family: var(--font-mono, monospace); font-weight: 600;
    }
    @media (max-width: 600px) {
      #real-market-widget { padding: 6px 12px; }
      #real-news-latest { display: none; }
    }
  `;
  document.head.appendChild(style);

  realMarketState.widgetVisible = true;
}

function _updateRealWidget() {
  // Update IHSG
  const ihsgValEl = document.getElementById('real-ihsg-val');
  const ihsgChgEl = document.getElementById('real-ihsg-chg');
  if (ihsgValEl && realMarketState.ihsg.value) {
    ihsgValEl.textContent = realMarketState.ihsg.value.toLocaleString('id-ID');
    const chg = realMarketState.ihsg.changePct;
    if (ihsgChgEl) {
      ihsgChgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
      ihsgChgEl.style.color = chg > 0 ? '#00E676' : chg < 0 ? '#EF5350' : 'var(--text-muted)';
    }
  }

  // Update saham real chips
  const row = document.getElementById('real-stocks-row');
  if (row && Object.keys(realMarketState.realPrices).length > 0) {
    const chips = REAL_MKT.REAL_STOCKS
      .filter(s => s.ticker !== '^JKSE' && realMarketState.realPrices[s.ticker])
      .map(s => {
        const d = realMarketState.realPrices[s.ticker];
        const color = d.changePct > 0 ? '#00E676' : d.changePct < 0 ? '#EF5350' : 'var(--text-muted)';
        const sign  = d.changePct >= 0 ? '+' : '';
        return `<div class="real-stock-chip" title="${d.name} — Vol: ${(d.volume||0).toLocaleString('id-ID')}">
          <span class="ticker">${s.ticker.replace('.JK','')}</span>
          <span class="rprice" style="color:${color}">Rp${d.price.toLocaleString('id-ID')}</span>
          <span class="rchg" style="color:${color}">${sign}${d.changePct.toFixed(1)}%</span>
        </div>`;
      })
      .join('');
    row.innerHTML = chips;
  }

  // Update status
  const statusEl = document.getElementById('real-fetch-status');
  if (statusEl) {
    const elapsed = realMarketState.lastStockFetch
      ? Math.round((Date.now() - realMarketState.lastStockFetch) / 1000)
      : null;

    if (realMarketState.stockFetchStatus === 'ok') {
      statusEl.textContent = `✅ Live · ${elapsed < 60 ? elapsed + 'd' : Math.floor(elapsed/60) + 'm'} lalu`;
      statusEl.style.color = 'var(--green, #00E676)';
    } else if (realMarketState.stockFetchStatus === 'loading') {
      statusEl.textContent = '⏳ Memuat…';
      statusEl.style.color = 'var(--text-muted)';
    } else {
      statusEl.textContent = '⚠️ Offline';
      statusEl.style.color = '#FFAB40';
    }
  }

  // Latest news headline di widget
  const newsLatest = document.getElementById('real-news-latest');
  if (newsLatest && realMarketState.realNews.length > 0) {
    const n = realMarketState.realNews[0];
    const icon = n.sentiment === 'bullish' ? '📈' : n.sentiment === 'bearish' ? '📉' : '📰';
    newsLatest.textContent = `${icon} ${n.title}`;
    newsLatest.style.color = n.sentiment === 'bullish' ? '#69F0AE' : n.sentiment === 'bearish' ? '#EF9A9A' : 'var(--text-muted)';
  }
}

function _updateRealNewsPanel() {
  // Cari tab news atau section berita di UI
  const newsPanel = document.getElementById('news-list') || document.querySelector('.news-panel');
  if (!newsPanel) return;

  // Inject real news items di bagian atas panel
  const existingReal = newsPanel.querySelectorAll('.real-news-item');
  existingReal.forEach(el => el.remove());

  const fragment = document.createDocumentFragment();

  realMarketState.realNews.slice(0, 5).forEach(item => {
    const div = document.createElement('div');
    div.className = 'real-news-item';
    const icon = item.sentiment === 'bullish' ? '📈' : item.sentiment === 'bearish' ? '📉' : '📰';
    const badgeColor = item.sentiment === 'bullish'
      ? 'background:rgba(0,230,118,0.15);color:#00E676;border:1px solid rgba(0,230,118,0.3)'
      : item.sentiment === 'bearish'
      ? 'background:rgba(239,83,80,0.15);color:#EF5350;border:1px solid rgba(239,83,80,0.3)'
      : 'background:rgba(255,255,255,0.05);color:var(--text-muted);border:1px solid var(--border-subtle)';

    div.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:8px">
        <span class="real-news-badge" style="${badgeColor}">${icon} REAL</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text-primary);line-height:1.4;margin-bottom:3px">${item.title}</div>
          <div style="font-size:10px;color:var(--text-muted)">
            ${item.source || 'Berita Indonesia'}
            · ${item.publishedAt.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}
            ${item.url ? `· <a href="${item.url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:var(--cyan);text-decoration:none">Baca ↗</a>` : ''}
          </div>
        </div>
      </div>
    `;
    fragment.appendChild(div);
  });

  newsPanel.prepend(fragment);
}

// Refresh manual
async function _manualRefreshRealMarket() {
  const statusEl = document.getElementById('real-fetch-status');
  if (statusEl) { statusEl.textContent = '⏳ Memuat…'; statusEl.style.color = 'var(--text-muted)'; }
  await fetchRealExchangeRate();
  await fetchRealStockPrices();
  await fetchRealIndonesiaNews();
}

// ════════════════════════════════════════════════════════
// §9. PATCH MACRO-ENGINE — UPDATE KURS DENGAN KEY RESMI
// ════════════════════════════════════════════════════════

(function patchMacroEngineWithRealKey() {
  // Override MACRO.APIS di macro-engine.js dengan endpoint key resmi user
  function tryPatch() {
    if (typeof MACRO === 'undefined') { setTimeout(tryPatch, 200); return; }

    // Masukkan endpoint dengan API key ke posisi pertama (prioritas)
    const keyedUrl = `https://v6.exchangerate-api.com/v6/${REAL_MKT.EXCHANGE_KEY}/latest/USD`;
    if (!MACRO.APIS.includes(keyedUrl)) {
      MACRO.APIS.unshift(keyedUrl);
    }

    // Percepat interval fetch macro menjadi selaras dengan real-market
    // (tidak perlu lebih sering dari 5 menit)
    console.log('✅ [RealMarket] macro-engine.js patched dengan API key resmi');
  }
  setTimeout(tryPatch, 500);
})();

// ════════════════════════════════════════════════════════
// §10. INIT
// ════════════════════════════════════════════════════════

(function initRealMarketEngine() {
  function tryInit() {
    // Tunggu dashboard ada
    const dash = document.getElementById('dashboard-page');
    if (!dash) { setTimeout(tryInit, 500); return; }

    // Tunggu STOCKS didefinisikan
    if (typeof STOCKS === 'undefined') { setTimeout(tryInit, 300); return; }

    // Inject widget pasar nyata
    _injectRealWidget();

    // ─── Fetch pertama: kurs → saham → berita ───────────────
    // Berurutan agar tidak membanjiri network saat startup
    fetchRealExchangeRate()
      .then(() => new Promise(r => setTimeout(r, 1500)))  // jeda 1.5d
      .then(() => fetchRealStockPrices())
      .then(() => new Promise(r => setTimeout(r, 2000)))  // jeda 2d
      .then(() => fetchRealIndonesiaNews())
      .then(() => {
        console.log('✅ [RealMarket] Full init selesai — data real Indonesia aktif');
      });

    // ─── Interval refresh ────────────────────────────────────
    // Kurs (selaras dengan macro-engine — jika macro sudah jalan, ini backup)
    setInterval(fetchRealExchangeRate, REAL_MKT.EXCHANGE_FETCH_INTERVAL);

    // Saham real Indonesia
    setInterval(fetchRealStockPrices, REAL_MKT.STOCK_FETCH_INTERVAL);

    // Berita real Indonesia
    setInterval(fetchRealIndonesiaNews, REAL_MKT.NEWS_FETCH_INTERVAL);

    // Update widget elapsed time tiap 30 detik
    setInterval(_updateRealWidget, 30_000);

    // Fetch ulang saat tab aktif kembali
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const staleStock = Date.now() - realMarketState.lastStockFetch > REAL_MKT.STOCK_FETCH_INTERVAL;
        const staleNews  = Date.now() - realMarketState.newsLastFetch  > REAL_MKT.NEWS_FETCH_INTERVAL;
        if (staleStock) fetchRealStockPrices();
        if (staleNews)  fetchRealIndonesiaNews();
      }
    });

    console.log('✅ [RealMarket] Engine aktif — memuat data pasar Indonesia real…');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 2000)); // tunggu engine lain dulu
  } else {
    setTimeout(tryInit, 2000);
  }
})();

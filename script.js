// ═══════════════════════════════════════════════════════
// UNISBA VIRTUAL MARKET — CORE ENGINE
// script.js
// ═══════════════════════════════════════════════════════

'use strict';

// ─── STOCKS DATA ───────────────────────────────────────
const STOCKS = [
  { id: 'EKOP', name: 'Ekonomi Pembangunan', faculty: 'FEB',    basePrice: 8500,  color: '#D4AF37', bg: 'rgba(212,175,55,0.12)'  },
  { id: 'MNJM', name: 'Manajemen',           faculty: 'FEB',    basePrice: 12000, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)'    },
  { id: 'AKNT', name: 'Akuntansi',           faculty: 'FEB',    basePrice: 10500, color: '#3D7EFF', bg: 'rgba(61,126,255,0.12)'  },
  { id: 'HUKM', name: 'Hukum',               faculty: 'FH',     basePrice: 9800,  color: '#E040FB', bg: 'rgba(224,64,251,0.1)'   },
  { id: 'TKSP', name: 'Teknik Sipil',        faculty: 'FT',     basePrice: 7600,  color: '#FF6D00', bg: 'rgba(255,109,0,0.1)'    },
  { id: 'TKIN', name: 'Teknik Industri',     faculty: 'FT',     basePrice: 8200,  color: '#00E676', bg: 'rgba(0,230,118,0.1)'    },
  { id: 'PSIK', name: 'Psikologi',           faculty: 'FPSI',   basePrice: 11000, color: '#FF4081', bg: 'rgba(255,64,129,0.1)'   },
  { id: 'KDOK', name: 'Kedokteran',          faculty: 'FK',     basePrice: 25000, color: '#69F0AE', bg: 'rgba(105,240,174,0.1)'  },
  { id: 'FARM', name: 'Farmasi',             faculty: 'FFAR',   basePrice: 18000, color: '#40C4FF', bg: 'rgba(64,196,255,0.1)'   },
  { id: 'KOMM', name: 'Komunikasi',          faculty: 'FKOM',   basePrice: 7200,  color: '#FFAB40', bg: 'rgba(255,171,64,0.1)'   },
  { id: 'PDDK', name: 'Pendidikan Islam',    faculty: 'FPAI',   basePrice: 6500,  color: '#B2FF59', bg: 'rgba(178,255,89,0.1)'   },
  { id: 'MTEK', name: 'Mesin & Elektro',     faculty: 'FT',     basePrice: 8800,  color: '#EA80FC', bg: 'rgba(234,128,252,0.1)'  },
];

// ─── NEWS EVENTS ───────────────────────────────────────
const NEWS_POOL = [
  { text: 'Mahasiswa Ekonomi Pembangunan raih juara 1 LKTI Nasional!',    stock: 'EKOP', impact:  0.06, type: 'bullish' },
  { text: 'Akuntansi UNISBA raih predikat akreditasi UNGGUL dari BAN-PT', stock: 'AKNT', impact:  0.08, type: 'bullish' },
  { text: 'Kedokteran UNISBA buka program beasiswa penuh untuk 2025',     stock: 'KDOK', impact:  0.05, type: 'bullish' },
  { text: 'Mahasiswa Teknik Sipil menangkan kompetisi desain jembatan',    stock: 'TKSP', impact:  0.07, type: 'bullish' },
  { text: 'Farmasi UNISBA luncurkan laboratorium riset terbaru',          stock: 'FARM', impact:  0.09, type: 'bullish' },
  { text: 'Psikologi UNISBA jalin kerjasama dengan Google Indonesia',      stock: 'PSIK', impact:  0.10, type: 'bullish' },
  { text: 'Komunikasi UNISBA dituduh plagiarisme karya tulis dosen',       stock: 'KOMM', impact: -0.07, type: 'bearish' },
  { text: 'Jumlah mahasiswa baru Hukum turun 15% tahun ini',              stock: 'HUKM', impact: -0.05, type: 'bearish' },
  { text: 'Isu keuangan kampus pengaruhi operasional beberapa prodi',     stock: null,   impact: -0.03, type: 'bearish' },
  { text: 'UNISBA masuk TOP 10 PTS terbaik versi Webometrics 2025!',      stock: null,   impact:  0.04, type: 'bullish' },
  { text: 'Teknik Industri UNISBA jalin MoU dengan perusahaan Fortune 500', stock: 'TKIN', impact: 0.12, type: 'bullish' },
  { text: 'Manajemen UNISBA juara 1 lomba bisnis plan nasional',          stock: 'MNJM', impact:  0.08, type: 'bullish' },
  { text: 'Prodi Mesin & Elektro terima hibah Rp 2 miliar dari BRIN',     stock: 'MTEK', impact:  0.11, type: 'bullish' },
  { text: 'Penerimaan mahasiswa baru diperpanjang — sinyal demand lemah', stock: null,   impact: -0.02, type: 'bearish' },
  { text: 'BEM UNISBA umumkan festival akademik terbesar sepanjang sejarah', stock: null, impact: 0.02, type: 'neutral' },
  { text: 'Pendidikan Islam UNISBA terima kunjungan delegasi dari Timur Tengah', stock: 'PDDK', impact: 0.06, type: 'bullish' },
  { text: 'Saham Hukum UNISBA melemah menyusul kontroversi internal fakultas',    stock: 'HUKM', impact: -0.06, type: 'bearish' },
  { text: 'Kedokteran UNISBA raih akreditasi internasional dari WHO Asia Pacific', stock: 'KDOK', impact:  0.09, type: 'bullish' },
  { text: 'Saham Komunikasi tertekan setelah survei kepuasan mahasiswa anjlok',    stock: 'KOMM', impact: -0.05, type: 'bearish' },
  { text: 'Farmasi UNISBA tandatangani MoU riset dengan Kalbe Farma',              stock: 'FARM', impact:  0.08, type: 'bullish' },
  { text: 'Teknik Sipil UNISBA menangkan proyek infrastruktur Pemkot Bandung',     stock: 'TKSP', impact:  0.07, type: 'bullish' },
  { text: 'Manajemen UNISBA buka program fast-track untuk mahasiswa berprestasi',  stock: 'MNJM', impact:  0.05, type: 'bullish' },
  { text: 'Bank Indonesia: suku bunga acuan tetap — pasar merespons positif',      stock: null,   impact:  0.03, type: 'bullish' },
  { text: 'Psikologi UNISBA gelar seminar nasional kesehatan mental 2025',         stock: 'PSIK', impact:  0.04, type: 'bullish' },
  { text: 'Akuntansi UNISBA siapkan program CPA bersama IAI',                      stock: 'AKNT', impact:  0.06, type: 'bullish' },
  { text: 'Isu kenaikan UKT picu demo mahasiswa — sentimen pasar negatif',         stock: null,   impact: -0.03, type: 'bearish' },
  { text: 'Mesin & Elektro UNISBA raih juara robot nasional LKT 2025',             stock: 'MTEK', impact:  0.10, type: 'bullish' },
];

// ─── CONSTANTS ─────────────────────────────────────────
const INITIAL_BALANCE  = 10_000_000; // Rp 10 juta
const PRICE_UPDATE_MS  = 2000;       // lebih cepat = lebih real-time
const NEWS_INTERVAL_MS = 15000;
const CHART_POINTS     = 80;

// ─── STATE ─────────────────────────────────────────────
let state = {
  user: null,
  balance: INITIAL_BALANCE,
  holdings: {},          // { stockId: { qty, avgPrice } }
  transactions: [],
  prices: {},            // { stockId: currentPrice }
  priceHistory: {},      // { stockId: [prices] }
  activeStock: STOCKS[0].id,
  activeTab: 'trade',
  tradeSide: 'buy',
  chart: null,
  chartData: {},
  pendingNewsImpact: {}, // stockId → multiplier to apply
  recentNews: [],
  leaderboard: [],
  zoomLevel: 1,          // 1 = default, 2 = 2× zoom in, 0.5 = zoom out
  panelLeft: true,       // stock list visible
  panelRight: true,      // trade panel visible
};

// ─── HELPERS ───────────────────────────────────────────
const fmt = {
  rp:   v => 'Rp ' + Math.round(v).toLocaleString('id-ID'),
  pct:  v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%',
  qty:  v => v.toLocaleString('id-ID'),
  mono: v => v.toFixed(0),
};

function lerp(a, b, t) { return a + (b - a) * t; }

// Gaussian random (Box-Muller) — lebih realistis dari uniform random
function gaussianRandom(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Geometric Brownian Motion — model harga saham profesional (Black-Scholes)
function randomWalk(price, volatility = 0.012) {
  const dt    = PRICE_UPDATE_MS / 1000;
  const drift = 0.00002 * dt;
  const sigma = volatility * Math.sqrt(dt);
  const shock = gaussianRandom(0, 1);
  const newPrice = price * Math.exp((drift - 0.5 * sigma * sigma) + sigma * shock);
  return Math.max(100, newPrice);
}

// Mean-reversion: harga tidak boleh terlalu jauh dari basePrice (±40%)
function applyMeanReversion(price, basePrice, strength = 0.003) {
  const ratio = price / basePrice;
  if (ratio > 1.4) return price * (1 - strength * (ratio - 1.4) * 3);
  if (ratio < 0.6) return price * (1 + strength * (0.6 - ratio) * 3);
  return price;
}

function getStock(id) { return STOCKS.find(s => s.id === id); }

function totalPortfolioValue() {
  // Saham prodi: harga dari state.prices
  const prodiVal = Object.entries(state.holdings).reduce((sum, [id, h]) => {
    return sum + (h.qty * (state.prices[id] || 0));
  }, 0);
  // Saham bank: harga dari bankState.prices, dicari berdasarkan bank.code
  let bankVal = 0;
  if (typeof BANK_STOCKS !== 'undefined' && typeof bankState !== 'undefined') {
    const bankCodeSet = new Set(BANK_STOCKS.map(b => b.code));
    Object.entries(state.holdings).forEach(([id, h]) => {
      if (!bankCodeSet.has(id) || !h.qty) return;
      // Cari bank berdasarkan code
      const bank = BANK_STOCKS.find(b => b.code === id);
      if (!bank) return;
      const d = bankState.prices[bank.ticker];
      const price = (d && d.price > 0) ? d.price : (bank.basePrice || 0);
      bankVal += h.qty * price;
    });
  }
  return prodiVal + bankVal;
}

function totalAssets() {
  return state.balance + totalPortfolioValue();
}

function pnl(id) {
  const h = state.holdings[id];
  if (!h || !h.qty) return 0;
  return (state.prices[id] - h.avgPrice) * h.qty;
}

// ─── SHARED PRICE SEED (semua user lihat harga sama) ───
// Seed per 5-menit window: stabil dalam window, berubah tiap 5 menit
function getSharedSeed() {
  // Selalu hitung ulang berdasarkan waktu sekarang — tidak di-cache
  // agar semua user yang load di window yang sama punya seed yang sama
  return Math.floor(Date.now() / (5 * 60 * 1000));
}
function seededRand(s) {
  s = Math.imul(s ^ (s >>> 15), s | 1);
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
  return ((s ^ (s >>> 14)) >>> 0) / 4294967295;
}
function seededGauss(s1, s2) {
  const u = Math.max(1e-10, seededRand((s1 * 2654435761) >>> 0));
  const v = seededRand((s2 * 2246822519) >>> 0);
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── INIT PRICES ───────────────────────────────────────
function initPrices() {
  const baseSeed = getSharedSeed();
  STOCKS.forEach((s, si) => {
    const hist = [];
    let p = s.basePrice;
    for (let i = 0; i < CHART_POINTS; i++) {
      const seed = ((baseSeed * 31 + si * 997 + i * 7919) & 0xFFFFFFFF) >>> 0;
      const shock = seededGauss(seed, seed ^ 0xDEADBEEF);
      const dt = 2;
      const sigma = 0.008 * Math.sqrt(dt);
      const drift = 0.00002 * dt;
      p = p * Math.exp((drift - 0.5 * sigma * sigma) + sigma * shock);
      p = Math.max(100, applyMeanReversion(p, s.basePrice));
      hist.push(parseFloat(p.toFixed(0)));
    }
    state.prices[s.id]       = hist[hist.length - 1];
    state.priceHistory[s.id] = hist;
  });
}

// ─── PRICE ENGINE ──────────────────────────────────────
// Setiap saham punya volatilitas berbeda, seperti di bursa nyata
const STOCK_VOLATILITY = {
  EKOP: 0.010, MNJM: 0.013, AKNT: 0.009, HUKM: 0.011,
  TKSP: 0.014, TKIN: 0.012, PSIK: 0.015, KDOK: 0.007,
  FARM: 0.008, KOMM: 0.016, PDDK: 0.010, MTEK: 0.013,
};

function tickPrices() {
  const changes = {};
  STOCKS.forEach(s => {
    const oldPrice = state.prices[s.id];
    let vol = STOCK_VOLATILITY[s.id] || 0.012;

    // Impact dari news
    let impact = 1;
    if (state.pendingNewsImpact[s.id]) {
      impact += state.pendingNewsImpact[s.id];
      delete state.pendingNewsImpact[s.id];
    }

    let newPrice = randomWalk(oldPrice * impact, vol);
    // Mean reversion agar tidak lari terlalu jauh dari base
    newPrice = applyMeanReversion(newPrice, s.basePrice);

    changes[s.id] = { old: oldPrice, new: newPrice };
    state.prices[s.id] = newPrice;
    state.priceHistory[s.id].push(parseFloat(newPrice.toFixed(0)));
    // CRITICAL FIX: HARD LIMIT 80 points — too many = y-scale auto-compress = FLAT CHART
    const MAX_PH = 80;
    while (state.priceHistory[s.id].length > MAX_PH)
      state.priceHistory[s.id].shift();
  });
  return changes;
}

// ─── NEWS ENGINE ───────────────────────────────────────
function fireNews() {
  const item = NEWS_POOL[Math.floor(Math.random() * NEWS_POOL.length)];
  const ts   = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  state.recentNews.unshift({ ...item, ts });
  if (state.recentNews.length > 20) state.recentNews.pop();

  if (item.impact !== 0) {
    if (item.stock) {
      state.pendingNewsImpact[item.stock] = item.impact;
    } else {
      // Market-wide news — affects all stocks lightly
      STOCKS.forEach(s => {
        state.pendingNewsImpact[s.id] = (state.pendingNewsImpact[s.id] || 0) + item.impact * 0.4;
      });
    }
  }

  renderNewsTicker();
  renderNewsPanel();

  showToast(
    item.type === 'bullish' ? '📈 Berita Pasar' : item.type === 'bearish' ? '📉 Berita Pasar' : '📰 Berita',
    item.text,
    item.type === 'bullish' ? 'success' : item.type === 'bearish' ? 'error' : 'info'
  );
}

// ═══════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════

// ─── Stock List ────────────────────────────────────────
function renderStockList(filter = '') {
  const container = document.getElementById('stock-list-items');
  if (!container) return;

  const q = filter.toLowerCase();
  const filtered = STOCKS.filter(s =>
    s.id.toLowerCase().includes(q) ||
    s.name.toLowerCase().includes(q) ||
    s.faculty.toLowerCase().includes(q)
  );

  container.innerHTML = filtered.map(s => {
    const price = state.prices[s.id] || s.basePrice;
    const hist  = state.priceHistory[s.id] || [];
    const first = hist[Math.max(0, hist.length - 20)] || price;
    const chg   = ((price - first) / first) * 100;
    const active = s.id === state.activeStock ? ' active' : '';

    return `
      <div class="stock-item${active}" onclick="selectStock('${s.id}')">
        <div class="stock-icon" style="background:${s.bg};color:${s.color}">${s.id.slice(0,2)}</div>
        <div class="stock-info">
          <div class="stock-ticker">${s.id}</div>
          <div class="stock-name">${s.name}</div>
        </div>
        <div class="stock-price-wrap">
          <div class="stock-price">${fmt.rp(price)}</div>
          <div class="stock-change ${chg >= 0 ? 'up' : 'down'}">${fmt.pct(chg)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Ticker tape ───────────────────────────────────────
function renderTicker() {
  const tracks = document.querySelectorAll('.ticker-track');
  if (!tracks.length) return;

  const items = STOCKS.map(s => {
    const price = state.prices[s.id] || s.basePrice;
    const hist  = state.priceHistory[s.id] || [];
    const first = hist[Math.max(0, hist.length - 20)] || price;
    const chg   = ((price - first) / first) * 100;
    return `
      <span class="ticker-item">
        <span class="ticker-name">${s.id}</span>
        <span class="ticker-price">${fmt.rp(price)}</span>
        <span class="ticker-change ${chg >= 0 ? 'up' : 'down'}">${fmt.pct(chg)}</span>
      </span>
      <span class="ticker-dot"></span>
    `;
  }).join('');

  tracks.forEach(t => t.innerHTML = items + items); // double for infinite scroll
}

// ─── Zoom & Panel Controls ──────────────────────────────
const ZOOM_STEPS  = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const ZOOM_LABELS = ['¼×', '½×', '¾×', '1×', '1.5×', '2×', '3×', '4×'];

function getZoomedHistory() {
  const hist = state.priceHistory[state.activeStock] || [];
  const idx  = ZOOM_STEPS.indexOf(state.zoomLevel);
  const zv   = ZOOM_STEPS[Math.max(0, idx)];
  // zoomLevel > 1 → fewer points (more detail), < 1 → more points (wider view)
  const points = Math.max(10, Math.round(CHART_POINTS / zv));
  return hist.slice(-Math.min(points, hist.length));
}

function applyZoom(delta) {
  const idx     = ZOOM_STEPS.indexOf(state.zoomLevel);
  const newIdx  = Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + delta));
  state.zoomLevel = ZOOM_STEPS[newIdx];
  const label   = document.getElementById('zoom-label');
  if (label) label.textContent = ZOOM_LABELS[newIdx];
  // Redraw line chart
  if (state.chart && state.chart.type === 'line') {
    drawLineChart();
    return;
  }
  if (state.chart && state.chart.data) {
    const hist = getZoomedHistory();
    state.chart.data.labels   = hist.map((_, i) => i);
    state.chart.data.datasets[0].data = [...hist];
    state.chart.update('none');
  }
}

function resetZoom() {
  state.zoomLevel = 1;
  const label = document.getElementById('zoom-label');
  if (label) label.textContent = '1×';
  if (state.chart && state.chart.type === 'line') {
    drawLineChart();
    return;
  }
  if (state.chart && state.chart.data) {
    const hist = getZoomedHistory();
    state.chart.data.labels   = hist.map((_, i) => i);
    state.chart.data.datasets[0].data = [...hist];
    state.chart.update('none');
  }
}

function togglePanel(side) {
  const tradingView = document.querySelector('.trading-view');
  if (!tradingView) return;

  if (side === 'left') {
    state.panelLeft = !state.panelLeft;
    tradingView.classList.toggle('left-collapsed', !state.panelLeft);
    const btn = document.getElementById('toggle-stock-list');
    if (btn) btn.classList.toggle('active', state.panelLeft);
  } else {
    state.panelRight = !state.panelRight;
    tradingView.classList.toggle('right-collapsed', !state.panelRight);
    const btn = document.getElementById('toggle-trade-panel');
    if (btn) btn.classList.toggle('active', state.panelRight);
  }
  // Resize chart after panel animation
  setTimeout(() => {
    if (state.chart && state.chart.type === 'line') {
      const canvas = document.getElementById('main-chart');
      if (canvas) {
        const wrap = canvas.parentElement;
        if (wrap) { canvas.width = wrap.clientWidth; canvas.height = wrap.clientHeight; lineChartGradientCache = {}; }
        drawLineChart();
      }
    }
  }, 320);
}

// ─── LINE CHART (smooth, professional, multi-warna per saham) ─────────────
// Garis smooth ala TradingView dengan gradient fill + label harga kanan

let lineChartAnimId = null;
let lineChartGradientCache = {};
let lineTooltip = { visible: false, x: 0, y: 0 };

function initChart() {
  const canvas = document.getElementById('main-chart');
  if (!canvas) return;

  if (lineChartAnimId) { cancelAnimationFrame(lineChartAnimId); lineChartAnimId = null; }
  if (state.chart && state.chart.destroy) { state.chart.destroy(); state.chart = null; }

  const wrap = canvas.parentElement;
  canvas.width  = wrap ? wrap.clientWidth  : canvas.offsetWidth;
  // Pada mobile, wrap bisa belum resolve height-nya karena flex layout.
  // Gunakan getBoundingClientRect() sebagai fallback yang lebih akurat.
  let wrapH = wrap ? wrap.clientHeight : canvas.offsetHeight;
  if (wrapH < 50 && wrap) wrapH = wrap.getBoundingClientRect().height;
  // CRITICAL FIX: NEVER allow chart height below 300px — this causes flat/compressed chart
  const MIN_CHART_H = window.innerWidth <= 900 ? 240 : 300;
  const MAX_CHART_H = 520;
  if (wrapH < MIN_CHART_H) wrapH = window.innerWidth <= 900 ? Math.floor(window.innerHeight * 0.42) : 380;
  if (wrapH > MAX_CHART_H) wrapH = MAX_CHART_H;
  canvas.height = Math.max(MIN_CHART_H, wrapH);
  if (canvas.width < 10 || canvas.height < MIN_CHART_H) {
    setTimeout(initChart, 100);
    return;
  }

  lineChartGradientCache = {};
  state.chart = { type: 'line', canvas };

  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    lineTooltip.x = e.clientX - rect.left;
    lineTooltip.y = e.clientY - rect.top;
    lineTooltip.visible = true;
    drawLineChart();
  };
  canvas.onmouseleave = () => {
    lineTooltip.visible = false;
    drawLineChart();
  };

  drawLineChart();
}

function drawLineChart() {
  const canvas = document.getElementById('main-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const s    = getStock(state.activeStock);
  const hist = getZoomedHistory();
  if (!hist || hist.length < 2) return;

  const PAD_LEFT   = 8;
  const PAD_RIGHT  = 72;  // lebih lebar untuk label kompak
  const PAD_TOP    = 16;
  const PAD_BOTTOM = 28;
  const drawW = W - PAD_LEFT - PAD_RIGHT;
  const drawH = H - PAD_TOP  - PAD_BOTTOM;

  // CRITICAL FIX: ensure minimum Y range — prevents flat compressed chart
  const rawMin = Math.min(...hist);
  const rawMax = Math.max(...hist);
  const midP   = (rawMin + rawMax) / 2;
  const minRng = midP * 0.008; // at least 0.8% range
  const yMin = Math.min(rawMin * 0.998, midP - minRng);
  const yMax = Math.max(rawMax * 1.002, midP + minRng);

  function toX(i) { return PAD_LEFT + (i / (hist.length - 1)) * drawW; }
  function toY(v) { return PAD_TOP + drawH - ((v - yMin) / (yMax - yMin)) * drawH; }

  // ── Grid lines + price labels kanan (rapat, 8 baris) ──
  const gridLines = 8;
  ctx.font = '9px JetBrains Mono, monospace';
  for (let i = 0; i <= gridLines; i++) {
    const y     = PAD_TOP + (drawH / gridLines) * i;
    const price = yMax - ((yMax - yMin) / gridLines) * i;

    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(W - PAD_RIGHT, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tick mark
    ctx.strokeStyle = 'rgba(120,140,170,0.25)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(W - PAD_RIGHT, y);
    ctx.lineTo(W - PAD_RIGHT + 3, y);
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(140,160,190,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(price).toLocaleString('id-ID'), W - PAD_RIGHT + 5, y + 3.5);
  }

  // ── Open price reference (garis horizontal tipis) ──
  const openPrice  = hist[0];
  const lastPrice  = hist[hist.length - 1];
  const isUp       = lastPrice >= openPrice;
  const openY      = toY(openPrice);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, openY);
  ctx.lineTo(W - PAD_RIGHT, openY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── DUAL-COLOR LINE: hijau di atas open, merah di bawah ──
  // Warna global saham tetap untuk gradient fill
  const stockColor = isUp ? '#00E676' : '#EF5350';
  const GREEN = '#00E676';
  const RED   = '#EF5350';

  // Helper: build smooth catmull-rom-like path
  function buildSmoothPath(from, to) {
    ctx.beginPath();
    ctx.moveTo(toX(from), toY(hist[from]));
    for (let i = from + 1; i <= to; i++) {
      const x0 = toX(i - 1), y0 = toY(hist[i - 1]);
      const x1 = toX(i),     y1 = toY(hist[i]);
      // Catmull-Rom tension 0.4 for ultra-smooth
      const cpx1 = x0 + (x1 - x0) * 0.4;
      const cpx2 = x1 - (x1 - x0) * 0.4;
      ctx.bezierCurveTo(cpx1, y0, cpx2, y1, x1, y1);
    }
  }

  // ── Gradient fill area (warna sesuai arah) ──
  const gKeyUp   = state.activeStock + W + H + 'up';
  const gKeyDown = state.activeStock + W + H + 'dn';
  if (!lineChartGradientCache[gKeyUp]) {
    const g = ctx.createLinearGradient(0, PAD_TOP, 0, PAD_TOP + drawH);
    g.addColorStop(0,   'rgba(0,230,118,0.35)');
    g.addColorStop(0.7, 'rgba(0,230,118,0.05)');
    g.addColorStop(1,   'rgba(0,230,118,0)');
    lineChartGradientCache[gKeyUp] = g;
  }
  if (!lineChartGradientCache[gKeyDown]) {
    const g = ctx.createLinearGradient(0, PAD_TOP, 0, PAD_TOP + drawH);
    g.addColorStop(0,   'rgba(239,83,80,0.05)');
    g.addColorStop(0.4, 'rgba(239,83,80,0.28)');
    g.addColorStop(1,   'rgba(239,83,80,0.08)');
    lineChartGradientCache[gKeyDown] = g;
  }

  // Fill background area
  buildSmoothPath(0, hist.length - 1);
  ctx.lineTo(toX(hist.length - 1), PAD_TOP + drawH);
  ctx.lineTo(PAD_LEFT, PAD_TOP + drawH);
  ctx.closePath();
  ctx.fillStyle = isUp ? lineChartGradientCache[gKeyUp] : lineChartGradientCache[gKeyDown];
  ctx.fill();

  // ── Draw dual-color segments ──
  // Segment-by-segment: each segment colored by its direction vs open
  ctx.lineWidth = 2.2;
  ctx.lineJoin  = 'round';
  ctx.lineCap   = 'round';
  ctx.setLineDash([]);

  // Draw in two passes: green segments, then red segments
  // Find crossings with openPrice
  function drawColoredLine(targetColor) {
    let inSegment = false;
    for (let i = 0; i < hist.length - 1; i++) {
      const v0 = hist[i];
      const v1 = hist[i + 1];
      const c0 = v0 >= openPrice ? GREEN : RED;
      const c1 = v1 >= openPrice ? GREEN : RED;

      if (c0 !== targetColor && c1 !== targetColor) continue;

      // Interpolate crossing point
      if (c0 !== c1) {
        // There's a crossing between i and i+1
        const t = (openPrice - v0) / (v1 - v0);
        const cx = toX(i) + t * (toX(i + 1) - toX(i));
        const cy = toY(openPrice);

        if (c0 === targetColor) {
          // Segment starts with this color, ends at crossing
          if (!inSegment) { ctx.beginPath(); ctx.strokeStyle = targetColor; ctx.moveTo(toX(i), toY(v0)); inSegment = true; }
          ctx.lineTo(cx, cy);
          ctx.stroke();
          inSegment = false;
        } else {
          // Segment starts at crossing with this color
          ctx.beginPath(); ctx.strokeStyle = targetColor; ctx.moveTo(cx, cy);
          ctx.lineTo(toX(i + 1), toY(v1));
          ctx.stroke();
          inSegment = false;
        }
      } else {
        // Same color segment
        if (!inSegment) { ctx.beginPath(); ctx.strokeStyle = targetColor; ctx.moveTo(toX(i), toY(v0)); inSegment = true; }
        const cpx1 = toX(i)   + (toX(i+1) - toX(i))   * 0.4;
        const cpx2 = toX(i+1) - (toX(i+1) - toX(i))   * 0.4;
        ctx.bezierCurveTo(cpx1, toY(v0), cpx2, toY(v1), toX(i+1), toY(v1));
      }
    }
    if (inSegment) ctx.stroke();
  }

  drawColoredLine(GREEN);
  drawColoredLine(RED);

  // ── Current price dashed line + badge ──
  const lineY      = toY(lastPrice);
  const badgeColor = isUp ? '#00E676' : '#EF5350';

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(212,175,55,0.6)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, lineY);
  ctx.lineTo(W - PAD_RIGHT, lineY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Badge
  const badgeW = 60, badgeH = 17, badgeX = W - PAD_RIGHT + 1, badgeY = lineY - badgeH / 2;
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
  else ctx.rect(badgeX, badgeY, badgeW, badgeH);
  ctx.fill();
  // Arrow
  ctx.beginPath();
  ctx.moveTo(badgeX, lineY);
  ctx.lineTo(badgeX - 5, lineY - 4);
  ctx.lineTo(badgeX - 5, lineY + 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.font      = 'bold 8px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(lastPrice).toLocaleString('id-ID'), badgeX + badgeW / 2, badgeY + badgeH - 4);

  // ── Tooltip on hover ──
  if (lineTooltip.visible) {
    const relX    = Math.max(0, Math.min(lineTooltip.x - PAD_LEFT, drawW));
    const idx     = Math.round((relX / drawW) * (hist.length - 1));
    const safeIdx = Math.max(0, Math.min(idx, hist.length - 1));
    const hPx     = toX(safeIdx);
    const hPy     = toY(hist[safeIdx]);
    const hPrice  = hist[safeIdx];
    const dotColor = hPrice >= openPrice ? GREEN : RED;

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(hPx, PAD_TOP);
    ctx.lineTo(hPx, PAD_TOP + drawH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(hPx, hPy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    const tw = 120, th = 40;
    let tx = hPx + 14;
    if (tx + tw > W - PAD_RIGHT) tx = hPx - tw - 14;
    const ty = Math.max(PAD_TOP, Math.min(H - PAD_BOTTOM - th, hPy - th / 2));

    ctx.fillStyle   = 'rgba(8,13,26,0.95)';
    ctx.strokeStyle = dotColor;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(tx, ty, tw, th, 6);
    else ctx.rect(tx, ty, tw, th);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = dotColor;
    ctx.font      = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(hPrice).toLocaleString('id-ID'), tx + 10, ty + 15);

    const chg = ((hPrice - openPrice) / openPrice) * 100;
    ctx.fillStyle = chg >= 0 ? GREEN : RED;
    ctx.font      = '9px JetBrains Mono, monospace';
    ctx.fillText((chg >= 0 ? '+' : '') + chg.toFixed(2) + '%', tx + 10, ty + 29);
  }
}

function updateChartData() {
  if (!state.chart || state.chart.type !== 'line') return;
  const canvas = document.getElementById('main-chart');
  if (!canvas) return;
  const wrap = canvas.parentElement;
  const MIN_H = window.innerWidth <= 900 ? 240 : 300;
  if (wrap) {
    const wW = wrap.clientWidth;
    let wH = wrap.clientHeight;
    if (wH < MIN_H) wH = wrap.getBoundingClientRect().height;
    if (wH < MIN_H) wH = MIN_H;  // CRITICAL: never go below minimum
    wH = Math.min(wH, 520);
    if (canvas.width !== wW || canvas.height !== wH) {
      canvas.width  = wW;
      canvas.height = wH;
      lineChartGradientCache = {};
    }
  }
  drawLineChart();
}

// ─── Chart Header ──────────────────────────────────────
function renderChartHeader() {
  const s     = getStock(state.activeStock);
  const price = state.prices[state.activeStock] || s.basePrice;
  const hist  = state.priceHistory[state.activeStock] || [];
  const open  = hist[Math.max(0, hist.length - 20)] || price;
  const chg   = ((price - open) / open) * 100;
  const hi    = Math.max(...hist.slice(-20));
  const lo    = Math.min(...hist.slice(-20));

  const iconEl = document.getElementById('chart-symbol-icon');
  const nameEl = document.getElementById('chart-symbol-name');
  const fullEl = document.getElementById('chart-symbol-full');
  const priceEl = document.getElementById('chart-current-price');
  const chgEl   = document.getElementById('chart-price-change');
  const hiEl    = document.getElementById('chart-stat-hi');
  const loEl    = document.getElementById('chart-stat-lo');

  if (iconEl) {
    iconEl.textContent   = s.id.slice(0, 2);
    iconEl.style.background = s.bg;
    iconEl.style.color   = s.color;
  }
  if (nameEl) nameEl.textContent = s.id;
  if (fullEl) fullEl.textContent = s.name + ' · ' + s.faculty;

  if (priceEl) {
    const wasUp = priceEl.dataset.last && price > parseFloat(priceEl.dataset.last);
    const wasDown = priceEl.dataset.last && price < parseFloat(priceEl.dataset.last);
    priceEl.textContent = fmt.rp(price);
    priceEl.dataset.last = price;
    if (wasUp)   priceEl.classList.add('text-green');
    if (wasDown) priceEl.classList.add('text-red');
    setTimeout(() => { priceEl.classList.remove('text-green', 'text-red'); }, 600);
  }

  if (chgEl) {
    chgEl.textContent  = fmt.pct(chg) + ' (' + fmt.rp(price - open) + ')';
    chgEl.className    = 'chart-price-change ' + (chg >= 0 ? 'up' : 'down');
  }

  if (hiEl) hiEl.textContent = fmt.rp(hi);
  if (loEl) loEl.textContent = fmt.rp(lo);
}

// ─── Trade Panel ───────────────────────────────────────
function renderTradePanel() {
  const s      = getStock(state.activeStock);
  const price  = state.prices[state.activeStock] || s.basePrice;
  const h      = state.holdings[state.activeStock];
  const qty    = h ? h.qty : 0;

  const balEl  = document.getElementById('trade-balance');
  const ownEl  = document.getElementById('trade-owned');
  const priceEl = document.getElementById('trade-unit-price');

  if (balEl)   balEl.textContent = fmt.rp(state.balance);
  if (ownEl)   ownEl.textContent = qty + ' lembar';
  if (priceEl) priceEl.textContent = fmt.rp(price);

  recalcTradeTotal();
}

function recalcTradeTotal() {
  const qtyEl   = document.getElementById('trade-qty-input');
  const totalEl = document.getElementById('trade-total-value');
  if (!qtyEl || !totalEl) return;

  const qty   = parseFloat(qtyEl.value) || 0;
  const price = state.prices[state.activeStock] || 0;
  const total = qty * price;

  totalEl.textContent = fmt.rp(total);
}

// ─── User Balance in Topbar ────────────────────────────
function renderTopbarBalance() {
  const el = document.getElementById('topbar-balance');
  if (el) el.textContent = fmt.rp(totalAssets());
}

// ─── Holdings Mini in Trade Panel ──────────────────────
function renderHoldingsMini() {
  const container = document.getElementById('holdings-mini-list');
  if (!container) return;

  const entries = Object.entries(state.holdings).filter(([_, h]) => h.qty > 0);
  if (!entries.length) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:4px 0;">Belum ada kepemilikan saham.</div>';
    return;
  }

  container.innerHTML = entries.map(([id, h]) => {
    // Harga: cek prodi dulu, lalu bank
    let price = state.prices[id] || 0;
    // FIX: cari bank berdasarkan code (bukan ticker)
    const bankStock = (typeof BANK_STOCKS !== 'undefined') ? BANK_STOCKS.find(b => b.code === id) : null;
    if (!price && bankStock && typeof bankState !== 'undefined') {
      const bd = bankState.prices[bankStock.ticker];
      price = (bd && bd.price > 0) ? bd.price : (bankStock.basePrice || 0);
    }
    const displayId = bankStock ? bankStock.code : id;
    const p      = (price - h.avgPrice) * h.qty;
    const pctStr = h.avgPrice ? fmt.pct(((price - h.avgPrice) / h.avgPrice) * 100) : '+0.00%';
    return `
      <div class="holding-row">
        <div>
          <div class="holding-ticker">${displayId}${bankStock ? ' <span style="font-size:8px;color:var(--gold)">B</span>' : ''}</div>
          <div class="holding-qty">${fmt.qty(h.qty)} lbr</div>
        </div>
        <div class="holding-pnl ${p >= 0 ? 'profit' : 'loss'}">
          ${p >= 0 ? '+' : ''}${fmt.rp(p)}<br>
          <span style="font-size:9px">${pctStr}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Portfolio View ─────────────────────────────────────
function renderPortfolio() {
  const totalVal = totalPortfolioValue();
  const total    = totalAssets();
  const pnlAbs   = total - INITIAL_BALANCE;
  const pnlPct   = ((total - INITIAL_BALANCE) / INITIAL_BALANCE) * 100;

  setEl('port-balance',   fmt.rp(state.balance));
  setEl('port-portfolio', fmt.rp(totalVal));
  setEl('port-total',     fmt.rp(total));

  const pnlEl = document.getElementById('port-pnl');
  if (pnlEl) {
    pnlEl.textContent = (pnlAbs >= 0 ? '+' : '') + fmt.rp(pnlAbs) + ' (' + fmt.pct(pnlPct) + ')';
    pnlEl.className   = 'summary-card-pnl ' + (pnlAbs >= 0 ? 'profit' : 'loss');
  }

  // Holdings table
  const holdingsBody = document.getElementById('holdings-table-body');
  if (holdingsBody) {
    const entries = Object.entries(state.holdings).filter(([_, h]) => h.qty > 0);
    if (!entries.length) {
      holdingsBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Belum ada kepemilikan saham.</td></tr>';
    } else {
      holdingsBody.innerHTML = entries.map(([id, h]) => {
        // Cek apakah ini saham prodi atau saham bank
        const s = getStock(id);
        // FIX: cari bank berdasarkan code (bukan ticker)
        const bankStock = (typeof BANK_STOCKS !== 'undefined') ? BANK_STOCKS.find(b => b.code === id) : null;

        // Tentukan harga terkini: prodi dari state.prices, bank dari bankState.prices
        let price = state.prices[id] || 0;
        if (!price && bankStock && typeof bankState !== 'undefined') {
          const bd = bankState.prices[bankStock.ticker];
          price = (bd && bd.price > 0) ? bd.price : (bankStock.basePrice || 0);
        }

        const val  = price * h.qty;
        const p    = (price - h.avgPrice) * h.qty;
        const pPct = h.avgPrice ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;

        // Nama & warna: prodi pakai s, bank pakai bankStock, fallback generic
        const displayId   = bankStock ? bankStock.code : id;
        const displayName = s ? s.name : (bankStock ? bankStock.name + ' · ' + bankStock.category : id);
        const bgColor     = s ? s.bg   : (bankStock ? bankStock.color + '22' : 'rgba(212,175,55,0.1)');
        const txtColor    = s ? s.color : (bankStock ? bankStock.color : '#D4AF37');
        const isBank      = !!bankStock;

        return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:10px;font-weight:700;background:${bgColor};color:${txtColor}">${displayId.slice(0,2)}</div>
                <div>
                  <div class="mono" style="font-size:12px;font-weight:600">${displayId}${isBank ? ' <span style="font-size:9px;color:var(--gold);font-family:var(--font-mono)">BANK</span>' : ''}</div>
                  <div class="muted">${displayName}</div>
                </div>
              </div>
            </td>
            <td class="mono">${fmt.qty(h.qty)}</td>
            <td class="mono">${fmt.rp(h.avgPrice)}</td>
            <td class="mono">${fmt.rp(price)}</td>
            <td class="mono">${fmt.rp(val)}</td>
            <td class="${p >= 0 ? 'profit' : 'loss'}">${p >= 0 ? '+' : ''}${fmt.rp(p)}<br><span style="font-size:10px">${fmt.pct(pPct)}</span></td>
            <td>
              ${isBank
                ? `<button class="btn btn-cyan" style="padding:5px 12px;font-size:11px" onclick="if(typeof selectBank==='function'){selectBank('${bankStock.ticker}');if(typeof _switchToBankTab==='function')_switchToBankTab();}">Trade</button>`
                : `<button class="btn btn-cyan" style="padding:5px 12px;font-size:11px" onclick="quickTrade('${id}')">Trade</button>`
              }
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Transactions table
  const txBody = document.getElementById('tx-table-body');
  if (txBody) {
    if (!state.transactions.length) {
      txBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Belum ada transaksi.</td></tr>';
    } else {
      txBody.innerHTML = [...state.transactions].reverse().slice(0, 50).map(tx => `
        <tr>
          <td class="muted">${tx.ts}</td>
          <td><span class="tx-badge ${tx.type}">${tx.type.toUpperCase()}</span></td>
          <td class="mono" style="font-size:11px">${tx.stock}</td>
          <td class="mono">${fmt.qty(tx.qty)}</td>
          <td class="mono">${fmt.rp(tx.price)}</td>
          <td class="mono" style="color:var(--gold)">${fmt.rp(tx.total)}</td>
        </tr>
      `).join('');
    }
  }
}

// ─── News Panel ────────────────────────────────────────
function renderNewsPanel() {
  const container = document.getElementById('news-panel-items');
  if (!container) return;

  if (!state.recentNews.length) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:11px;">Menunggu berita terbaru...</div>';
    return;
  }

  container.innerHTML = state.recentNews.slice(0, 8).map(n => `
    <div class="news-item">
      <span class="news-item-tag ${n.type}">${n.type}</span>
      <div class="news-item-text">${n.text}</div>
      <div class="news-item-time">${n.ts}</div>
    </div>
  `).join('');
}

function renderNewsTicker() {
  const el = document.getElementById('news-ticker');
  if (el && state.recentNews.length) {
    el.textContent = state.recentNews.map(n => n.text).join('   ·   ');
  }
  // Update topbar news bar juga
  const topEl = document.getElementById('topbar-news-scroll');
  if (topEl && state.recentNews.length) {
    const items = state.recentNews.slice(0, 10).map(n => {
      const icon = n.type === 'bullish' ? '▲' : n.type === 'bearish' ? '▼' : '●';
      const color = n.type === 'bullish' ? '#00E676' : n.type === 'bearish' ? '#EF5350' : '#D4AF37';
      return `<span style="color:${color};margin-right:4px">${icon}</span><span style="margin-right:40px">${n.text}</span>`;
    }).join('');
    topEl.innerHTML = items + items;
  }
}

// ─── Leaderboard ───────────────────────────────────────
// DEMO_USERS_LB removed — leaderboard now only shows real Firebase users or current user

const AVATAR_COLORS = [
  '#D4AF37','#00E5FF','#3D7EFF','#E040FB','#FF6D00',
  '#00E676','#FF4081','#69F0AE','#FFAB40','#EA80FC',
];

function colorFromUid(uid) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) & 0xFFFFFF;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ─── DOM diff helper: update text without full rebuild ───
function _setIfChanged(el, val) {
  if (el && el.textContent !== String(val)) el.textContent = val;
}
function _setAttrIfChanged(el, attr, val) {
  if (el && el.getAttribute(attr) !== String(val)) el.setAttribute(attr, val);
}

function buildLeaderboardUI(allUsers) {
  // ── Podium (top 3) ──
  const podium = document.getElementById('leaderboard-podium');
  if (podium) {
    const top3     = allUsers.slice(0, 3);
    const arranged = [top3[1], top3[0], top3[2]].filter(Boolean);
    const rankClass = ['rank-2', 'rank-1', 'rank-3'];
    const rankNums  = [2, 1, 3];

    // Full rebuild only when count changes (first load / different number of top-3 users)
    if (podium.children.length !== arranged.length) {
      podium.innerHTML = arranged.map((u, i) => {
        const pnl = u.totalAssets - INITIAL_BALANCE;
        return `
          <div class="podium-card ${rankClass[i]} ${u.isMe ? 'is-me' : ''}" data-uid="${u.name}">
            <div class="podium-rank">${rankNums[i] === 1 ? '🥇' : rankNums[i] === 2 ? '🥈' : '🥉'}</div>
            <div class="podium-avatar" style="background:linear-gradient(135deg,${u.color}55,${u.color}22);border:1.5px solid ${u.color}66">${u.initials}</div>
            <div class="podium-name">${u.name}</div>
            <div class="podium-value">${fmt.rp(u.totalAssets)}</div>
            <div class="podium-pnl ${pnl >= 0 ? 'profit' : 'loss'}">${pnl >= 0 ? '+' : ''}${fmt.rp(pnl)}</div>
          </div>
        `;
      }).join('');
    } else {
      // In-place update — no DOM removal, no flicker
      arranged.forEach((u, i) => {
        const card = podium.children[i];
        if (!card) return;
        const pnl = u.totalAssets - INITIAL_BALANCE;
        const valEl = card.querySelector('.podium-value');
        const pnlEl = card.querySelector('.podium-pnl');
        if (valEl) _setIfChanged(valEl, fmt.rp(u.totalAssets));
        if (pnlEl) {
          _setIfChanged(pnlEl, (pnl >= 0 ? '+' : '') + fmt.rp(pnl));
          pnlEl.className = 'podium-pnl ' + (pnl >= 0 ? 'profit' : 'loss');
        }
      });
    }
  }

  // ── Full table ──
  const lbBody = document.getElementById('lb-table-body');
  if (!lbBody) return;

  const existingRows = lbBody.querySelectorAll('tr[data-lb-idx]');

  if (existingRows.length !== allUsers.length) {
    // Full rebuild only when row count differs
    lbBody.innerHTML = allUsers.map((u, i) => {
      const pnl    = u.totalAssets - INITIAL_BALANCE;
      const pnlPct = (pnl / INITIAL_BALANCE) * 100;
      const rowStyle = u.isMe ? 'background:rgba(105,240,174,0.05);outline:1px solid rgba(105,240,174,0.15)' : '';
      return `
        <tr data-lb-idx="${i}" style="${rowStyle}">
          <td class="mono" style="font-size:13px;color:${i < 3 ? 'var(--gold)' : 'var(--text-muted)'};font-weight:${i < 3 ? 700 : 400}">
            ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:11px;font-weight:700;background:${u.color}22;color:${u.color};flex-shrink:0">${u.initials}</div>
              <div>
                <div style="font-size:13px;color:${u.isMe ? 'var(--green)' : 'var(--text-primary)'}">${u.name}${u.isMe ? ' <span style="font-size:10px;color:var(--green);font-family:var(--font-mono)">(Anda)</span>' : ''}</div>
                ${u.source === 'real' ? '<div style="font-size:10px;color:var(--gold);font-family:var(--font-mono);letter-spacing:0.05em">LIVE</div>' : ''}
              </div>
            </div>
          </td>
          <td class="mono lb-asset" style="color:var(--gold)">${fmt.rp(u.totalAssets)}</td>
          <td class="lb-pnl ${pnl >= 0 ? 'profit' : 'loss'}">${pnl >= 0 ? '+' : ''}${fmt.rp(pnl)}</td>
          <td class="lb-pnlpct ${pnl >= 0 ? 'profit' : 'loss'}">${fmt.pct(pnlPct)}</td>
        </tr>
      `;
    }).join('');
  } else {
    // In-place update: only touch changing cells, no flicker
    allUsers.forEach((u, i) => {
      const row = lbBody.querySelector(`tr[data-lb-idx="${i}"]`);
      if (!row) return;
      const pnl    = u.totalAssets - INITIAL_BALANCE;
      const pnlPct = (pnl / INITIAL_BALANCE) * 100;

      const assetEl  = row.querySelector('.lb-asset');
      const pnlEl    = row.querySelector('.lb-pnl');
      const pnlPctEl = row.querySelector('.lb-pnlpct');

      if (assetEl)  _setIfChanged(assetEl, fmt.rp(u.totalAssets));
      if (pnlEl)    { _setIfChanged(pnlEl, (pnl >= 0 ? '+' : '') + fmt.rp(pnl)); pnlEl.className = 'lb-pnl ' + (pnl >= 0 ? 'profit' : 'loss'); }
      if (pnlPctEl) { _setIfChanged(pnlPctEl, fmt.pct(pnlPct)); pnlPctEl.className = 'lb-pnlpct ' + (pnl >= 0 ? 'profit' : 'loss'); }
    });
  }
}

async function renderLeaderboard() {
  const myAssets   = totalAssets();
  const myName     = state.user?.displayName || state.user?.email?.split('@')[0] || 'Anda';
  const myUid      = state.user?.uid || 'me';
  const myInitials = myName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const myColor    = '#69F0AE';

  const meEntry = { name: myName, initials: myInitials, totalAssets: myAssets, color: myColor, isMe: true, source: 'real' };

  // Show loading state
  const lbBody = document.getElementById('lb-table-body');
  if (lbBody) lbBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">⏳ Memuat data leaderboard…</td></tr>';

  // Sync data kita DULU sebelum baca leaderboard agar total aset terbaru tersimpan
  if (firebaseReady && state.user) {
    await syncLeaderboard();
  }

  if (firebaseReady) {
    // Coba maksimal 3x jika gagal
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const entries = await getLeaderboard(50);
        let realUsers = entries
          .filter(e => e.totalAssets && e.name)
          .map(e => ({
            name:        e.name,
            initials:    e.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
            totalAssets: e.totalAssets,
            color:       colorFromUid(e.id || e.name),
            isMe:        e.id === myUid,
            source:      'real',
          }));

        // Make sure current user appears even if not yet synced
        const alreadyInList = realUsers.some(u => u.isMe);
        if (!alreadyInList) realUsers.push(meEntry);
        else realUsers = realUsers.map(u => u.isMe ? { ...u, totalAssets: myAssets, isMe: true } : u);

        realUsers.sort((a, b) => b.totalAssets - a.totalAssets);

        // Show badge count
        const badge = document.getElementById('lb-count-badge');
        if (badge) badge.textContent = realUsers.length + ' trader';
        const srcBadge = document.getElementById('lb-source-badge');
        if (srcBadge) srcBadge.style.display = 'inline';
        const footer = document.getElementById('lb-footer-text');
        if (footer) footer.textContent = '🔴 Data LIVE dari Firebase · Diperbarui setiap transaksi';

        buildLeaderboardUI(realUsers);
        return; // berhasil, keluar
      } catch (e) {
        console.warn(`Leaderboard fetch attempt ${attempt + 1} failed:`, e);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000)); // tunggu 1s sebelum retry
      }
    }
    // Semua attempt gagal, tapi Firebase ready — tampilkan user saat ini saja
    buildLeaderboardUI([meEntry]);
    const footer = document.getElementById('lb-footer-text');
    if (footer) footer.textContent = '⚠️ Gagal memuat data. Klik Refresh untuk coba lagi.';
    return;
  }

  // Firebase not ready — show only current user + demo notice
  const badge = document.getElementById('lb-count-badge');
  if (badge) badge.textContent = '1 trader';
  const footer = document.getElementById('lb-footer-text');
  const srcBadge = document.getElementById('lb-source-badge');
  if (srcBadge) srcBadge.style.display = 'none';

  if (!firebaseReady) {
    // Show informative message
    if (footer) footer.innerHTML = '⚙️ <span style="color:var(--gold)">Firebase belum dikonfigurasi</span> — leaderboard real membutuhkan Firebase. Isi konfigurasi di <code style="font-size:10px;color:var(--cyan)">firebase.js</code> untuk melihat peringkat semua trader.';
    const podium = document.getElementById('leaderboard-podium');
    if (podium) {
      podium.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:32px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg)">
          <div style="font-size:32px;margin-bottom:12px">⚙️</div>
          <div style="font-family:var(--font-display);font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:8px">Firebase Belum Dikonfigurasi</div>
          <div style="font-size:13px;color:var(--text-muted);max-width:400px;margin:0 auto;line-height:1.6">
            Untuk leaderboard real-time, isi konfigurasi Firebase di <code style="color:var(--cyan)">firebase.js</code>.<br>
            Setelah dikonfigurasi, semua trader yang login akan otomatis muncul di sini.
          </div>
        </div>
      `;
    }
    if (lbBody) lbBody.innerHTML = `
      <tr>
        <td>👤</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:11px;font-weight:700;background:#69F0AE22;color:#69F0AE">${meEntry.initials}</div>
            <div style="color:var(--green)">${meEntry.name} <span style="font-size:10px;font-family:var(--font-mono)">(Anda — Sesi ini)</span></div>
          </div>
        </td>
        <td class="mono" style="color:var(--gold)">${fmt.rp(meEntry.totalAssets)}</td>
        <td class="${meEntry.totalAssets - INITIAL_BALANCE >= 0 ? 'profit' : 'loss'}">${meEntry.totalAssets - INITIAL_BALANCE >= 0 ? '+' : ''}${fmt.rp(meEntry.totalAssets - INITIAL_BALANCE)}</td>
        <td class="${meEntry.totalAssets - INITIAL_BALANCE >= 0 ? 'profit' : 'loss'}">${fmt.pct(((meEntry.totalAssets - INITIAL_BALANCE) / INITIAL_BALANCE) * 100)}</td>
      </tr>
    `;
    return;
  }

  // Fallback: current user only
  buildLeaderboardUI([meEntry]);
}

// ─── Utilities ─────────────────────────────────────────
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ─── Toast ─────────────────────────────────────────────
const toastIcons = { success: '✅', error: '❌', info: '💡', warning: '⚠️' };

function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.querySelector('.toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${toastIcons[type] || '💡'}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ═══════════════════════════════════════════════════════
// USER INTERACTIONS
// ═══════════════════════════════════════════════════════

function selectStock(id) {
  state.activeStock = id;
  renderStockList();
  renderChartHeader();
  renderTradePanel();
  // Destroy dulu sebelum init ulang
  if (state.chart) {
    if (state.chart.destroy) state.chart.destroy();
    state.chart = null;
  }
  if (lineChartAnimId) { cancelAnimationFrame(lineChartAnimId); lineChartAnimId = null; }
  initChart();
}

function quickTrade(id) {
  selectStock(id);
  switchTab('trade');
  // Scroll to trade panel
  document.querySelector('.trade-panel')?.scrollIntoView({ behavior: 'smooth' });
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.nav-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  // Gunakan hanya class .active, JANGAN set inline style display
  // agar tidak konflik dengan CSS .panel-view { display:none } / .panel-view.active { display:flex }
  document.querySelectorAll('.panel-view').forEach(el => {
    el.style.display = '';  // reset inline style supaya CSS yang kontrol
    el.classList.toggle('active', el.id === tab + '-view');
  });

  if (tab === 'trade') {
    // Destroy chart lama jika ada
    if (state.chart) {
      if (state.chart.destroy) state.chart.destroy();
      state.chart = null;
    }
    if (lineChartAnimId) { cancelAnimationFrame(lineChartAnimId); lineChartAnimId = null; }
    // Tunggu CSS transition selesai (display:flex perlu layout pass)
    setTimeout(() => {
      initChart();
      renderAll();
    }, 50);
  }
  if (tab === 'portfolio')   renderPortfolio();
  if (tab === 'leaderboard') renderLeaderboard();
}

function switchTradeSide(side) {
  state.tradeSide = side;
  document.getElementById('trade-tab-buy').classList.toggle('active', side === 'buy');
  document.getElementById('trade-tab-sell').classList.toggle('active', side === 'sell');

  const btn = document.getElementById('trade-submit-btn');
  if (btn) {
    btn.textContent = side === 'buy' ? '▲ BELI SEKARANG' : '▼ JUAL SEKARANG';
    btn.className   = side === 'buy' ? 'btn-buy-full' : 'btn-sell-full';
  }
}

function setTradePercent(pct) {
  const price = state.prices[state.activeStock] || 1;
  let qty = 0;
  if (state.tradeSide === 'buy') {
    qty = Math.floor((state.balance * pct) / price);
  } else {
    const h = state.holdings[state.activeStock];
    qty = Math.floor(((h?.qty || 0) * pct));
  }
  const input = document.getElementById('trade-qty-input');
  if (input) { input.value = qty; recalcTradeTotal(); }
}

function executeTrade() {
  const qtyInput = document.getElementById('trade-qty-input');
  const qty      = parseInt(qtyInput?.value) || 0;

  if (qty <= 0) { showToast('Perhatian', 'Masukkan jumlah lembar yang valid.', 'warning'); return; }

  const s     = getStock(state.activeStock);
  const price = state.prices[state.activeStock] || s.basePrice;
  const total = qty * price;

  if (state.tradeSide === 'buy') {
    if (total > state.balance) {
      showToast('Saldo Tidak Cukup', `Dibutuhkan ${fmt.rp(total)}, saldo Anda ${fmt.rp(state.balance)}`, 'error');
      return;
    }

    state.balance -= total;
    if (!state.holdings[s.id]) {
      state.holdings[s.id] = { qty: 0, avgPrice: price };
    }
    const h = state.holdings[s.id];
    const newQty = h.qty + qty;
    h.avgPrice   = ((h.avgPrice * h.qty) + (price * qty)) / newQty;
    h.qty        = newQty;

    playSound('buy');
    showToast('✅ Order Berhasil!', `Beli ${qty} lembar ${s.id} @ ${fmt.rp(price)}`, 'success');

  } else {
    const h = state.holdings[s.id];
    if (!h || h.qty < qty) {
      showToast('Lembar Tidak Cukup', `Anda hanya memiliki ${h?.qty || 0} lembar ${s.id}`, 'error');
      return;
    }

    h.qty        -= qty;
    state.balance += total;

    if (h.qty === 0) delete state.holdings[s.id];

    playSound('sell');
    showToast('✅ Order Berhasil!', `Jual ${qty} lembar ${s.id} @ ${fmt.rp(price)}`, 'success');
  }

  // Record transaction
  state.transactions.push({
    ts:    new Date().toLocaleString('id-ID'),
    type:  state.tradeSide,
    stock: s.id,
    qty,
    price,
    total,
  });

  if (qtyInput) qtyInput.value = '';

  saveToStorage();
  renderAll();
  syncLeaderboard();
}

function renderAll() {
  renderStockList();
  renderChartHeader();
  renderTradePanel();
  renderHoldingsMini();
  renderTicker();
  renderTopbarBalance();
  if (state.activeTab === 'portfolio')    renderPortfolio();
  if (state.activeTab === 'leaderboard')  renderLeaderboard();
  // Update active stock label di komunitas
  const csEl = document.getElementById('community-active-stock');
  if (csEl) csEl.textContent = state.activeStock || '—';
}

// ─── Sound (Web Audio API) ─────────────────────────────
let audioCtx;

function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    if (type === 'buy') {
      osc.frequency.setValueAtTime(523, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(784, audioCtx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(784, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.2);
    }

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) { /* audio not supported */ }
}

// ─── Persistence ───────────────────────────────────────
function saveToStorage() {
  const data = {
    balance:      state.balance,
    holdings:     state.holdings,
    transactions: state.transactions.slice(-100),
    binaryHistory: binaryState.history.slice(-30),
  };
  try {
    localStorage.setItem('uvm_state', JSON.stringify(data));
  } catch (e) {}

  // Firebase sync
  if (firebaseReady && state.user) {
    updateUserData(state.user.uid, data).catch(() => {});
    syncLeaderboard();
  }
}

function loadFromStorage(data) {
  if (!data) return;
  state.balance      = data.balance      ?? INITIAL_BALANCE;
  state.holdings     = data.holdings     ?? {};
  state.transactions = data.transactions ?? [];
  // Pulihkan binary history (posisi aktif tidak bisa dipulihkan karena timer sudah lewat)
  if (data.binaryHistory) binaryState.history = data.binaryHistory;
}

async function syncLeaderboard() {
  if (!firebaseReady || !state.user) return;
  const total = totalAssets();
  // Prioritize displayName, fallback ke email prefix, fallback ke 'Anon'
  const name = (state.user.displayName && state.user.displayName.trim())
    ? state.user.displayName.trim()
    : (state.user.email ? state.user.email.split('@')[0] : 'Anon');
  try {
    await updateLeaderboard(state.user.uid, {
      name,
      email:       state.user.email || '',
      totalAssets: total,
      pnl:         total - INITIAL_BALANCE,
      ts:          Date.now(),
    });
    console.log('✅ Leaderboard synced:', name, fmt.rp(total));
  } catch(e) { console.warn('syncLeaderboard error:', e); }
}

// ─── Particle Background ───────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x     = Math.random() * canvas.width;
      this.y     = Math.random() * canvas.height;
      this.size  = Math.random() * 1.5 + 0.3;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.7 ? '#D4AF37' : Math.random() > 0.5 ? '#00E5FF' : '#3D7EFF';
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle   = this.color;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < 120; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.save();
          ctx.globalAlpha = (1 - dist / 100) * 0.08;
          ctx.strokeStyle = '#D4AF37';
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
}

// ─── Clock ─────────────────────────────────────────────
function startClock() {
  function tick() {
    const el = document.getElementById('topbar-time');
    if (el) el.textContent = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ─── Loading Screen ────────────────────────────────────
function runLoadingScreen(onDone) {
  const screen = document.getElementById('loading-screen');
  const bar    = document.getElementById('loading-bar');
  const status = document.getElementById('loading-status');
  if (!screen) { onDone(); return; }

  const steps = [
    'Menginisialisasi pasar…',
    'Memuat data saham…',
    'Menghubungkan ke Firebase…',
    'Mengkalibrasi algoritma harga…',
    'Menyiapkan dashboard…',
  ];

  let pct   = 0;
  let step  = 0;

  const interval = setInterval(() => {
    pct += Math.random() * 25 + 10;
    if (pct >= 100) pct = 100;

    if (bar)    bar.style.width = pct + '%';
    if (status) status.textContent = steps[Math.min(step, steps.length - 1)];
    step++;

    if (pct >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        screen.classList.add('hidden');
        onDone();
      }, 500);
    }
  }, 400);
}

// ═══════════════════════════════════════════════════════
// AUTH FLOW
// ═══════════════════════════════════════════════════════

function showPage(page) {
  document.getElementById('landing-page')?.classList.toggle('hidden', page !== 'landing');
  document.getElementById('auth-page')?.classList.toggle('hidden', page !== 'auth');
  const dash = document.getElementById('dashboard-page');
  if (dash) dash.style.display = page === 'dashboard' ? 'flex' : 'none';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideAuthError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

async function handleLogin() {
  hideAuthError();
  const email = document.getElementById('login-email')?.value?.trim();
  const pass  = document.getElementById('login-password')?.value;

  if (!email || !pass) { showAuthError('Masukkan email dan password.'); return; }

  if (firebaseReady) {
    const btn = document.querySelector('#login-form .btn-gold');
    if (btn) { btn.textContent = '⏳ Masuk…'; btn.disabled = true; }

    const loginTimeout = setTimeout(() => {
      if (btn) { btn.textContent = 'Masuk ke Platform'; btn.disabled = false; }
      showAuthError('Koneksi lambat. Periksa internet Anda dan coba lagi.');
    }, 12000);

    try {
      await signInWithEmail(email, pass);
      clearTimeout(loginTimeout);
    } catch (e) {
      clearTimeout(loginTimeout);
      if (btn) { btn.textContent = 'Masuk ke Platform'; btn.disabled = false; }
      const msgs = {
        'auth/user-not-found':    'Akun tidak ditemukan. Silakan Daftar terlebih dahulu.',
        'auth/wrong-password':    'Password salah.',
        'auth/invalid-email':     'Format email tidak valid.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
        'auth/invalid-login-credentials': '⚠️ Email/password salah, atau akun ini terdaftar via Google — gunakan tombol "Lanjutkan dengan Google" di atas.',
      };
      showAuthError(msgs[e.code] || e.message);
    }
  } else {
    demoLogin({ displayName: email.split('@')[0], email, uid: 'demo-' + Date.now() });
  }
}

async function handleRegister() {
  hideAuthError();
  const name  = document.getElementById('reg-name')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim();
  const pass  = document.getElementById('reg-password')?.value;

  if (!name || !email || !pass) { showAuthError('Isi semua kolom.'); return; }
  if (pass.length < 6)          { showAuthError('Password minimal 6 karakter.'); return; }

  if (firebaseReady) {
    const btn = document.querySelector('#register-form .btn-gold');
    if (btn) { btn.textContent = 'Mendaftarkan…'; btn.disabled = true; }
    try {
      const cred = await signUpWithEmail(email, pass);
      await cred.user.updateProfile({ displayName: name });
      await createUserData(cred.user.uid, {
        name, email,
        balance: INITIAL_BALANCE,
        holdings: {},
        transactions: [],
        createdAt: Date.now(),
      });
      // onAuthStateChanged will fire and enter dashboard automatically
      showToast('✅ Akun Dibuat!', 'Selamat datang ' + name + '! Modal Rp10JT sudah disiapkan.', 'success');
    } catch (e) {
      if (btn) { btn.textContent = 'Buat Akun — Rp10.000.000 Modal Gratis'; btn.disabled = false; }
      const msgs = {
        'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk.',
        'auth/invalid-email':        'Format email tidak valid.',
        'auth/weak-password':        'Password terlalu lemah (min 6 karakter).',
      };
      showAuthError(msgs[e.code] || e.message);
    }
  } else {
    // Demo mode — save name and enter
    localStorage.setItem('uvm_demo_name', name);
    demoLogin({ displayName: name, email, uid: 'demo-' + Date.now() });
  }
}

async function handleGoogleLogin() {
  hideAuthError();
  if (firebaseReady) {
    const btn = document.getElementById('btn-google-login');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Menghubungkan ke Google…'; }

    // Timeout fallback: jika 15 detik tidak ada respons
    const loginTimeout = setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg> Lanjutkan dengan Google`;
        showAuthError('Login timeout. Pastikan popup Google tidak diblokir browser, lalu coba lagi.');
      }
    }, 15000);

    try {
      await signInWithGoogle();
      clearTimeout(loginTimeout);
      // onAuthStateChanged akan handle masuk dashboard otomatis
    } catch (e) {
      clearTimeout(loginTimeout);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg> Lanjutkan dengan Google`;
      }
      const msgs = {
        'auth/popup-closed-by-user':    'Login dibatalkan.',
        'auth/popup-blocked':           '⚠️ Popup diblokir! Klik ikon di address bar untuk izinkan popup, lalu coba lagi.',
        'auth/cancelled-popup-request': 'Login dibatalkan.',
        'auth/network-request-failed':  'Periksa koneksi internet Anda.',
        'auth/unauthorized-domain':     '⚠️ Domain belum diotorisasi. Tambahkan domain di Firebase Console → Authentication → Authorized domains.',
        'auth/invalid-login-credentials': 'Akun Google ini belum terdaftar. Silakan klik tab Daftar terlebih dahulu.',
      };
      showAuthError(msgs[e.code] || 'Login Google gagal: ' + e.message);
    }
  } else {
    showAuthError('⚙️ Firebase belum dikonfigurasi. Isi konfigurasi di firebase.js terlebih dahulu, atau gunakan tombol Demo di bawah.');
  }
}

// Enter platform without Firebase login
function enterDemoMode() {
  const savedName = localStorage.getItem('uvm_demo_name') || 'Demo Trader';
  // Use stable demo UID so data always loads back on re-login
  demoLogin({ displayName: savedName, email: 'demo@unisba.ac.id', uid: 'demo-local-stable' });
}

function demoLogin(user) {
  state.user = user;
  const saved = localStorage.getItem('uvm_state');
  loadFromStorage(saved ? JSON.parse(saved) : null);
  enterDashboard();
}

async function handleLogout() {
  saveToStorage();
  if (firebaseReady) await signOut();
  state.user = null;
  // Hapus session cache agar tidak auto-login lagi
  try { localStorage.removeItem('uvm_session_cache'); } catch(e) {}
  showPage('landing');
}

async function enterDashboard() {
  const displayName = state.user?.displayName || state.user?.email?.split('@')[0] || 'Trader';
  const initials = displayName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0,2).toUpperCase();
  const avatar   = document.getElementById('user-avatar');
  if (avatar) avatar.textContent = initials;

  const nameEl = document.getElementById('user-display-name');
  if (nameEl) nameEl.textContent = displayName;

  // Update community avatar initials
  const commAvatar = document.getElementById('community-avatar');
  if (commAvatar) commAvatar.textContent = initials;

  showPage('dashboard');

  // Sync leaderboard (kirim data kita ke Firebase)
  await syncLeaderboard();

  setTimeout(() => {
    initChart();
    renderAll();
    renderNewsPanel();
    // Render leaderboard setelah sync selesai
    setTimeout(() => renderLeaderboard(), 800);
  }, 100);
}

// ═══════════════════════════════════════════════════════
// MAIN INIT
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Init Firebase (if available)
  const fbReady = initFirebase();

  // Init particle & price engine
  initParticles();
  initPrices();

  // Render landing ticker immediately
  renderTicker();
  renderTicker(); // populate landing ticker

  // ─── Session Cache Helper (1 jam) ───
  const SESSION_TTL = 60 * 60 * 1000; // 1 jam dalam ms

  function saveSessionCache(user) {
    try {
      localStorage.setItem('uvm_session_cache', JSON.stringify({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        savedAt: Date.now(),
      }));
    } catch(e) {}
  }

  function getSessionCache() {
    try {
      const raw = localStorage.getItem('uvm_session_cache');
      if (!raw) return null;
      const cache = JSON.parse(raw);
      if (Date.now() - cache.savedAt > SESSION_TTL) {
        localStorage.removeItem('uvm_session_cache');
        return null;
      }
      return cache;
    } catch(e) { return null; }
  }

  function clearSessionCache() {
    localStorage.removeItem('uvm_session_cache');
  }

  // Auth state listener — guard agar tidak double enterDashboard
  let _dashboardEntered = false;
  if (fbReady) {
    onAuthChanged(async user => {
      if (user) {
        // Update user info (bisa dipanggil berkali-kali oleh Firebase)
        state.user = user;
        saveSessionCache(user);

        if (!_dashboardEntered) {
          // Pertama kali auth — load data dari Firebase
          const data = await getUserData(user.uid);
          if (data) {
            loadFromStorage(data);
          } else {
            await createUserData(user.uid, {
              name: user.displayName || user.email,
              email: user.email,
              balance: INITIAL_BALANCE,
              holdings: {},
              transactions: [],
              createdAt: Date.now(),
            });
          }
          _dashboardEntered = true;
          enterDashboard();
        } else {
          // Re-fire (token refresh dll) — cukup update user di state
          // Tidak perlu enterDashboard lagi
        }
      } else {
        // Logout
        _dashboardEntered = false;
      }
    });
  }

  // Leaderboard realtime listener — debounced agar tidak kedap-kedip
  function startLeaderboardListener() {
    if (!firebaseReady || !db) return;
    let _lbDebounce = null;
    try {
      db.ref('leaderboard').orderByChild('totalAssets').on('value', snap => {
        if (!snap.exists()) return;
        // Update badge count immediately (ringan, tidak rebuild DOM)
        const count = Object.keys(snap.val() || {}).length;
        const badge = document.getElementById('lb-count-badge');
        if (badge) badge.textContent = count + ' trader';
        // Debounce render — tunggu 1.5 detik tenang sebelum rebuild tabel
        if (state.activeTab === 'leaderboard') {
          clearTimeout(_lbDebounce);
          _lbDebounce = setTimeout(() => renderLeaderboard(), 1500);
        }
      });
    } catch(e) { console.warn('Leaderboard listener error:', e); }
  }

  // Loading screen
  runLoadingScreen(async () => {
    // Mulai leaderboard realtime listener
    startLeaderboardListener();

    // Firebase mode: cek session cache dulu agar tidak lambat tunggu onAuthChanged
    if (fbReady) {
      const sessionCache = getSessionCache();
      if (sessionCache) {
        // Session masih valid — masuk dashboard langsung pakai localStorage dulu
        const cachedUser = {
          uid: sessionCache.uid,
          displayName: sessionCache.displayName,
          email: sessionCache.email,
        };
        state.user = cachedUser;
        _dashboardEntered = true;
        const saved = localStorage.getItem('uvm_state');
        loadFromStorage(saved ? JSON.parse(saved) : null);
        enterDashboard();

        // ✅ FIX: Setelah masuk, sync data dari Firebase di background
        // Ini mencegah data "balik ke nilai lama" saat refresh
        getUserData(cachedUser.uid).then(firebaseData => {
          if (!firebaseData) return;
          // Pilih data dengan total aset lebih tinggi (anti-overwrite)
          const fbBalance  = firebaseData.balance      ?? INITIAL_BALANCE;
          const fbHoldings = firebaseData.holdings     ?? {};
          const fbTx       = firebaseData.transactions ?? [];
          const localTotal = state.balance + Object.entries(state.holdings).reduce((s, [id, h]) => s + (h.qty * (state.prices[id] || 0)), 0);
          const fbTotal    = fbBalance    + Object.entries(fbHoldings).reduce((s, [id, h]) => s + (h.qty * (state.prices[id] || 0)), 0);

          // Selalu gunakan Firebase jika lebih baru (lebih banyak transaksi)
          if (fbTx.length >= (state.transactions || []).length || fbTotal !== localTotal) {
            loadFromStorage(firebaseData);
            // Update localStorage supaya konsisten
            try { localStorage.setItem('uvm_state', JSON.stringify({ balance: state.balance, holdings: state.holdings, transactions: state.transactions.slice(-100) })); } catch(e) {}
            renderAll();
            renderTopbarBalance();
            console.log('✅ Data di-sync dari Firebase:', fmt.rp(totalAssets()));
          }
        }).catch(e => console.warn('Background Firebase sync error:', e));

        return;
      }
      // Tidak ada cache — tampilkan landing, onAuthChanged akan handle jika masih login
      showPage('landing');
      return;
    }
    // Demo mode
    const cachedUser = localStorage.getItem('uvm_demo_user');
    if (cachedUser) {
      try { demoLogin(JSON.parse(cachedUser)); return; } catch (e) {}
    }
    showPage('landing');
  });

  // ─── roundRect polyfill (browser lama) ───
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
      r = Math.min(r, w/2, h/2);
      this.beginPath();
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      this.closePath();
    };
  }

  // ─── Window resize — redraw line chart ───
  window.addEventListener('resize', () => {
    if (state.chart && state.chart.type === 'line') {
      const canvas = document.getElementById('main-chart');
      if (canvas) {
        const wrap = canvas.parentElement;
        if (wrap) { canvas.width = wrap.clientWidth; canvas.height = wrap.clientHeight; lineChartGradientCache = {}; }
        drawLineChart();
      }
    }
  });

  // Ticker tape double-content (infinite scroll)
  const landing_ticker = document.getElementById('landing-ticker-track');
  if (landing_ticker) {
    // Content is set dynamically once prices are ready
    renderTicker();
  }

  // ─── Price update loop ─── SINGLE INTERVAL GUARD (anti bug interval duplikat)
  if (window.__priceLoopActive) { console.warn('[script.js] Price loop already running — skip'); }
  else {
  window.__priceLoopActive = true;
  if (window.__priceLoopInterval) clearInterval(window.__priceLoopInterval);
  window.__priceLoopInterval = setInterval(() => {
    const changes = tickPrices();

    // Flash price changes in stock list
    Object.entries(changes).forEach(([id, ch]) => {
      const items = document.querySelectorAll(`.stock-item`);
      items.forEach(item => {
        if (item.getAttribute('onclick')?.includes(id)) {
          item.classList.add(ch.new >= ch.old ? 'flash-up' : 'flash-down');
          setTimeout(() => item.classList.remove('flash-up', 'flash-down'), 600);
        }
      });
    });

    renderStockList();
    renderChartHeader();
    renderTopbarBalance();
    renderTicker();
    if (state.activeTab === 'portfolio') renderPortfolio();
    updateChartData();

  }, PRICE_UPDATE_MS);
  } // end single-interval guard

  // ─── News loop ───
  setInterval(fireNews, NEWS_INTERVAL_MS);
  // Fire first news after 5s
  setTimeout(fireNews, 5000);

  // ─── Clock ───
  startClock();

  // ─── Leaderboard auto-refresh (every 20s when on leaderboard tab) ───
  setInterval(() => {
    if (state.activeTab === 'leaderboard') renderLeaderboard();
  }, 30000);

  // ─── Auto-sync leaderboard setiap 10s agar total aset selalu update ───
  // (harga bergerak terus → total aset berubah meski tidak trade)
  setInterval(() => {
    if (firebaseReady && state.user) syncLeaderboard();
  }, 10000);

  // ─── Event listeners ───

  // Landing Enter Market button
  document.getElementById('btn-enter-market')?.addEventListener('click', () => {
    showPage('auth');
    document.getElementById('auth-login-tab')?.click();
    // Show demo banner if Firebase not configured
    const banner = document.getElementById('demo-mode-banner');
    if (banner) banner.classList.toggle('hidden', firebaseReady);
  });

  // Auth close / back to landing
  document.getElementById('btn-auth-close')?.addEventListener('click', () => {
    showPage('landing');
    hideAuthError();
  });

  // Zoom controls
  document.getElementById('zoom-in-btn')?.addEventListener('click', () => applyZoom(+1));
  document.getElementById('zoom-out-btn')?.addEventListener('click', () => applyZoom(-1));
  document.getElementById('zoom-reset-btn')?.addEventListener('click', resetZoom);

  // Scroll wheel zoom on chart canvas
  // Hanya aktif untuk line chart — candle chart punya handler sendiri di upgrades.js
  document.getElementById('main-chart')?.addEventListener('wheel', e => {
    // Skip jika candle chart aktif (upgrades.js handle sendiri)
    if (state.chart && state.chart.type === 'candle') return;
    e.preventDefault();
    applyZoom(e.deltaY < 0 ? +1 : -1);
  }, { passive: false });

  // Panel toggle buttons
  document.getElementById('toggle-stock-list')?.addEventListener('click', () => togglePanel('left'));
  document.getElementById('toggle-trade-panel')?.addEventListener('click', () => togglePanel('right'));

  // Auth tabs
  document.getElementById('auth-login-tab')?.addEventListener('click', () => {
    document.getElementById('auth-login-tab').classList.add('active');
    document.getElementById('auth-reg-tab').classList.remove('active');
    document.getElementById('login-form')?.classList.remove('hidden');
    document.getElementById('register-form')?.classList.add('hidden');
    hideAuthError();
  });

  document.getElementById('auth-reg-tab')?.addEventListener('click', () => {
    document.getElementById('auth-reg-tab').classList.add('active');
    document.getElementById('auth-login-tab').classList.remove('active');
    document.getElementById('register-form')?.classList.remove('hidden');
    document.getElementById('login-form')?.classList.add('hidden');
    hideAuthError();
  });

  // Enter key on forms
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('reg-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });

  // Dashboard nav tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Trade tabs
  document.getElementById('trade-tab-buy')?.addEventListener('click', () => switchTradeSide('buy'));
  document.getElementById('trade-tab-sell')?.addEventListener('click', () => switchTradeSide('sell'));

  // Trade qty input
  document.getElementById('trade-qty-input')?.addEventListener('input', recalcTradeTotal);

  // Trade pct buttons
  document.querySelectorAll('.trade-pct-btn').forEach(btn => {
    btn.addEventListener('click', () => setTradePercent(parseFloat(btn.dataset.pct)));
  });

  // Trade submit
  document.getElementById('trade-submit-btn')?.addEventListener('click', executeTrade);

  // Stock search
  document.getElementById('stock-search-input')?.addEventListener('input', e => {
    renderStockList(e.target.value);
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  // User avatar click → show dropdown (simple)
  document.getElementById('user-avatar')?.addEventListener('click', () => {
    showToast('👤 ' + (state.user?.displayName || 'Trader'), 'Total Aset: ' + fmt.rp(totalAssets()), 'info');
  });
});

// ═══════════════════════════════════════════════════════
// MOBILE ENHANCEMENTS
// ═══════════════════════════════════════════════════════

function updateMobileBar() {
  const s = getStock(state.activeStock);
  const price = state.prices[state.activeStock] || s.basePrice;
  const hist = state.priceHistory[state.activeStock] || [];
  const open = hist[Math.max(0, hist.length - 20)] || price;
  const chg = ((price - open) / open) * 100;

  const priceEl = document.getElementById('mobile-price-val');
  const chgEl = document.getElementById('mobile-price-chg');

  if (priceEl) priceEl.textContent = fmt.rp(price);
  if (chgEl) {
    chgEl.textContent = fmt.pct(chg);
    chgEl.className = 'mobile-price-chg ' + (chg >= 0 ? 'up' : 'down');
  }
}

function openMobileStockSheet() {
  const overlay = document.getElementById('mobile-stock-sheet');
  const list = document.getElementById('mobile-stock-list');
  if (!overlay || !list) return;

  // Build list
  list.innerHTML = STOCKS.map(s => {
    const price = state.prices[s.id] || s.basePrice;
    const hist = state.priceHistory[s.id] || [];
    const first = hist[Math.max(0, hist.length - 20)] || price;
    const chg = ((price - first) / first) * 100;
    const active = s.id === state.activeStock ? ' active' : '';
    return `
      <div class="stock-item${active}" onclick="selectStockMobile('${s.id}')">
        <div class="stock-icon" style="background:${s.bg};color:${s.color}">${s.id.slice(0,2)}</div>
        <div class="stock-info">
          <div class="stock-ticker">${s.id}</div>
          <div class="stock-name">${s.name}</div>
        </div>
        <div class="stock-price-wrap">
          <div class="stock-price">${fmt.rp(price)}</div>
          <div class="stock-change ${chg >= 0 ? 'up' : 'down'}">${fmt.pct(chg)}</div>
        </div>
      </div>
    `;
  }).join('');

  overlay.classList.add('open');
}

function closeMobileStockSheet() {
  document.getElementById('mobile-stock-sheet')?.classList.remove('open');
}

function selectStockMobile(id) {
  selectStock(id);
  updateMobileBar();
  closeMobileStockSheet();
}

function openMobileTradeModal(side) {
  const overlay = document.getElementById('mobile-trade-modal-overlay');
  const modal = document.getElementById('mobile-trade-modal');
  if (!overlay || !modal) return;

  switchTradeSide(side);

  const s = getStock(state.activeStock);
  const price = state.prices[state.activeStock] || s.basePrice;
  const h = state.holdings[state.activeStock];
  const qty = h ? h.qty : 0;

  modal.innerHTML = `
    <div style="padding:12px 20px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:12px;font-weight:700;background:${s.bg};color:${s.color}">${s.id.slice(0,2)}</div>
        <div>
          <div style="font-family:var(--font-display);font-size:14px;font-weight:600;color:var(--text-primary)">${s.id}</div>
          <div style="font-size:11px;color:var(--text-muted)">${fmt.rp(price)}</div>
        </div>
      </div>
      <button onclick="closeMobileTradeModal()" style="width:28px;height:28px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;">✕</button>
    </div>
    <div style="padding:16px;overflow-y:auto;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        <div style="background:var(--bg-deep);border-radius:6px;padding:8px 10px;border:1px solid var(--border-subtle)">
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:3px">Saldo</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--gold)">${fmt.rp(state.balance)}</div>
        </div>
        <div style="background:var(--bg-deep);border-radius:6px;padding:8px 10px;border:1px solid var(--border-subtle)">
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:3px">Dimiliki</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--cyan)">${qty} lembar</div>
        </div>
      </div>

      <div class="trade-tabs" style="margin-bottom:14px">
        <button class="trade-tab buy ${side === 'buy' ? 'active' : ''}" onclick="switchTradeSide('buy');openMobileTradeModal('buy')">▲ BELI</button>
        <button class="trade-tab sell ${side === 'sell' ? 'active' : ''}" onclick="switchTradeSide('sell');openMobileTradeModal('sell')">▼ JUAL</button>
      </div>

      <div class="trade-form-row">
        <div class="trade-form-label">
          <span>Jumlah Lembar</span>
          <span class="trade-form-avail">Harga/lbr: ${fmt.rp(price)}</span>
        </div>
        <input type="number" class="trade-input" id="mobile-trade-qty" placeholder="0" min="1" step="1" oninput="calcMobileTotal()" style="font-size:16px" />
        <div class="trade-pct-btns" style="margin-top:6px">
          <button class="trade-pct-btn" onclick="setMobileTradePercent(0.25)">25%</button>
          <button class="trade-pct-btn" onclick="setMobileTradePercent(0.5)">50%</button>
          <button class="trade-pct-btn" onclick="setMobileTradePercent(0.75)">75%</button>
          <button class="trade-pct-btn" onclick="setMobileTradePercent(1)">MAX</button>
        </div>
      </div>

      <div class="trade-total" style="margin-bottom:14px">
        <div class="trade-total-label">Total Nilai Order</div>
        <div class="trade-total-value" id="mobile-trade-total">Rp 0</div>
      </div>

      <button class="${side === 'buy' ? 'btn-buy-full' : 'btn-sell-full'}" onclick="executeMobileTrade()">
        ${side === 'buy' ? '▲ BELI SEKARANG' : '▼ JUAL SEKARANG'}
      </button>
    </div>
  `;

  overlay.classList.add('open');
}

function closeMobileTradeModal() {
  document.getElementById('mobile-trade-modal-overlay')?.classList.remove('open');
}

function calcMobileTotal() {
  const qty = parseFloat(document.getElementById('mobile-trade-qty')?.value) || 0;
  const price = state.prices[state.activeStock] || 0;
  const el = document.getElementById('mobile-trade-total');
  if (el) el.textContent = fmt.rp(qty * price);
}

function setMobileTradePercent(pct) {
  const price = state.prices[state.activeStock] || 1;
  let qty = 0;
  if (state.tradeSide === 'buy') {
    qty = Math.floor((state.balance * pct) / price);
  } else {
    const h = state.holdings[state.activeStock];
    qty = Math.floor(((h?.qty || 0) * pct));
  }
  const input = document.getElementById('mobile-trade-qty');
  if (input) { input.value = qty; calcMobileTotal(); }
}

function executeMobileTrade() {
  // Sync mobile qty to main trade input
  const mobileQty = document.getElementById('mobile-trade-qty')?.value;
  const mainInput = document.getElementById('trade-qty-input');
  if (mainInput && mobileQty) mainInput.value = mobileQty;

  executeTrade();
  if (document.getElementById('mobile-trade-modal-overlay')?.classList.contains('open')) {
    closeMobileTradeModal();
  }
  updateMobileBar();
}

// Patch renderAll to also update mobile bar
// Pakai setTimeout agar patch terjadi setelah semua script selesai load
setTimeout(function() {
  const _orig = window.renderAll;
  window.renderAll = function() {
    if (_orig) _orig();
    if (typeof updateMobileBar === 'function') updateMobileBar();
  };
}, 0);

// ═══════════════════════════════════════════════════════
// BINARY TRADING — UP / DOWN (Simulasi seperti Binomo)
// ═══════════════════════════════════════════════════════

const BINARY_DURATIONS = [
  { label: '30 detik', ms: 30000 },
  { label: '1 menit',  ms: 60000 },
  { label: '2 menit',  ms: 120000 },
  { label: '5 menit',  ms: 300000 },
];

const BINARY_AMOUNTS = [50000, 100000, 250000, 500000, 1000000];

let binaryState = {
  activeTrades: [],   // { id, stock, direction, amount, startPrice, endTime, payout }
  history: [],
  selectedDuration: 0,
  selectedAmount: 1,
};

function openBinaryModal() {
  const existing = document.getElementById('binary-modal-overlay');
  if (existing) { existing.remove(); }

  const s = getStock(state.activeStock);
  const price = state.prices[state.activeStock] || s.basePrice;

  const overlay = document.createElement('div');
  overlay.id = 'binary-modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    background:rgba(0,0,0,0.7);
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(4px);
  `;
  overlay.onclick = e => { if(e.target === overlay) closeBinaryModal(); };

  overlay.innerHTML = `
    <div style="
      background:var(--bg-card);
      border:1px solid var(--border-subtle);
      border-radius:20px;
      width:min(480px,95vw);
      max-height:90vh;
      overflow-y:auto;
      padding:28px;
      box-shadow:0 0 60px rgba(0,0,0,0.5);
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:4px">⚡ Binary Trading</div>
          <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text-primary)">${s.id} — ${s.name}</div>
        </div>
        <button onclick="closeBinaryModal()" style="width:32px;height:32px;background:var(--bg-deep);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:16px">✕</button>
      </div>

      <!-- Current Price -->
      <div style="background:var(--bg-deep);border-radius:12px;padding:16px;text-align:center;border:1px solid var(--border-subtle);margin-bottom:20px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-bottom:6px">HARGA SAAT INI</div>
        <div style="font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--gold)" id="binary-live-price">${fmt.rp(price)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Prediksi apakah harga akan NAIK atau TURUN?</div>
      </div>

      <!-- Duration Selection -->
      <div style="margin-bottom:16px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">⏱ Durasi</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
          ${BINARY_DURATIONS.map((d, i) => `
            <button onclick="selectBinaryDuration(${i})" id="bdur-${i}"
              style="padding:8px 4px;border-radius:8px;font-family:var(--font-mono);font-size:10px;cursor:pointer;
              border:1px solid ${i === binaryState.selectedDuration ? 'var(--gold)' : 'var(--border-subtle)'};
              background:${i === binaryState.selectedDuration ? 'var(--gold-glow)' : 'var(--bg-deep)'};
              color:${i === binaryState.selectedDuration ? 'var(--gold)' : 'var(--text-muted)'}">
              ${d.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Amount Selection -->
      <div style="margin-bottom:20px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">💰 Modal Taruhan</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px">
          ${BINARY_AMOUNTS.map((a, i) => `
            <button onclick="selectBinaryAmount(${i})" id="bamt-${i}"
              style="padding:8px 4px;border-radius:8px;font-family:var(--font-mono);font-size:9px;cursor:pointer;text-align:center;
              border:1px solid ${i === binaryState.selectedAmount ? 'var(--cyan)' : 'var(--border-subtle)'};
              background:${i === binaryState.selectedAmount ? 'rgba(0,229,255,0.1)' : 'var(--bg-deep)'};
              color:${i === binaryState.selectedAmount ? 'var(--cyan)' : 'var(--text-muted)'}">
              ${(a/1000)}K
            </button>
          `).join('')}
        </div>
        <div style="background:var(--bg-deep);border-radius:8px;padding:10px 14px;border:1px solid var(--border-subtle);display:flex;justify-content:space-between">
          <span style="font-size:12px;color:var(--text-muted)">Modal: <span style="color:var(--gold)" id="binary-modal-amount">${fmt.rp(BINARY_AMOUNTS[binaryState.selectedAmount])}</span></span>
          <span style="font-size:12px;color:var(--text-muted)">Payout: <span style="color:var(--green)" id="binary-modal-payout">${fmt.rp(BINARY_AMOUNTS[binaryState.selectedAmount] * 0.85)}</span> (+85%)</span>
        </div>
      </div>

      <!-- UP / DOWN Buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <button onclick="placeBinaryTrade('up')" style="
          padding:18px;border-radius:12px;font-family:var(--font-display);font-size:16px;font-weight:800;
          cursor:pointer;border:2px solid var(--green);background:rgba(0,230,118,0.12);
          color:var(--green);letter-spacing:0.05em;transition:all 0.2s;
          display:flex;flex-direction:column;align-items:center;gap:4px;
        " onmouseover="this.style.background='rgba(0,230,118,0.25)'" onmouseout="this.style.background='rgba(0,230,118,0.12)'">
          <span style="font-size:28px">▲</span>
          <span>NAIK</span>
          <span style="font-size:11px;opacity:0.7;font-family:var(--font-mono)">+85%</span>
        </button>
        <button onclick="placeBinaryTrade('down')" style="
          padding:18px;border-radius:12px;font-family:var(--font-display);font-size:16px;font-weight:800;
          cursor:pointer;border:2px solid #FF3D71;background:rgba(255,61,113,0.12);
          color:#FF3D71;letter-spacing:0.05em;transition:all 0.2s;
          display:flex;flex-direction:column;align-items:center;gap:4px;
        " onmouseover="this.style.background='rgba(255,61,113,0.25)'" onmouseout="this.style.background='rgba(255,61,113,0.12)'">
          <span style="font-size:28px">▼</span>
          <span>TURUN</span>
          <span style="font-size:11px;opacity:0.7;font-family:var(--font-mono)">+85%</span>
        </button>
      </div>

      <!-- Active Trades -->
      <div id="binary-active-trades-wrap">
        ${renderBinaryActiveTrades()}
      </div>

      <!-- History -->
      <div id="binary-history-wrap">
        ${renderBinaryHistory()}
      </div>

      <!-- Info -->
      <div style="text-align:center;padding-top:12px;border-top:1px solid var(--border-subtle);font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">
        ⚠️ Binary trading = simulasi prediksi arah harga · Kemenangan 85% dari modal
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Live price update untuk modal
  const liveInterval = setInterval(() => {
    const el = document.getElementById('binary-live-price');
    if (!el) { clearInterval(liveInterval); return; }
    el.textContent = fmt.rp(state.prices[state.activeStock] || 0);
  }, 1000);

  overlay._liveInterval = liveInterval;
}

function closeBinaryModal() {
  const overlay = document.getElementById('binary-modal-overlay');
  if (overlay) {
    clearInterval(overlay._liveInterval);
    overlay.remove();
  }
}

function selectBinaryDuration(i) {
  binaryState.selectedDuration = i;
  BINARY_DURATIONS.forEach((_, idx) => {
    const btn = document.getElementById(`bdur-${idx}`);
    if (!btn) return;
    const active = idx === i;
    btn.style.borderColor = active ? 'var(--gold)' : 'var(--border-subtle)';
    btn.style.background  = active ? 'var(--gold-glow)' : 'var(--bg-deep)';
    btn.style.color       = active ? 'var(--gold)' : 'var(--text-muted)';
  });
}

function selectBinaryAmount(i) {
  binaryState.selectedAmount = i;
  BINARY_AMOUNTS.forEach((_, idx) => {
    const btn = document.getElementById(`bamt-${idx}`);
    if (!btn) return;
    const active = idx === i;
    btn.style.borderColor = active ? 'var(--cyan)' : 'var(--border-subtle)';
    btn.style.background  = active ? 'rgba(0,229,255,0.1)' : 'var(--bg-deep)';
    btn.style.color       = active ? 'var(--cyan)' : 'var(--text-muted)';
  });
  const amtEl = document.getElementById('binary-modal-amount');
  const payEl = document.getElementById('binary-modal-payout');
  const amount = BINARY_AMOUNTS[i];
  if (amtEl) amtEl.textContent = fmt.rp(amount);
  if (payEl) payEl.textContent = fmt.rp(Math.round(amount * 0.85));
}

function placeBinaryTrade(direction) {
  const amount = BINARY_AMOUNTS[binaryState.selectedAmount];
  const duration = BINARY_DURATIONS[binaryState.selectedDuration];

  if (state.balance < amount) {
    showToast('Saldo Tidak Cukup', `Butuh ${fmt.rp(amount)}, saldo Anda ${fmt.rp(state.balance)}`, 'error');
    return;
  }

  state.balance -= amount;
  const startPrice = state.prices[state.activeStock];
  const endTime    = Date.now() + duration.ms;
  const id         = Date.now().toString();
  const payout     = Math.round(amount * 1.85); // modal kembali + 85%

  binaryState.activeTrades.push({
    id, stock: state.activeStock, direction, amount, startPrice, endTime, payout,
    durationLabel: duration.label,
  });

  saveToStorage();
  renderAll();
  updateBinaryModal();

  showToast(
    direction === 'up' ? '▲ Prediksi NAIK' : '▼ Prediksi TURUN',
    `${fmt.rp(amount)} di ${state.activeStock} selama ${duration.label}`,
    'info'
  );

  // Schedule result
  setTimeout(() => resolveBinaryTrade(id), duration.ms);
}

function resolveBinaryTrade(id) {
  const idx = binaryState.activeTrades.findIndex(t => t.id === id);
  if (idx === -1) return;

  const trade = binaryState.activeTrades[idx];
  binaryState.activeTrades.splice(idx, 1);

  const endPrice = state.prices[trade.stock] || trade.startPrice;
  const diff = endPrice - trade.startPrice;

  // Draw: harga sama atau bergerak < 0.01% — kembalikan modal (tidak ada yang menang/kalah)
  const isDraw = Math.abs(diff / trade.startPrice) < 0.0001;
  const priceWentUp = diff > 0;
  const won = !isDraw && ((trade.direction === 'up' && priceWentUp) || (trade.direction === 'down' && !priceWentUp));

  const result = {
    ...trade,
    endPrice,
    won,
    isDraw,
    profit: isDraw ? 0 : (won ? trade.payout - trade.amount : -trade.amount),
    ts: new Date().toLocaleString('id-ID'),
  };

  if (isDraw) {
    state.balance += trade.amount; // refund modal
    showToast('🤝 DRAW', `Harga ${trade.stock} tidak bergerak cukup. Modal dikembalikan.`, 'info', 5000);
  } else if (won) {
    state.balance += trade.payout;
    showToast('🎉 MENANG!', `+${fmt.rp(trade.payout - trade.amount)} dari prediksi ${trade.direction === 'up' ? '▲ NAIK' : '▼ TURUN'} ${trade.stock}`, 'success', 6000);
  } else {
    showToast('❌ KALAH', `-${fmt.rp(trade.amount)} prediksi ${trade.direction === 'up' ? '▲ NAIK' : '▼ TURUN'} ${trade.stock} meleset`, 'error', 6000);
  }

  binaryState.history.unshift(result);
  if (binaryState.history.length > 30) binaryState.history.pop();

  saveToStorage();
  renderAll();
  syncLeaderboard();
  updateBinaryModal();
}

function updateBinaryModal() {
  const at = document.getElementById('binary-active-trades-wrap');
  const bh = document.getElementById('binary-history-wrap');
  if (at) at.innerHTML = renderBinaryActiveTrades();
  if (bh) bh.innerHTML = renderBinaryHistory();
}

function renderBinaryActiveTrades() {
  const active = binaryState.activeTrades;
  if (!active.length) return '';

  return `
    <div style="margin-bottom:16px">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--cyan);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">⏳ Posisi Aktif (${active.length})</div>
      ${active.map(t => {
        const remaining = Math.max(0, Math.round((t.endTime - Date.now()) / 1000));
        const curPrice  = state.prices[t.stock] || t.startPrice;
        const winning   = (t.direction === 'up' && curPrice > t.startPrice) || (t.direction === 'down' && curPrice < t.startPrice);
        return `
          <div style="background:var(--bg-deep);border-radius:10px;padding:10px 14px;border:1px solid ${winning ? 'rgba(0,230,118,0.3)' : 'rgba(255,61,113,0.3)'};margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:12px;font-weight:600;color:${t.direction === 'up' ? 'var(--green)' : '#FF3D71'}">${t.direction === 'up' ? '▲ NAIK' : '▼ TURUN'} ${t.stock}</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${fmt.rp(t.amount)} · ${t.durationLabel}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-mono);font-size:11px;color:${winning ? 'var(--green)' : '#FF3D71'}">${winning ? '✓ Menang' : '✗ Kalah'}</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">⏱ ${remaining}s</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderBinaryHistory() {
  const hist = binaryState.history.slice(0, 8);
  if (!hist.length) return '';

  const wins  = binaryState.history.filter(h => h.won).length;
  const total = binaryState.history.length;
  const winRate = total ? Math.round(wins / total * 100) : 0;

  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase">📊 Riwayat Binary</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:${winRate >= 50 ? 'var(--green)' : '#FF3D71'}">Win rate: ${winRate}%</div>
      </div>
      ${hist.map(h => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border-subtle)">
          <div>
            <span style="font-size:11px;color:${h.direction === 'up' ? 'var(--green)' : '#FF3D71'}">${h.direction === 'up' ? '▲' : '▼'}</span>
            <span style="font-size:11px;color:var(--text-secondary);margin-left:4px">${h.stock}</span>
          </div>
          <div style="font-family:var(--font-mono);font-size:11px;color:${h.won ? 'var(--green)' : '#FF3D71'}">
            ${h.won ? '+' : ''}${fmt.rp(h.profit)}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// AI MENTOR — Pakai Groq API (bebas CORS, gratis, cepat)
// User perlu masukkan Groq API key (gratis di console.groq.com)
// ═══════════════════════════════════════════════════════

let aiMentorHistory = [];
let groqApiKey = localStorage.getItem('uvm_groq_key') || '';

// Simpan & load chat history ke localStorage
function saveAIHistory() {
  try {
    // Simpan history (max 20 pesan)
    localStorage.setItem('uvm_ai_history', JSON.stringify(aiMentorHistory.slice(-20)));
  } catch(e) {}
}

function loadAIHistory() {
  try {
    const raw = localStorage.getItem('uvm_ai_history');
    if (raw) aiMentorHistory = JSON.parse(raw);
  } catch(e) { aiMentorHistory = []; }
}

// Render ulang chat dari history yang tersimpan
function restoreChatUI() {
  const container = document.getElementById('ai-chat-messages');
  if (!container || !aiMentorHistory.length) return;
  // Hapus welcome message jika ada, lalu isi ulang dari history
  container.innerHTML = '';
  for (let i = 0; i < aiMentorHistory.length; i++) {
    const msg = aiMentorHistory[i];
    appendAIMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
  }
}

function openAIMentor() {
  // Toggle: jika sudah terbuka, sembunyikan; jika tersembunyi, tampilkan
  const existing = document.getElementById('ai-mentor-overlay');
  if (existing) {
    existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
    return;
  }

  // Load history dari localStorage
  loadAIHistory();

  const overlay = document.createElement('div');
  overlay.id = 'ai-mentor-overlay';
  overlay.style.cssText = `
    position:fixed;bottom:80px;right:20px;z-index:9999;
    width:min(400px,95vw);height:min(560px,80vh);
    background:var(--bg-card);
    border:1px solid var(--border-subtle);
    border-radius:20px;
    display:flex;flex-direction:column;
    box-shadow:0 0 60px rgba(0,0,0,0.6);
    overflow:hidden;
  `;

  const hasKey = !!groqApiKey;

  overlay.innerHTML = `
    <div style="padding:14px 18px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:var(--bg-deep)">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--gold),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:18px">🤖</div>
        <div>
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--text-primary)">AI Trading Mentor</div>
          <div style="font-size:10px;color:${hasKey ? 'var(--green)' : 'var(--gold)'};font-family:var(--font-mono)">${hasKey ? '● Online · Groq' : '⚙ Perlu API Key'}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="clearAIChat()" title="Hapus Riwayat Chat" style="width:28px;height:28px;background:transparent;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:12px">🗑</button>
        <button onclick="showGroqKeyInput()" title="Ganti API Key" style="width:28px;height:28px;background:transparent;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:12px">⚙</button>
        <button onclick="document.getElementById('ai-mentor-overlay').style.display='none'" style="width:28px;height:28px;background:transparent;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:14px">✕</button>
      </div>
    </div>

    <div id="ai-chat-messages" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px">
      ${!hasKey ? `
      <div style="background:rgba(212,175,55,0.08);border:1px solid var(--gold-dim);border-radius:12px;padding:14px;font-size:12px;color:var(--text-secondary);line-height:1.7">
        🔑 <strong style="color:var(--gold)">Butuh Groq API Key (Gratis!)</strong><br><br>
        1. Buka <a href="https://console.groq.com/keys" target="_blank" style="color:var(--cyan)">console.groq.com/keys</a><br>
        2. Daftar/login (gratis)<br>
        3. Buat API key baru<br>
        4. Paste di bawah & simpan<br><br>
        <span style="color:var(--text-muted);font-size:11px">Key tersimpan di browser kamu saja, tidak dikirim ke mana-mana kecuali Groq.</span>
      </div>
      <div style="display:flex;gap:8px">
        <input type="password" id="groq-key-inline" placeholder="gsk_..." style="flex:1;background:var(--bg-deep);border:1px solid var(--border-subtle);border-radius:8px;padding:9px 12px;color:var(--text-primary);font-size:12px;font-family:var(--font-mono);outline:none" onkeydown="if(event.key==='Enter')saveGroqKey()" />
        <button onclick="saveGroqKey()" style="padding:9px 14px;border-radius:8px;background:var(--gold);color:#000;font-size:12px;font-weight:700;border:none;cursor:pointer">Simpan</button>
      </div>
      ` : `
      <div style="background:rgba(212,175,55,0.06);border:1px solid var(--gold-dim);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--text-secondary);line-height:1.6">
        👋 Halo! Saya AI Mentor trading kamu.<br>
        <span style="color:var(--text-muted);font-size:11px">Contoh: "Analisir portofolio saya" · "Strategi untuk pemula?" · "Kapan beli KDOK?"</span>
      </div>
      `}
    </div>

    <div style="padding:10px 14px;border-top:1px solid var(--border-subtle);display:flex;gap:8px;flex-shrink:0">
      <input type="text" id="ai-chat-input" placeholder="${hasKey ? 'Tanya AI Mentor…' : 'Simpan API key dulu…'}" ${hasKey ? '' : 'disabled'} style="
        flex:1;background:var(--bg-deep);border:1px solid var(--border-subtle);border-radius:10px;
        padding:10px 14px;color:var(--text-primary);font-size:12px;font-family:var(--font-mono);
        outline:none;opacity:${hasKey ? 1 : 0.5};
      " onkeydown="if(event.key==='Enter')sendAIMessage()" />
      <button onclick="sendAIMessage()" ${hasKey ? '' : 'disabled'} style="
        width:40px;height:40px;border-radius:10px;
        background:${hasKey ? 'linear-gradient(135deg,var(--gold),#FF8C00)' : 'var(--bg-deep)'};
        border:${hasKey ? 'none' : '1px solid var(--border-subtle)'};
        cursor:${hasKey ? 'pointer' : 'default'};
        font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:${hasKey ? 1 : 0.4};
      ">➤</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Restore chat history setelah DOM tersedia
  if (hasKey && aiMentorHistory.length > 0) {
    setTimeout(restoreChatUI, 50);
  }
}

function clearAIChat() {
  aiMentorHistory = [];
  try { localStorage.removeItem('uvm_ai_history'); } catch(e) {}
  const container = document.getElementById('ai-chat-messages');
  if (container) {
    container.innerHTML = `
      <div style="background:rgba(212,175,55,0.06);border:1px solid var(--gold-dim);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--text-secondary);line-height:1.6">
        👋 Halo! Saya AI Mentor trading kamu.<br>
        <span style="color:var(--text-muted);font-size:11px">Contoh: "Analisir portofolio saya" · "Strategi untuk pemula?" · "Kapan beli KDOK?"</span>
      </div>
    `;
  }
  showToast('🗑 Chat Dihapus', 'Riwayat chat AI sudah dibersihkan.', 'info');
}

function showGroqKeyInput() {
  const msgs = document.getElementById('ai-chat-messages');
  if (!msgs) return;
  msgs.insertAdjacentHTML('afterbegin', `
    <div id="groq-key-edit-box" style="background:var(--bg-deep);border:1px solid var(--gold-dim);border-radius:10px;padding:12px;margin-bottom:4px">
      <div style="font-size:11px;color:var(--gold);margin-bottom:8px">🔑 Ganti Groq API Key</div>
      <div style="display:flex;gap:8px">
        <input type="password" id="groq-key-edit" value="${groqApiKey}" style="flex:1;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:8px;padding:8px 10px;color:var(--text-primary);font-size:11px;font-family:var(--font-mono);outline:none" />
        <button onclick="saveGroqKey('edit')" style="padding:8px 12px;border-radius:8px;background:var(--gold);color:#000;font-size:11px;font-weight:700;border:none;cursor:pointer">OK</button>
        <button onclick="document.getElementById('groq-key-edit-box').remove()" style="padding:8px 10px;border-radius:8px;background:var(--bg-card);color:var(--text-muted);font-size:11px;border:1px solid var(--border-subtle);cursor:pointer">✕</button>
      </div>
    </div>
  `);
}

function saveGroqKey(mode = 'inline') {
  const inputId = mode === 'edit' ? 'groq-key-edit' : 'groq-key-inline';
  const val = document.getElementById(inputId)?.value?.trim();
  if (!val) return;
  groqApiKey = val;
  localStorage.setItem('uvm_groq_key', val);
  showToast('✅ API Key Disimpan', 'AI Mentor siap digunakan!', 'success');
  // Sembunyikan lalu buka ulang agar UI diperbarui
  const overlay = document.getElementById('ai-mentor-overlay');
  if (overlay) overlay.remove();
  setTimeout(openAIMentor, 100);
}

async function sendAIMessage() {
  if (!groqApiKey) {
    showToast('⚙️ API Key Belum Diset', 'Klik ⚙ di AI Mentor untuk masukkan Groq API key (gratis)', 'warning');
    return;
  }

  const input = document.getElementById('ai-chat-input');
  const text  = input?.value?.trim();
  if (!text) return;

  input.value = '';
  appendAIMessage('user', text);

  // Build context dari state user
  const myAssets = totalAssets();
  const pnlAbs   = myAssets - INITIAL_BALANCE;
  const holdingsStr = Object.entries(state.holdings)
    .filter(([_, h]) => h.qty > 0)
    .map(([id, h]) => {
      const s = getStock(id);
      const curPrice = state.prices[id] || 0;
      const p = (curPrice - h.avgPrice) * h.qty;
      return `${id}(${s?.name}): ${h.qty} lbr avg ${fmt.rp(h.avgPrice)}, kini ${fmt.rp(curPrice)}, P/L ${p >= 0 ? '+' : ''}${fmt.rp(p)}`;
    }).join('; ') || 'Tidak ada saham';

  const recentTx = state.transactions.slice(-3).map(t => `${t.type.toUpperCase()} ${t.qty}lbr ${t.stock} @${fmt.rp(t.price)}`).join('; ');

  const systemPrompt = `Kamu adalah AI Trading Mentor untuk platform simulasi saham UNISBA Virtual Market. Saham yang ada: EKOP(Ekonomi Pembangunan), MNJM(Manajemen), AKNT(Akuntansi), HUKM(Hukum), TKSP(Teknik Sipil), TKIN(Teknik Industri), PSIK(Psikologi), KDOK(Kedokteran), FARM(Farmasi), KOMM(Komunikasi), PDDK(Pendidikan Islam), MTEK(Mesin&Elektro).
Data trader: Total Aset ${fmt.rp(myAssets)}, Saldo ${fmt.rp(state.balance)}, P/L ${pnlAbs >= 0 ? '+' : ''}${fmt.rp(pnlAbs)}, Kepemilikan: ${holdingsStr}, Transaksi terakhir: ${recentTx || 'belum ada'}.
Jawab dalam Bahasa Indonesia, singkat (max 180 kata), gunakan emoji, edukatif dan memotivasi. Ini simulasi — tidak ada uang nyata.`;

  const thinking = appendAIMessage('ai', '⏳ Sedang menganalisis…', true);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 512,
        messages: [
          { role: 'system', content: systemPrompt },
          ...aiMentorHistory,
          { role: 'user', content: text }
        ],
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Maaf, tidak ada respons.';

    aiMentorHistory.push({ role: 'user', content: text });
    aiMentorHistory.push({ role: 'assistant', content: reply });
    if (aiMentorHistory.length > 16) aiMentorHistory = aiMentorHistory.slice(-16);
    saveAIHistory(); // ← simpan ke localStorage

    if (thinking) thinking.remove();
    appendAIMessage('ai', reply);

  } catch (e) {
    if (thinking) thinking.remove();
    const msg = e.message?.includes('401') || e.message?.includes('invalid')
      ? '🔑 API Key tidak valid. Klik ⚙ untuk ganti key.'
      : e.message?.includes('429')
      ? '⏳ Rate limit Groq. Tunggu sebentar lalu coba lagi.'
      : `❌ Error: ${e.message || 'Tidak diketahui'}`;
    appendAIMessage('ai', msg);
  }
}

function appendAIMessage(role, text, isTemp = false) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return null;

  const div = document.createElement('div');
  div.style.cssText = `
    max-width:88%;
    padding:10px 14px;
    border-radius:${role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
    font-size:12px;line-height:1.6;
    ${role === 'user'
      ? 'background:rgba(0,229,255,0.12);border:1px solid rgba(0,229,255,0.2);color:var(--text-primary);align-self:flex-end;margin-left:auto;'
      : 'background:var(--bg-deep);border:1px solid var(--border-subtle);color:var(--text-secondary);'
    }
  `;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  return isTemp ? div : null;
}


// ═══════════════════════════════════════════════════════
// MATERI BELAJAR
// ═══════════════════════════════════════════════════════

const LEARN_CONTENT = {
  saham: {
    title: '📈 Apa itu Saham?',
    sections: [
      { heading: 'Definisi Saham', body: 'Saham adalah tanda kepemilikan atas sebuah perusahaan. Ketika kamu membeli saham sebuah perusahaan, kamu menjadi bagian dari pemilik perusahaan tersebut secara proporsional.' },
      { heading: 'Cara Kerja Pasar Saham', body: 'Pasar saham adalah tempat jual beli saham antar investor. Harga saham ditentukan oleh supply & demand — ketika banyak yang ingin beli, harga naik; ketika banyak yang jual, harga turun.' },
      { heading: 'Mengapa Berinvestasi Saham?', body: '✅ Potensi keuntungan lebih tinggi dari deposito\n✅ Membantu perusahaan berkembang\n✅ Dapat dividen (bagi hasil)\n✅ Likuid — mudah dijual kapan saja\n\n⚠️ Ingat: saham berisiko, nilai bisa turun!' },
      { heading: 'Istilah Dasar', body: '• Lot = 100 lembar saham (di BEI)\n• Bid = harga tertinggi pembeli bersedia bayar\n• Ask = harga terendah penjual mau terima\n• Spread = selisih bid dan ask\n• Market Cap = harga saham × total lembar beredar' },
    ]
  },
  analisis: {
    title: '🔍 Analisis Teknikal',
    sections: [
      { heading: 'Apa itu Analisis Teknikal?', body: 'Analisis teknikal memprediksi pergerakan harga berdasarkan data historis (grafik harga & volume), bukan fundamental perusahaan. Prinsip utamanya: "history repeats itself".' },
      { heading: 'Membaca Grafik (Candlestick)', body: '• Candlestick hijau = harga penutupan lebih tinggi dari pembukaan (bullish)\n• Candlestick merah = harga penutupan lebih rendah dari pembukaan (bearish)\n• Upper shadow = harga tertinggi yang dicapai\n• Lower shadow = harga terendah yang dicapai' },
      { heading: 'Support & Resistance', body: '📉 Support = level harga di mana saham sering berbalik naik (banyak pembeli)\n📈 Resistance = level harga di mana saham sering berbalik turun (banyak penjual)\n\nTips: Beli mendekati support, jual mendekati resistance!' },
      { heading: 'Indikator Populer', body: '• MA (Moving Average) — rata-rata harga dalam periode tertentu, menunjukkan tren\n• RSI — mengukur overbought (>70) atau oversold (<30)\n• MACD — momentum dan perubahan tren\n• Bollinger Bands — volatilitas harga\n• Volume — konfirmasi kekuatan tren' },
    ]
  },
  strategi: {
    title: '♟️ Strategi Trading',
    sections: [
      { heading: 'Day Trading', body: '⚡ Beli dan jual di hari yang sama. Cocok untuk: trader aktif dengan waktu penuh.\n\nKelebihan: profit cepat, tidak ada risiko overnight\nKekurangan: butuh konsentrasi tinggi, risiko tinggi, biaya transaksi banyak' },
      { heading: 'Swing Trading', body: '🌊 Hold 2-14 hari, memanfaatkan "swing" harga. Cocok untuk: trader yang bekerja atau kuliah.\n\nKelebihan: tidak perlu monitor terus-menerus\nKekurangan: risiko semalam (gap up/down)' },
      { heading: 'Buy & Hold (Investasi)', body: '🏗️ Beli dan tahan jangka panjang (bulan-tahun). Cocok untuk: investor pemula, sabar.\n\nKelebihan: tidak perlu analisis harian, potensi compound growth\nKekurangan: modal "nyangkut" lama, tidak cocok jika butuh dana cepat' },
      { heading: 'Dollar Cost Averaging (DCA)', body: '📅 Beli saham secara rutin dengan jumlah tetap, tidak peduli harga naik atau turun.\n\nContoh: Beli Rp500.000 saham KDOK setiap bulan\n→ Saat harga murah dapat lebih banyak lembar\n→ Rata-rata harga beli jadi lebih optimal' },
    ]
  },
  risiko: {
    title: '🛡️ Manajemen Risiko',
    sections: [
      { heading: 'Aturan 1% - 2%', body: 'Jangan pernah risiko lebih dari 1-2% modal total dalam satu trade.\n\nContoh: Modal Rp10 juta → maksimal risiko per trade Rp100.000-200.000.\n\nIni menjaga kamu tetap survive meski loss berturut-turut.' },
      { heading: 'Stop Loss', body: '🛑 Stop loss adalah order otomatis jual saat harga turun ke level tertentu.\n\nCara pakai: "Jika KDOK turun 5% dari harga beli, saya jual"\n→ Pasang stop loss di -5% harga beli\n→ Biarkan sistem eksekusi otomatis, jangan hapus karena emosi!' },
      { heading: 'Diversifikasi', body: '🍳 "Jangan taruh semua telur di satu keranjang"\n\nSebar investasi di beberapa saham berbeda sektor:\n• 3-5 saham berbeda = diversifikasi dasar\n• Campurkan sektor: pendidikan, kesehatan, teknologi\n• Jangan investasi 100% di 1 saham, seberapapun yakinnya kamu' },
      { heading: 'Risk-Reward Ratio', body: 'Sebelum masuk trade, hitung:\n• Potensi profit (jika target tercapai)\n• Potensi loss (jika stop loss kena)\n\n✅ Idealnya R:R minimal 1:2\n→ Risiko Rp100K → Target profit minimal Rp200K\n→ Dengan win rate 50% pun kamu tetap profit!' },
    ]
  },
  psikologi: {
    title: '🧠 Psikologi Trading',
    sections: [
      { heading: 'Fear & Greed', body: '😨 Fear (takut): Menjual terlalu cepat karena takut rugi, atau tidak berani beli saat harga murah\n\n🤑 Greed (serakah): Hold terlalu lama karena ingin profit lebih, atau over-trade\n\nSolusi: Punya rencana trading yang jelas SEBELUM masuk trade.' },
      { heading: 'FOMO (Fear of Missing Out)', body: '"Wah, saham ini naik 10%! Aku harus beli sekarang!"\n\n⚠️ FOMO adalah musuh trader. Beli saat harga sudah tinggi karena takut ketinggalan sering berakhir loss.\n\nTips: Jika kamu merasa FOMO, TUNGGU koreksi dulu. Selalu ada kesempatan lain.' },
      { heading: 'Confirmation Bias', body: 'Kecenderungan mencari informasi yang mendukung keputusan yang sudah dibuat.\n\n"Aku sudah beli PSIK, sekarang aku cari berita bagus tentang PSIK aja"\n\nSolusi: Aktif cari informasi yang bertentangan dengan posisimu untuk membuat keputusan lebih objektif.' },
      { heading: 'Tips Jaga Psikologi', body: '✅ Tulis trading journal — catat alasan masuk/keluar\n✅ Tentukan target profit dan stop loss SEBELUM beli\n✅ Istirahat saat loss streak — emosi bisa merusak\n✅ Jangan trading pakai uang yang tidak sanggup kamu hilangkan\n✅ Evaluasi strategi setiap bulan, bukan setiap hari\n✅ Ingat: losing trade ≠ trader buruk. Semua trader pernah loss.' },
    ]
  },
};

function showLearnModal(topic) {
  const content = LEARN_CONTENT[topic];
  if (!content) return;

  const existing = document.getElementById('learn-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'learn-modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    background:rgba(0,0,0,0.75);
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(4px);padding:16px;
  `;
  overlay.onclick = e => { if(e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="
      background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:20px;
      width:min(600px,100%);max-height:85vh;overflow-y:auto;padding:32px;
      box-shadow:0 0 80px rgba(0,0,0,0.6);
    ">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <h2 style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--text-primary)">${content.title}</h2>
        <button onclick="document.getElementById('learn-modal-overlay').remove()" style="width:32px;height:32px;background:var(--bg-deep);border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:16px;flex-shrink:0">✕</button>
      </div>
      ${content.sections.map(s => `
        <div style="margin-bottom:20px;padding:16px;background:var(--bg-deep);border-radius:12px;border-left:3px solid var(--gold)">
          <h3 style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--gold);margin-bottom:8px">${s.heading}</h3>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.75;white-space:pre-line">${s.body}</div>
        </div>
      `).join('')}
      <div style="margin-top:16px;display:flex;gap:10px">
        <button onclick="document.getElementById('learn-modal-overlay').remove();openAIMentor()" style="
          flex:1;padding:12px;border-radius:10px;background:linear-gradient(135deg,rgba(212,175,55,0.2),rgba(0,229,255,0.2));
          border:1px solid var(--gold-dim);color:var(--gold);font-size:13px;cursor:pointer;font-family:var(--font-display);font-weight:600;
        ">🤖 Tanya AI Mentor</button>
        <button onclick="document.getElementById('learn-modal-overlay').remove()" style="
          padding:12px 20px;border-radius:10px;background:var(--bg-deep);
          border:1px solid var(--border-subtle);color:var(--text-muted);font-size:13px;cursor:pointer;
        ">Tutup</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}


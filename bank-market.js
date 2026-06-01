// ═══════════════════════════════════════════════════════
// UNISBA VIRTUAL MARKET — BANK INDONESIA MARKET MODULE
// bank-market.js
//
// LOAD ORDER: setelah script.js dan real-market.js
//
// Fitur:
//   ① Tab baru "🏦 Bank Indonesia" di nav utama
//   ② Semua bank Indonesia yang listing di BEI (37 bank)
//   ③ Harga REAL dari Yahoo Finance via proxy (allorigins)
//   ④ Beli/jual terintegrasi dengan saldo & portofolio utama
//   ⑤ Chart harga historis per bank (canvas line chart)
//   ⑥ Refresh otomatis tiap 3 menit
//   ⑦ Portofolio bank muncul di tab Portofolio utama
// ═══════════════════════════════════════════════════════

'use strict';

// ════════════════════════════════════════════════════════
// §0. MIGRASI DATA LAMA
// Mengkonversi holdings lama (key = ticker 'BBRI.JK' atau kode lama 'BBRI','BMRI','BBNI','BBHI','BBYB','ARTO','SEAA')
// menjadi key baru (bank.code = 'BRI','MANDIRI','BNI','ALLO BANK', dll)
// ════════════════════════════════════════════════════════

function _migrateBankHoldings() {
  if (typeof state === 'undefined') return;

  // Mapping: semua bentuk key lama → code baru
  const OLD_TO_NEW = {};
  BANK_STOCKS.forEach(b => {
    OLD_TO_NEW[b.ticker]          = b.code;  // 'BBRI.JK' → 'BRI'
    OLD_TO_NEW[b.ticker.replace('.JK','')] = b.code;  // 'BBRI' → 'BRI'
  });
  // Tambah mapping eksplisit untuk kode lama yang diubah
  const EXPLICIT = {
    'BBRI':   'BRI',
    'BMRI':   'MANDIRI',
    'BBNI':   'BNI',
    'BBTL':   'BTN',
    'ARTO':   'BANK JAGO',
    'BBYB':   'NEO BANK',
    'BBHI':   'ALLO BANK',
    'SEAA':   'SEABANK',
    'SEEA':   'SEABANK',
  };
  Object.assign(OLD_TO_NEW, EXPLICIT);

  let migrated = 0;
  Object.keys(state.holdings).forEach(key => {
    const newCode = OLD_TO_NEW[key];
    if (newCode && newCode !== key) {
      const h = state.holdings[key];
      if (!state.holdings[newCode]) {
        state.holdings[newCode] = { ...h };
      } else {
        // Merge: gabung qty dan recalc avgPrice
        const existing = state.holdings[newCode];
        const totalQty = existing.qty + h.qty;
        existing.avgPrice = ((existing.avgPrice * existing.qty) + (h.avgPrice * h.qty)) / totalQty;
        existing.qty = totalQty;
      }
      delete state.holdings[key];
      migrated++;
    }
  });

  if (migrated > 0) {
    console.log(`[BankMarket] Migrasi ${migrated} holdings lama ke format baru`);
    if (typeof saveToStorage === 'function') saveToStorage();
  }
}

// Lookup harga bank berdasarkan code (untuk totalPortfolioValue di script.js)
// Dipanggil dari script.js saat menghitung nilai portfolio
function getBankPriceByCode(code) {
  const bank = BANK_STOCKS.find(b => b.code === code);
  if (!bank) return 0;
  const d = bankState.prices[bank.ticker];
  return (d && d.price > 0) ? d.price : (bank.basePrice || 0);
}


// ════════════════════════════════════════════════════════

const BANK_STOCKS = [
  // ── Bank BUMN ────────────────────────────────────────
  { ticker: 'BBRI.JK', code: 'BRI',     name: 'Bank BRI',              category: 'BUMN',       color: '#F44336', basePrice: 4200 },
  { ticker: 'BBCA.JK', code: 'BCA',     name: 'Bank Central Asia',     category: 'BUMN',       color: '#1565C0', basePrice: 9350 },
  { ticker: 'BMRI.JK', code: 'MANDIRI', name: 'Bank Mandiri',          category: 'BUMN',       color: '#F9A825', basePrice: 6800 },
  { ticker: 'BBNI.JK', code: 'BNI',     name: 'Bank BNI',              category: 'BUMN',       color: '#FF8F00', basePrice: 5300 },
  { ticker: 'BBTL.JK', code: 'BTN',     name: 'Bank BTN',              category: 'BUMN',       color: '#2E7D32', basePrice: 1340 },

  // ── Bank Konvensional Swasta Besar ────────────────────
  { ticker: 'BNGA.JK', code: 'BNGA', name: 'Bank CIMB Niaga',      category: 'Swasta',     color: '#C62828', basePrice: 1640 },
  { ticker: 'BNLI.JK', code: 'BNLI', name: 'Bank Permata',         category: 'Swasta',     color: '#4A148C', basePrice: 1400 },
  { ticker: 'BDMN.JK', code: 'BDMN', name: 'Bank Danamon',         category: 'Swasta',     color: '#1A237E', basePrice: 2480 },
  { ticker: 'PNBN.JK', code: 'PNBN', name: 'Bank Panin',           category: 'Swasta',     color: '#004D40', basePrice: 1100 },
  { ticker: 'NISP.JK', code: 'NISP', name: 'Bank OCBC NISP',       category: 'Swasta',     color: '#E65100', basePrice: 1030 },
  { ticker: 'MEGA.JK', code: 'MEGA', name: 'Bank Mega',            category: 'Swasta',     color: '#880E4F', basePrice: 3640 },
  { ticker: 'MAYA.JK', code: 'MAYA', name: 'Bank Mayapada',        category: 'Swasta',     color: '#006064', basePrice: 1720 },
  { ticker: 'AGRO.JK', code: 'AGRO', name: 'Bank Raya (BRI Agro)', category: 'Swasta',     color: '#33691E', basePrice: 298  },
  { ticker: 'BNBA.JK', code: 'BNBA', name: 'Bank Bumi Arta',       category: 'Swasta',     color: '#BF360C', basePrice: 610  },
  { ticker: 'BACA.JK', code: 'BACA', name: 'Bank Capital',         category: 'Swasta',     color: '#37474F', basePrice: 50   },
  { ticker: 'BMAS.JK', code: 'BMAS', name: 'Bank Maspion',         category: 'Swasta',     color: '#4E342E', basePrice: 790  },
  { ticker: 'NOBU.JK', code: 'NOBU', name: 'Bank Nationalnobu',    category: 'Swasta',     color: '#263238', basePrice: 450  },
  { ticker: 'DNAR.JK', code: 'DNAR', name: 'Bank Oke Indonesia',   category: 'Swasta',     color: '#1B5E20', basePrice: 200  },
  { ticker: 'BGTG.JK', code: 'BGTG', name: 'Bank Ganesha',         category: 'Swasta',     color: '#3E2723', basePrice: 148  },
  { ticker: 'MCOR.JK', code: 'MCOR', name: 'Bank China Constr.',   category: 'Swasta',     color: '#B71C1C', basePrice: 272  },
  { ticker: 'SDRA.JK', code: 'SDRA', name: 'Bank Woori Saudara',   category: 'Swasta',     color: '#01579B', basePrice: 620  },
  { ticker: 'INPC.JK', code: 'INPC', name: 'Bank Artha Graha',     category: 'Swasta',     color: '#827717', basePrice: 61   },
  { ticker: 'BVIC.JK', code: 'BVIC', name: 'Bank Victoria',        category: 'Swasta',     color: '#4527A0', basePrice: 156  },
  { ticker: 'BBKP.JK', code: 'BBKP', name: 'Bank KB Bukopin',      category: 'Swasta',     color: '#E65100', basePrice: 83   },
  { ticker: 'BSWD.JK', code: 'BSWD', name: 'Bank Of India Ind.',   category: 'Swasta',     color: '#FF6F00', basePrice: 3780 },
  { ticker: 'NAGA.JK', code: 'NAGA', name: 'Bank Mitraniaga',      category: 'Swasta',     color: '#1A237E', basePrice: 200  },
  { ticker: 'BKSW.JK', code: 'BKSW', name: 'Bank QNB Indonesia',   category: 'Swasta',     color: '#311B92', basePrice: 158  },

  // ── Bank Syariah ──────────────────────────────────────
  { ticker: 'BRIS.JK', code: 'BRIS', name: 'Bank BSI',             category: 'Syariah',    color: '#00695C', basePrice: 1850 },
  { ticker: 'BTPS.JK', code: 'BTPS', name: 'Bank BTPN Syariah',   category: 'Syariah',    color: '#006064', basePrice: 980  },
  { ticker: 'PNBS.JK', code: 'PNBS', name: 'Bank Panin Dubai Sy.',category: 'Syariah',    color: '#004D40', basePrice: 90   },

  // ── Bank Pembangunan Daerah (BPD) ─────────────────────
  { ticker: 'BJBR.JK', code: 'BJBR', name: 'Bank BJB',            category: 'BPD',        color: '#1B5E20', basePrice: 1200 },
  { ticker: 'BJTM.JK', code: 'BJTM', name: 'Bank Jatim',          category: 'BPD',        color: '#0D47A1', basePrice: 690  },
  { ticker: 'BDKI.JK', code: 'BDKI', name: 'Bank DKI',            category: 'BPD',        color: '#B71C1C', basePrice: 370  },

  // ── Bank Digital ─────────────────────────────────────
  { ticker: 'ARTO.JK', code: 'BANK JAGO', name: 'Bank Jago',         category: 'Digital',    color: '#00BCD4', basePrice: 2180 },
  { ticker: 'BBYB.JK', code: 'NEO BANK',  name: 'Bank Neo Commerce', category: 'Digital',    color: '#7B1FA2', basePrice: 370  },
  { ticker: 'BBHI.JK', code: 'ALLO BANK', name: 'Allo Bank',         category: 'Digital',    color: '#00ACC1', basePrice: 610  },
  { ticker: 'SEEA.JK', code: 'SEABANK',   name: 'SeaBank Indonesia', category: 'Digital',    color: '#F57C00', basePrice: 1300 },
];

const BANK_CATEGORY_COLORS = {
  'BUMN':    '#F9A825',
  'Swasta':  '#42A5F5',
  'Syariah': '#66BB6A',
  'BPD':     '#EF5350',
  'Digital': '#AB47BC',
};

// ════════════════════════════════════════════════════════
// §2. STATE BANK MARKET
// ════════════════════════════════════════════════════════

const bankState = {
  prices:       {},   // { ticker: { price, prevClose, change, changePct, volume, name, lastFetch } }
  priceHistory: {},   // { ticker: [price, price, ...] }  — untuk fallback/line mode
  candleData:   {},   // { ticker: [{t,o,h,l,c,v},...] }  — candlestick data
  activeBank:   BANK_STOCKS[0].ticker,
  filterCat:    'Semua',
  fetchStatus:  'idle',  // 'idle' | 'loading' | 'ok' | 'error'
  lastFetch:    0,
  fetchErrors:  0,
  chart:        null,
  chartAnimId:  null,
  tradeSide:    'buy',
  // Candlestick state — identik dengan candleState di upgrades.js
  candle: {
    timeframe: '1D',
    chartType: 'candle',  // 'candle' | 'line'
    indicators: {
      ma:   { active: true,  period: 20, color: '#D4AF37' },
      ema:  { active: true,  period: 9,  color: '#00E5FF' },
      rsi:  { active: false },
      macd: { active: false },
    },
    panOffset: 0,
    zoomBars:  60,
    isDragging: false,
    dragStartX: 0,
    dragStartPan: 0,
  },
};

// ════════════════════════════════════════════════════════
// §3. FETCH HARGA REAL DARI YAHOO FINANCE
// ════════════════════════════════════════════════════════

async function fetchBankPrice(bank) {
  const params = new URLSearchParams({ interval: '1d', range: '5d', includePrePost: false });
  const yfUrl  = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(bank.ticker)}?${params}`;
  const proxy  = `https://api.allorigins.win/get?url=${encodeURIComponent(yfUrl)}`;

  try {
    const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('proxy fail');
    const wrapper = await res.json();
    const data    = JSON.parse(wrapper.contents || '{}');
    const result  = data?.chart?.result?.[0];
    if (!result) throw new Error('no data');

    const meta      = result.meta;
    const price     = meta.regularMarketPrice || meta.previousClose;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;

    if (!price || price <= 0) throw new Error('invalid price');

    // Ambil history harga penutupan 5 hari terakhir untuk chart
    const closes = result.indicators?.quote?.[0]?.close || [];
    const validCloses = closes.filter(Boolean).map(p => Math.round(p));

    return {
      price:     Math.round(price),
      prevClose: Math.round(prevClose),
      change:    Math.round(price - prevClose),
      changePct: prevClose ? parseFloat(((price - prevClose) / prevClose * 100).toFixed(2)) : 0,
      volume:    meta.regularMarketVolume || 0,
      name:      bank.name,
      closes:    validCloses,
      lastFetch: Date.now(),
      isReal:    true,
    };
  } catch (e) {
    // Fallback: pakai basePrice dengan simulasi kecil
    return null;
  }
}

async function fetchAllBankPrices(showLoading = true) {
  if (showLoading) {
    bankState.fetchStatus = 'loading';
    _updateBankFetchStatus();
  }

  let successCount = 0;

  // Fetch 5 bank sekaligus (tidak terlalu membanjiri proxy)
  const BATCH = 5;
  for (let i = 0; i < BANK_STOCKS.length; i += BATCH) {
    const batch = BANK_STOCKS.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(b => fetchBankPrice(b)));

    results.forEach((result, idx) => {
      const bank = batch[idx];
      if (result.status === 'fulfilled' && result.value) {
        const data = result.value;
        const prev = bankState.prices[bank.ticker];

        bankState.prices[bank.ticker] = data;

        // Update history (max 120 titik)
        if (!bankState.priceHistory[bank.ticker]) {
          bankState.priceHistory[bank.ticker] = data.closes.length > 0
            ? data.closes
            : _genFallbackHistory(bank.basePrice);
        } else {
          // Tambah harga terbaru jika berbeda dari sebelumnya
          const hist = bankState.priceHistory[bank.ticker];
          if (hist[hist.length - 1] !== data.price) {
            hist.push(data.price);
            if (hist.length > 120) hist.shift();
          }
        }
        successCount++;
      } else {
        // Fallback: harga dari basePrice + simulasi
        if (!bankState.prices[bank.ticker]) {
          const fp = bank.basePrice;
          bankState.prices[bank.ticker] = {
            price: fp, prevClose: fp, change: 0, changePct: 0,
            volume: 0, name: bank.name, isReal: false, lastFetch: Date.now(),
          };
          bankState.priceHistory[bank.ticker] = _genFallbackHistory(fp);
        }
      }
    });

    // Jeda kecil antar batch
    if (i + BATCH < BANK_STOCKS.length) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  bankState.fetchStatus = successCount > 0 ? 'ok' : 'error';
  bankState.lastFetch   = Date.now();
  bankState.fetchErrors = successCount > 0 ? 0 : bankState.fetchErrors + 1;

  console.log(`✅ [BankMarket] ${successCount}/${BANK_STOCKS.length} harga bank berhasil diambil dari Yahoo Finance`);

  // Rebuild candle data untuk bank aktif setelah fetch
  _buildBankCandles(bankState.activeBank);
  // Update candle semua bank dengan harga baru
  BANK_STOCKS.forEach(bank => {
    const d = bankState.prices[bank.ticker];
    if (d && d.price > 0) _updateBankCandle(bank.ticker, d.price);
  });

  _renderBankList();
  bankChartGradientCache = {};
  _renderBankChart();
  _updateBankFetchStatus();
  _renderBankTradePanel();
}

function _genFallbackHistory(basePrice, points = 30) {
  const hist = [];
  let p = basePrice;
  for (let i = 0; i < points; i++) {
    p = p * (1 + (Math.random() - 0.499) * 0.008);
    hist.push(Math.round(Math.max(10, p)));
  }
  return hist;
}

// Simulasi tick kecil saat data real belum di-refresh
function _tickBankPricesLocal() {
  BANK_STOCKS.forEach(bank => {
    const d = bankState.prices[bank.ticker];
    if (!d) return;
    // Simulasi volatilitas kecil (0.1%) antar refresh real
    const delta = d.price * (Math.random() - 0.499) * 0.001;
    d.price = Math.max(10, Math.round(d.price + delta));
    const hist = bankState.priceHistory[bank.ticker];
    if (hist) {
      hist.push(d.price);
      if (hist.length > 120) hist.shift();
    }
    // Update candle data juga
    _updateBankCandle(bank.ticker, d.price);
  });
  _renderBankList();
  // Hanya update chart jika tab bank aktif
  if (typeof state !== 'undefined' && state.activeTab === 'bank') {
    _renderBankChart();
  }
}

// ════════════════════════════════════════════════════════
// §4. INJECT TAB "BANK INDONESIA" KE NAV + VIEW
// ════════════════════════════════════════════════════════

function _injectBankTab() {
  // Tambah tab ke nav
  const nav = document.querySelector('.dashboard-nav');
  if (!nav || document.getElementById('bank-nav-tab')) return;

  // Insert setelah tab "Trading"
  const tradingTab = nav.querySelector('[data-tab="trade"]');
  const bankTab = document.createElement('button');
  bankTab.className   = 'nav-tab';
  bankTab.id          = 'bank-nav-tab';
  bankTab.dataset.tab = 'bank';
  bankTab.innerHTML   = '🏦 Bank Indonesia';
  if (tradingTab && tradingTab.nextSibling) {
    nav.insertBefore(bankTab, tradingTab.nextSibling);
  } else {
    nav.appendChild(bankTab);
  }

  bankTab.addEventListener('click', () => _switchToBankTab());

  // Tambah panel view
  const dashContent = document.querySelector('.dashboard-content');
  if (!dashContent || document.getElementById('bank-view')) return;

  const view = document.createElement('div');
  view.className = 'panel-view';
  view.id        = 'bank-view';
  view.style.cssText = 'display:none;width:100%;height:100%;overflow:hidden;';
  view.innerHTML = _buildBankViewHTML();
  dashContent.appendChild(view);

  // Event listeners di dalam view
  _attachBankViewListeners();

  // Inject CSS
  _injectBankCSS();
}

function _buildBankViewHTML() {
  return `
  <div style="display:flex;height:100%;overflow:hidden">

    <!-- ── Sidebar Daftar Bank ── -->
    <aside id="bank-list-panel" style="
      width:260px;min-width:220px;flex-shrink:0;
      border-right:1px solid var(--border-subtle);
      display:flex;flex-direction:column;overflow:hidden;
    ">
      <div style="padding:12px 14px;border-bottom:1px solid var(--border-subtle)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--gold)">
            🏦 Bank Indonesia
          </span>
          <span id="bank-count-badge" style="
            background:rgba(212,175,55,0.15);color:var(--gold);
            font-family:var(--font-mono);font-size:10px;font-weight:700;
            padding:2px 7px;border-radius:20px;border:1px solid rgba(212,175,55,0.3)
          ">${BANK_STOCKS.length}</span>
        </div>
        <!-- Search -->
        <input id="bank-search-input" type="text" placeholder="Cari bank…" style="
          width:100%;box-sizing:border-box;
          background:var(--bg-deep);border:1px solid var(--border-subtle);
          border-radius:8px;padding:7px 10px;color:var(--text-primary);
          font-family:var(--font-mono);font-size:11px;outline:none;
          margin-bottom:8px;
        "/>
        <!-- Filter kategori -->
        <div id="bank-cat-filters" style="display:flex;gap:4px;flex-wrap:wrap">
          ${['Semua','BUMN','Swasta','Syariah','BPD','Digital'].map(cat => `
            <button class="bank-cat-btn ${cat==='Semua'?'active':''}" data-cat="${cat}"
              style="font-size:9px;padding:3px 8px;border-radius:20px;cursor:pointer;
              font-family:var(--font-mono);font-weight:600;transition:all 0.15s;
              background:${cat==='Semua'?'rgba(212,175,55,0.2)':'rgba(255,255,255,0.05)'};
              border:1px solid ${cat==='Semua'?'rgba(212,175,55,0.5)':'var(--border-subtle)'};
              color:${cat==='Semua'?'var(--gold)':'var(--text-muted)'}">
              ${cat}
            </button>
          `).join('')}
        </div>
      </div>
      <!-- Daftar bank -->
      <div id="bank-list-items" style="overflow-y:auto;flex:1;scrollbar-width:thin"></div>
    </aside>

    <!-- ── Chart & Trade Area ── -->
    <main style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0">

      <!-- Header bank aktif -->
      <div id="bank-chart-header" style="
        padding:12px 16px;border-bottom:1px solid var(--border-subtle);
        display:flex;align-items:center;gap:14px;flex-shrink:0;flex-wrap:wrap;gap:10px;
      ">
        <div style="display:flex;align-items:center;gap:10px">
          <div id="bank-icon" style="
            width:38px;height:38px;border-radius:10px;
            display:flex;align-items:center;justify-content:center;
            font-family:var(--font-display);font-size:12px;font-weight:800;
            background:rgba(249,168,37,0.15);color:#F9A825;flex-shrink:0;
          ">BR</div>
          <div>
            <div id="bank-symbol-name" style="font-family:var(--font-display);font-size:15px;font-weight:800;color:var(--text-primary)">${BANK_STOCKS[0].code}</div>
            <div id="bank-symbol-full" style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">Bank BRI · BUMN</div>
          </div>
        </div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div id="bank-current-price" style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--gold)">Rp —</div>
          <div id="bank-price-change" style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">—</div>
        </div>
        <div style="display:flex;gap:16px;margin-left:8px">
          <div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase">Prev Close</div>
            <div id="bank-stat-prev" style="font-family:var(--font-mono);font-size:11px;color:var(--text-primary)">—</div>
          </div>
          <div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase">Volume</div>
            <div id="bank-stat-vol" style="font-family:var(--font-mono);font-size:11px;color:var(--text-primary)">—</div>
          </div>
          <div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase">Status Data</div>
            <div id="bank-data-status" style="font-family:var(--font-mono);font-size:10px;color:var(--green)">⏳ Memuat…</div>
          </div>
        </div>
        <button onclick="fetchAllBankPrices(true)" title="Refresh harga real" style="
          margin-left:auto;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:600;
          background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);
          color:var(--cyan);cursor:pointer;font-family:var(--font-mono);
        ">↺ Refresh</button>
      </div>

      <!-- Chart Canvas Wrap — identik .chart-canvas-wrap di trading -->
      <!-- FIX: SAME height config as .chart-canvas-wrap to prevent flat chart -->
      <div class="bank-chart-canvas-wrap" style="
        flex:1;position:relative;overflow:auto;overflow-x:auto;overflow-y:hidden;
        min-height:300px;height:400px;max-height:520px;min-width:0;
        padding:12px 12px 8px 12px;
      ">
        <!-- Zoom controls — identik trading, SVG icons -->
        <div style="position:absolute;top:14px;right:16px;z-index:5;display:flex;align-items:center;gap:4px;">
          <!-- Indicator toggles -->
          <button id="bank-ind-ma" onclick="bankToggleIndicator('ma')" title="Moving Average (MA20)" style="
            padding:3px 8px;border-radius:6px;font-family:var(--font-mono);font-size:10px;font-weight:700;
            cursor:pointer;border:1px solid rgba(212,175,55,0.5);
            background:rgba(212,175,55,0.2);color:#D4AF37;transition:all 0.15s;
          ">MA</button>
          <button id="bank-ind-ema" onclick="bankToggleIndicator('ema')" title="Exponential MA (EMA9)" style="
            padding:3px 8px;border-radius:6px;font-family:var(--font-mono);font-size:10px;font-weight:700;
            cursor:pointer;border:1px solid rgba(0,229,255,0.5);
            background:rgba(0,229,255,0.2);color:#00E5FF;transition:all 0.15s;
          ">EMA</button>
          <!-- Candle/Line toggle -->
          <button id="bank-chart-candle-btn" onclick="bankSetChartType('candle')" title="Candlestick Chart" style="
            width:28px;height:22px;display:flex;align-items:center;justify-content:center;
            border-radius:6px;cursor:pointer;transition:all 0.15s;font-size:12px;
            border:1px solid rgba(212,175,55,0.5);background:rgba(212,175,55,0.2);color:var(--gold);
          ">▮</button>
          <button id="bank-chart-line-btn" onclick="bankSetChartType('line')" title="Line Chart" style="
            width:28px;height:22px;display:flex;align-items:center;justify-content:center;
            border-radius:6px;cursor:pointer;transition:all 0.15s;font-size:12px;
            border:1px solid var(--border-subtle);background:transparent;color:var(--text-muted);
          ">~</button>
          <div style="width:1px;height:16px;background:var(--border-subtle);margin:0 2px"></div>
          <button onclick="_bankApplyZoom(-1)" title="Zoom Out" style="
            width:24px;height:24px;display:flex;align-items:center;justify-content:center;
            background:none;border:none;color:var(--text-muted);cursor:pointer;
            border-radius:4px;transition:all 0.15s;
          " onmouseover="this.style.color='var(--gold)';this.style.background='rgba(212,175,55,0.08)'" onmouseout="this.style.color='var(--text-muted)';this.style.background='none'">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4 6h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
          <span id="bank-zoom-label" style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary,#8895aa);min-width:20px;text-align:center;user-select:none;">1×</span>
          <button onclick="_bankApplyZoom(+1)" title="Zoom In" style="
            width:24px;height:24px;display:flex;align-items:center;justify-content:center;
            background:none;border:none;color:var(--text-muted);cursor:pointer;
            border-radius:4px;transition:all 0.15s;
          " onmouseover="this.style.color='var(--gold)';this.style.background='rgba(212,175,55,0.08)'" onmouseout="this.style.color='var(--text-muted)';this.style.background='none'">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4 6h4M6 4v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          </button>
          <button onclick="_bankResetZoom()" title="Reset zoom" style="
            width:24px;height:24px;display:flex;align-items:center;justify-content:center;
            background:none;border:none;color:var(--text-muted);cursor:pointer;
            border-radius:4px;transition:all 0.15s;
          " onmouseover="this.style.color='var(--cyan)';this.style.background='rgba(0,229,255,0.08)'" onmouseout="this.style.color='var(--text-muted)';this.style.background='none'">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7a5 5 0 1 0 1-3M2 2v3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <canvas id="bank-chart-canvas" style="width:100%;height:100%;display:block;cursor:crosshair;"></canvas>
      </div>

      <!-- Scroll bar horizontal — identik fixes.js / trading -->
      <div id="bank-scroll-wrap" style="
        display:none;align-items:center;gap:6px;
        padding:5px 8px;background:var(--bg-deep);
        border-top:1px solid var(--border-subtle);flex-shrink:0;
        user-select:none;
      ">
        <button id="bank-scroll-left" title="Geser ke kiri" style="
          width:26px;height:22px;background:var(--bg-card);
          border:1px solid var(--border-subtle);border-radius:6px;
          color:var(--text-muted);cursor:pointer;font-size:12px;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;transition:all 0.15s;
        ">◀</button>
        <div id="bank-scroll-track" style="
          flex:1;height:10px;background:rgba(255,255,255,0.04);
          border-radius:5px;position:relative;cursor:pointer;
          border:1px solid var(--border-subtle);overflow:hidden;
        ">
          <div id="bank-scroll-thumb" style="
            position:absolute;top:1px;height:8px;
            background:linear-gradient(90deg,var(--gold-dim,rgba(212,175,55,0.5)),rgba(212,175,55,0.3));
            border-radius:4px;cursor:grab;min-width:30px;transition:background 0.15s;
          "></div>
        </div>
        <button id="bank-scroll-right" title="Geser ke kanan" style="
          width:26px;height:22px;background:var(--bg-card);
          border:1px solid var(--border-subtle);border-radius:6px;
          color:var(--text-muted);cursor:pointer;font-size:12px;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;transition:all 0.15s;
        ">▶</button>
        <div id="bank-scroll-label" style="
          font-family:var(--font-mono);font-size:9px;color:var(--text-muted);
          white-space:nowrap;min-width:40px;text-align:right;
        ">Live</div>
      </div>

      <!-- Disclaimer -->
      <div style="
        padding:5px 16px;border-top:1px solid var(--border-subtle);
        font-family:var(--font-mono);font-size:9px;color:var(--text-muted);
        display:flex;align-items:center;gap:6px;flex-shrink:0;
      ">
        <span style="color:var(--gold)">⚠</span>
        Harga dari Yahoo Finance (BEI). Ini <strong style="color:var(--text-primary)">simulasi investasi</strong> — bukan trading sungguhan.
      </div>
    </main>

    <!-- ── Order Book (identik Trading) ── -->
    <aside id="bank-order-book-panel" style="
      width:200px;min-width:170px;flex-shrink:0;
      border-left:1px solid var(--border-subtle);
      display:flex;flex-direction:column;overflow:hidden;
      background:var(--bg-surface);
    ">
      <div style="padding:10px 12px 8px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="font-family:var(--font-display);font-size:11px;font-weight:700;color:var(--text-primary)">📖 Order Book</div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--green)">● LIVE</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding:5px 10px;border-bottom:1px solid var(--border-subtle);flex-shrink:0">
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase">Harga</span>
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase;text-align:right">Vol</span>
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase;text-align:right">Total</span>
      </div>
      <div id="bank-order-book-body" style="flex:1;overflow-y:auto;scrollbar-width:thin"></div>
    </aside>

    <!-- ── Panel Order Kanan ── -->
    <aside id="bank-trade-panel" style="
      width:240px;min-width:200px;flex-shrink:0;
      border-left:1px solid var(--border-subtle);
      display:flex;flex-direction:column;overflow-y:auto;
      padding:14px;gap:12px;scrollbar-width:thin;
    ">
      <!-- Order Box -->
      <div style="background:var(--bg-deep);border-radius:10px;padding:14px;border:1px solid var(--border-subtle)">
        <div style="font-family:var(--font-display);font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px">
          Order Panel
        </div>

        <!-- BUY / SELL tabs -->
        <div style="display:flex;gap:6px;margin-bottom:12px">
          <button id="bank-tab-buy" onclick="switchBankSide('buy')" style="
            flex:1;padding:7px;border-radius:8px;font-family:var(--font-display);
            font-size:12px;font-weight:800;cursor:pointer;border:1.5px solid var(--green);
            background:rgba(0,230,118,0.15);color:var(--green);transition:all 0.15s;
          ">▲ BELI</button>
          <button id="bank-tab-sell" onclick="switchBankSide('sell')" style="
            flex:1;padding:7px;border-radius:8px;font-family:var(--font-display);
            font-size:12px;font-weight:800;cursor:pointer;border:1.5px solid var(--border-subtle);
            background:transparent;color:var(--text-muted);transition:all 0.15s;
          ">▼ JUAL</button>
        </div>

        <!-- Saldo & Dimiliki -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px">
          <div style="background:var(--bg-card);border-radius:6px;padding:7px 8px;border:1px solid var(--border-subtle)">
            <div style="font-family:var(--font-mono);font-size:8px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px">Saldo</div>
            <div id="bank-trade-balance" style="font-family:var(--font-mono);font-size:10px;color:var(--gold);font-weight:700">Rp —</div>
          </div>
          <div style="background:var(--bg-card);border-radius:6px;padding:7px 8px;border:1px solid var(--border-subtle)">
            <div style="font-family:var(--font-mono);font-size:8px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px">Dimiliki</div>
            <div id="bank-trade-owned" style="font-family:var(--font-mono);font-size:10px;color:var(--cyan);font-weight:700">0 lbr</div>
          </div>
        </div>

        <!-- Input jumlah lembar -->
        <div style="margin-bottom:8px">
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);margin-bottom:4px;display:flex;justify-content:space-between">
            <span>Jumlah Lembar</span>
            <span>Harga: <span id="bank-unit-price">—</span></span>
          </div>
          <input type="number" id="bank-qty-input" placeholder="0" min="1" step="1" style="
            width:100%;box-sizing:border-box;
            background:var(--bg-card);border:1px solid var(--border-subtle);
            border-radius:8px;padding:8px 10px;color:var(--text-primary);
            font-family:var(--font-mono);font-size:13px;font-weight:700;outline:none;
          "/>
        </div>

        <!-- % Shortcut -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:10px">
          ${[25,50,75,100].map(p => `
            <button onclick="setBankTradePercent(${p/100})" style="
              padding:5px;border-radius:6px;font-family:var(--font-mono);font-size:9px;
              font-weight:700;cursor:pointer;border:1px solid var(--border-subtle);
              background:rgba(255,255,255,0.04);color:var(--text-muted);transition:all 0.15s;
            " onmouseover="this.style.color='var(--text-primary)'" onmouseout="this.style.color='var(--text-muted)'">${p===100?'MAX':p+'%'}</button>
          `).join('')}
        </div>

        <!-- Total -->
        <div style="
          background:var(--bg-card);border-radius:8px;padding:8px 10px;
          border:1px solid var(--border-subtle);margin-bottom:10px;
          display:flex;justify-content:space-between;align-items:center;
        ">
          <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase">Total</span>
          <span id="bank-trade-total" style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--text-primary)">Rp 0</span>
        </div>

        <!-- Submit -->
        <button id="bank-submit-btn" onclick="executeBankTrade()" style="
          width:100%;padding:10px;border-radius:10px;
          font-family:var(--font-display);font-size:13px;font-weight:800;
          cursor:pointer;border:none;letter-spacing:0.05em;transition:all 0.15s;
          background:linear-gradient(135deg,#00C853,#00E676);color:#000;
        ">▲ BELI SEKARANG</button>
      </div>

      <!-- Holdings bank -->
      <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--border-subtle)">
        <div style="font-family:var(--font-display);font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:10px">
          📂 Kepemilikan Bank Saya
        </div>
        <div id="bank-holdings-list">
          <div style="color:var(--text-muted);font-size:10px;font-family:var(--font-mono)">Belum ada kepemilikan.</div>
        </div>
      </div>

      <!-- Info pasar -->
      <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--border-subtle)">
        <div style="font-family:var(--font-display);font-size:11px;font-weight:700;color:var(--gold);margin-bottom:8px">
          ℹ️ Cara Simulasi
        </div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);line-height:1.7">
          • Harga diambil dari BEI via Yahoo Finance<br>
          • Refresh tiap 3 menit otomatis<br>
          • Saldo & portofolio sama dengan trading prodi<br>
          • Tanda ✅ = data real, ⚠️ = simulasi fallback<br>
          • Gunakan ini untuk latihan sebelum terjun nyata
        </div>
      </div>
    </aside>
  </div>
  `;
}

// ════════════════════════════════════════════════════════
// §5. RENDER DAFTAR BANK
// ════════════════════════════════════════════════════════

function _renderBankList() {
  const container = document.getElementById('bank-list-items');
  if (!container) return;

  const q   = (document.getElementById('bank-search-input')?.value || '').toLowerCase();
  const cat = bankState.filterCat;

  const filtered = BANK_STOCKS.filter(b => {
    const matchCat  = cat === 'Semua' || b.category === cat;
    const matchSearch = !q || b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (!filtered.length) {
    container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:11px">Tidak ditemukan</div>`;
    return;
  }

  container.innerHTML = filtered.map(bank => {
    const d       = bankState.prices[bank.ticker];
    const price   = d ? d.price   : bank.basePrice;
    const chgPct  = d ? d.changePct : 0;
    const isReal  = d ? d.isReal  : false;
    const isActive = bank.ticker === bankState.activeBank;
    const color    = chgPct > 0 ? '#00E676' : chgPct < 0 ? '#EF5350' : 'var(--text-muted)';
    const catColor = BANK_CATEGORY_COLORS[bank.category] || '#888';

    return `
      <div class="bank-list-item ${isActive ? 'active' : ''}"
        onclick="selectBank('${bank.ticker}')"
        style="
          padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border-subtle);
          background:${isActive ? 'rgba(255,255,255,0.06)' : 'transparent'};
          transition:background 0.15s;display:flex;align-items:center;gap:10px;
        "
        onmouseover="if(!this.classList.contains('active'))this.style.background='rgba(255,255,255,0.03)'"
        onmouseout="if(!this.classList.contains('active'))this.style.background='transparent'"
      >
        <div style="
          width:34px;height:34px;border-radius:8px;flex-shrink:0;
          background:${bank.color}22;border:1px solid ${bank.color}44;
          display:flex;align-items:center;justify-content:center;
          font-family:var(--font-display);font-size:10px;font-weight:800;color:${bank.color};
        ">${bank.code.slice(0,2)}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:5px">
            <span style="font-family:var(--font-display);font-size:12px;font-weight:700;color:var(--text-primary)">${bank.code}</span>
            <span style="font-size:8px;padding:1px 5px;border-radius:10px;background:${catColor}22;color:${catColor};font-family:var(--font-mono);font-weight:600">${bank.category}</span>
            ${isReal ? '<span style="font-size:8px;color:#00E676" title="Data Real BEI">✅</span>' : '<span style="font-size:8px;color:#FFAB40" title="Estimasi">⚠️</span>'}
          </div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${bank.name}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--text-primary)">Rp${price.toLocaleString('id-ID')}</div>
          <div style="font-family:var(--font-mono);font-size:9px;color:${color}">${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%</div>
        </div>
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════════════════════
// §6. RENDER CHART — IDENTIK TRADING (Candlestick + Volume + MA/EMA + Scroll)
// ════════════════════════════════════════════════════════

const BANK_ZOOM_STEPS  = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const BANK_ZOOM_LABELS = ['¼×', '½×', '¾×', '1×', '1.5×', '2×', '3×', '4×'];
const BANK_CHART_POINTS = 120;

let bankChartGradientCache = {};
let bankLineTooltip = { visible: false, x: 0, y: 0 };
let bankZoomLevel   = 1;
let bankScrollOffset = 0; // jumlah titik di-scroll dari kiri

// ── Build candle data dari priceHistory ──────────────────
function _buildBankCandles(ticker) {
  if (!bankState.candleData[ticker] || bankState.candleData[ticker].length < 2) {
    const hist = bankState.priceHistory[ticker] || [];
    const bank = BANK_STOCKS.find(b => b.ticker === ticker);
    const basePrice = bank?.basePrice || 1000;
    const now = Date.now();
    const TF_MS = 60000; // 1 menit per candle (untuk simulasi)

    if (hist.length >= 2) {
      const candles = [];
      for (let i = 0; i < hist.length; i++) {
        const p = hist[i];
        const prev = hist[Math.max(0, i - 1)];
        const open  = prev;
        const close = p;
        const hi = Math.max(open, close) * (1 + Math.random() * 0.003);
        const lo = Math.min(open, close) * (1 - Math.random() * 0.003);
        const vol = Math.floor(Math.random() * 80000 + 10000);
        candles.push({ t: now - (hist.length - i) * TF_MS, o: open, h: hi, l: lo, c: close, v: vol });
      }
      bankState.candleData[ticker] = candles;
    } else {
      // Generate dari basePrice
      const candles = [];
      let p = basePrice;
      for (let i = 60; i >= 0; i--) {
        const open = p;
        const moves = 4;
        let hi = open, lo = open, close = open;
        for (let j = 0; j < moves; j++) {
          const vol2 = 0.008;
          p = p * Math.exp((0.00002 - 0.5 * vol2 * vol2) + vol2 * (Math.random() * 2 - 1));
          p = Math.max(10, p);
          if (p > hi) hi = p;
          if (p < lo) lo = p;
          close = p;
        }
        candles.push({ t: now - i * TF_MS, o: open, h: hi, l: lo, c: Math.round(close), v: Math.floor(Math.random() * 80000 + 10000) });
      }
      bankState.candleData[ticker] = candles;
    }
  }
}

// Update candle saat harga berubah
function _updateBankCandle(ticker, newPrice) {
  if (!bankState.candleData[ticker] || !bankState.candleData[ticker].length) {
    _buildBankCandles(ticker);
    return;
  }
  const now = Date.now();
  const TF_MS = 60000;
  const candles = bankState.candleData[ticker];
  const last = candles[candles.length - 1];
  const barStart = Math.floor(now / TF_MS) * TF_MS;

  if (last.t < barStart) {
    candles.push({ t: barStart, o: newPrice, h: newPrice, l: newPrice, c: newPrice, v: 0 });
    if (candles.length > 300) candles.shift();
  } else {
    if (newPrice > last.h) last.h = newPrice;
    if (newPrice < last.l) last.l = newPrice;
    last.c = newPrice;
    last.v += Math.floor(Math.random() * 200 + 50);
  }
}

// Indicator calculators (identik upgrades.js)
function _bankCalcMA(closes, period) {
  const result = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result[i] = sum / period;
  }
  return result;
}

function _bankCalcEMA(closes, period) {
  const k = 2 / (period + 1);
  const result = new Array(closes.length).fill(null);
  if (closes.length < period) return result;
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = ema;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

function _bankGetZoomedHistory() {
  // Fallback ke priceHistory untuk line chart
  const hist = bankState.priceHistory[bankState.activeBank] || [];
  const idx  = BANK_ZOOM_STEPS.indexOf(bankZoomLevel);
  const zv   = BANK_ZOOM_STEPS[Math.max(0, idx)];
  const points = Math.max(10, Math.round(BANK_CHART_POINTS / zv));
  const count  = Math.min(points, hist.length);
  const maxOff = Math.max(0, hist.length - count);
  const off    = Math.min(bankScrollOffset, maxOff);
  const end    = hist.length - off;
  return hist.slice(Math.max(0, end - count), end);
}

function _bankGetZoomedCandles() {
  const candles = bankState.candleData[bankState.activeBank] || [];
  const zv   = bankZoomLevel;
  const visN = Math.max(10, Math.round(60 / zv));
  const count = Math.min(visN, candles.length);
  const maxOff = Math.max(0, candles.length - count);
  const off = Math.min(bankScrollOffset, maxOff);
  const end = candles.length - off;
  return candles.slice(Math.max(0, end - count), end);
}

function _bankApplyZoom(delta) {
  const idx    = BANK_ZOOM_STEPS.indexOf(bankZoomLevel);
  const newIdx = Math.max(0, Math.min(BANK_ZOOM_STEPS.length - 1, idx + delta));
  bankZoomLevel = BANK_ZOOM_STEPS[newIdx];
  bankChartGradientCache = {};
  const label = document.getElementById('bank-zoom-label');
  if (label) label.textContent = BANK_ZOOM_LABELS[newIdx];
  _updateBankScrollbar();
  _renderBankChart();
}

function _bankResetZoom() {
  bankZoomLevel    = 1;
  bankScrollOffset = 0;
  bankChartGradientCache = {};
  const label = document.getElementById('bank-zoom-label');
  if (label) label.textContent = '1×';
  _updateBankScrollbar();
  _renderBankChart();
}

function _updateBankScrollbar() {
  const candles = bankState.candleData[bankState.activeBank] || [];
  const zv    = bankZoomLevel;
  const visN  = Math.max(10, Math.round(60 / zv));
  const maxOff = Math.max(0, candles.length - visN);

  const track  = document.getElementById('bank-scroll-track');
  const thumb  = document.getElementById('bank-scroll-thumb');
  const wrap   = document.getElementById('bank-scroll-wrap');
  const label  = document.getElementById('bank-scroll-label');
  if (!track || !thumb || !wrap) return;

  // FIX: selalu tampilkan scrollbar (sama seperti trading di fixes.js)
  wrap.style.display = 'flex';

  const trackW = track.offsetWidth || 200;

  if (maxOff <= 0) {
    // Semua data terlihat — thumb full width
    thumb.style.left  = '1px';
    thumb.style.width = Math.max(30, trackW - 2) + 'px';
    if (label) label.textContent = 'Live';
    return;
  }

  // Thumb proporsional: visN / total candles
  const thumbW = Math.max(30, Math.round((visN / candles.length) * trackW));
  // Posisi: offset=0 (live) → thumb di kanan; offset=maxOff → thumb di kiri
  const thumbX = Math.round(((maxOff - bankScrollOffset) / maxOff) * (trackW - thumbW));
  thumb.style.left  = Math.max(1, thumbX) + 'px';
  thumb.style.width = thumbW + 'px';
  if (label) label.textContent = bankScrollOffset === 0 ? 'Live' : '-' + bankScrollOffset + 'b';
}

function _renderBankChart() {
  const canvas = document.getElementById('bank-chart-canvas');
  if (!canvas) return;

  const bank = BANK_STOCKS.find(b => b.ticker === bankState.activeBank);
  if (!bank) return;

  // Pastikan candle data tersedia
  _buildBankCandles(bankState.activeBank);

  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;

  // FIX: paksa reflow dengan offsetWidth/offsetHeight (lebih reliable dari getBoundingClientRect)
  const rawW = wrap ? wrap.offsetWidth : 0;
  let rawH   = wrap ? wrap.offsetHeight : 0;

  // CRITICAL FIX: Same minimum height as trading chart — prevents flat chart
  const BANK_MIN_H = window.innerWidth <= 900 ? 240 : 300;
  if (rawH < BANK_MIN_H) rawH = wrap ? wrap.getBoundingClientRect().height : 0;
  if (rawH < BANK_MIN_H) rawH = BANK_MIN_H;

  const W = rawW;
  const H = Math.max(BANK_MIN_H, Math.min(rawH, 520));

  if (W < 20 || H < BANK_MIN_H) {
    // Canvas belum layout — retry dengan rAF (lebih akurat dari setTimeout)
    requestAnimationFrame(() => requestAnimationFrame(_renderBankChart));
    return;
  }

  // CRITICAL FIX: HANYA reset canvas jika dimensi benar-benar berubah (toleransi 2px)
  // Setiap kali canvas.width/height di-assign, context DIHAPUS TOTAL — ini penyebab glitch!
  if (Math.abs(canvas.width - W) > 2 || Math.abs(canvas.height - H) > 2) {
    canvas.width  = W;
    canvas.height = H;
  }

  const showMA   = bankState.candle.indicators.ma.active;
  const showEMA  = bankState.candle.indicators.ema.active;
  const showVol  = true; // always show volume
  const showRSI  = bankState.candle.indicators.rsi.active;

  // FIX: proporsi identik trading — volume hanya tampil jika tidak ada RSI/MACD
  // Jika RSI aktif, sub panel 15%; jika tidak ada, MAIN_H penuh (volume digambar di dalam)
  const VOL_H   = showRSI ? 0 : Math.round(H * 0.15);
  const RSI_H   = showRSI ? Math.round(H * 0.20) : 0;
  const MAIN_H  = H - VOL_H - RSI_H - (VOL_H > 0 ? 4 : 0) - (RSI_H > 0 ? 4 : 0);
  const PAD_L   = 12, PAD_R = 72, PAD_T = 16, PAD_B = 24;

  const chartType = bankState.candle.chartType;
  const candles = _bankGetZoomedCandles();

  if (!candles || candles.length < 2) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Memuat data chart…', W / 2, H / 2);
    return;
  }

  ctx.clearRect(0, 0, W, H);

  const drawW = W - PAD_L - PAD_R;
  const barW  = drawW / candles.length;
  const candleW = Math.max(1, Math.min(barW * 0.7, 18));

  // Y scale untuk main panel
  // CRITICAL FIX: Pastikan range minimal 1% dari harga — mencegah garis nempel di atas
  // saat harga bergerak sangat kecil (flat)
  const rawHi  = Math.max(...candles.map(c => c.h));
  const rawLo  = Math.min(...candles.map(c => c.l));
  const midPrice = (rawHi + rawLo) / 2;
  const minRange = midPrice * 0.008; // minimal 0.8% range agar chart selalu di tengah
  const hiMax = Math.max(rawHi * 1.001, midPrice + minRange);
  const loMin = Math.min(rawLo * 0.999, midPrice - minRange);

  function toX(i)   { return PAD_L + (i + 0.5) * barW; }
  function toY(v)   { return PAD_T + MAIN_H - ((v - loMin) / (hiMax - loMin)) * MAIN_H; }
  function toYvol(v, maxV) {
    const y0 = PAD_T + MAIN_H + 4;
    return y0 + VOL_H - (v / maxV) * VOL_H * 0.9;
  }

  // ── Grid lines main (8 baris) ──
  ctx.font = '9px JetBrains Mono, monospace';
  const gridLines = 6;
  for (let i = 0; i <= gridLines; i++) {
    const y = PAD_T + (MAIN_H / gridLines) * i;
    const price = hiMax - ((hiMax - loMin) / gridLines) * i;
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(120,140,170,0.2)';
    ctx.beginPath(); ctx.moveTo(W - PAD_R, y); ctx.lineTo(W - PAD_R + 3, y); ctx.stroke();
    ctx.fillStyle = 'rgba(140,160,190,0.65)';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(price).toLocaleString('id-ID'), W - PAD_R + 5, y + 3.5);
  }

  // ── Separator volume panel ──
  const volY0 = PAD_T + MAIN_H + 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD_L, volY0); ctx.lineTo(W - PAD_R, volY0); ctx.stroke();

  // ── Volume bars ──
  const maxVol = Math.max(...candles.map(c => c.v || 0), 1);
  candles.forEach((c, i) => {
    const x  = toX(i);
    const bh = ((c.v || 0) / maxVol) * VOL_H * 0.9;
    const y  = volY0 + VOL_H - bh;
    const isUp = c.c >= c.o;
    ctx.fillStyle = isUp ? 'rgba(0,230,118,0.45)' : 'rgba(239,83,80,0.45)';
    ctx.fillRect(x - candleW / 2, y, candleW, bh);
  });

  // ── Volume label ──
  const lastVol = candles[candles.length - 1]?.v || 0;
  ctx.fillStyle = 'rgba(140,160,190,0.5)';
  ctx.font = '8px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Volume', PAD_L + 2, volY0 + 10);

  if (chartType === 'line') {
    // ── LINE CHART (smooth dual-color, identik script.js) ──
    const hist = candles.map(c => c.c);
    const openP = hist[0];
    const lastP = hist[hist.length - 1];
    const isUp  = lastP >= openP;
    const GREEN = '#00E676', RED = '#EF5350';

    function ltoX(i) { return PAD_L + (i / (hist.length - 1)) * drawW; }
    function ltoY(v) { return PAD_T + MAIN_H - ((v - loMin) / (hiMax - loMin)) * MAIN_H; }

    // Fill gradient
    const gKey = bankState.activeBank + W + H + (isUp ? 'up' : 'dn');
    if (!bankChartGradientCache[gKey]) {
      const g = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + MAIN_H);
      if (isUp) { g.addColorStop(0, 'rgba(0,230,118,0.3)'); g.addColorStop(1, 'rgba(0,230,118,0)'); }
      else      { g.addColorStop(0, 'rgba(239,83,80,0.05)'); g.addColorStop(0.5, 'rgba(239,83,80,0.25)'); g.addColorStop(1, 'rgba(239,83,80,0.05)'); }
      bankChartGradientCache[gKey] = g;
    }
    ctx.beginPath();
    ctx.moveTo(ltoX(0), ltoY(hist[0]));
    for (let i = 1; i < hist.length; i++) {
      const x0 = ltoX(i-1), y0 = ltoY(hist[i-1]), x1 = ltoX(i), y1 = ltoY(hist[i]);
      ctx.bezierCurveTo(x0+(x1-x0)*0.4, y0, x1-(x1-x0)*0.4, y1, x1, y1);
    }
    ctx.lineTo(ltoX(hist.length-1), PAD_T+MAIN_H);
    ctx.lineTo(PAD_L, PAD_T+MAIN_H);
    ctx.closePath();
    ctx.fillStyle = bankChartGradientCache[gKey];
    ctx.fill();

    // Dual-color line
    ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [GREEN, RED].forEach(targetColor => {
      let inSeg = false;
      for (let i = 0; i < hist.length - 1; i++) {
        const v0 = hist[i], v1 = hist[i+1];
        const c0 = v0 >= openP ? GREEN : RED;
        const c1 = v1 >= openP ? GREEN : RED;
        if (c0 !== targetColor && c1 !== targetColor) continue;
        if (c0 !== c1) {
          const t  = (openP - v0) / (v1 - v0);
          const cx = ltoX(i) + t * (ltoX(i+1) - ltoX(i));
          const cy = ltoY(openP);
          if (c0 === targetColor) {
            if (!inSeg) { ctx.beginPath(); ctx.strokeStyle = targetColor; ctx.moveTo(ltoX(i), ltoY(v0)); inSeg = true; }
            ctx.lineTo(cx, cy); ctx.stroke(); inSeg = false;
          } else {
            ctx.beginPath(); ctx.strokeStyle = targetColor; ctx.moveTo(cx, cy);
            ctx.lineTo(ltoX(i+1), ltoY(v1)); ctx.stroke(); inSeg = false;
          }
        } else {
          if (!inSeg) { ctx.beginPath(); ctx.strokeStyle = targetColor; ctx.moveTo(ltoX(i), ltoY(v0)); inSeg = true; }
          const cpx1 = ltoX(i)+(ltoX(i+1)-ltoX(i))*0.4;
          const cpx2 = ltoX(i+1)-(ltoX(i+1)-ltoX(i))*0.4;
          ctx.bezierCurveTo(cpx1, ltoY(v0), cpx2, ltoY(v1), ltoX(i+1), ltoY(v1));
        }
      }
      if (inSeg) ctx.stroke();
    });

  } else {
    // ── CANDLESTICK ──
    candles.forEach((c, i) => {
      const x     = toX(i);
      const isUp  = c.c >= c.o;
      const col   = isUp ? '#00E676' : '#EF5350';
      const yO    = toY(c.o), yC = toY(c.c), yH = toY(c.h), yL = toY(c.l);

      // Wick
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x, yH); ctx.lineTo(x, Math.min(yO, yC));
      ctx.moveTo(x, Math.max(yO, yC)); ctx.lineTo(x, yL);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(yO, yC);
      const bodyH   = Math.max(1, Math.abs(yO - yC));
      if (isUp) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(0,230,118,0.15)';
        ctx.fillRect(x - candleW/2, bodyTop, candleW, bodyH);
        ctx.strokeRect(x - candleW/2, bodyTop, candleW, bodyH);
      } else {
        ctx.fillStyle = col;
        ctx.fillRect(x - candleW/2, bodyTop, candleW, bodyH);
      }
    });
  }

  // ── MA Indicator ──
  if (showMA) {
    const closes = candles.map(c => c.c);
    const ma = _bankCalcMA(closes, bankState.candle.indicators.ma.period);
    ctx.strokeStyle = bankState.candle.indicators.ma.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.setLineDash([]);
    let started = false;
    ctx.beginPath();
    ma.forEach((v, i) => {
      if (v === null) return;
      const x = toX(i), y = toY(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    if (started) ctx.stroke();

    // Label
    const lastMA = ma.filter(Boolean).pop();
    if (lastMA) {
      ctx.fillStyle = bankState.candle.indicators.ma.color;
      ctx.font = 'bold 8px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('MA' + bankState.candle.indicators.ma.period, W - PAD_R + 5, toY(lastMA) + 3);
    }
  }

  // ── EMA Indicator ──
  if (showEMA) {
    const closes = candles.map(c => c.c);
    const ema = _bankCalcEMA(closes, bankState.candle.indicators.ema.period);
    ctx.strokeStyle = bankState.candle.indicators.ema.color;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3, 2]);
    let started = false;
    ctx.beginPath();
    ema.forEach((v, i) => {
      if (v === null) return;
      const x = toX(i), y = toY(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    if (started) ctx.stroke();
    ctx.setLineDash([]);

    // Label
    const lastEMA = ema.filter(Boolean).pop();
    if (lastEMA) {
      ctx.fillStyle = bankState.candle.indicators.ema.color;
      ctx.font = 'bold 8px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('EMA' + bankState.candle.indicators.ema.period, W - PAD_R + 5, toY(lastEMA) - 4);
    }
  }

  // ── Current price dashed line + badge ──
  const lastC   = candles[candles.length - 1];
  const lastPrice = lastC.c;
  const prevC   = candles[0].o;
  const isUpAll = lastPrice >= prevC;
  const lineY   = toY(lastPrice);
  const bColor  = isUpAll ? '#00E676' : '#EF5350';

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(212,175,55,0.6)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(PAD_L, lineY); ctx.lineTo(W - PAD_R, lineY); ctx.stroke();
  ctx.setLineDash([]);

  const bW = 62, bH = 17, bX = W - PAD_R + 1, bY = lineY - bH / 2;
  ctx.fillStyle = bColor;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bX, bY, bW, bH, 3);
  else ctx.rect(bX, bY, bW, bH);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bX, lineY); ctx.lineTo(bX - 5, lineY - 4); ctx.lineTo(bX - 5, lineY + 4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = 'bold 8px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(lastPrice).toLocaleString('id-ID'), bX + bW / 2, bY + bH - 4);

  // ── Crosshair tooltip ──
  if (bankLineTooltip.visible) {
    const relX  = Math.max(0, Math.min(bankLineTooltip.x - PAD_L, drawW));
    const cidx  = Math.max(0, Math.min(Math.round((relX / drawW) * (candles.length - 1)), candles.length - 1));
    const hC    = candles[cidx];
    const hPx   = toX(cidx);
    const hPy   = toY(hC.c);
    const dotCol = hC.c >= hC.o ? '#00E676' : '#EF5350';

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(hPx, PAD_T); ctx.lineTo(hPx, PAD_T + MAIN_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD_L, hPy); ctx.lineTo(W - PAD_R, hPy); ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath(); ctx.arc(hPx, hPy, 4, 0, Math.PI * 2);
    ctx.fillStyle = dotCol; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

    const tw = 130, th = 56;
    let tx = hPx + 14;
    if (tx + tw > W - PAD_R) tx = hPx - tw - 14;
    const ty = Math.max(PAD_T, Math.min(PAD_T + MAIN_H - th, hPy - th / 2));

    ctx.fillStyle = 'rgba(8,13,26,0.96)';
    ctx.strokeStyle = dotCol; ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(tx, ty, tw, th, 6);
    else ctx.rect(tx, ty, tw, th);
    ctx.fill(); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = dotCol; ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillText('O:' + Math.round(hC.o).toLocaleString('id-ID'), tx + 8, ty + 14);
    ctx.fillStyle = '#00E676';
    ctx.fillText('H:' + Math.round(hC.h).toLocaleString('id-ID'), tx + 8, ty + 26);
    ctx.fillStyle = '#EF5350';
    ctx.fillText('L:' + Math.round(hC.l).toLocaleString('id-ID'), tx + 8, ty + 38);
    ctx.fillStyle = dotCol;
    ctx.fillText('C:' + Math.round(hC.c).toLocaleString('id-ID'), tx + 8, ty + 50);
    ctx.fillStyle = 'rgba(140,160,190,0.7)';
    ctx.font = '8px JetBrains Mono, monospace';
    const vol = (hC.v || 0) >= 1000000 ? (hC.v / 1000000).toFixed(1) + 'M' : (hC.v >= 1000 ? (hC.v / 1000).toFixed(0) + 'K' : String(hC.v));
    ctx.fillText('V:' + vol, tx + 72, ty + 14);
  }

  _updateBankChartHeader();
  _updateBankScrollbar();
}

function _updateBankChartHeader() {
  const bank = BANK_STOCKS.find(b => b.ticker === bankState.activeBank);
  const d    = bankState.prices[bankState.activeBank];
  if (!bank || !d) return;

  const color = d.changePct > 0 ? '#00E676' : d.changePct < 0 ? '#EF5350' : 'var(--text-muted)';
  const sign  = d.changePct >= 0 ? '+' : '';

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setStyle = (id, prop, val) => { const el = document.getElementById(id); if (el) el.style[prop] = val; };

  // Icon
  const iconEl = document.getElementById('bank-icon');
  if (iconEl) {
    iconEl.textContent = bank.code.slice(0, 2);
    iconEl.style.background = bank.color + '22';
    iconEl.style.color = bank.color;
  }

  setEl('bank-symbol-name', bank.code);
  setEl('bank-symbol-full', `${bank.name} · ${bank.category}`);
  setEl('bank-current-price', `Rp ${d.price.toLocaleString('id-ID')}`);
  setEl('bank-price-change',  `${sign}${d.changePct.toFixed(2)}% (${sign}Rp${Math.abs(d.change).toLocaleString('id-ID')})`);
  setStyle('bank-price-change', 'color', color);
  setEl('bank-stat-prev', `Rp ${d.prevClose.toLocaleString('id-ID')}`);
  setEl('bank-stat-vol',  d.volume ? d.volume.toLocaleString('id-ID') : '—');
  setEl('bank-data-status', d.isReal ? '✅ Data Real BEI' : '⚠️ Estimasi');
  if (document.getElementById('bank-data-status')) {
    document.getElementById('bank-data-status').style.color = d.isReal ? '#00E676' : '#FFAB40';
  }
}

// ════════════════════════════════════════════════════════
// §7. RENDER PANEL TRADING
// ════════════════════════════════════════════════════════

function _renderBankTradePanel() {
  const bank = BANK_STOCKS.find(b => b.ticker === bankState.activeBank);
  const d    = bankState.prices[bankState.activeBank];
  const price = d ? d.price : (bank?.basePrice || 0);

  // Saldo dari state utama
  if (typeof state !== 'undefined') {
    const balEl = document.getElementById('bank-trade-balance');
    if (balEl) balEl.textContent = `Rp ${Math.round(state.balance).toLocaleString('id-ID')}`;

    // KEY FIX: gunakan bank.code (bukan ticker) sebagai key holdings
    const holdingKey = bank ? bank.code : bankState.activeBank;
    const h = state.holdings[holdingKey];
    const ownedEl = document.getElementById('bank-trade-owned');
    if (ownedEl) ownedEl.textContent = `${(h?.qty || 0).toLocaleString('id-ID')} lbr`;
  }

  const unitEl = document.getElementById('bank-unit-price');
  if (unitEl) unitEl.textContent = `Rp ${price.toLocaleString('id-ID')}`;

  // Recalc total
  _recalcBankTotal();

  // Holdings
  _renderBankHoldings();
}

function _renderBankHoldings() {
  const container = document.getElementById('bank-holdings-list');
  if (!container || typeof state === 'undefined') return;

  // KEY FIX: filter berdasarkan bank.code (bukan ticker)
  const bankCodes = new Set(BANK_STOCKS.map(b => b.code));
  const entries = Object.entries(state.holdings).filter(([id, h]) => bankCodes.has(id) && h.qty > 0);

  if (!entries.length) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:10px;font-family:var(--font-mono)">Belum ada kepemilikan.</div>`;
    return;
  }

  container.innerHTML = entries.map(([code, h]) => {
    // Cari bank berdasarkan code
    const bank  = BANK_STOCKS.find(b => b.code === code);
    if (!bank) return '';
    const d     = bankState.prices[bank.ticker];
    const price = d ? d.price : h.avgPrice;
    const pnlVal = (price - h.avgPrice) * h.qty;
    const pnlPct = ((price - h.avgPrice) / h.avgPrice * 100);
    const color  = pnlVal >= 0 ? '#00E676' : '#EF5350';

    return `
      <div onclick="selectBank('${bank.ticker}')" style="
        padding:8px;border-radius:8px;background:var(--bg-card);
        border:1px solid var(--border-subtle);margin-bottom:6px;cursor:pointer;
      ">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-family:var(--font-display);font-size:11px;font-weight:700;color:var(--text-primary)">${bank.code}</span>
          <span style="font-family:var(--font-mono);font-size:10px;color:${color};font-weight:700">
            ${pnlVal >= 0 ? '+' : ''}Rp${Math.round(Math.abs(pnlVal)).toLocaleString('id-ID')}
          </span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">${h.qty.toLocaleString('id-ID')} lbr · avg Rp${Math.round(h.avgPrice).toLocaleString('id-ID')}</span>
          <span style="font-family:var(--font-mono);font-size:9px;color:${color}">${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%</span>
        </div>
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// §7b. totalPortfolioValue sudah di-patch langsung di script.js
// (mendukung BANK_STOCKS secara native) — tidak perlu override lagi di sini.
// Fungsi ini dipertahankan hanya untuk kompatibilitas backward.
function _patchTotalPortfolioValue() {
  // Sudah ditangani di script.js — tidak ada aksi diperlukan
  console.log('[BankMarket] totalPortfolioValue sudah mendukung bank holdings secara native');
}

// §8. TRADING FUNCTIONS
// ════════════════════════════════════════════════════════

function selectBank(ticker) {
  bankState.activeBank = ticker;
  bankScrollOffset = 0;
  bankChartGradientCache = {};
  _buildBankCandles(ticker);
  _renderBankList();
  _renderBankChart();
  _renderBankTradePanel();
  renderBankOrderBook();
}

function bankToggleIndicator(name) {
  if (!bankState.candle.indicators[name]) return;
  bankState.candle.indicators[name].active = !bankState.candle.indicators[name].active;
  // Update button visual
  const btn = document.getElementById('bank-ind-' + name);
  if (btn) {
    const isActive = bankState.candle.indicators[name].active;
    const colors = { ma: { on: 'rgba(212,175,55,0.2)', border: 'rgba(212,175,55,0.5)', text: '#D4AF37' },
                     ema: { on: 'rgba(0,229,255,0.2)', border: 'rgba(0,229,255,0.5)', text: '#00E5FF' } };
    const c = colors[name];
    btn.style.background = isActive ? c.on : 'transparent';
    btn.style.borderColor = isActive ? c.border : 'var(--border-subtle)';
    btn.style.color = isActive ? c.text : 'var(--text-muted)';
  }
  bankChartGradientCache = {};
  _renderBankChart();
}

function bankSetChartType(type) {
  bankState.candle.chartType = type;
  bankChartGradientCache = {};
  // Update button visuals
  const candleBtn = document.getElementById('bank-chart-candle-btn');
  const lineBtn   = document.getElementById('bank-chart-line-btn');
  if (candleBtn) {
    candleBtn.style.background = type === 'candle' ? 'rgba(212,175,55,0.2)' : 'transparent';
    candleBtn.style.borderColor = type === 'candle' ? 'rgba(212,175,55,0.5)' : 'var(--border-subtle)';
    candleBtn.style.color = type === 'candle' ? 'var(--gold)' : 'var(--text-muted)';
  }
  if (lineBtn) {
    lineBtn.style.background = type === 'line' ? 'rgba(0,229,255,0.1)' : 'transparent';
    lineBtn.style.borderColor = type === 'line' ? 'rgba(0,229,255,0.4)' : 'var(--border-subtle)';
    lineBtn.style.color = type === 'line' ? 'var(--cyan)' : 'var(--text-muted)';
  }
  _renderBankChart();
}

function switchBankSide(side) {
  bankState.tradeSide = side;

  const buyBtn  = document.getElementById('bank-tab-buy');
  const sellBtn = document.getElementById('bank-tab-sell');
  const subBtn  = document.getElementById('bank-submit-btn');

  if (buyBtn && sellBtn) {
    if (side === 'buy') {
      buyBtn.style.cssText  += ';border-color:var(--green);background:rgba(0,230,118,0.15);color:var(--green)';
      sellBtn.style.cssText += ';border-color:var(--border-subtle);background:transparent;color:var(--text-muted)';
    } else {
      sellBtn.style.cssText += ';border-color:#EF5350;background:rgba(239,83,80,0.15);color:#EF5350';
      buyBtn.style.cssText  += ';border-color:var(--border-subtle);background:transparent;color:var(--text-muted)';
    }
  }

  if (subBtn) {
    subBtn.textContent = side === 'buy' ? '▲ BELI SEKARANG' : '▼ JUAL SEKARANG';
    subBtn.style.background = side === 'buy'
      ? 'linear-gradient(135deg,#00C853,#00E676)'
      : 'linear-gradient(135deg,#C62828,#EF5350)';
    subBtn.style.color = '#000';
  }

  _recalcBankTotal();
}

function setBankTradePercent(pct) {
  const d     = bankState.prices[bankState.activeBank];
  const bank  = BANK_STOCKS.find(b => b.ticker === bankState.activeBank);
  const price = d ? d.price : (bank?.basePrice || 1);
  let qty = 0;

  if (typeof state !== 'undefined') {
    if (bankState.tradeSide === 'buy') {
      qty = Math.floor((state.balance * pct) / price);
    } else {
      // KEY FIX: gunakan bank.code sebagai key holdings
      const holdingKey = bank ? bank.code : bankState.activeBank;
      const h = state.holdings[holdingKey];
      qty = Math.floor((h?.qty || 0) * pct);
    }
  }

  const input = document.getElementById('bank-qty-input');
  if (input) { input.value = qty; _recalcBankTotal(); }
}

function _recalcBankTotal() {
  const input = document.getElementById('bank-qty-input');
  const qty   = parseInt(input?.value) || 0;
  const d     = bankState.prices[bankState.activeBank];
  const bank  = BANK_STOCKS.find(b => b.ticker === bankState.activeBank);
  const price = d ? d.price : (bank?.basePrice || 0);
  const total = qty * price;

  const totalEl = document.getElementById('bank-trade-total');
  if (totalEl) totalEl.textContent = `Rp ${Math.round(total).toLocaleString('id-ID')}`;
}

function executeBankTrade() {
  if (typeof state === 'undefined') return;

  const input = document.getElementById('bank-qty-input');
  const qty   = parseInt(input?.value) || 0;
  if (qty <= 0) {
    if (typeof showToast === 'function') showToast('Perhatian', 'Masukkan jumlah lembar yang valid.', 'warning');
    return;
  }

  const bank  = BANK_STOCKS.find(b => b.ticker === bankState.activeBank);
  const d     = bankState.prices[bankState.activeBank];
  const price = d ? d.price : (bank?.basePrice || 0);
  const total = qty * price;

  // KEY FIX: gunakan bank.code sebagai key holdings (bukan ticker 'BBRI.JK')
  // sehingga totalPortfolioValue() dan renderPortfolio() dapat menemukan harga via bankState.prices
  const holdingKey = bank.code;

  if (bankState.tradeSide === 'buy') {
    if (total > state.balance) {
      if (typeof showToast === 'function') showToast('Saldo Tidak Cukup', `Dibutuhkan Rp ${Math.round(total).toLocaleString('id-ID')}, saldo Anda Rp ${Math.round(state.balance).toLocaleString('id-ID')}`, 'error');
      return;
    }
    state.balance -= total;
    if (!state.holdings[holdingKey]) state.holdings[holdingKey] = { qty: 0, avgPrice: price };
    const h = state.holdings[holdingKey];
    const newQty = h.qty + qty;
    h.avgPrice   = ((h.avgPrice * h.qty) + (price * qty)) / newQty;
    h.qty        = newQty;

    if (typeof showToast === 'function') showToast('✅ Beli Berhasil!', `${qty} lbr ${bank.code} @ Rp ${price.toLocaleString('id-ID')}`, 'success');
    if (typeof playSound === 'function') playSound('buy');

  } else {
    const h = state.holdings[holdingKey];
    if (!h || h.qty < qty) {
      if (typeof showToast === 'function') showToast('Lembar Tidak Cukup', `Anda hanya punya ${h?.qty || 0} lembar ${bank.code}`, 'error');
      return;
    }
    h.qty -= qty;
    state.balance += total;
    if (h.qty === 0) delete state.holdings[holdingKey];

    if (typeof showToast === 'function') showToast('✅ Jual Berhasil!', `${qty} lbr ${bank.code} @ Rp ${price.toLocaleString('id-ID')}`, 'success');
    if (typeof playSound === 'function') playSound('sell');
  }

  // Record transaksi ke sistem utama
  state.transactions.push({
    ts:    new Date().toLocaleString('id-ID'),
    type:  bankState.tradeSide,
    stock: bank.code + ' (Bank)',
    qty, price, total,
  });

  if (input) input.value = '';

  if (typeof saveToStorage === 'function') saveToStorage();
  if (typeof syncLeaderboard === 'function') syncLeaderboard();

  if (typeof renderTopbarBalance === 'function') renderTopbarBalance();
  if (typeof renderAll === 'function') renderAll();
  if (typeof state !== 'undefined' && state.activeTab === 'portfolio' && typeof renderPortfolio === 'function') renderPortfolio();

  _renderBankTradePanel();
  _renderBankList();
}

// ════════════════════════════════════════════════════════
// §9. SWITCH TAB BANK (integrasi dengan sistem tab utama)
// ════════════════════════════════════════════════════════

function _switchToBankTab() {
  if (typeof state !== 'undefined') state.activeTab = 'bank';

  // Stop chart trading yang sedang berjalan
  if (typeof state !== 'undefined' && state.chart) {
    if (state.chart.destroy) state.chart.destroy();
    state.chart = null;
  }
  if (typeof lineChartAnimId !== 'undefined' && lineChartAnimId) {
    cancelAnimationFrame(lineChartAnimId);
    window.lineChartAnimId = null;
  }

  // Semua nav-tab: non-aktif kecuali bank
  document.querySelectorAll('.nav-tab').forEach(el => {
    el.classList.toggle('active', el.id === 'bank-nav-tab');
  });

  // Semua panel-view: gunakan HANYA CSS class, BERSIHKAN inline style
  // agar tidak konflik dengan CSS .panel-view { display:none } / .panel-view.active { display: }
  document.querySelectorAll('.panel-view').forEach(el => {
    el.style.display = '';  // reset inline → CSS mengambil alih
    el.classList.toggle('active', el.id === 'bank-view');
  });

  // Render
  _renderBankList();
  _renderBankTradePanel();
  bankChartGradientCache = {};
  // Build candle data untuk bank aktif jika belum ada
  _buildBankCandles(bankState.activeBank);
  // FIX: gunakan double rAF untuk memastikan layout selesai sebelum render chart
  requestAnimationFrame(() => requestAnimationFrame(_renderBankChart));
}

// ════════════════════════════════════════════════════════
// §10. Reset bank-view sudah ditangani di fixes.js §4
//       Tidak ada _patchSwitchTab di sini agar tidak ada
//       dobel-wrap yang menyebabkan konflik.
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
// §11. STATUS FETCH
// ════════════════════════════════════════════════════════

function _updateBankFetchStatus() {
  const statusEl = document.getElementById('bank-data-status');
  if (!statusEl) return;
  if (bankState.fetchStatus === 'loading') {
    statusEl.textContent = '⏳ Mengambil data real…';
    statusEl.style.color = 'var(--text-muted)';
  } else if (bankState.fetchStatus === 'ok') {
    const sec = Math.round((Date.now() - bankState.lastFetch) / 1000);
    statusEl.textContent = `✅ Real BEI · ${sec < 60 ? sec + 'd' : Math.floor(sec/60) + 'm'} lalu`;
    statusEl.style.color = '#00E676';
  } else {
    statusEl.textContent = '⚠️ Offline / Estimasi';
    statusEl.style.color = '#FFAB40';
  }
}

// ════════════════════════════════════════════════════════
// §12. LISTENERS
// ════════════════════════════════════════════════════════

function _attachBankViewListeners() {
  // Search
  const searchInput = document.getElementById('bank-search-input');
  if (searchInput) searchInput.addEventListener('input', () => _renderBankList());

  // Filter kategori
  document.querySelectorAll('.bank-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bankState.filterCat = btn.dataset.cat;
      document.querySelectorAll('.bank-cat-btn').forEach(b => {
        const isActive = b === btn;
        b.style.background = isActive ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)';
        b.style.borderColor = isActive ? 'rgba(212,175,55,0.5)' : 'var(--border-subtle)';
        b.style.color = isActive ? 'var(--gold)' : 'var(--text-muted)';
      });
      _renderBankList();
    });
  });

  // Qty input → recalc
  const qtyInput = document.getElementById('bank-qty-input');
  if (qtyInput) qtyInput.addEventListener('input', _recalcBankTotal);

  // Canvas: crosshair tooltip + drag pan
  const canvas = document.getElementById('bank-chart-canvas');
  if (canvas) {
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      bankLineTooltip.x = e.clientX - rect.left;
      bankLineTooltip.y = e.clientY - rect.top;
      bankLineTooltip.visible = true;
      // Drag pan
      if (bankState.candle.isDragging) {
        const dx = bankState.candle.dragStartX - e.clientX;
        const candles = bankState.candleData[bankState.activeBank] || [];
        const zv = bankZoomLevel;
        const visN = Math.max(10, Math.round(60 / zv));
        const maxOff = Math.max(0, candles.length - visN);
        const pxPerBar = (canvas.width - 84) / Math.max(1, visN);
        const newOff = Math.round(bankState.candle.dragStartPan + dx / Math.max(1, pxPerBar));
        bankScrollOffset = Math.max(0, Math.min(maxOff, newOff));
        _updateBankScrollbar();
      }
      _renderBankChart();
    });
    canvas.addEventListener('mousedown', e => {
      bankState.candle.isDragging = true;
      bankState.candle.dragStartX = e.clientX;
      bankState.candle.dragStartPan = bankScrollOffset;
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('mouseup', () => {
      bankState.candle.isDragging = false;
      canvas.style.cursor = 'crosshair';
    });
    canvas.addEventListener('mouseleave', () => {
      bankLineTooltip.visible = false;
      bankState.candle.isDragging = false;
      canvas.style.cursor = 'crosshair';
      _renderBankChart();
    });
    // Scroll wheel zoom
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      _bankApplyZoom(e.deltaY < 0 ? +1 : -1);
    }, { passive: false });
    // Touch support
    let _touchStartX = 0, _touchStartOff = 0;
    canvas.addEventListener('touchstart', e => {
      _touchStartX = e.touches[0].clientX;
      _touchStartOff = bankScrollOffset;
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      const dx = _touchStartX - e.touches[0].clientX;
      const candles = bankState.candleData[bankState.activeBank] || [];
      const zv = bankZoomLevel;
      const visN = Math.max(10, Math.round(60 / zv));
      const maxOff = Math.max(0, candles.length - visN);
      const pxPerBar = (canvas.width - 84) / Math.max(1, visN);
      bankScrollOffset = Math.max(0, Math.min(maxOff, Math.round(_touchStartOff + dx / Math.max(1, pxPerBar))));
      _renderBankChart();
    }, { passive: true });
  }

  // Hover effect scroll buttons — identik trading
  ['bank-scroll-left', 'bank-scroll-right'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = 'var(--gold-dim, rgba(212,175,55,0.4))';
      btn.style.color = 'var(--gold)';
      btn.style.background = 'rgba(212,175,55,0.07)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'var(--border-subtle)';
      btn.style.color = 'var(--text-muted)';
      btn.style.background = 'var(--bg-card)';
    });
  });

  // Drag thumb scroll
  const _bThumb = document.getElementById('bank-scroll-thumb');
  const _bTrack = document.getElementById('bank-scroll-track');
  let _bDragging = false, _bDragStartX = 0, _bDragStartOff = 0;
  if (_bThumb && _bTrack) {
    _bThumb.addEventListener('mousedown', e => {
      _bDragging = true; _bDragStartX = e.clientX; _bDragStartOff = bankScrollOffset;
      _bThumb.style.cursor = 'grabbing';
      _bThumb.style.background = 'linear-gradient(90deg,var(--gold),rgba(212,175,55,0.7))';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!_bDragging) return;
      const hist  = bankState.priceHistory[bankState.activeBank] || [];
      const zv    = BANK_ZOOM_STEPS[Math.max(0, BANK_ZOOM_STEPS.indexOf(bankZoomLevel))];
      const count = Math.max(10, Math.round(BANK_CHART_POINTS / zv));
      const maxOff = Math.max(0, hist.length - count);
      const trackW = _bTrack.offsetWidth - _bThumb.offsetWidth - 2;
      if (trackW <= 0) return;
      const dx = _bDragStartX - e.clientX;
      bankScrollOffset = Math.max(0, Math.min(maxOff, Math.round(_bDragStartOff + dx * (maxOff / trackW))));
      _updateBankScrollbar(); _renderBankChart();
    });
    document.addEventListener('mouseup', () => {
      if (_bDragging) {
        _bDragging = false;
        _bThumb.style.cursor = 'grab';
        _bThumb.style.background = 'linear-gradient(90deg,var(--gold-dim,rgba(212,175,55,0.5)),rgba(212,175,55,0.3))';
      }
    });
  }

  // Scroll bar: tombol kiri/kanan
  document.getElementById('bank-scroll-left')?.addEventListener('click', () => {
    const hist  = bankState.priceHistory[bankState.activeBank] || [];
    const idx   = BANK_ZOOM_STEPS.indexOf(bankZoomLevel);
    const zv    = BANK_ZOOM_STEPS[Math.max(0, idx)];
    const count = Math.max(10, Math.round(BANK_CHART_POINTS / zv));
    const step  = Math.max(1, Math.round(count * 0.2));
    bankScrollOffset = Math.min(bankScrollOffset + step, hist.length - count);
    _renderBankChart();
  });
  document.getElementById('bank-scroll-right')?.addEventListener('click', () => {
    const idx   = BANK_ZOOM_STEPS.indexOf(bankZoomLevel);
    const zv    = BANK_ZOOM_STEPS[Math.max(0, idx)];
    const count = Math.max(10, Math.round(BANK_CHART_POINTS / zv));
    const step  = Math.max(1, Math.round(count * 0.2));
    bankScrollOffset = Math.max(0, bankScrollOffset - step);
    _renderBankChart();
  });

  // Scroll bar: klik track
  const track = document.getElementById('bank-scroll-track');
  if (track) {
    track.addEventListener('click', e => {
      const hist  = bankState.priceHistory[bankState.activeBank] || [];
      const idx   = BANK_ZOOM_STEPS.indexOf(bankZoomLevel);
      const zv    = BANK_ZOOM_STEPS[Math.max(0, idx)];
      const count = Math.max(10, Math.round(BANK_CHART_POINTS / zv));
      const maxOff = Math.max(0, hist.length - count);
      if (maxOff <= 0) return;
      const rect  = track.getBoundingClientRect();
      const frac  = (e.clientX - rect.left) / rect.width;
      // frac 0 = paling kiri (paling lama) → offset = maxOff; frac 1 = paling kanan (terbaru) → offset 0
      bankScrollOffset = Math.round((1 - frac) * maxOff);
      _renderBankChart();
    });
  }

  // Resize chart on window resize
  window.addEventListener('resize', () => {
    if (typeof state !== 'undefined' && state.activeTab === 'bank') {
      bankChartGradientCache = {};
      _renderBankChart();
    }
  });
}

// ════════════════════════════════════════════════════════
// §12b. ORDER BOOK BANK INDONESIA
// Identik dengan renderOrderBook() di upgrades.js
// ════════════════════════════════════════════════════════

function _generateBankOrderBook(ticker) {
  const priceData = bankState.prices[ticker];
  const price = (priceData && priceData.price) ? priceData.price : 4000;
  const bids = [], asks = [];
  const spread = price * 0.001;

  for (let i = 0; i < 12; i++) {
    const bidPrice = price - spread - i * (price * 0.0008 + Math.random() * price * 0.0005);
    const askPrice = price + spread + i * (price * 0.0008 + Math.random() * price * 0.0005);
    const bidVol = Math.floor(Math.random() * 5000 + 500);
    const askVol = Math.floor(Math.random() * 5000 + 500);
    bids.push({ price: bidPrice, vol: bidVol, total: bidPrice * bidVol });
    asks.push({ price: askPrice, vol: askVol, total: askPrice * askVol });
  }

  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);
  return { bids, asks };
}

function renderBankOrderBook() {
  const el = document.getElementById('bank-order-book-body');
  if (!el) return;

  const { bids, asks } = _generateBankOrderBook(bankState.activeBank);
  const price = (bankState.prices[bankState.activeBank] || {}).price || 0;
  const maxVol = Math.max(...bids.map(b => b.vol), ...asks.map(a => a.vol));

  const asksHtml = [...asks].reverse().slice(0, 8).map(a => {
    const pct = (a.vol / maxVol) * 100;
    return `<div class="ob-row ask" style="--depth:${pct}%;display:grid;grid-template-columns:1fr 1fr 1fr;padding:3px 10px;position:relative;cursor:default">
      <span style="font-family:var(--font-mono);font-size:10px;color:#FF3D71;font-weight:600">${Math.round(a.price).toLocaleString('id-ID')}</span>
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);text-align:right">${a.vol.toLocaleString('id-ID')}</span>
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-align:right">${(a.total / 1000000).toFixed(1)}M</span>
    </div>`;
  }).join('');

  const spreadPct = price > 0 ? ((asks[0].price - bids[0].price) / price * 100).toFixed(3) : '0.000';
  const spreadHtml = `<div style="
    display:flex;justify-content:space-between;align-items:center;
    padding:5px 10px;background:var(--bg-deep);
    border-top:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);
    flex-shrink:0;
  ">
    <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--gold)">${Math.round(price).toLocaleString('id-ID')}</span>
    <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">Spread ${spreadPct}%</span>
  </div>`;

  const bidsHtml = bids.slice(0, 8).map(b => {
    const pct = (b.vol / maxVol) * 100;
    return `<div class="ob-row bid" style="--depth:${pct}%;display:grid;grid-template-columns:1fr 1fr 1fr;padding:3px 10px;position:relative;cursor:default">
      <span style="font-family:var(--font-mono);font-size:10px;color:#00E676;font-weight:600">${Math.round(b.price).toLocaleString('id-ID')}</span>
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);text-align:right">${b.vol.toLocaleString('id-ID')}</span>
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-align:right">${(b.total / 1000000).toFixed(1)}M</span>
    </div>`;
  }).join('');

  el.innerHTML = asksHtml + spreadHtml + bidsHtml;
}

// Auto-refresh order book bank setiap 1.5 detik (identik trading)
setInterval(() => {
  if (document.getElementById('bank-order-book-body')) renderBankOrderBook();
}, 1500);

// ════════════════════════════════════════════════════════
// §13. CSS
// ════════════════════════════════════════════════════════

function _injectBankCSS() {
  if (document.getElementById('bank-market-css')) return;
  const style = document.createElement('style');
  style.id = 'bank-market-css';
  style.textContent = `
    #bank-view { background: var(--bg-panel, var(--bg-deep, #0D1117)); }
    /* Layout identik trading — bank-view sendiri adalah flex, isi penuh */
    #bank-view > div { height: 100%; overflow: hidden; }
    #bank-view > div > main { min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    /* Canvas wrap — identik .chart-canvas-wrap trading: max-height 520px */
    .bank-chart-canvas-wrap {
      flex: 1;
      min-height: 280px;
      min-width: 0;
      overflow: hidden;
      max-height: 520px;
      /* CRITICAL FIX: fix the height so it doesn't shrink when content reflows */
      height: 100%;
      /* Center the canvas content */
      display: flex;
      align-items: stretch;
      justify-content: stretch;
    }
    #bank-chart-canvas {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
      cursor: crosshair;
      /* CRITICAL FIX: max-height prevents canvas growing beyond container */
      max-height: 100%;
    }
    /* Scrollbar list & panel */
    #bank-list-items::-webkit-scrollbar { width: 4px; }
    #bank-list-items::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 2px; }
    #bank-trade-panel::-webkit-scrollbar { width: 4px; }
    #bank-trade-panel::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 2px; }
    /* Input */
    #bank-qty-input:focus { border-color: var(--gold) !important; box-shadow: 0 0 0 2px rgba(212,175,55,0.15); }
    #bank-qty-input { transition: border-color 0.15s, box-shadow 0.15s; }
    /* Scroll bar thumb — identik trading */
    #bank-scroll-thumb:hover { background: linear-gradient(90deg, var(--gold), rgba(212,175,55,0.6)) !important; }
    #bank-scroll-thumb:active { cursor: grabbing !important; }
    /* Order Book rows — identik ob-row trading */
    #bank-order-book-body .ob-row { position: relative; }
    #bank-order-book-body .ob-row::before {
      content: '';
      position: absolute;
      top: 0; bottom: 0; right: 0;
      width: var(--depth, 0%);
      opacity: 0.08;
      pointer-events: none;
    }
    #bank-order-book-body .ob-row.ask::before { background: #FF3D71; }
    #bank-order-book-body .ob-row.bid::before { background: #00E676; }
    #bank-order-book-body .ob-row:hover { background: rgba(255,255,255,0.03); }
    @media (max-width: 768px) {
      #bank-list-panel { width: 200px; min-width: 160px; }
      #bank-trade-panel { width: 200px; min-width: 180px; }
      #bank-order-book-panel { width: 160px; min-width: 140px; }
    }
    @media (max-width: 600px) {
      #bank-trade-panel { display: none; }
      #bank-order-book-panel { display: none; }
      #bank-list-panel { width: 180px; }
    }
  `;
  document.head.appendChild(style);
}

// ════════════════════════════════════════════════════════
// §14. INIT
// ════════════════════════════════════════════════════════

(function initBankMarket() {
  function tryInit() {
    const dash = document.getElementById('dashboard-page');
    if (!dash || dash.style.display === 'none') { setTimeout(tryInit, 400); return; }

    const nav = document.querySelector('.dashboard-nav');
    if (!nav) { setTimeout(tryInit, 400); return; }

    // Inject tab & view
    _injectBankTab();

    // Migrasi holdings lama (ticker → code baru) sebelum apapun
    _migrateBankHoldings();

    // (switchTab patch sudah ditangani di fixes.js §4)

    // Patch totalPortfolioValue agar bank holdings masuk total aset
    _patchTotalPortfolioValue();

    // Inisialisasi harga fallback dulu agar UI tidak kosong
    BANK_STOCKS.forEach(bank => {
      if (!bankState.prices[bank.ticker]) {
        bankState.prices[bank.ticker] = {
          price: bank.basePrice, prevClose: bank.basePrice,
          change: 0, changePct: 0, volume: 0,
          name: bank.name, isReal: false, lastFetch: 0,
        };
        bankState.priceHistory[bank.ticker] = _genFallbackHistory(bank.basePrice);
      }
    });

    _renderBankList();

    // Fetch harga real (mulai 3 detik setelah load agar tidak bertabrakan)
    setTimeout(() => fetchAllBankPrices(true), 3000);

    // CRITICAL FIX: Guard semua interval agar tidak duplikat saat re-init
    if (!window._bankIntervalsStarted) {
      window._bankIntervalsStarted = true;

      // Refresh otomatis tiap 3 menit
      setInterval(() => fetchAllBankPrices(false), 3 * 60 * 1000);

      // Tick lokal tiap 5 detik (simulasi kecil antar refresh)
      setInterval(_tickBankPricesLocal, 5000);

      // Update status elapsed tiap 30 detik
      setInterval(_updateBankFetchStatus, 30_000);

      // Update trade panel tiap 2 detik (saldo bisa berubah dari trading prodi)
      setInterval(() => {
        if (typeof state !== 'undefined' && state.activeTab === 'bank') {
          _renderBankTradePanel();
        }
      }, 2000);
    }

    // Refresh saat tab aktif kembali
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const stale = Date.now() - bankState.lastFetch > 3 * 60 * 1000;
        if (stale) fetchAllBankPrices(false);
      }
    });

    console.log('✅ [BankMarket] Tab "🏦 Bank Indonesia" aktif —', BANK_STOCKS.length, 'bank siap diperdagangkan');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 2500));
  } else {
    setTimeout(tryInit, 2500);
  }
})();

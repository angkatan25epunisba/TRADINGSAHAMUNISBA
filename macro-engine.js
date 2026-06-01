// ═══════════════════════════════════════════════════════
// UNISBA VIRTUAL MARKET — MACRO ENGINE v1.0
// macro-engine.js
//
// LOAD ORDER: setelah market-engine.js
//
// Fitur:
//   - Ambil kurs USD/IDR real dari API gratis (CORS-friendly)
//   - Kurs mempengaruhi drift semua saham secara otomatis
//   - Trigger berita makro otomatis saat kurs bergerak signifikan
//   - Tampilkan widget kurs di dashboard
//   - Fallback graceful jika offline / API down
// ═══════════════════════════════════════════════════════

'use strict';

// ════════════════════════════════════════════════════════
// §1. KONFIGURASI
// ════════════════════════════════════════════════════════

const MACRO = {
  // API endpoints — dicoba berurutan, pakai yang pertama berhasil
  // API key resmi user (exchangerate-api v6) diprioritaskan
  APIS: [
    'https://v6.exchangerate-api.com/v6/165c0b01ff52586f75d4a2fd/latest/USD', // ✅ KEY RESMI
    'https://api.exchangerate-api.com/v4/latest/USD',   // gratis, CORS OK
    'https://open.er-api.com/v6/latest/USD',            // backup gratis
    'https://api.fxratesapi.com/latest?base=USD&currencies=IDR', // backup 2
  ],

  FETCH_INTERVAL:  5 * 60 * 1000,  // ambil data tiap 5 menit
  DISPLAY_INTERVAL: 10 * 1000,     // update widget tiap 10 detik (interpolasi)

  // Zona kurs IDR/USD — menentukan kondisi market
  // DIPERBARUI: tambah zona krisis berlapis untuk kondisi Rupiah >18.000
  ZONES: {
    SANGAT_KUAT:   { max: 14500,   label: 'Sangat Kuat',    modifier:  0.00025, color: '#00E676', icon: '💪' },
    KUAT:          { max: 15000,   label: 'Kuat',            modifier:  0.00015, color: '#69F0AE', icon: '📈' },
    NORMAL:        { max: 15500,   label: 'Normal',          modifier:  0.00005, color: '#D4AF37', icon: '➡️' },
    LEMAH:         { max: 16000,   label: 'Melemah',         modifier: -0.00015, color: '#FFAB40', icon: '📉' },
    SANGAT_LEMAH:  { max: 16500,   label: 'Sangat Lemah',   modifier: -0.00025, color: '#FF6D00', icon: '⚠️' },
    KRISIS:        { max: 17500,   label: 'KRISIS',          modifier: -0.00040, color: '#EF5350', icon: '🚨' },
    KRISIS_PARAH:  { max: 19000,   label: 'KRISIS PARAH',   modifier: -0.00060, color: '#D32F2F', icon: '🔴' },
    KRISIS_DARURAT:{ max: Infinity, label: 'KRISIS DARURAT', modifier: -0.00085, color: '#B71C1C', icon: '☠️' },
  },

  // Threshold perubahan kurs untuk trigger berita (%)
  NEWS_THRESHOLD_MINOR: 0.3,   // 0.3% → berita kecil
  NEWS_THRESHOLD_MAJOR: 0.8,   // 0.8% → berita besar
  NEWS_THRESHOLD_SHOCK: 1.5,   // 1.5% → shock event

  // Sektor saham — sektor mana lebih sensitif terhadap kurs
  // (nilai 0–2.0: makin tinggi makin sensitif terhadap pelemahan rupiah)
  SECTOR_SENSITIVITY: {
    EKOP: 1.8,  // Ekonomi Pembangunan — sangat sensitif kondisi makro
    MNJM: 1.5,  // Manajemen — sensitif
    AKNT: 1.4,  // Akuntansi — sensitif
    HUKM: 0.8,  // Hukum — tidak terlalu sensitif
    TKSP: 1.6,  // Teknik Sipil — sensitif (bahan bangunan impor)
    TKIN: 1.5,  // Teknik Industri — sensitif
    PSIK: 0.7,  // Psikologi — paling tidak sensitif
    KDOK: 1.2,  // Kedokteran — sedang (alat medis impor)
    FARM: 1.3,  // Farmasi — sedang (bahan baku impor)
    KOMM: 1.0,  // Komunikasi — normal
    PDDK: 0.9,  // Pendidikan Islam — tidak terlalu sensitif
    MTEK: 1.7,  // Mesin & Elektro — sangat sensitif (komponen impor)
  },
};

// ════════════════════════════════════════════════════════
// §2. STATE MAKRO
// ════════════════════════════════════════════════════════

const macroState = {
  usdIdr:         15800,      // nilai default (fallback)
  usdIdrPrev:     15800,      // nilai sebelumnya untuk hitung perubahan
  usdIdrChange:   0,          // perubahan % dari fetch sebelumnya
  usdIdrDaily:    0,          // perubahan % dari awal hari
  usdIdrOpen:     null,       // kurs awal hari (di-set saat pertama fetch)
  lastFetch:      0,          // timestamp fetch terakhir
  fetchStatus:    'loading',  // 'loading' | 'ok' | 'error' | 'offline'
  zone:           'NORMAL',   // zona kurs saat ini
  modifier:       0,          // drift modifier yang diaplikasikan ke market
  apiIndex:       0,          // index API yang sedang dipakai
  newsThrottle:   {},         // throttle per jenis berita
};

// ════════════════════════════════════════════════════════
// §3. FETCH KURS DARI API
// ════════════════════════════════════════════════════════

async function fetchExchangeRate() {
  // Coba semua API sampai ada yang berhasil
  for (let i = 0; i < MACRO.APIS.length; i++) {
    const apiUrl = MACRO.APIS[(macroState.apiIndex + i) % MACRO.APIS.length];
    try {
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const data = await res.json();

      // Parse IDR dari berbagai format response
      let idrRate = null;
      if (data.rates?.IDR)         idrRate = data.rates.IDR;       // exchangerate-api & open.er-api
      else if (data.data?.IDR?.value) idrRate = data.data.IDR.value; // fxratesapi
      else if (data.rates?.IDR?.rate) idrRate = data.rates.IDR.rate;

      if (!idrRate || idrRate < 10000 || idrRate > 30000) continue; // sanity check

      // Berhasil
      macroState.apiIndex    = (macroState.apiIndex + i) % MACRO.APIS.length;
      macroState.usdIdrPrev  = macroState.usdIdr;
      macroState.usdIdr      = Math.round(idrRate);
      macroState.lastFetch   = Date.now();
      macroState.fetchStatus = 'ok';

      // Set kurs awal hari jika belum ada
      if (!macroState.usdIdrOpen) {
        macroState.usdIdrOpen = macroState.usdIdr;
      }

      // Hitung perubahan
      macroState.usdIdrChange = ((macroState.usdIdr - macroState.usdIdrPrev) / macroState.usdIdrPrev) * 100;
      macroState.usdIdrDaily  = ((macroState.usdIdr - macroState.usdIdrOpen)  / macroState.usdIdrOpen)  * 100;

      // Update zona & modifier
      _updateZone();

      // Trigger berita makro jika perubahan signifikan
      _checkMacroNews();

      console.log(`✅ [MacroEngine] USD/IDR: ${macroState.usdIdr.toLocaleString('id-ID')} (${macroState.usdIdrChange >= 0 ? '+' : ''}${macroState.usdIdrChange.toFixed(2)}%) — Zone: ${macroState.zone}`);

      _updateMacroWidget();
      return true;

    } catch (e) {
      // Coba API berikutnya
      continue;
    }
  }

  // Semua API gagal
  macroState.fetchStatus = navigator.onLine ? 'error' : 'offline';
  console.warn('[MacroEngine] Semua API gagal, pakai data terakhir:', macroState.usdIdr);
  _updateMacroWidget();
  return false;
}

// ════════════════════════════════════════════════════════
// §4. UPDATE ZONA & MARKET MODIFIER
// ════════════════════════════════════════════════════════

function _updateZone() {
  const rate = macroState.usdIdr;
  for (const [zoneName, zoneData] of Object.entries(MACRO.ZONES)) {
    if (rate < zoneData.max) {
      macroState.zone     = zoneName;
      macroState.modifier = zoneData.modifier;
      break;
    }
  }
}

// Getter untuk dipakai market-engine.js — tambahkan ke market phase drift
function getMacroDrift(stockId) {
  const sensitivity = MACRO.SECTOR_SENSITIVITY[stockId] || 1.0;
  // Modifier dikurangi sensitivitas per sektor
  // Pelemahan rupiah (modifier negatif) → saham impor-sensitif lebih terdampak
  return macroState.modifier * sensitivity;
}

// ════════════════════════════════════════════════════════
// §5. PATCH MARKET ENGINE — inject macro drift ke tickPrices
// ════════════════════════════════════════════════════════

(function patchTickPricesWithMacro() {
  function tryPatch() {
    if (typeof tickPrices !== 'function') { setTimeout(tryPatch, 300); return; }

    const _origTick = window.tickPrices;
    window.tickPrices = function() {
      const changes = _origTick();
      if (!changes || typeof STOCKS === 'undefined') return changes;

      // Inject macro drift ke setiap saham setelah tick normal
      const macroDriftTotal = macroState.modifier;
      if (Math.abs(macroDriftTotal) < 0.000001) return changes; // tidak ada efek

      STOCKS.forEach(s => {
        if (!changes[s.id] || typeof state === 'undefined') return;
        const sensitivity  = MACRO.SECTOR_SENSITIVITY[s.id] || 1.0;
        const extraDrift   = macroDriftTotal * sensitivity;
        const currentPrice = state.prices[s.id];
        if (!currentPrice) return;

        // Terapkan micro-drift tambahan dari kondisi makro
        const adjusted = currentPrice * (1 + extraDrift);
        const bounded  = typeof applyMeanReversion === 'function'
          ? applyMeanReversion(adjusted, s.basePrice)
          : Math.max(100, adjusted);

        state.prices[s.id] = bounded;
        changes[s.id].new  = bounded;

        // Update history juga
        if (state.priceHistory[s.id]?.length) {
          state.priceHistory[s.id][state.priceHistory[s.id].length - 1] = parseFloat(bounded.toFixed(0));
        }
      });

      return changes;
    };

    console.log('✅ [MacroEngine] tickPrices patched with macro drift');
  }
  setTimeout(tryPatch, 3000); // patch setelah market-engine.js juga patch
})();

// ════════════════════════════════════════════════════════
// §6. BERITA MAKRO OTOMATIS
// ════════════════════════════════════════════════════════

const MACRO_NEWS = {
  // Rupiah melemah
  LEMAH_MINOR: [
    { text: 'Rupiah melemah tipis — investor asing mulai wait and see', type: 'bearish', impact: -0.015 },
    { text: 'Kurs USD/IDR naik — tekanan jual ringan di pasar domestik',  type: 'bearish', impact: -0.012 },
  ],
  LEMAH_MAJOR: [
    { text: `Rupiah tembus Rp${(0).toLocaleString('id-ID')} — IHSG tertekan, sentimen negatif menyebar`, type: 'bearish', impact: -0.035 },
    { text: 'Pelemahan rupiah berlanjut — investor asing keluar dari aset domestik', type: 'bearish', impact: -0.030 },
  ],
  LEMAH_SHOCK: [
    { text: `🚨 SHOCK: Rupiah melemah tajam ke Rp${(0).toLocaleString('id-ID')}! Pasar virtual ikut terguncang!`, type: 'bearish', impact: -0.065 },
    { text: '🚨 Gejolak kurs IDR! Bank Indonesia bersiap intervensi pasar valuta asing', type: 'bearish', impact: -0.055 },
  ],
  // Rupiah menguat
  KUAT_MINOR: [
    { text: 'Rupiah menguat — capital inflow positif, pasar domestik bernapas',  type: 'bullish', impact:  0.013 },
    { text: 'Kurs USD/IDR turun — sentimen investor domestik membaik',           type: 'bullish', impact:  0.010 },
  ],
  KUAT_MAJOR: [
    { text: 'Rupiah rebound kuat! Kepercayaan investor pulih — pasar merespons positif', type: 'bullish', impact: 0.030 },
    { text: 'Penguatan rupiah berlanjut — BI pertahankan suku bunga, inflasi terkendali', type: 'bullish', impact: 0.025 },
  ],
  // Stabil
  STABIL: [
    { text: 'Bank Indonesia: kurs rupiah bergerak stabil sesuai fundamental ekonomi', type: 'neutral', impact: 0.005 },
    { text: 'Rupiah konsolidasi — pasar menanti data ekonomi terbaru', type: 'neutral', impact: 0 },
  ],
  // Zona krisis
  KRISIS: [
    { text: `🚨 KRISIS KEUANGAN: USD/IDR menembus Rp${(0).toLocaleString('id-ID')}! Semua sektor terdampak!`, type: 'bearish', impact: -0.08 },
    { text: '🚨 Rupiah di level terendah! Pemerintah dan BI rapat darurat stabilisasi kurs', type: 'bearish', impact: -0.07 },
  ],
  KRISIS_PARAH: [
    { text: `☠️ DARURAT KEUANGAN: Rupiah di Rp${(0).toLocaleString('id-ID')}! Pasar virtual ikut terjun bebas!`, type: 'bearish', impact: -0.12 },
    { text: '🔴 Rupiah terus melemah — BI intervensi besar-besaran, pasar bergejolak ekstrem', type: 'bearish', impact: -0.10 },
    { text: `🔴 Kurs IDR capai ${(0).toLocaleString('id-ID')}/USD — modal asing kabur, IHSG longsor`, type: 'bearish', impact: -0.11 },
  ],
  KRISIS_DARURAT: [
    { text: `☠️ KRISIS LEVEL TERTINGGI: Rupiah melemah parah ke Rp${(0).toLocaleString('id-ID')}! Semua aset rontok!`, type: 'bearish', impact: -0.18 },
    { text: '☠️ Indonesia darurat ekonomi — IMF diminta intervensi, rupiah di level kritis', type: 'bearish', impact: -0.15 },
  ],
};

function _checkMacroNews() {
  const chg     = Math.abs(macroState.usdIdrChange);
  const isWeaker = macroState.usdIdrChange > 0; // USD/IDR naik = rupiah melemah
  const now     = Date.now();
  const COOLDOWN = 3 * 60 * 1000; // 3 menit cooldown per kategori berita

  let newsPool = null;
  let category = '';

  // Cek zona krisis terlebih dahulu (berlapis sesuai keparahan)
  if (macroState.zone === 'KRISIS_DARURAT' && (!macroState.newsThrottle['KRISIS_DARURAT'] || now - macroState.newsThrottle['KRISIS_DARURAT'] > COOLDOWN * 3)) {
    newsPool = MACRO_NEWS.KRISIS_DARURAT;
    category = 'KRISIS_DARURAT';
  } else if (macroState.zone === 'KRISIS_PARAH' && (!macroState.newsThrottle['KRISIS_PARAH'] || now - macroState.newsThrottle['KRISIS_PARAH'] > COOLDOWN * 2)) {
    newsPool = MACRO_NEWS.KRISIS_PARAH;
    category = 'KRISIS_PARAH';
  } else if (macroState.zone === 'KRISIS' && (!macroState.newsThrottle['KRISIS'] || now - macroState.newsThrottle['KRISIS'] > COOLDOWN * 2)) {
    newsPool = MACRO_NEWS.KRISIS;
    category = 'KRISIS';
  } else if (chg >= MACRO.NEWS_THRESHOLD_SHOCK) {
    newsPool = isWeaker ? MACRO_NEWS.LEMAH_SHOCK : MACRO_NEWS.KUAT_MAJOR;
    category = isWeaker ? 'LEMAH_SHOCK' : 'KUAT_MAJOR';
  } else if (chg >= MACRO.NEWS_THRESHOLD_MAJOR) {
    newsPool = isWeaker ? MACRO_NEWS.LEMAH_MAJOR : MACRO_NEWS.KUAT_MAJOR;
    category = isWeaker ? 'LEMAH_MAJOR' : 'KUAT_MAJOR';
  } else if (chg >= MACRO.NEWS_THRESHOLD_MINOR) {
    newsPool = isWeaker ? MACRO_NEWS.LEMAH_MINOR : MACRO_NEWS.KUAT_MINOR;
    category = isWeaker ? 'LEMAH_MINOR' : 'KUAT_MINOR';
  }

  if (!newsPool) return;
  if (macroState.newsThrottle[category] && now - macroState.newsThrottle[category] < COOLDOWN) return;

  macroState.newsThrottle[category] = now;

  // Pilih berita acak dari pool
  const raw  = newsPool[Math.floor(Math.random() * newsPool.length)];
  // Isi nilai kurs ke template berita
  const text = raw.text.replace(/Rp0/g, 'Rp' + macroState.usdIdr.toLocaleString('id-ID'));
  const item = { ...raw, text };

  // Injeksi ke news system
  if (typeof state !== 'undefined' && state.recentNews) {
    const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    state.recentNews.unshift({ ...item, ts, stock: null });
    if (state.recentNews.length > 20) state.recentNews.pop();
  }

  // Apply impact ke semua saham (market-wide)
  if (item.impact !== 0 && typeof state !== 'undefined') {
    if (!state.pendingNewsImpact) state.pendingNewsImpact = {};
    STOCKS?.forEach(s => {
      const sensitivity = MACRO.SECTOR_SENSITIVITY[s.id] || 1.0;
      state.pendingNewsImpact[s.id] = (state.pendingNewsImpact[s.id] || 0) + item.impact * sensitivity * 0.5;
    });
  }

  // Render news
  if (typeof renderNewsTicker === 'function') renderNewsTicker();
  if (typeof renderNewsPanel  === 'function') renderNewsPanel();

  // Toast
  if (typeof showToast === 'function') {
    showToast(
      item.type === 'bearish' ? '📉 Makro Ekonomi' : item.type === 'bullish' ? '📈 Makro Ekonomi' : '📊 Makro Ekonomi',
      text,
      item.type === 'bearish' ? 'error' : item.type === 'bullish' ? 'success' : 'info',
      7000
    );
  }
}

// ════════════════════════════════════════════════════════
// §7. WIDGET KURS DI DASHBOARD
// ════════════════════════════════════════════════════════

function _injectMacroWidget() {
  // Sudah ada? Skip
  if (document.getElementById('macro-widget')) return;

  // Cari tempat inject — di sebelah topbar-time atau di bawah ticker
  const ticker = document.querySelector('.ticker-wrap');
  if (!ticker) return;

  const widget = document.createElement('div');
  widget.id = 'macro-widget';
  widget.style.cssText = `
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-subtle);
    padding: 6px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    flex-wrap: wrap;
    position: relative;
    z-index: 10;
  `;

  widget.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;opacity:0.7;font-size:10px;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase">
      🌏 MAKRO EKONOMI INDONESIA
    </div>

    <div style="display:flex;align-items:center;gap:6px" id="macro-usd-idr">
      <span style="color:var(--text-muted)">USD/IDR</span>
      <span id="macro-rate" style="color:var(--gold);font-weight:700">⏳</span>
      <span id="macro-change" style="font-size:10px"></span>
    </div>

    <div style="display:flex;align-items:center;gap:6px">
      <span style="color:var(--text-muted)">Kondisi</span>
      <span id="macro-zone-badge" style="
        padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;
        background:rgba(212,175,55,0.15);color:var(--gold);border:1px solid rgba(212,175,55,0.3);
      ">Memuat…</span>
    </div>

    <div style="display:flex;align-items:center;gap:6px">
      <span style="color:var(--text-muted)">Harian</span>
      <span id="macro-daily" style="font-size:10px;color:var(--text-muted)">—</span>
    </div>

    <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
      <span id="macro-status" style="font-size:10px;color:var(--text-muted)">⏳ Menghubungkan…</span>
      <button onclick="_manualRefreshMacro()" title="Refresh data kurs" style="
        width:22px;height:22px;border-radius:6px;background:transparent;
        border:1px solid var(--border-subtle);color:var(--text-muted);
        cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;
      ">↺</button>
    </div>
  `;

  // Insert setelah ticker-wrap
  ticker.parentNode.insertBefore(widget, ticker.nextSibling);
}

function _updateMacroWidget() {
  const rateEl  = document.getElementById('macro-rate');
  const changeEl = document.getElementById('macro-change');
  const zoneEl  = document.getElementById('macro-zone-badge');
  const dailyEl = document.getElementById('macro-daily');
  const statusEl = document.getElementById('macro-status');

  if (!rateEl) return; // widget belum diinjek

  const zone = MACRO.ZONES[macroState.zone];

  if (rateEl) {
    rateEl.textContent = 'Rp' + macroState.usdIdr.toLocaleString('id-ID');
    rateEl.style.color = zone?.color || 'var(--gold)';
  }

  if (changeEl) {
    const c = macroState.usdIdrChange;
    // Naik = rupiah melemah (buruk), turun = rupiah menguat (baik)
    const sign  = c >= 0 ? '+' : '';
    const color = c > 0 ? '#EF5350' : c < 0 ? '#00E676' : 'var(--text-muted)';
    changeEl.textContent = `${sign}${c.toFixed(2)}%`;
    changeEl.style.color = color;
  }

  if (zoneEl && zone) {
    zoneEl.textContent        = zone.icon + ' ' + zone.label;
    zoneEl.style.background   = zone.color + '22';
    zoneEl.style.color        = zone.color;
    zoneEl.style.borderColor  = zone.color + '55';
  }

  if (dailyEl) {
    const d = macroState.usdIdrDaily;
    if (!macroState.usdIdrOpen) {
      dailyEl.textContent = '—';
    } else {
      const sign  = d >= 0 ? '+' : '';
      dailyEl.textContent = `${sign}${d.toFixed(2)}%`;
      dailyEl.style.color = d > 0 ? '#EF5350' : d < 0 ? '#00E676' : 'var(--text-muted)';
    }
  }

  if (statusEl) {
    const elapsed = Math.round((Date.now() - macroState.lastFetch) / 1000);
    const statusMap = {
      ok:      `✅ Live · ${elapsed < 60 ? elapsed + 'd' : Math.floor(elapsed/60) + 'm'} lalu`,
      error:   '⚠️ Gagal — pakai data terakhir',
      offline: '📴 Offline — pakai data terakhir',
      loading: '⏳ Mengambil data…',
    };
    statusEl.textContent = statusMap[macroState.fetchStatus] || '';
    statusEl.style.color = macroState.fetchStatus === 'ok'
      ? 'var(--green)'
      : macroState.fetchStatus === 'loading'
      ? 'var(--text-muted)'
      : '#FFAB40';
  }
}

// Refresh manual (tombol ↺)
async function _manualRefreshMacro() {
  const statusEl = document.getElementById('macro-status');
  if (statusEl) { statusEl.textContent = '⏳ Mengambil data…'; statusEl.style.color = 'var(--text-muted)'; }
  await fetchExchangeRate();
}

// Update status elapsed time tiap 10 detik (tanpa fetch ulang)
setInterval(() => {
  if (macroState.fetchStatus === 'ok') _updateMacroWidget();
}, 10000);

// ════════════════════════════════════════════════════════
// §8. INJECT CSS WIDGET
// ════════════════════════════════════════════════════════

(function injectMacroCSS() {
  const style = document.createElement('style');
  style.textContent = `
    #macro-widget {
      transition: opacity 0.3s;
    }
    #macro-widget:hover {
      opacity: 1 !important;
    }
    /* Animasi rate berubah */
    #macro-rate.flash {
      animation: macroFlash 0.6s ease-out;
    }
    @keyframes macroFlash {
      0%   { opacity: 0.3; transform: scale(1.08); }
      100% { opacity: 1;   transform: scale(1); }
    }
    /* Sembunyikan widget di landing page */
    #landing-page ~ * #macro-widget,
    #macro-widget.hidden-on-landing {
      display: none;
    }
    /* Responsive */
    @media (max-width: 600px) {
      #macro-widget {
        padding: 5px 12px;
        gap: 12px;
        font-size: 10px;
      }
      #macro-widget > div:nth-child(4) { display: none; } /* sembunyikan Harian di mobile */
    }
  `;
  document.head.appendChild(style);
})();

// ════════════════════════════════════════════════════════
// §9. FLASH ANIMASI SAAT RATE BERUBAH
// ════════════════════════════════════════════════════════

function _flashRateWidget() {
  const el = document.getElementById('macro-rate');
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth; // reflow
  el.classList.add('flash');
}

// ════════════════════════════════════════════════════════
// §10. INIT
// ════════════════════════════════════════════════════════

(function initMacroEngine() {
  function tryInit() {
    // Tunggu dashboard ada di DOM
    const dash = document.getElementById('dashboard-page');
    if (!dash) { setTimeout(tryInit, 500); return; }

    // Inject widget
    _injectMacroWidget();

    // Fetch pertama
    fetchExchangeRate().then(ok => {
      if (ok) _flashRateWidget();
    });

    // Fetch berkala tiap 5 menit
    setInterval(async () => {
      const prevRate = macroState.usdIdr;
      await fetchExchangeRate();
      if (macroState.usdIdr !== prevRate) _flashRateWidget();
    }, MACRO.FETCH_INTERVAL);

    // Juga fetch ulang saat tab kembali aktif (user buka tab lagi setelah lama)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const stale = Date.now() - macroState.lastFetch > MACRO.FETCH_INTERVAL;
        if (stale) fetchExchangeRate();
      }
    });

    console.log('✅ [MacroEngine] Initialized — fetching USD/IDR real-time');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 1000));
  } else {
    setTimeout(tryInit, 1000);
  }
})();

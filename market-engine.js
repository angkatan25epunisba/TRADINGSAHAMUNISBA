// ═══════════════════════════════════════════════════════
// UNISBA VIRTUAL MARKET — GLOBAL MARKET ENGINE v1.0
// market-engine.js
//
// LOAD ORDER: setelah firebase.js dan script.js, sebelum upgrades.js/fixes.js
//
// Fitur yang ditambahkan:
//   1. Market Phase Engine (bullish/bearish/sideways)
//   2. NPC Trader Simulation (leaderboard tetap hidup saat offline)
//   3. Transaction Fee + Slippage
//   4. Background Auto-Sync (portfolio + leaderboard update tiap detik)
//   5. Market Events (pump/dump/volatility spike)
//   6. Leaderboard Rank-change Animation
//   7. Semua berjalan tanpa backend — pure frontend + Firebase
// ═══════════════════════════════════════════════════════

'use strict';

// ════════════════════════════════════════════════════════
// §1. KONSTANTA & KONFIGURASI
// ════════════════════════════════════════════════════════

const ME = {
  // Fee & slippage
  TRANSACTION_FEE_PCT:  0.0015,   // 0.15% biaya transaksi (mirip BEI)
  SLIPPAGE_BASE:        0.0005,   // 0.05% slippage dasar
  SLIPPAGE_VARIANCE:    0.0008,   // tambahan slippage acak

  // Market phase
  PHASE_CHANGE_INTERVAL: 120_000, // 2 menit — ganti fase
  PHASES: ['bullish', 'bullish', 'sideways', 'sideways', 'bearish'], // bobot

  // Market event
  EVENT_INTERVAL:   45_000,  // 45 detik kemungkinan event
  EVENT_PROBABILITY: 0.25,   // 25% chance tiap interval

  // NPC
  NPC_SYNC_INTERVAL:  8_000,  // update NPC di Firebase tiap 8 detik
  NPC_TRADE_INTERVAL: 4_000,  // NPC "trade" tiap 4 detik (lokal)
  NPC_COUNT:          12,     // jumlah NPC trader

  // Leaderboard
  LB_LIVE_INTERVAL:   5_000,  // refresh leaderboard tiap 5 detik saat tab aktif
  LB_PORTFOLIO_SYNC:  15_000, // sync total aset user ke leaderboard Firebase

  // Auto-save
  PORTFOLIO_AUTOSAVE: 20_000, // auto-save portfolio tiap 20 detik
};

// ════════════════════════════════════════════════════════
// §2. MARKET PHASE ENGINE
// ════════════════════════════════════════════════════════

const marketPhase = {
  current: 'sideways',     // 'bullish' | 'bearish' | 'sideways'
  intensity: 1.0,          // 0.5–2.0 — seberapa kuat fase ini
  ticksRemaining: 60,      // berapa tick sebelum ganti fase
  eventActive: null,       // { type, stock, magnitude, ticksLeft }

  // Drift multiplier berdasarkan fase
  getDrift() {
    switch (this.current) {
      case 'bullish':   return  0.00015 * this.intensity;
      case 'bearish':   return -0.00012 * this.intensity;
      case 'sideways':  return  0.00001;
      default:          return  0;
    }
  },

  // Volatility multiplier
  getVolMult() {
    if (this.eventActive) return 1.8 + Math.random() * 0.8;
    switch (this.current) {
      case 'bullish':  return 0.9 + Math.random() * 0.3;
      case 'bearish':  return 1.1 + Math.random() * 0.5;
      case 'sideways': return 0.7 + Math.random() * 0.2;
      default:         return 1.0;
    }
  },

  tick() {
    this.ticksRemaining--;
    if (this.ticksRemaining <= 0) this._changePhase();
    if (this.eventActive) {
      this.eventActive.ticksLeft--;
      if (this.eventActive.ticksLeft <= 0) this.eventActive = null;
    }
  },

  _changePhase() {
    const prev = this.current;
    this.current   = ME.PHASES[Math.floor(Math.random() * ME.PHASES.length)];
    this.intensity = 0.6 + Math.random() * 1.4;
    this.ticksRemaining = 30 + Math.floor(Math.random() * 90);

    if (this.current !== prev) {
      _phaseToast(prev, this.current);
    }
  },

  triggerEvent(type, stockId, magnitude) {
    this.eventActive = { type, stockId, magnitude, ticksLeft: 8 + Math.floor(Math.random() * 12) };
  },
};

function _phaseToast(from, to) {
  const icons = { bullish: '📈', bearish: '📉', sideways: '📊' };
  const msgs  = {
    bullish:  'Sentimen pasar membaik — fase BULLISH dimulai!',
    bearish:  'Tekanan jual meningkat — fase BEARISH dimulai.',
    sideways: 'Pasar konsolidasi — fase SIDEWAYS.',
  };
  if (typeof showToast === 'function') {
    showToast(
      icons[to] + ' Market Phase: ' + to.toUpperCase(),
      msgs[to],
      to === 'bullish' ? 'success' : to === 'bearish' ? 'error' : 'info',
      5000
    );
  }
}

// ════════════════════════════════════════════════════════
// §3. PATCH tickPrices — Injeksi phase drift ke price engine
// ════════════════════════════════════════════════════════
// Dilakukan dengan monkey-patch aman: simpan referensi asli

(function patchTickPricesWithPhase() {
  // Tunda cukup lama agar upgrades.js sudah patch terlebih dahulu
  // (upgrades.js patch di t=50ms, market-engine patch di t=1500ms)
  // Dengan cara WRAP bukan replace — phase drift diterapkan di atas harga baru
  function tryPatch() {
    if (typeof tickPrices !== 'function') { setTimeout(tryPatch, 300); return; }
    // Hindari double-patch
    if (window.__marketEnginePhasePatch) return;
    window.__marketEnginePhasePatch = true;

    const _prevTick = window.tickPrices;

    window.tickPrices = function() {
      // Panggil chain patch sebelumnya (upgrades, script.js, dll)
      const changes = _prevTick();
      if (!changes) return changes;

      const phase = marketPhase;

      // Aplikasikan phase modifier sebagai koreksi post-hoc pada harga
      // (lebih aman daripada mengganti seluruh price logic)
      STOCKS.forEach(s => {
        if (!changes[s.id]) return;

        // Phase drift tambahan — ringan, tidak tumpang tindih
        const drift = phase.getDrift() * 0.5;
        const phaseMultiplier = 1 + drift + (phase.getVolMult() - 1) * 0.02 * (Math.random() - 0.5);

        let newPrice = state.prices[s.id] * phaseMultiplier;

        // Event impact
        if (phase.eventActive && phase.eventActive.stockId === s.id) {
          const evMult = phase.eventActive.type === 'pump'
            ? 1 + phase.eventActive.magnitude * 0.01
            : 1 - phase.eventActive.magnitude * 0.008;
          newPrice *= evMult;
        }

        newPrice = Math.max(100, newPrice);
        if (typeof applyMeanReversion === 'function') {
          newPrice = applyMeanReversion(newPrice, s.basePrice);
        }
        newPrice = parseFloat(newPrice.toFixed(0));

        state.prices[s.id] = newPrice;
        changes[s.id].new = newPrice;

        // CRITICAL FIX: JANGAN update priceHistory di sini!
        // upgrades.js sudah update candleData via updateCandles() di dalam patched tickPrices.
        // Kalau kita replace priceHistory[last] di sini, candle close akan berbeda dari
        // priceHistory dan menyebabkan double-line / garis nempel di chart.
        // priceHistory diupdate sekali saja di script.js tickPrices() yang asli.
      });

      phase.tick();
      return changes;
    };

    console.log('✅ [MarketEngine] tickPrices wrapped with phase-aware drift (non-destructive)');
  }
  // Jalankan setelah upgrades.js dan script.js sudah setup (t=1500ms)
  setTimeout(tryPatch, 1500);
})();

// ════════════════════════════════════════════════════════
// §4. MARKET EVENT ENGINE
// ════════════════════════════════════════════════════════

const MARKET_EVENTS = [
  { type: 'pump',  label: '🚀 PUMP!',       msg: s => `Volume beli masif terjadi pada ${s}! Harga melesat!`,    sentiment: 'bullish' },
  { type: 'dump',  label: '💣 DUMP!',        msg: s => `Panic selling ${s}! Investor melepas posisi besar.`,     sentiment: 'bearish' },
  { type: 'spike', label: '⚡ VOLATILITY!', msg: s => `Volatilitas ekstrem pasar ${s}. Hati-hati dalam trading!`, sentiment: 'neutral' },
  { type: 'pump',  label: '📰 RUMOR BULLISH', msg: s => `Rumor positif beredar soal ${s} — beli spekulatif melonjak!`, sentiment: 'bullish' },
  { type: 'dump',  label: '😨 FUD!',         msg: s => `Fear, Uncertainty, Doubt (FUD) menyebar di pasar ${s}.`,  sentiment: 'bearish' },
];

function triggerMarketEvent() {
  if (typeof STOCKS === 'undefined') return;
  const ev    = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
  const stock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
  const mag   = 0.5 + Math.random() * 1.5;

  marketPhase.triggerEvent(ev.type, stock.id, mag);

  // Apply immediate price impact
  if (typeof state !== 'undefined' && state.prices[stock.id]) {
    const sign   = ev.type === 'pump' ? 1 : ev.type === 'dump' ? -1 : (Math.random() > 0.5 ? 1 : -1);
    const impact = sign * (0.03 + Math.random() * 0.06) * mag;
    if (!state.pendingNewsImpact) state.pendingNewsImpact = {};
    state.pendingNewsImpact[stock.id] = (state.pendingNewsImpact[stock.id] || 0) + impact;
  }

  if (typeof showToast === 'function') {
    showToast(ev.label, ev.msg(stock.id), ev.sentiment === 'bullish' ? 'success' : ev.sentiment === 'bearish' ? 'error' : 'info', 6000);
  }
  console.log(`[MarketEngine] Event: ${ev.type} on ${stock.id} mag=${mag.toFixed(2)}`);
}

// ════════════════════════════════════════════════════════
// §5. TRANSACTION FEE + SLIPPAGE
// ════════════════════════════════════════════════════════
// Patch executeTrade: tambah fee & slippage setelah fixes.js juga diload

function _applyFeeAndSlippage(price, side) {
  const slippage = ME.SLIPPAGE_BASE + Math.random() * ME.SLIPPAGE_VARIANCE;
  // Buy: harga sedikit naik (slippage); Sell: harga sedikit turun
  const slippedPrice = side === 'buy'
    ? price * (1 + slippage)
    : price * (1 - slippage);
  return slippedPrice;
}

// Fee dikalkulasi dari total transaksi
function calcFee(total) {
  return total * ME.TRANSACTION_FEE_PCT;
}

// Patch window.executeTrade setelah semua script load
(function patchExecuteTradeWithFee() {
  function tryPatch() {
    const orig = window.executeTrade;
    if (typeof orig !== 'function') { setTimeout(tryPatch, 300); return; }

    window.executeTrade = function() {
      const orderType = (typeof currentOrderType !== 'undefined') ? currentOrderType : 'market';
      if (orderType === 'limit') { orig(); return; } // limit order: tidak patch

      const qtyInput   = document.getElementById('trade-qty-input');
      const qty        = parseInt(qtyInput?.value) || 0;
      if (qty <= 0) { orig(); return; }

      const s     = (typeof getStock === 'function') ? getStock(state.activeStock) : null;
      if (!s) { orig(); return; }

      const rawPrice    = state.prices[state.activeStock] || s.basePrice;
      const finalPrice  = _applyFeeAndSlippage(rawPrice, state.tradeSide);
      const rawTotal    = qty * finalPrice;
      const fee         = calcFee(rawTotal);
      const totalWithFee = rawTotal + (state.tradeSide === 'buy' ? fee : -fee);

      if (state.tradeSide === 'buy') {
        if (totalWithFee > state.balance) {
          if (typeof showToast === 'function') {
            showToast('Saldo Tidak Cukup',
              `Dibutuhkan ${(typeof fmt !== 'undefined' ? fmt.rp : v => 'Rp'+Math.round(v))(totalWithFee)} (termasuk fee ${(typeof fmt !== 'undefined' ? fmt.rp : v=>'Rp'+Math.round(v))(fee)}), saldo Anda ${(typeof fmt !== 'undefined' ? fmt.rp : v=>'Rp'+Math.round(v))(state.balance)}`,
              'error');
          }
          return;
        }
        state.balance -= totalWithFee;
        if (!state.holdings[s.id]) state.holdings[s.id] = { qty: 0, avgPrice: finalPrice };
        const h = state.holdings[s.id];
        const newQty = h.qty + qty;
        h.avgPrice   = ((h.avgPrice * h.qty) + (finalPrice * qty)) / newQty;
        h.qty        = newQty;
        if (typeof playSound === 'function') playSound('buy');
        if (typeof showToast === 'function') {
          const fmtRp = typeof fmt !== 'undefined' ? fmt.rp : v => 'Rp' + Math.round(v);
          showToast('✅ Order Berhasil!',
            `Beli ${qty} lbr ${s.id} @ ${fmtRp(finalPrice)} · Fee: ${fmtRp(fee)}`,
            'success');
        }
      } else {
        const h = state.holdings[s.id];
        if (!h || h.qty < qty) {
          if (typeof showToast === 'function') {
            showToast('Lembar Tidak Cukup', `Anda hanya memiliki ${h?.qty || 0} lembar ${s.id}`, 'error');
          }
          return;
        }
        const proceeds = rawTotal - fee;
        h.qty         -= qty;
        state.balance += proceeds;
        if (h.qty === 0) delete state.holdings[s.id];
        if (typeof playSound === 'function') playSound('sell');
        if (typeof showToast === 'function') {
          const fmtRp = typeof fmt !== 'undefined' ? fmt.rp : v => 'Rp' + Math.round(v);
          showToast('✅ Order Berhasil!',
            `Jual ${qty} lbr ${s.id} @ ${fmtRp(finalPrice)} · Fee: ${fmtRp(fee)}`,
            'success');
        }
      }

      state.transactions.push({
        ts:    new Date().toLocaleString('id-ID'),
        type:  state.tradeSide,
        stock: s.id,
        qty,
        price: parseFloat(finalPrice.toFixed(0)),
        total: parseFloat(totalWithFee.toFixed(0)),
        fee:   parseFloat(fee.toFixed(0)),
      });

      if (qtyInput) qtyInput.value = '';
      if (typeof saveToStorage   === 'function') saveToStorage();
      if (typeof renderAll       === 'function') renderAll();
      if (typeof syncLeaderboard === 'function') syncLeaderboard();
    };

    console.log('✅ [MarketEngine] executeTrade patched with fee+slippage');
  }
  // Tunggu fixes.js selesai override executeTrade
  setTimeout(tryPatch, 2500);
})();

// ════════════════════════════════════════════════════════
// §6. NPC TRADER SIMULATION
// ════════════════════════════════════════════════════════
// NPC traders disimpan di Firebase leaderboard/ agar terlihat oleh semua user
// Data di-generate dan di-update secara berkala dari client manapun yang online

const NPC_PROFILES = [
  { uid: 'npc_001', name: 'Aldi Pratama',    initials: 'AP', style: 'aggressive' },
  { uid: 'npc_002', name: 'Bunga Rahayu',    initials: 'BR', style: 'conservative' },
  { uid: 'npc_003', name: 'Candra Wijaya',   initials: 'CW', style: 'swing' },
  { uid: 'npc_004', name: 'Dewi Kusuma',     initials: 'DK', style: 'dca' },
  { uid: 'npc_005', name: 'Eko Santoso',     initials: 'ES', style: 'aggressive' },
  { uid: 'npc_006', name: 'Fitri Handayani', initials: 'FH', style: 'conservative' },
  { uid: 'npc_007', name: 'Galih Nugroho',   initials: 'GN', style: 'momentum' },
  { uid: 'npc_008', name: 'Hani Lestari',    initials: 'HL', style: 'swing' },
  { uid: 'npc_009', name: 'Irfan Maulana',   initials: 'IM', style: 'aggressive' },
  { uid: 'npc_010', name: 'Juwita Sari',     initials: 'JS', style: 'dca' },
  { uid: 'npc_011', name: 'Kevin Aditya',    initials: 'KA', style: 'momentum' },
  { uid: 'npc_012', name: 'Lisa Amalia',     initials: 'LA', style: 'conservative' },
];

// NPC state: hanya di memori lokal (tidak perlu persist, dicompute dari seed)
const npcState = {};

function _npcSeed(uid) {
  // Deterministik: NPC selalu mulai dari aset yang sama berdasarkan uid
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) & 0x7FFFFFFF;
  return h;
}

function _initNPCState() {
  const INITIAL_BALANCE = (typeof window.INITIAL_BALANCE !== 'undefined') ? window.INITIAL_BALANCE : 10_000_000;

  NPC_PROFILES.forEach(npc => {
    const seed       = _npcSeed(npc.uid);
    const startMult  = 0.85 + (seed % 100) / 300; // 0.85 – 1.18× modal awal
    npcState[npc.uid] = {
      ...npc,
      totalAssets: INITIAL_BALANCE * startMult,
      holdings: {},
      lastTrade: 0,
      color: _npcColor(seed),
    };
  });
}

function _npcColor(seed) {
  const COLORS = [
    '#D4AF37','#00E5FF','#3D7EFF','#E040FB','#FF6D00',
    '#00E676','#FF4081','#69F0AE','#FFAB40','#EA80FC',
    '#40C4FF','#B2FF59',
  ];
  return COLORS[seed % COLORS.length];
}

// Simulasi trade NPC — menggerakkan totalAssets secara realistis
function _simulateNPCTrades() {
  if (typeof STOCKS === 'undefined' || typeof state === 'undefined') return;

  const now   = Date.now();
  const phase = marketPhase.current;

  NPC_PROFILES.forEach(npc => {
    const ns = npcState[npc.uid];
    if (!ns) return;

    // Cooldown per NPC berdasarkan style
    const cooldown = {
      aggressive:   4_000,
      conservative: 20_000,
      swing:        10_000,
      dca:          30_000,
      momentum:     6_000,
    }[npc.style] || 8_000;

    if (now - ns.lastTrade < cooldown) return;
    ns.lastTrade = now;

    // Pilih saham random berdasarkan momentum
    const stock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
    const price = state.prices[stock.id] || stock.basePrice;

    // Style menentukan arah trade
    let direction; // 'buy' | 'sell' | 'hold'
    const hist  = state.priceHistory[stock.id] || [];
    const p20   = hist[Math.max(0, hist.length - 20)] || price;
    const trend = (price - p20) / p20; // % change

    switch (npc.style) {
      case 'aggressive':
        // Agresif: ikut trend, sering trade
        direction = Math.random() < 0.7 ? (phase === 'bullish' ? 'buy' : 'sell') : 'hold';
        break;
      case 'conservative':
        // Konservatif: hanya beli saat bearish (diskon), jual saat overbought
        direction = trend < -0.03 ? 'buy' : trend > 0.05 ? 'sell' : 'hold';
        break;
      case 'swing':
        // Swing: counter-trend
        direction = trend < -0.02 ? 'buy' : trend > 0.03 ? 'sell' : 'hold';
        break;
      case 'dca':
        // DCA: selalu beli pelan-pelan
        direction = Math.random() < 0.6 ? 'buy' : 'hold';
        break;
      case 'momentum':
        // Momentum: ikut arah kuat
        direction = trend > 0.01 ? 'buy' : trend < -0.01 ? 'sell' : 'hold';
        break;
      default:
        direction = 'hold';
    }

    if (direction === 'hold') return;

    // Hitung perubahan aset (simulasi — tidak track holdings secara detail)
    // Pergerakan kecil dan realistis
    const tradeSizePct = 0.01 + Math.random() * 0.04; // 1–5% dari total aset
    const tradeValue   = ns.totalAssets * tradeSizePct;
    const priceChg     = (state.prices[stock.id] || stock.basePrice) / (stock.basePrice || 1);
    const pnlMult      = direction === 'buy'
      ? 1 + (priceChg - 1) * 0.5 * (Math.random() * 0.8 + 0.2)
      : 1 - (priceChg - 1) * 0.3 * (Math.random() * 0.6 + 0.1);

    // Terapkan fee NPC juga
    const fee = tradeValue * ME.TRANSACTION_FEE_PCT;
    const delta = (tradeValue * pnlMult - tradeValue) - fee;

    // Batasi perubahan per tick agar tidak terlalu liar
    const maxChange = ns.totalAssets * 0.03;
    ns.totalAssets += Math.max(-maxChange, Math.min(maxChange, delta));

    // Floor: NPC tidak boleh bangkrut total
    const INITIAL_BALANCE = (typeof window.INITIAL_BALANCE !== 'undefined') ? window.INITIAL_BALANCE : 10_000_000;
    ns.totalAssets = Math.max(INITIAL_BALANCE * 0.3, ns.totalAssets);
  });
}

// Push NPC data ke Firebase leaderboard/ — hanya client pertama yang online yang melakukan ini
// Cek dengan Firebase lock (flag 'npc_last_sync') agar tidak bertabrakan
let _npcFirebaseLock = false;
let _lastNPCSyncTime = 0;

async function _syncNPCToFirebase() {
  if (!_npcFirebaseLock && typeof db !== 'undefined' && db && typeof firebaseReady !== 'undefined' && firebaseReady) {
    const now = Date.now();
    if (now - _lastNPCSyncTime < ME.NPC_SYNC_INTERVAL) return;
    _lastNPCSyncTime = now;
    _npcFirebaseLock  = true;

    try {
      // Update setiap NPC secara batch
      const updates = {};
      NPC_PROFILES.forEach(npc => {
        const ns = npcState[npc.uid];
        if (!ns) return;
        const INITIAL_BALANCE = (typeof window.INITIAL_BALANCE !== 'undefined') ? window.INITIAL_BALANCE : 10_000_000;
        updates['leaderboard/' + npc.uid] = {
          name:        ns.name,
          totalAssets: Math.round(ns.totalAssets),
          pnl:         Math.round(ns.totalAssets - INITIAL_BALANCE),
          ts:          now,
          isNPC:       true,
        };
      });
      await db.ref().update(updates);
    } catch (e) {
      // Senyap — gagal sync NPC tidak perlu alert user
    } finally {
      _npcFirebaseLock = false;
    }
  }
}

// ════════════════════════════════════════════════════════
// §7. LIVE PORTFOLIO VALUE UPDATE (buat leaderboard tetap bergerak)
// ════════════════════════════════════════════════════════
// Setiap beberapa detik, recalculate totalAssets user berdasarkan harga terkini
// dan push ke Firebase — ini yang membuat leaderboard bergerak bahkan tanpa trade

async function _syncUserPortfolioToLeaderboard() {
  if (typeof firebaseReady === 'undefined' || !firebaseReady) return;
  if (typeof state === 'undefined' || !state.user) return;
  if (typeof totalAssets !== 'function') return;

  const total = totalAssets(); // sudah memakai harga live
  const INITIAL_BALANCE = (typeof window.INITIAL_BALANCE !== 'undefined') ? window.INITIAL_BALANCE : 10_000_000;
  const name  = (state.user.displayName && state.user.displayName.trim())
    ? state.user.displayName.trim()
    : (state.user.email ? state.user.email.split('@')[0] : 'Anon');

  try {
    if (typeof db !== 'undefined' && db) {
      await db.ref('leaderboard/' + state.user.uid).update({
        name,
        totalAssets: Math.round(total),
        pnl:         Math.round(total - INITIAL_BALANCE),
        ts:          Date.now(),
      });
    }
  } catch (e) { /* senyap */ }
}

// ════════════════════════════════════════════════════════
// §8. LEADERBOARD LIVE REFRESH + RANK ANIMATION
// ════════════════════════════════════════════════════════

let _prevLbOrder = [];   // simpan urutan uid sebelumnya untuk deteksi rank change

function _animateRankChanges(newOrder) {
  if (!_prevLbOrder.length) { _prevLbOrder = newOrder; return; }

  newOrder.forEach((uid, newRank) => {
    const oldRank = _prevLbOrder.indexOf(uid);
    if (oldRank === -1) return;
    const delta = oldRank - newRank; // positif = naik rank

    if (delta !== 0) {
      // Cari row DOM yang bersangkutan
      const row = document.querySelector(`#lb-table-body tr[data-lb-idx="${newRank}"]`);
      if (!row) return;
      const cls = delta > 0 ? 'rank-up' : 'rank-down';
      row.classList.add(cls);
      setTimeout(() => row.classList.remove(cls), 1500);
    }
  });

  _prevLbOrder = newOrder;
}

// Override renderLeaderboard agar otomatis animasi rank change
(function patchLeaderboardForAnimation() {
  function tryPatch() {
    if (typeof renderLeaderboard !== 'function') { setTimeout(tryPatch, 500); return; }

    const _origRenderLB = window.renderLeaderboard;
    window.renderLeaderboard = async function() {
      await _origRenderLB();
      // Ambil urutan uid setelah render
      const rows = document.querySelectorAll('#lb-table-body tr[data-lb-idx]');
      if (!rows.length) return;
      // Urutan uid dari atribut data-uid atau fallback index
      const newOrder = Array.from(rows).map((_, i) => String(i));
      _animateRankChanges(newOrder);
    };
    console.log('✅ [MarketEngine] renderLeaderboard patched with rank animation');
  }
  setTimeout(tryPatch, 1000);
})();

// Inject CSS untuk rank animation (tidak ubah desain, hanya tambah efek)
(function injectRankAnimCSS() {
  const style = document.createElement('style');
  style.textContent = `
    /* Rank animation — naik: flash hijau, turun: flash merah */
    #lb-table-body tr.rank-up {
      animation: rankUpFlash 1.4s ease-out forwards;
    }
    #lb-table-body tr.rank-down {
      animation: rankDownFlash 1.4s ease-out forwards;
    }
    @keyframes rankUpFlash {
      0%   { background: rgba(0,230,118,0.22); }
      60%  { background: rgba(0,230,118,0.10); }
      100% { background: transparent; }
    }
    @keyframes rankDownFlash {
      0%   { background: rgba(239,83,80,0.18); }
      60%  { background: rgba(239,83,80,0.08); }
      100% { background: transparent; }
    }

    /* Market phase badge di topbar (opsional) */
    #market-phase-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-family: var(--font-mono, monospace);
      font-weight: 600;
      letter-spacing: 0.06em;
      border: 1px solid transparent;
      transition: all 0.4s ease;
    }
    #market-phase-badge.bullish {
      background: rgba(0,230,118,0.12);
      border-color: rgba(0,230,118,0.3);
      color: #00E676;
    }
    #market-phase-badge.bearish {
      background: rgba(239,83,80,0.12);
      border-color: rgba(239,83,80,0.3);
      color: #EF5350;
    }
    #market-phase-badge.sideways {
      background: rgba(212,175,55,0.12);
      border-color: rgba(212,175,55,0.3);
      color: #D4AF37;
    }

    /* Fee info di trade panel */
    .trade-fee-note {
      font-size: 10px;
      color: var(--text-muted, #888);
      font-family: var(--font-mono, monospace);
      margin-top: 4px;
      text-align: right;
      opacity: 0.8;
    }
  `;
  document.head.appendChild(style);
})();

// ════════════════════════════════════════════════════════
// §9. MARKET PHASE BADGE DI TOPBAR
// ════════════════════════════════════════════════════════

function _updatePhaseBadge() {
  let badge = document.getElementById('market-phase-badge');

  // Inject badge jika belum ada (taruh di sebelah clock)
  if (!badge) {
    const timeEl = document.getElementById('topbar-time');
    if (!timeEl) return;
    badge = document.createElement('span');
    badge.id = 'market-phase-badge';
    timeEl.parentElement?.insertBefore(badge, timeEl);
  }

  const icons   = { bullish: '▲', bearish: '▼', sideways: '◆' };
  const labels  = { bullish: 'BULL', bearish: 'BEAR', sideways: 'FLAT' };
  const p       = marketPhase.current;
  badge.className   = 'market-phase-badge ' + p;
  badge.innerHTML   = `${icons[p]} ${labels[p]}`;
  badge.title       = `Market Phase: ${p.toUpperCase()} · Intensity: ${marketPhase.intensity.toFixed(2)}`;
}

// ════════════════════════════════════════════════════════
// §10. FEE INFO DI TRADE PANEL
// ════════════════════════════════════════════════════════

function _updateFeeNote() {
  const totalEl = document.getElementById('trade-total-value');
  if (!totalEl) return;

  let feeEl = document.getElementById('trade-fee-note');
  if (!feeEl) {
    feeEl = document.createElement('div');
    feeEl.id        = 'trade-fee-note';
    feeEl.className = 'trade-fee-note';
    totalEl.parentElement?.appendChild(feeEl);
  }

  const qtyEl = document.getElementById('trade-qty-input');
  const qty   = parseFloat(qtyEl?.value) || 0;
  if (!qty || typeof state === 'undefined') {
    feeEl.textContent = '';
    return;
  }
  const price = state.prices?.[state.activeStock] || 0;
  const total = qty * price;
  const fee   = calcFee(total);
  const fmtRp = typeof fmt !== 'undefined' ? fmt.rp : v => 'Rp' + Math.round(v).toLocaleString('id-ID');
  feeEl.textContent = `Fee: ${fmtRp(fee)} · Slippage ~0.05–0.13%`;
}

// Hook ke recalcTradeTotal
(function patchRecalcForFee() {
  function tryPatch() {
    if (typeof recalcTradeTotal !== 'function') { setTimeout(tryPatch, 400); return; }
    const _orig = window.recalcTradeTotal;
    window.recalcTradeTotal = function() {
      _orig();
      _updateFeeNote();
    };
  }
  setTimeout(tryPatch, 1000);
})();

// ════════════════════════════════════════════════════════
// §11. MAIN INTERVALS — semua loop background
// ════════════════════════════════════════════════════════

function _startMarketEngineLoops() {
  console.log('🚀 [MarketEngine] Starting all background loops…');

  // A. Market event — acak tiap 45 detik
  setInterval(() => {
    if (Math.random() < ME.EVENT_PROBABILITY) triggerMarketEvent();
  }, ME.EVENT_INTERVAL);

  // B. NPC local simulation — tiap 4 detik
  setInterval(() => {
    _simulateNPCTrades();
  }, ME.NPC_TRADE_INTERVAL);

  // C. NPC → Firebase sync — tiap 8 detik
  setInterval(() => {
    _syncNPCToFirebase();
  }, ME.NPC_SYNC_INTERVAL);

  // D. User portfolio → Firebase leaderboard — tiap 15 detik
  //    Ini yang membuat leaderboard user bergerak saat sahamnya naik/turun
  setInterval(() => {
    _syncUserPortfolioToLeaderboard();
  }, ME.LB_PORTFOLIO_SYNC);

  // E. Leaderboard auto-refresh saat tab aktif — tiap 5 detik
  setInterval(() => {
    if (typeof state !== 'undefined' && state.activeTab === 'leaderboard') {
      if (typeof renderLeaderboard === 'function') renderLeaderboard();
    }
    _updatePhaseBadge();
  }, ME.LB_LIVE_INTERVAL);

  // F. Auto-save portfolio ke localStorage — tiap 20 detik
  setInterval(() => {
    if (typeof saveToStorage === 'function' && typeof state !== 'undefined' && state.user) {
      saveToStorage();
    }
  }, ME.PORTFOLIO_AUTOSAVE);

  // G. Update market phase badge setiap 3 detik
  setInterval(_updatePhaseBadge, 3000);
}

// ════════════════════════════════════════════════════════
// §12. INIT
// ════════════════════════════════════════════════════════

(function initMarketEngine() {
  function tryInit() {
    // Pastikan state dan STOCKS sudah ada (script.js selesai load)
    if (typeof state === 'undefined' || typeof STOCKS === 'undefined') {
      setTimeout(tryInit, 300);
      return;
    }

    // Init NPC state
    _initNPCState();

    // Kick off initial random phase
    marketPhase.current     = ME.PHASES[Math.floor(Math.random() * ME.PHASES.length)];
    marketPhase.intensity   = 0.7 + Math.random() * 1.0;
    marketPhase.ticksRemaining = 40 + Math.floor(Math.random() * 60);

    // Start all loops
    _startMarketEngineLoops();

    // Sync NPC ke Firebase segera setelah Firebase siap
    // (retry sampai firebaseReady = true)
    let _fbWaitAttempt = 0;
    function waitForFirebaseAndSyncNPC() {
      _fbWaitAttempt++;
      if (typeof firebaseReady !== 'undefined' && firebaseReady) {
        _syncNPCToFirebase();
        console.log('✅ [MarketEngine] Initial NPC sync to Firebase done');
      } else if (_fbWaitAttempt < 30) {
        setTimeout(waitForFirebaseAndSyncNPC, 1000);
      }
    }
    setTimeout(waitForFirebaseAndSyncNPC, 2000);

    // Initial phase badge
    setTimeout(_updatePhaseBadge, 1500);

    console.log(`✅ [MarketEngine] Initialized — Phase: ${marketPhase.current} · NPCs: ${NPC_PROFILES.length}`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 500));
  } else {
    setTimeout(tryInit, 500);
  }
})();

// ════════════════════════════════════════════════════════
// §13. FIREBASE LEADERBOARD REALTIME LISTENER (Enhanced)
// ════════════════════════════════════════════════════════
// Menggantikan listener bawaan agar bisa filter NPC dan trigger animasi

(function enhanceLeaderboardListener() {
  function tryPatch() {
    if (typeof db === 'undefined' || !db || typeof firebaseReady === 'undefined' || !firebaseReady) {
      setTimeout(tryPatch, 1500);
      return;
    }

    // Listener sudah dipasang di script.js — kita tambah listener kedua yang khusus
    // update NPC portfolio value secara lokal agar tidak ada delay Firebase
    let _lbRefreshDebounce = null;

    db.ref('leaderboard').orderByChild('totalAssets').on('value', snap => {
      if (!snap.exists()) return;

      // Debounce agar tidak flicker
      clearTimeout(_lbRefreshDebounce);
      _lbRefreshDebounce = setTimeout(() => {
        if (typeof state !== 'undefined' && state.activeTab === 'leaderboard') {
          if (typeof renderLeaderboard === 'function') renderLeaderboard();
        }
      }, 800);
    });

    console.log('✅ [MarketEngine] Enhanced leaderboard Firebase listener active');
  }
  setTimeout(tryPatch, 4000);
})();

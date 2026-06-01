// ═══════════════════════════════════════════════════════
// UNISBA VM — FIXES PATCH
// Perbaikan untuk:
//   1. Community Chat tidak muncul di akun lain (Firebase isMe bug)
//   2. Tombol Beli/Jual tidak ada efek (executeTrade override race)
//   3. Limit Order tidak tampil datanya
//   4. Kepemilikan Saham di menu Trading tidak muncul
//   5. Scroll horizontal grafik (scrollbar + tombol kiri/kanan)
// ═══════════════════════════════════════════════════════

'use strict';

// ─── 1. FIX COMMUNITY CHAT — isMe tidak boleh disimpan ke Firebase ──────────
// Masalah: field `isMe: true` ikut tersimpan ke Firebase → semua user
//          melihat post orang lain sebagai "is-me" (tidak muncul / styling salah)
// Fix: strip isMe dari data yang dikirim ke Firebase, tentukan isMe saat render

(function fixCommunity() {
  // Override saveCommunityPost agar tidak menyimpan field isMe ke Firebase
  window.saveCommunityPost = function(post) {
    // Pisahkan isMe dari data yang dikirim
    const { isMe: _isMe, ...postForFirebase } = post;

    const ref = _communityRef();
    if (ref) {
      return ref.push(postForFirebase).catch(e => {
        console.warn('Community Firebase save error:', e);
        communityPosts.unshift({ ...post, _fbKey: 'local_' + Date.now() });
        localStorage.setItem('uvm_community', JSON.stringify(communityPosts.slice(0, 50)));
        renderCommunityFeed();
      });
    } else {
      communityPosts.unshift({ ...post, _fbKey: 'local_' + Date.now() });
      localStorage.setItem('uvm_community', JSON.stringify(communityPosts.slice(0, 50)));
      renderCommunityFeed();
    }
  };

  // Override renderCommunityFeed agar isMe ditentukan dari uid user saat ini,
  // bukan dari field yang tersimpan di Firebase
  window.renderCommunityFeed = function() {
    const el = document.getElementById('community-feed');
    if (!el) return;

    const badge = document.getElementById('community-notif-badge');
    if (badge) badge.style.display = 'none';

    if (!_communityLoaded) {
      el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:12px">⏳ Memuat diskusi komunitas…</div>';
      return;
    }
    if (!communityPosts.length) {
      el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:12px">Belum ada post. Jadilah yang pertama!</div>';
      return;
    }

    const myUid = state.user?.uid || null;
    const myName = state.user?.displayName || state.user?.email?.split('@')[0] || null;

    el.innerHTML = communityPosts.slice(0, 30).map((p, idx) => {
      // isMe: cocokkan via uid (lebih akurat) atau nama jika uid tidak ada
      const isMe = myUid
        ? (p.uid === myUid)
        : (myName && p.author === myName);
      return `
        <div class="community-post ${isMe ? 'is-me' : ''}">
          <div class="post-avatar" style="background:${p.color}22;color:${p.color}">${p.avatar}</div>
          <div class="post-body">
            <div class="post-meta">
              <span class="post-author">${p.author}</span>
              ${p.stock ? `<span class="post-stock" onclick="selectStock('${p.stock}')">${p.stock}</span>` : ''}
              <span class="post-sentiment ${p.sentiment}">${p.sentiment === 'bullish' ? '▲ Bullish' : p.sentiment === 'bearish' ? '▼ Bearish' : '● Neutral'}</span>
              <span class="post-time">${p.ts}</span>
            </div>
            <div class="post-text">${p.text}</div>
            <div class="post-actions">
              <button onclick="likePost(${idx})" class="post-like-btn">♥ ${p.likes || 0}</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  // Override startCommunityListener agar renderCommunityFeed baru yang dipakai
  window.startCommunityListener = function() {
    const ref = _communityRef();
    if (!ref || window._communityListenerActiveFixed) return;
    window._communityListenerActiveFixed = true;
    try {
      ref.orderByChild('createdAt').limitToLast(30).on('value', snap => {
        if (!snap.exists()) return;
        const arr = [];
        snap.forEach(child => arr.push({ _fbKey: child.key, ...child.val() }));
        communityPosts = arr.reverse();
        if (state.activeTab === 'community') renderCommunityFeed();
        const badge = document.getElementById('community-notif-badge');
        if (badge && state.activeTab !== 'community') {
          badge.style.display = 'inline';
          badge.textContent = '●';
        }
      });
    } catch(e) { console.warn('Community listener error:', e); }
  };

  console.log('✅ Community fix applied');
})();


// ─── 2. FIX EXECUTETRADE — Pastikan market order selalu bekerja ──────────────
// Masalah: upgrades.js override executeTrade, tapi _origExecuteTrade bisa null
//          jika script.js belum selesai load → klik Beli/Jual tidak ada efek

(function fixExecuteTrade() {
  // Fungsi market order yang selalu benar
  function _doMarketOrder() {
    const qtyInput = document.getElementById('trade-qty-input');
    const qty = parseInt(qtyInput?.value) || 0;
    if (qty <= 0) { showToast('Perhatian', 'Masukkan jumlah lembar yang valid.', 'warning'); return; }

    const s = getStock(state.activeStock);
    const price = state.prices[state.activeStock] || s.basePrice;
    const total = qty * price;

    if (state.tradeSide === 'buy') {
      if (total > state.balance) {
        showToast('Saldo Tidak Cukup', `Dibutuhkan ${fmt.rp(total)}, saldo Anda ${fmt.rp(state.balance)}`, 'error');
        return;
      }
      state.balance -= total;
      if (!state.holdings[s.id]) state.holdings[s.id] = { qty: 0, avgPrice: price };
      const h = state.holdings[s.id];
      const newQty = h.qty + qty;
      h.avgPrice = ((h.avgPrice * h.qty) + (price * qty)) / newQty;
      h.qty = newQty;
      playSound('buy');
      showToast('✅ Order Berhasil!', `Beli ${qty} lembar ${s.id} @ ${fmt.rp(price)}`, 'success');
    } else {
      const h = state.holdings[s.id];
      if (!h || h.qty < qty) {
        showToast('Lembar Tidak Cukup', `Anda hanya memiliki ${h?.qty || 0} lembar ${s.id}`, 'error');
        return;
      }
      h.qty -= qty;
      state.balance += total;
      if (h.qty === 0) delete state.holdings[s.id];
      playSound('sell');
      showToast('✅ Order Berhasil!', `Jual ${qty} lembar ${s.id} @ ${fmt.rp(price)}`, 'success');
    }

    state.transactions.push({
      ts: new Date().toLocaleString('id-ID'),
      type: state.tradeSide,
      stock: s.id,
      qty, price, total,
    });

    if (qtyInput) qtyInput.value = '';
    saveToStorage();
    renderAll();
    renderLimitOrders();
    if (typeof syncLeaderboard === 'function') syncLeaderboard();
  }

  // Override executeTrade yang solid — cek currentOrderType dengan aman
  window.executeTrade = function() {
    const orderType = (typeof currentOrderType !== 'undefined') ? currentOrderType : 'market';

    if (orderType === 'limit') {
      const qtyInput = document.getElementById('trade-qty-input');
      const limitInput = document.getElementById('limit-price-input');
      const qty = parseInt(qtyInput?.value) || 0;
      const limitPrice = parseFloat(limitInput?.value) || 0;
      if (placeLimitOrder(state.tradeSide, state.activeStock, qty, limitPrice)) {
        if (qtyInput) qtyInput.value = '';
        if (limitInput) limitInput.value = '';
        renderLimitOrders();
      }
      return;
    }

    // Market order
    _doMarketOrder();
  };

  console.log('✅ ExecuteTrade fix applied');
})();


// ─── 3. FIX LIMIT ORDER — Data tidak muncul setelah dipasang ─────────────────
// Masalah: renderLimitOrders tidak terpanggil pada waktu yang tepat,
//          dan elemen #limit-orders-list mungkin belum ada saat injeksi terlambat

(function fixLimitOrders() {
  // Pastikan renderLimitOrders selalu dipanggil setelah renderAll
  const _origRenderAllForLimit = window.renderAll;
  window.renderAll = function() {
    if (_origRenderAllForLimit) _origRenderAllForLimit();
    renderLimitOrders();
    renderHoldingsMini();  // Fix #4: pastikan holdings mini juga update
  };

  // Re-inject limit price input jika belum ada, dengan delay lebih panjang
  function ensureLimitOrderUI() {
    const qtyRow = document.querySelector('.trade-form-row');
    if (!qtyRow) return;

    if (!document.getElementById('limit-price-row')) {
      const limitRow = document.createElement('div');
      limitRow.className = 'trade-form-row';
      limitRow.id = 'limit-price-row';
      limitRow.style.display = 'none';
      limitRow.innerHTML = `
        <div class="trade-form-label">
          <span>Harga Limit</span>
          <span class="trade-form-avail">Order tereksekusi saat harga tercapai</span>
        </div>
        <input type="number" class="trade-input" id="limit-price-input"
          placeholder="Masukkan harga limit" min="1" step="1" />
      `;
      qtyRow.parentElement.insertBefore(limitRow, qtyRow.nextSibling);
    }

    if (!document.querySelector('.order-type-btns')) {
      const tradeTabs = document.querySelector('.trade-tabs');
      if (tradeTabs) {
        const row = document.createElement('div');
        row.className = 'order-type-btns';
        row.innerHTML = `
          <button class="order-type-btn active" data-type="market" onclick="switchOrderType('market')">Market</button>
          <button class="order-type-btn" data-type="limit" onclick="switchOrderType('limit')">Limit</button>
        `;
        tradeTabs.parentElement.insertBefore(row, tradeTabs.nextSibling);
      }
    }

    renderLimitOrders();
  }

  setTimeout(ensureLimitOrderUI, 1500);
  setTimeout(ensureLimitOrderUI, 3000);

  console.log('✅ Limit order display fix applied');
})();


// ─── 4. FIX HOLDINGS MINI di tab Trading ─────────────────────────────────────
// Masalah: renderHoldingsMini tidak dipanggil setelah transaksi,
//          atau elemen belum ada. Patch renderAll sudah di atas (#3).

(function fixHoldingsMini() {
  // Pastikan renderHoldingsMini juga dipanggil saat tab trade aktif
  const _switchTabOrig = window.switchTab;
  window.switchTab = function(tab) {
    // ── FIX BUG MENU MENIMPA: reset SEMUA panel-view ke state bersih ──
    // Hapus semua inline style.display dan class active terlebih dahulu
    document.querySelectorAll('.panel-view').forEach(el => {
      el.style.display = '';
      el.classList.remove('active');
    });
    // Reset bank-nav-tab
    const bankNavTab = document.getElementById('bank-nav-tab');
    if (bankNavTab) bankNavTab.classList.remove('active');

    // Aktifkan view yang benar
    const targetView = document.getElementById(tab + '-view');
    if (targetView) targetView.classList.add('active');

    // Update nav-tab active state
    document.querySelectorAll('.nav-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    // Update state
    if (typeof state !== 'undefined') state.activeTab = tab;

    if (tab === 'trade') {
      if (typeof state !== 'undefined') {
        if (state.chart) {
          if (state.chart.destroy) state.chart.destroy();
          state.chart = null;
        }
      }
      if (typeof lineChartAnimId !== 'undefined' && lineChartAnimId) {
        cancelAnimationFrame(lineChartAnimId);
        window.lineChartAnimId = null;
      }
      setTimeout(() => {
        if (typeof initChart === 'function') initChart();
        if (typeof renderAll === 'function') renderAll();
        renderHoldingsMini();
        renderLimitOrders();
      }, 50);
    }
    if (tab === 'portfolio' && typeof renderPortfolio === 'function') renderPortfolio();
    if (tab === 'leaderboard' && typeof renderLeaderboard === 'function') renderLeaderboard();
    if (tab === 'berita' && typeof renderBeritaGrid === 'function') {
      setTimeout(() => { renderBeritaGrid(); if (typeof renderBeritaFilterBar === 'function') renderBeritaFilterBar(); }, 80);
    }

    if (tab === 'trade') {
      setTimeout(() => {
        renderHoldingsMini();
        renderLimitOrders();
      }, 200);
    }
  };

  console.log('✅ Holdings mini fix applied');
})();


// ─── 5. CHART SCROLL — Scrollbar horizontal + tombol kiri/kanan ──────────────
// Tambahkan scrollbar visual + tombol ◀ ▶ di bawah grafik untuk pan kiri/kanan

(function addChartScrollBar() {
  function injectChartScrollBar() {
    // Guard: jangan inject lebih dari sekali
    if (window.__chartScrollBarInjected) return;
    const chartWrap = document.querySelector('.chart-canvas-wrap');
    if (!chartWrap || document.getElementById('chart-hscroll-bar')) return;
    window.__chartScrollBarInjected = true;

    // Container scrollbar di bawah chart
    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'chart-hscroll-bar';
    scrollContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      background: var(--bg-deep);
      border-top: 1px solid var(--border-subtle);
      user-select: none;
    `;

    scrollContainer.innerHTML = `
      <!-- Tombol kiri -->
      <button id="chart-scroll-left" title="Geser ke kiri" style="
        width: 26px; height: 22px;
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 12px;
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
      ">◀</button>

      <!-- Track scrollbar -->
      <div id="chart-scroll-track" style="
        flex: 1;
        height: 10px;
        background: rgba(255,255,255,0.04);
        border-radius: 5px;
        position: relative;
        cursor: pointer;
        border: 1px solid var(--border-subtle);
        overflow: hidden;
      ">
        <div id="chart-scroll-thumb" style="
          position: absolute;
          top: 1px;
          height: 8px;
          background: linear-gradient(90deg, var(--gold-dim), rgba(212,175,55,0.4));
          border-radius: 4px;
          cursor: grab;
          min-width: 30px;
          transition: background 0.15s;
        "></div>
      </div>

      <!-- Tombol kanan -->
      <button id="chart-scroll-right" title="Geser ke kanan" style="
        width: 26px; height: 22px;
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 12px;
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
      ">▶</button>

      <!-- Label posisi -->
      <div id="chart-scroll-label" style="
        font-family: var(--font-mono);
        font-size: 9px;
        color: var(--text-muted);
        white-space: nowrap;
        min-width: 48px;
        text-align: right;
      ">Live</div>
    `;

    // Insert tepat setelah chart canvas wrap
    chartWrap.insertAdjacentElement('afterend', scrollContainer);

    // ── Logic scroll ──
    const STEP = 5; // bars per klik

    function getMaxPan() {
      const tf = candleState.timeframe;
      const key = state.activeStock + '_' + tf;
      const total = (candleData[key] || []).length;
      return Math.max(0, total - 20);
    }

    function panChart(delta) {
      const maxPan = getMaxPan();
      candleState.panOffset = Math.max(0, Math.min(maxPan, candleState.panOffset + delta));
      updateScrollThumb();
      drawCandleChart();
    }

    function updateScrollThumb() {
      const track = document.getElementById('chart-scroll-track');
      const thumb = document.getElementById('chart-scroll-thumb');
      const label = document.getElementById('chart-scroll-label');
      if (!track || !thumb) return;

      const maxPan = getMaxPan();
      const trackW = track.clientWidth;

      if (maxPan <= 0) {
        // Tidak bisa di-pan → thumb full width
        thumb.style.left = '1px';
        thumb.style.width = (trackW - 2) + 'px';
        if (label) label.textContent = 'Live';
        return;
      }

      // Thumb size proporsional dengan visible vs total
      const tf = candleState.timeframe;
      const key = state.activeStock + '_' + tf;
      const total = (candleData[key] || []).length;
      const visible = candleState.zoomBars;
      const ratio = Math.min(1, visible / total);
      const thumbW = Math.max(30, trackW * ratio);

      // posisi: panOffset=0 → thumb di kanan (live), panOffset=maxPan → thumb di kiri
      const panRatio = candleState.panOffset / maxPan;   // 0=live, 1=paling kiri
      const maxLeft = trackW - thumbW - 2;
      const left = maxLeft * (1 - panRatio); // kiri = terlama, kanan = terbaru

      thumb.style.width = thumbW + 'px';
      thumb.style.left = Math.max(1, left) + 'px';

      if (label) {
        label.textContent = candleState.panOffset === 0
          ? 'Live'
          : '-' + candleState.panOffset + 'b';
      }
    }

    // Tombol kiri → geser ke kiri (lihat lebih lama)
    document.getElementById('chart-scroll-left')?.addEventListener('click', () => panChart(+STEP));

    // Tombol kanan → geser ke kanan (kembali ke live)
    document.getElementById('chart-scroll-right')?.addEventListener('click', () => panChart(-STEP));

    // Hover effect buttons
    ['chart-scroll-left', 'chart-scroll-right'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = 'var(--gold-dim)';
        btn.style.color = 'var(--gold)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = 'var(--border-subtle)';
        btn.style.color = 'var(--text-muted)';
      });
    });

    // Drag scrollbar thumb
    const track = document.getElementById('chart-scroll-track');
    const thumb = document.getElementById('chart-scroll-thumb');
    let isDraggingThumb = false;
    let thumbDragStartX = 0;
    let thumbDragStartPan = 0;

    thumb.addEventListener('mousedown', e => {
      isDraggingThumb = true;
      thumbDragStartX = e.clientX;
      thumbDragStartPan = candleState.panOffset;
      thumb.style.cursor = 'grabbing';
      thumb.style.background = 'linear-gradient(90deg, var(--gold), rgba(212,175,55,0.7))';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isDraggingThumb) return;
      const trackRect = track.getBoundingClientRect();
      const thumbW = thumb.offsetWidth;
      const trackUsable = trackRect.width - thumbW - 2;
      if (trackUsable <= 0) return;

      const dx = thumbDragStartX - e.clientX;  // drag kiri = tambah offset (lihat lebih lama)
      const maxPan = getMaxPan();
      const panPerPx = maxPan / trackUsable;
      const newPan = Math.round(thumbDragStartPan + dx * panPerPx);
      candleState.panOffset = Math.max(0, Math.min(maxPan, newPan));
      updateScrollThumb();
      drawCandleChart();
    });

    document.addEventListener('mouseup', () => {
      if (isDraggingThumb) {
        isDraggingThumb = false;
        thumb.style.cursor = 'grab';
        thumb.style.background = 'linear-gradient(90deg, var(--gold-dim), rgba(212,175,55,0.4))';
      }
    });

    // Klik langsung di track (bukan thumb) → jump ke posisi itu
    track.addEventListener('click', e => {
      if (e.target === thumb) return;
      const rect = track.getBoundingClientRect();
      const thumbW = thumb.offsetWidth;
      const trackUsable = rect.width - thumbW - 2;
      const clickX = e.clientX - rect.left - thumbW / 2;
      const ratio = 1 - Math.max(0, Math.min(1, clickX / trackUsable));
      const maxPan = getMaxPan();
      candleState.panOffset = Math.round(ratio * maxPan);
      updateScrollThumb();
      drawCandleChart();
    });

    // Touch support for scrollbar
    thumb.addEventListener('touchstart', e => {
      isDraggingThumb = true;
      thumbDragStartX = e.touches[0].clientX;
      thumbDragStartPan = candleState.panOffset;
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (!isDraggingThumb) return;
      const trackRect = track.getBoundingClientRect();
      const thumbW = thumb.offsetWidth;
      const trackUsable = trackRect.width - thumbW - 2;
      if (trackUsable <= 0) return;

      const dx = thumbDragStartX - e.touches[0].clientX;
      const maxPan = getMaxPan();
      const panPerPx = maxPan / trackUsable;
      candleState.panOffset = Math.max(0, Math.min(maxPan, Math.round(thumbDragStartPan + dx * panPerPx)));
      updateScrollThumb();
      drawCandleChart();
    }, { passive: true });

    document.addEventListener('touchend', () => { isDraggingThumb = false; });

    // Patch drawCandleChart agar setiap render juga update thumb
    const _origDrawCandle = window.drawCandleChart;
    window.drawCandleChart = function() {
      _origDrawCandle();
      updateScrollThumb();
    };

    // Patch switchTimeframe agar thumb reset
    const _origSwitchTF = window.switchTimeframe;
    window.switchTimeframe = function(tf) {
      _origSwitchTF(tf);
      updateScrollThumb();
    };

    // Initial update
    updateScrollThumb();
    console.log('✅ Chart scrollbar injected');
  }

  // Coba inject setelah DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectChartScrollBar, 1200));
  } else {
    setTimeout(injectChartScrollBar, 1200);
  }
  // Fallback
  setTimeout(injectChartScrollBar, 2500);
  setTimeout(injectChartScrollBar, 4000);

})();


// ─── 6. FIX: Pastikan Firebase db siap sebelum community listener diaktifkan ──
// Masalah: _communityRef() mengembalikan null jika dipanggil sebelum Firebase init

(function fixCommunityFirebaseReady() {
  let _retryCount = 0;
  function tryStartListener() {
    _retryCount++;
    const ref = (typeof db !== 'undefined' && db) ? db.ref('community') : null;
    if (ref) {
      loadCommunityPosts();
      startCommunityListener();
      console.log('✅ Community listener started (attempt ' + _retryCount + ')');
    } else if (_retryCount < 10) {
      setTimeout(tryStartListener, 1000);
    }
  }
  setTimeout(tryStartListener, 3000);
})();


// ─── 7. FIX: Sync holdings ke Firebase setelah trade ────────────────────────
// Pastikan holdings tersimpan dan tampil setelah beli/jual
(function fixPostTradeSave() {
  // Monitor tombol submit
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('trade-submit-btn');
    if (btn) {
      // Tambahkan visual feedback
      const originalText = btn.textContent;
      const _origClick = btn.onclick;
      btn.addEventListener('click', () => {
        // Flash button sebagai feedback
        btn.style.opacity = '0.7';
        setTimeout(() => { btn.style.opacity = '1'; }, 200);
        // Render ulang setelah trade
        setTimeout(() => {
          renderHoldingsMini();
          renderLimitOrders();
          if (state.activeTab === 'portfolio') renderPortfolio();
        }, 100);
      });
    }
  });
})();

console.log('✅ All UNISBA VM fixes loaded successfully');

// ─── 8. MIGRASI OTOMATIS DATA LAMA DI LOCALSTORAGE ───────────────────────────
// Jalankan migrasi sekali setelah semua modul siap (3 detik setelah load)
// Mengkonversi key holdings lama ('BBRI.JK', 'BBRI', 'ARTO', dst) → code baru
(function autoMigrateLegacyHoldings() {
  setTimeout(() => {
    if (typeof _migrateBankHoldings === 'function') {
      _migrateBankHoldings();
    }
  }, 3500);

  // Juga patch loadFromStorage agar migrasi otomatis saat data dimuat dari Firebase/localStorage
  const _origLoadFromStorage = window.loadFromStorage;
  if (_origLoadFromStorage) {
    window.loadFromStorage = function(data) {
      _origLoadFromStorage(data);
      // Jalankan migrasi setelah data dimuat
      setTimeout(() => {
        if (typeof _migrateBankHoldings === 'function') _migrateBankHoldings();
      }, 500);
    };
  }

  console.log('✅ Auto-migration hook installed');
})();

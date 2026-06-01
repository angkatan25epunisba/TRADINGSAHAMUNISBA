// ═══════════════════════════════════════════════════════
// FIX PATCH 2 — BERITA KEUANGAN ENGINE
// fix-berita.js
//
// CARA PAKAI:
//   Tambahkan tag <script src="fix-berita.js"></script>
//   setelah <script src="berita-engine.js"></script>
//   dan setelah <script src="real-market.js"></script>
//
// MASALAH YANG DIPERBAIKI:
//   1. Klik berita → hanya buka homepage sumber, bukan artikel
//   2. Berita real dari real-market.js (RSS dengan URL valid) tidak muncul
//      di tab "Berita Keuangan"
//   3. Source URL map tidak lengkap → beberapa kartu klik ke halaman salah
//   4. Template sentiment {sentNFP}, {sentMSCI}, dll tidak ter-resolve
//   5. Auto-deduplicate berdasarkan URL + judul
// ═══════════════════════════════════════════════════════

'use strict';

(function patchBeritaEngine() {

  // ── 1. FIX: Source URL map yang lebih baik ──────────────────────────────
  // SEBELUM: URL mengarah ke homepage / section umum → user bingung
  // SESUDAH: URL mengarah ke halaman search/news yang lebih relevan

  // Map ini digunakan oleh renderBeritaGrid() saat kartu berita diklik
  // Akan di-override setelah berita-engine.js load
  window._BERITA_SRC_URLS_FIXED = {
    'CNBC Indonesia':         'https://www.cnbcindonesia.com/market',
    'Bloomberg':              'https://www.bloomberg.com/markets',
    'Reuters':                'https://www.reuters.com/markets/',
    'Bank Indonesia':         'https://www.bi.go.id/id/publikasi/laporan/Pages/default.aspx',
    'BPS':                    'https://www.bps.go.id/pressrelease.html',
    'BPS / Reuters':          'https://www.bps.go.id/pressrelease.html',
    'OJK':                    'https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Default.aspx',
    'OJK / Bloomberg':        'https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Default.aspx',
    'OJK / BI':               'https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Default.aspx',
    'Kemenkeu':               'https://www.kemenkeu.go.id/informasi-publik/siaran-pers/',
    'IMF / Bloomberg':        'https://www.imf.org/en/News',
    'S&P Global / Bloomberg': 'https://www.spglobal.com/marketintelligence/en/mi/research-analysis/insight.html',
    'NBS / Bloomberg':        'https://www.bloomberg.com/markets/asia',
    'BLS / Reuters':          'https://www.bls.gov/news.release/empsit.nr0.htm',
    'TechCrunch':             'https://techcrunch.com/category/fintech/',
    'default':                'https://news.google.com/search?q=ekonomi+indonesia+saham&hl=id&gl=ID',
  };

  // ── 2. FIX: renderBeritaGrid — gunakan URL yang tepat + tambahkan real news ──
  // SEBELUM: SRC_URLS di dalam closure, tidak bisa di-override dari luar
  // SESUDAH: patch fungsi renderBeritaGrid setelah berita-engine.js load

  function patchRenderBeritaGrid() {
    if (typeof renderBeritaGrid === 'undefined') {
      setTimeout(patchRenderBeritaGrid, 300);
      return;
    }

    const _origRenderBeritaGrid = window.renderBeritaGrid;

    window.renderBeritaGrid = function renderBeritaGridFixed() {
      const grid = document.getElementById('berita-grid');
      if (!grid) return;

      // Merge berita real dari real-market.js ke dalam beritaList
      _mergeRealNewsIntoBeritaList();

      // Filter list
      const activeFilter = typeof beritaActiveFilter !== 'undefined' ? beritaActiveFilter : 'Semua';
      const filtered = activeFilter === 'Semua'
        ? beritaList
        : beritaList.filter(b => b.cat === activeFilter);

      if (!filtered.length) {
        grid.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);grid-column:1/-1">Tidak ada berita untuk kategori ini.</div>';
        return;
      }

      const sentColors = {
        bullish: { border: 'rgba(0,230,118,0.3)',  tag: '#00E676', tagBg: 'rgba(0,230,118,0.12)', icon: '▲' },
        bearish: { border: 'rgba(239,83,80,0.3)',   tag: '#EF5350', tagBg: 'rgba(239,83,80,0.12)', icon: '▼' },
        neutral: { border: 'rgba(212,175,55,0.2)',  tag: '#D4AF37', tagBg: 'rgba(212,175,55,0.1)', icon: '●' },
      };

      const srcIcons = {
        'CNBC Indonesia': '📺', 'Bloomberg': '📊', 'Reuters': '📰',
        'Bank Indonesia': '🏦', 'BPS': '📈', 'OJK': '🔒',
        'Kemenkeu': '🏛️', 'IMF / Bloomberg': '🌐', 'TechCrunch': '💻',
        'Google News': '🔍', 'Kompas': '📰', 'Kontan': '💹', 'Bisnis Indonesia': '📊',
        'Detik Finance': '💻', 'Tempo': '📰', 'Investor Daily': '📈',
      };

      const SRC_URLS = window._BERITA_SRC_URLS_FIXED;

      const DISPLAY_MAX = typeof BERITA_CFG !== 'undefined' ? BERITA_CFG.DISPLAY_PER_PAGE : 30;

      grid.innerHTML = filtered.slice(0, DISPLAY_MAX).map(b => {
        const sc = sentColors[b.sentiment] || sentColors.neutral;
        const srcIcon = srcIcons[b.src] || '📄';
        const isNew = b.isNew;
        const isReal = b._isReal; // flag untuk berita dari RSS real

        // CRITICAL FIX: gunakan URL artikel yang valid jika tersedia
        // Berita real (dari RSS) punya b.url yang valid
        // Berita template punya URL dari SRC_URLS map (search page, bukan homepage)
        let clickUrl;
        if (isReal && b.url && b.url.startsWith('http')) {
          // Berita real dari RSS — URL artikel asli
          clickUrl = b.url;
        } else {
          // Berita template — buka halaman search/news sumber
          // Gunakan Google News search dengan judul sebagai query untuk hasil lebih relevan
          const encodedTitle = encodeURIComponent((b.text || '').slice(0, 80));
          const srcUrl = SRC_URLS[b.src] || SRC_URLS['default'];

          // Untuk beberapa sumber, buat search query yang lebih relevan
          if (b.src === 'Bloomberg') {
            clickUrl = `https://www.bloomberg.com/search?query=${encodedTitle}`;
          } else if (b.src === 'Reuters') {
            clickUrl = `https://www.reuters.com/search/news?blob=${encodedTitle}`;
          } else if (b.src === 'CNBC Indonesia') {
            clickUrl = `https://www.cnbcindonesia.com/search?q=${encodedTitle}`;
          } else if (b.src === 'Bank Indonesia') {
            clickUrl = 'https://www.bi.go.id/id/publikasi/laporan/Pages/default.aspx';
          } else {
            // Fallback: Google News search dengan judul — hampir pasti akan menemukan artikel relevan
            clickUrl = `https://news.google.com/search?q=${encodedTitle}&hl=id&gl=ID&ceid=ID:id`;
          }
        }

        return `
          <a href="${clickUrl}"
             target="_blank"
             rel="noopener noreferrer"
             style="
               background:var(--bg-card);
               border:1px solid ${sc.border};
               border-radius:14px;
               padding:16px;
               position:relative;
               transition:transform 0.15s,border-color 0.15s,box-shadow 0.15s;
               display:flex;flex-direction:column;min-height:160px;
               text-decoration:none;color:inherit;cursor:pointer;
               ${isNew ? 'animation:beritaFadeIn 0.4s ease-out;' : ''}
             "
             onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.4)'"
             onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'"
          >
            ${isNew ? '<div style="position:absolute;top:10px;right:10px;font-family:var(--font-mono);font-size:8px;font-weight:700;color:var(--green);background:rgba(0,230,118,0.12);border:1px solid rgba(0,230,118,0.3);border-radius:100px;padding:1px 6px;letter-spacing:0.1em">NEW</div>' : ''}
            ${isReal ? '<div style="position:absolute;top:10px;left:10px;font-family:var(--font-mono);font-size:8px;font-weight:700;color:var(--cyan);background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.25);border-radius:100px;padding:1px 6px">✅ REAL</div>' : ''}
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;${isReal ? 'margin-top:16px;' : ''}">
              <span style="
                font-family:var(--font-mono);font-size:9px;font-weight:700;
                padding:2px 8px;border-radius:100px;
                background:${sc.tagBg};color:${sc.tag};border:1px solid ${sc.border};
                letter-spacing:0.08em;
              ">${sc.icon} ${(b.sentiment || 'neutral').toUpperCase()}</span>
              <span style="
                font-family:var(--font-mono);font-size:9px;
                padding:2px 8px;border-radius:100px;
                background:rgba(255,255,255,0.04);color:var(--text-muted);border:1px solid var(--border-subtle);
              ">${b.cat}</span>
            </div>
            <div style="font-size:13px;font-weight:500;color:var(--text-primary);line-height:1.55;margin-bottom:10px">${b.text || b.title || ''}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto">
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${srcIcon} ${b.src}</div>
              <div style="display:flex;align-items:center;gap:6px">
                <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">${b.ts}</div>
                <div style="font-family:var(--font-mono);font-size:8px;color:${isReal ? 'var(--cyan)' : 'var(--gold)'};border:1px solid ${isReal ? 'rgba(0,229,255,0.3)' : 'rgba(212,175,55,0.3)'};border-radius:4px;padding:1px 5px">${isReal ? '↗ Baca Artikel' : '↗ Lihat Sumber'}</div>
              </div>
            </div>
          </a>
        `;
      }).join('');

      beritaList.forEach(b => b.isNew = false);
      if (typeof renderBeritaFilterBar === 'function') renderBeritaFilterBar();
    };

    console.log('✅ [fix-berita] renderBeritaGrid patched — berita sekarang membuka artikel/search yang relevan');
  }

  // ── 3. FIX: Merge berita real (dari RSS) ke beritaList ──────────────────
  // SEBELUM: berita RSS tersimpan di realMarketState.realNews, tidak tampil di tab Berita
  // SESUDAH: setiap berita real di-merge ke beritaList dengan flag _isReal

  window._mergeRealNewsIntoBeritaList = function() {
    if (typeof realMarketState === 'undefined') return;
    if (!realMarketState.realNews || !realMarketState.realNews.length) return;
    if (typeof beritaList === 'undefined') return;

    // Set URL yang sudah ada di beritaList
    const existingUrls = new Set(beritaList.map(b => b.url || '').filter(Boolean));
    const existingTexts = new Set(beritaList.map(b => b.text || b.title || ''));

    let added = 0;
    realMarketState.realNews.forEach(item => {
      if (!item.title || !item.url) return;

      // Skip duplikat
      if (existingUrls.has(item.url)) return;
      if (existingTexts.has(item.title)) return;

      // Konversi format real news ke format berita-engine
      const beritaItem = {
        id:         'real_' + (item.url || Date.now()).replace(/[^a-z0-9]/gi, '_').slice(0, 30),
        text:       item.title,
        title:      item.title,
        url:        item.url,
        cat:        _mapRealNewsCat(item),
        sentiment:  item.sentiment || 'neutral',
        src:        item.source || 'Google News',
        impact:     item.impact || 0.2,
        ts:         item.publishedAt
          ? new Date(item.publishedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        tsMs:       item.publishedAt ? new Date(item.publishedAt).getTime() : Date.now(),
        isNew:      false,
        _isReal:    true,  // flag: ini berita real dengan URL artikel
      };

      existingUrls.add(item.url);
      existingTexts.add(item.title);
      beritaList.push(beritaItem);
      added++;
    });

    if (added > 0) {
      // Sort: terbaru dulu
      beritaList.sort((a, b) => (b.tsMs || 0) - (a.tsMs || 0));
      // Trim
      if (beritaList.length > 80) beritaList = beritaList.slice(0, 80);
    }
  };

  function _mapRealNewsCat(item) {
    const text = (item.title || '').toLowerCase();
    if (text.includes('bank') || text.includes('perbankan')) return 'Perbankan';
    if (text.includes('ihsg') || text.includes('saham')) return 'IHSG';
    if (text.includes('rupiah') || text.includes('kurs') || text.includes('usd')) return 'Rupiah';
    if (text.includes('inflasi') || text.includes('cpi')) return 'Inflasi';
    if (text.includes('suku bunga') || text.includes('bi rate')) return 'Suku Bunga';
    if (text.includes('minyak') || text.includes('emas') || text.includes('nikel')) return 'Komoditas';
    if (text.includes('ojk') || text.includes('kemenkeu') || text.includes('apbn')) return 'Ekonomi';
    if (text.includes('bi') || text.includes('bank indonesia')) return 'BI';
    return 'Ekonomi';
  }

  // ── 4. FIX: Auto-merge setiap kali real news di-fetch ──────────────────
  // Patch fetchRealIndonesiaNews agar setelah selesai, merge ke beritaList
  function patchRealNewsFetch() {
    if (typeof fetchRealIndonesiaNews === 'undefined') {
      setTimeout(patchRealNewsFetch, 500);
      return;
    }
    if (window._realNewsFetchPatched) return;
    window._realNewsFetchPatched = true;

    const _origFetch = window.fetchRealIndonesiaNews;
    window.fetchRealIndonesiaNews = async function() {
      const result = await _origFetch.apply(this, arguments);
      // Setelah fetch selesai, merge ke beritaList
      if (typeof beritaList !== 'undefined') {
        _mergeRealNewsIntoBeritaList();
        // Re-render jika tab berita aktif
        if (typeof state !== 'undefined' && state.activeTab === 'berita') {
          if (typeof renderBeritaGrid === 'function') renderBeritaGrid();
        }
      }
      return result;
    };
    console.log('✅ [fix-berita] fetchRealIndonesiaNews patched — berita real akan masuk tab Berita Keuangan');
  }

  // ── 5. FIX: Template sentiment yang tidak ter-resolve ──────────────────
  // Patch _fillTemplate agar semua {sentXxx} yang hilang ter-handle
  function patchFillTemplate() {
    if (typeof _fillTemplate === 'undefined') {
      setTimeout(patchFillTemplate, 300);
      return;
    }
    if (window._fillTemplatePatchApplied) return;
    window._fillTemplatePatchApplied = true;

    const _origFillTemplate = window._fillTemplate;
    window._fillTemplate = function(tpl, sentimentRef) {
      let result = _origFillTemplate.apply(this, arguments);

      // CRITICAL FIX: ganti semua placeholder {sentXxx} yang mungkin masih tersisa
      // Ini terjadi karena beberapa sentiment key tidak dimasukkan ke replacements object
      const SENTIMENT_FALLBACKS = {
        '{sentFed}':     ['bullish', 'neutral', 'bullish'][Math.floor(Math.random() * 3)],
        '{sentWS}':      Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentOil}':     Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentDxy}':     Math.random() > 0.5 ? 'bearish' : 'neutral',
        '{sentGold}':    Math.random() > 0.5 ? 'bullish' : 'neutral',
        '{sentIhsg}':    Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentRp}':      Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentInfl}':    Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentCad}':     Math.random() > 0.5 ? 'bullish' : 'neutral',
        '{sentBank}':    Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentSaham}':   Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentCN}':      Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentInflUS}':  Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentNFP}':     Math.random() > 0.5 ? 'bullish' : 'neutral',
        '{sentIMF}':     Math.random() > 0.5 ? 'bullish' : 'neutral',
        '{sentMSCI}':    Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentCoal}':    Math.random() > 0.5 ? 'bullish' : 'neutral',
        '{sentNi}':      Math.random() > 0.5 ? 'bullish' : 'neutral',
        '{sentTech}':    Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentPmi}':     Math.random() > 0.5 ? 'bullish' : 'bearish',
        '{sentConflict}':Math.random() > 0.5 ? 'bearish' : 'neutral',
      };

      // Ganti semua placeholder {sentXxx} yang belum terganti
      Object.entries(SENTIMENT_FALLBACKS).forEach(([key, val]) => {
        if (result.includes(key)) {
          result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
        }
      });

      // Ganti semua placeholder {xxx} yang masih tersisa dengan teks kosong
      // agar tidak ada teks template yang bocor ke UI
      result = result.replace(/\{[a-zA-Z0-9_]+\}/g, '');

      return result;
    };
    console.log('✅ [fix-berita] _fillTemplate patched — semua {sentXxx} placeholder akan ter-resolve');
  }

  // ── 6. FIX: Interval berita engine — pastikan tidak duplikat ──────────
  // SEBELUM: setInterval di scope module, bisa berlipat jika re-init
  // Patch sudah ada di berita-engine.js (window.__beritaLoopActive)
  // Tambahkan juga guard untuk addNewBerita yang lebih sering dipanggil

  function patchAddNewBerita() {
    if (typeof addNewBerita === 'undefined') {
      setTimeout(patchAddNewBerita, 300);
      return;
    }
    if (window._addNewBeritaPatched) return;
    window._addNewBeritaPatched = true;

    const _origAdd = window.addNewBerita;
    window.addNewBerita = function() {
      _origAdd.apply(this, arguments);
      // Juga merge berita real setelah tambah berita baru
      _mergeRealNewsIntoBeritaList();
    };
  }

  // ── 7. FIX: Auto-update sumber berita real setiap 5 menit ─────────────
  // Jadwalkan re-merge setiap 5 menit agar berita real terbaru masuk
  if (!window._beritaMergeInterval) {
    window._beritaMergeInterval = true;
    setInterval(() => {
      if (typeof beritaList !== 'undefined') {
        _mergeRealNewsIntoBeritaList();
        if (typeof state !== 'undefined' && state.activeTab === 'berita') {
          if (typeof renderBeritaGrid === 'function') renderBeritaGrid();
        }
      }
    }, 5 * 60 * 1000);
  }

  // ── Apply semua patches ──────────────────────────────────────────────
  // Jalankan setelah semua scripts load
  setTimeout(() => {
    patchRenderBeritaGrid();
    patchFillTemplate();
    patchRealNewsFetch();
    patchAddNewBerita();

    // Initial merge
    setTimeout(() => {
      if (typeof beritaList !== 'undefined') {
        _mergeRealNewsIntoBeritaList();
      }
    }, 4000); // tunggu real-market.js selesai fetch pertama kali
  }, 1500);

  console.log('✅ [fix-berita] Berita engine patches scheduled');
})();

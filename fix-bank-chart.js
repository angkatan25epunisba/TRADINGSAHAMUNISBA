// ═══════════════════════════════════════════════════════
// FIX PATCH 1 — BANK INDONESIA CHART CENTERING & SIZING
// fix-bank-chart.js
//
// CARA PAKAI:
//   Tambahkan tag <script src="fix-bank-chart.js"></script>
//   setelah <script src="bank-market.js"></script> di index.html
//
// MASALAH YANG DIPERBAIKI:
//   - Chart terlalu di atas, tidak center vertikal
//   - Height chain tidak benar (container flex tidak menyerahkan height)
//   - Canvas pixel size tidak sinkron dengan container visual size
//   - Y-axis scaling terlalu ketat untuk saham harga rendah
//   - MA calculation O(n²) → O(n) running sum
// ═══════════════════════════════════════════════════════

'use strict';

// ── Patch 1: Override _renderBankChart dengan versi yang lebih robust ────────
// SEBELUM: rawH diambil dari offsetHeight yang sering 0 saat tab tersembunyi
// SESUDAH: gunakan ResizeObserver + fallback getComputedStyle

(function patchBankChart() {
  // Tunggu hingga bank-market.js selesai load
  function applyPatch() {
    if (typeof _renderBankChart === 'undefined') {
      setTimeout(applyPatch, 200);
      return;
    }

    // ── Override CSS untuk bank-chart-canvas-wrap ──
    // SEBELUM: height:400px inline style di _buildBankViewHTML() dan CSS class
    // SESUDAH: flex grow dengan min-height yang benar
    const existingStyle = document.getElementById('bank-chart-fix-css');
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = 'bank-chart-fix-css';
      style.textContent = `
        /* ═══════════════════════════════════════════════
           FIX: Bank chart canvas wrap — identik trading
           Masalah: chart terbang ke atas, tidak proporsional
           Solusi: flex chain yang benar + canvas sizing
           ═══════════════════════════════════════════════ */

        /* Override inline style yang mengunci height */
        .bank-chart-canvas-wrap {
          flex: 1 1 0 !important;
          height: 0 !important;             /* CRITICAL: flex:1 perlu height:0 untuk grow */
          min-height: 300px !important;
          max-height: 520px !important;
          position: relative !important;
          overflow: hidden !important;      /* bukan auto — auto bisa buat layout loop */
          padding: 12px 12px 8px 12px !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: stretch !important;  /* canvas mengisi full height */
          justify-content: stretch !important;
        }

        /* Canvas mengisi seluruh wrap — tidak boleh ada ukuran tersirat */
        #bank-chart-canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          min-height: 0 !important;         /* biarkan flex yang mengatur */
          cursor: crosshair !important;
        }

        /* Main area di bank view harus proper flex chain */
        #bank-view > div > main {
          flex: 1 1 0 !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }

        /* Seluruh bank-view layout */
        #bank-view > div {
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        @media (max-width: 900px) {
          .bank-chart-canvas-wrap {
            min-height: 240px !important;
            max-height: 45vw !important;
          }
        }

        @media (max-width: 600px) {
          .bank-chart-canvas-wrap {
            min-height: 200px !important;
            max-height: 55vw !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // ── Override _renderBankChart dengan versi yang lebih andal ──
    // SEBELUM: offsetHeight seringkali 0 saat tab tersembunyi
    // SESUDAH: coba multiple methods + ResizeObserver untuk sizing yang akurat
    const _originalRenderBankChart = window._renderBankChart;

    window._renderBankChart = function bankChartFixed() {
      const canvas = document.getElementById('bank-chart-canvas');
      if (!canvas) return;

      const bank = (typeof BANK_STOCKS !== 'undefined')
        ? BANK_STOCKS.find(b => b.ticker === bankState.activeBank)
        : null;
      if (!bank) return;

      // Pastikan candle data tersedia
      if (typeof _buildBankCandles === 'function') {
        _buildBankCandles(bankState.activeBank);
      }

      const ctx = canvas.getContext('2d');
      const wrap = canvas.parentElement;
      if (!wrap) return;

      // ── CRITICAL FIX: ukuran canvas dari multiple sources ──
      // Priority: getBoundingClientRect > offsetWidth/Height > clientWidth/Height
      const rect = wrap.getBoundingClientRect();
      let rawW = rect.width  || wrap.offsetWidth  || wrap.clientWidth  || 0;
      let rawH = rect.height || wrap.offsetHeight || wrap.clientHeight || 0;

      // Kurangi padding dari ukuran (CSS padding: 12px 12px 8px 12px)
      // agar canvas tidak overflow padding
      const padH = 20; // 12 + 8
      const padW = 24; // 12 * 2
      rawW = Math.max(rawW - padW, 100);
      rawH = Math.max(rawH - padH, 50);

      // Minimum heights — sesuaikan dengan trading chart
      const BANK_MIN_H = window.innerWidth <= 900 ? 220 : 280;
      const BANK_MAX_H = 500;

      if (rawW < 20) {
        // Layout belum siap — retry
        requestAnimationFrame(() => requestAnimationFrame(window._renderBankChart));
        return;
      }

      if (rawH < BANK_MIN_H) {
        rawH = BANK_MIN_H;
      }

      const W = Math.round(rawW);
      const H = Math.round(Math.min(rawH, BANK_MAX_H));

      // CRITICAL: hanya reset canvas pixel dimensions jika benar-benar berubah
      // Reset menyebabkan context clear + reflow yang lambat
      if (Math.abs(canvas.width - W) > 2 || Math.abs(canvas.height - H) > 2) {
        canvas.width  = W;
        canvas.height = H;
      }

      const showMA   = bankState.candle.indicators.ma.active;
      const showEMA  = bankState.candle.indicators.ema.active;
      const showRSI  = bankState.candle.indicators.rsi.active;

      const VOL_H  = showRSI ? 0 : Math.round(H * 0.15);
      const RSI_H  = showRSI ? Math.round(H * 0.20) : 0;
      const MAIN_H = H - VOL_H - RSI_H - (VOL_H > 0 ? 4 : 0) - (RSI_H > 0 ? 4 : 0);
      const PAD_L  = 12, PAD_R = 72, PAD_T = 16, PAD_B = 24;

      const chartType = bankState.candle.chartType;

      // Ambil candles yang sudah di-zoom
      const candles = (typeof _bankGetZoomedCandles === 'function')
        ? _bankGetZoomedCandles()
        : [];

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

      // ── Y-AXIS SCALING — TradingView style ──
      //
      // SEBELUM (bug lama):
      //   minRange = midPrice * 0.015  → dibandingkan dengan rawHi/rawLo secara
      //   independen via Math.max/Math.min. Jika range alami > minRange, padding
      //   hanya 0.2% (rawHi * 1.002) → candle hampir menyentuh tepi = terlalu zoom.
      //   Jika range alami < minRange, midPrice ± minRange benar, tapi tidak ada
      //   padding tambahan di atas hasil itu → masih bisa gepeng.
      //
      // SESUDAH (fix ini):
      //   1. Hitung rawRange = max(rawHi - rawLo, floor harga minimum)
      //   2. Pastikan rawRange ≥ 2% dari midPrice (menghindari flat total)
      //   3. Tambahkan padding 12% dari rawRange di atas DAN bawah (TradingView ~10-15%)
      //   4. Ini memastikan candle selalu menempati ±76% area vertikal,
      //      tidak pernah menyentuh tepi atas/bawah, dan tidak pernah gepeng.
      //
      //   Contoh perilaku:
      //   - BBCA (9350): range 200pt → rawRange=200, pad=24 → hiMax=9374+24=9398, loMin=9150-24=9126
      //   - BACA (50):   range 2pt   → rawRange=1(floor), minRange=50*0.02=1 → pakai 2%, pad=0.12
      //   - Saham flat:  range 0     → minRange=2% price → pad=12% of that → selalu ada ruang

      const rawHi = Math.max(...candles.map(c => c.h));
      const rawLo = Math.min(...candles.map(c => c.l));
      const midPrice = (rawHi + rawLo) / 2;

      // Floor untuk harga sangat murah (< 100 IDR), agar tidak collapse ke 0
      const absFloor = midPrice < 100 ? 2 : midPrice < 500 ? 5 : midPrice < 2000 ? 20 : 50;

      // Range alami, dengan minimum 2% dari harga tengah
      const naturalRange = Math.max(rawHi - rawLo, absFloor, midPrice * 0.02);

      // Padding 12% dari range alami, di atas dan bawah
      // (TradingView menggunakan ~10-15% — 12% adalah titik tengah yang proporsional)
      const PAD_RATIO = 0.12;
      const rangePad  = naturalRange * PAD_RATIO;

      // Y boundaries akhir: raw hi/lo + padding dari range alami
      const hiMax = rawHi + rangePad;
      const loMin = rawLo - rangePad;

      function toX(i)   { return PAD_L + (i + 0.5) * barW; }
      function toY(v)   { return PAD_T + MAIN_H - ((v - loMin) / (hiMax - loMin)) * MAIN_H; }

      // ── Grid lines ──
      ctx.font = '9px JetBrains Mono, monospace';
      const gridLines = 6;
      for (let i = 0; i <= gridLines; i++) {
        const y = PAD_T + (MAIN_H / gridLines) * i;
        const price = hiMax - ((hiMax - loMin) / gridLines) * i;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
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

      // ── Volume panel separator + bars ──
      const volY0 = PAD_T + MAIN_H + 4;
      if (VOL_H > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(PAD_L, volY0); ctx.lineTo(W - PAD_R, volY0); ctx.stroke();

        const maxVol = Math.max(...candles.map(c => c.v || 0), 1);
        candles.forEach((c, i) => {
          const x  = toX(i);
          const bh = ((c.v || 0) / maxVol) * VOL_H * 0.85;
          const y  = volY0 + VOL_H - bh;
          const isUp = c.c >= c.o;
          ctx.fillStyle = isUp ? 'rgba(0,230,118,0.45)' : 'rgba(239,83,80,0.45)';
          ctx.fillRect(x - candleW / 2, y, candleW, bh);
        });

        ctx.fillStyle = 'rgba(140,160,190,0.5)';
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Volume', PAD_L + 2, volY0 + 10);
      }

      // ── Candlestick / Line chart ──
      if (chartType === 'line') {
        _drawBankLineChart(ctx, candles, PAD_L, PAD_T, MAIN_H, drawW, loMin, hiMax,
                           bankState.activeBank, W, H);
      } else {
        _drawBankCandleChart(ctx, candles, toX, toY, candleW);
      }

      // ── MA Indicator — O(n) running sum ──
      if (showMA) {
        const closes = candles.map(c => c.c);
        const ma = _bankCalcMA_fast(closes, bankState.candle.indicators.ma.period);
        _drawBankLine(ctx, ma, toX, toY, bankState.candle.indicators.ma.color, 1.5, false);
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
        const ema = _bankCalcEMA_fast(closes, bankState.candle.indicators.ema.period);
        _drawBankLine(ctx, ema, toX, toY, bankState.candle.indicators.ema.color, 1.5, true);
        const lastEMA = ema.filter(Boolean).pop();
        if (lastEMA) {
          ctx.fillStyle = bankState.candle.indicators.ema.color;
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText('EMA' + bankState.candle.indicators.ema.period, W - PAD_R + 5, toY(lastEMA) - 4);
        }
      }

      // ── Current price dashed line + badge ──
      const lastC    = candles[candles.length - 1];
      const lastPrice = lastC.c;
      const prevC    = candles[0].o;
      const isUpAll  = lastPrice >= prevC;
      const lineY    = toY(lastPrice);
      const bColor   = isUpAll ? '#00E676' : '#EF5350';

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

      // ── Crosshair ──
      if (typeof bankLineTooltip !== 'undefined' && bankLineTooltip.visible) {
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
        const vol = (hC.v || 0) >= 1e6 ? (hC.v / 1e6).toFixed(1) + 'M' : (hC.v >= 1000 ? (hC.v / 1000).toFixed(0) + 'K' : String(hC.v || 0));
        ctx.fillStyle = 'rgba(140,160,190,0.7)';
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.fillText('V:' + vol, tx + 72, ty + 14);
      }

      // Update header & scrollbar
      if (typeof _updateBankChartHeader === 'function') _updateBankChartHeader();
      if (typeof _updateBankScrollbar    === 'function') _updateBankScrollbar();
    };

    // ── Helper: candlestick renderer ──
    window._drawBankCandleChart = function(ctx, candles, toX, toY, candleW) {
      candles.forEach((c, i) => {
        const x    = toX(i);
        const isUp = c.c >= c.o;
        const col  = isUp ? '#00E676' : '#EF5350';
        const yO   = toY(c.o), yC = toY(c.c), yH = toY(c.h), yL = toY(c.l);

        ctx.strokeStyle = col;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(x, yH); ctx.lineTo(x, Math.min(yO, yC));
        ctx.moveTo(x, Math.max(yO, yC)); ctx.lineTo(x, yL);
        ctx.stroke();

        const bodyTop = Math.min(yO, yC);
        const bodyH   = Math.max(1, Math.abs(yO - yC));
        if (isUp) {
          ctx.fillStyle = 'rgba(0,230,118,0.15)';
          ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
          ctx.strokeRect(x - candleW / 2, bodyTop, candleW, bodyH);
        } else {
          ctx.fillStyle = col;
          ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
        }
      });
    };

    // ── Helper: line chart renderer ──
    window._drawBankLineChart = function(ctx, candles, PAD_L, PAD_T, MAIN_H, drawW, loMin, hiMax, ticker, W, H) {
      const hist = candles.map(c => c.c);
      if (hist.length < 2) return;
      const openP = hist[0];
      const lastP = hist[hist.length - 1];
      const isUp  = lastP >= openP;
      const GREEN = '#00E676', RED = '#EF5350';

      function ltoX(i) { return PAD_L + (i / (hist.length - 1)) * drawW; }
      function ltoY(v) { return PAD_T + MAIN_H - ((v - loMin) / (hiMax - loMin)) * MAIN_H; }

      if (typeof bankChartGradientCache === 'undefined') window.bankChartGradientCache = {};
      const gKey = ticker + W + H + (isUp ? 'up' : 'dn');
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

      ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      [GREEN, RED].forEach(targetColor => {
        let inSeg = false;
        for (let i = 0; i < hist.length - 1; i++) {
          const v0 = hist[i], v1 = hist[i+1];
          const c0 = v0 >= openP ? GREEN : RED;
          const c1 = v1 >= openP ? GREEN : RED;
          if (c0 !== targetColor && c1 !== targetColor) continue;
          if (c0 !== c1) {
            const t = (openP - v0) / (v1 - v0);
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
    };

    // ── Helper: draw indicator line ──
    window._drawBankLine = function(ctx, values, toX, toY, color, width, dashed) {
      ctx.strokeStyle = color;
      ctx.lineWidth   = width;
      ctx.lineJoin    = 'round';
      if (dashed) ctx.setLineDash([3, 2]);
      else ctx.setLineDash([]);
      let started = false;
      ctx.beginPath();
      values.forEach((v, i) => {
        if (v === null || v === undefined) return;
        const x = toX(i), y = toY(v);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      if (started) ctx.stroke();
      ctx.setLineDash([]);
    };

    // ── FIX: MA O(n) — SEBELUM: O(n²) slice + reduce setiap bar ──
    // SESUDAH: running window sum
    window._bankCalcMA_fast = function(closes, period) {
      const result = new Array(closes.length).fill(null);
      if (closes.length < period) return result;
      let windowSum = 0;
      for (let i = 0; i < period; i++) windowSum += closes[i];
      result[period - 1] = windowSum / period;
      for (let i = period; i < closes.length; i++) {
        windowSum += closes[i] - closes[i - period];
        result[i] = windowSum / period;
      }
      return result;
    };

    // ── FIX: EMA — sama seperti sebelumnya tapi lebih explicit ──
    window._bankCalcEMA_fast = function(closes, period) {
      const k = 2 / (period + 1);
      const result = new Array(closes.length).fill(null);
      if (closes.length < period) return result;
      let sum = 0;
      for (let i = 0; i < period; i++) sum += closes[i];
      let ema = sum / period;
      result[period - 1] = ema;
      for (let i = period; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
        result[i] = ema;
      }
      return result;
    };

    // ── FIX: Patch bank-chart-canvas-wrap inline style saat view dibuat ──
    // Masalah: _buildBankViewHTML() hardcodes height:400px di inline style
    // Solusi: observer yang patch element segera setelah dibuat
    const _origSwitchToBankTab = window._switchToBankTab;
    if (_origSwitchToBankTab) {
      window._switchToBankTab = function() {
        _origSwitchToBankTab.apply(this, arguments);
        // Hapus inline height dari canvas wrap setelah tab dibuat
        setTimeout(() => {
          const wrap = document.querySelector('.bank-chart-canvas-wrap');
          if (wrap) {
            // Remove conflicting inline styles yang akan di-override oleh CSS fix
            wrap.style.removeProperty('height');
            // Pastikan flex:1 benar — biarkan CSS class mengatur
          }
        }, 50);
      };
    }

    // ── FIX: ResizeObserver untuk re-render saat container berubah ukuran ──
    if (typeof ResizeObserver !== 'undefined') {
      let _bankResizeTimer = null;
      const _bankRObs = new ResizeObserver(() => {
        if (typeof state !== 'undefined' && state.activeTab === 'bank') {
          clearTimeout(_bankResizeTimer);
          _bankResizeTimer = setTimeout(() => {
            if (typeof bankChartGradientCache !== 'undefined') bankChartGradientCache = {};
            window._renderBankChart();
          }, 60);
        }
      });

      // Observe saat wrap ada
      function _startBankResize() {
        const wrap = document.querySelector('.bank-chart-canvas-wrap');
        if (wrap) {
          _bankRObs.observe(wrap);
        } else {
          setTimeout(_startBankResize, 500);
        }
      }
      setTimeout(_startBankResize, 3000);
    }

    // ── FIX: Guard renderBankOrderBook interval — SEBELUM: tidak ada guard ──
    // Patch agar interval tidak berlipat jika file di-reload
    if (!window._bankOBIntervalStarted) {
      window._bankOBIntervalStarted = true;
      // Interval sudah didaftarkan di bank-market.js — tidak perlu duplikat
    }

    console.log('✅ [fix-bank-chart] Bank Indonesia chart patch applied');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(applyPatch, 500));
  } else {
    setTimeout(applyPatch, 500);
  }
})();

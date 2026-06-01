// ═══════════════════════════════════════════════════════
// UNISBA VM — PRO UPGRADE PATCH v2.0
// Candlestick Chart, Order Book, Price Alerts, 
// Limit Orders, Indicators, Community Feed
// ═══════════════════════════════════════════════════════

'use strict';

// ─── CANDLESTICK STATE ─────────────────────────────────
let candleState = {
  timeframe: '1m',      // 1m, 5m, 15m, 1h, 1d
  chartType: 'candle',  // 'candle' or 'line'
  indicators: {
    ma:   { active: true,  period: 20, color: '#D4AF37' },
    ema:  { active: true,  period: 9,  color: '#00E5FF' },
    rsi:  { active: false },
    macd: { active: false },
  },
  crosshairPrice: null,
  panOffset: 0,    // bars panned from right
  zoomBars: 80,    // how many bars to show
  isDragging: false,
  dragStartX: 0,
  dragStartPan: 0,
};

// ─── CANDLE DATA per stock per timeframe ───────────────
const candleData = {};   // { stockId_tf: [{t,o,h,l,c,v}...] }

// ─── TIMEFRAME INTERVAL MAP (ms per candle) ────────────
const TF_MS = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '1d': 86400000 };
const TF_CANDLES = { '1m': 120, '5m': 100, '15m': 80, '1h': 60, '1d': 50 };

// ─── BUILD INITIAL CANDLES from price history ──────────
function buildCandles(stockId, tf) {
  const key = stockId + '_' + tf;
  if (candleData[key] && candleData[key].length > 0) return;

  const stock = STOCKS.find(s => s.id === stockId);
  if (!stock) return;

  const tfMs = TF_MS[tf];
  const count = TF_CANDLES[tf];
  const now = Date.now();
  const candles = [];
  let price = stock.basePrice;

  for (let i = count; i >= 0; i--) {
    const t = now - i * tfMs;
    const open = price;
    const volatility = (STOCK_VOLATILITY[stockId] || 0.012) * Math.sqrt(tfMs / 2000);
    const moves = Math.max(4, Math.floor(tfMs / 2000));
    let high = open, low = open, close = open;
    let p = open;

    for (let j = 0; j < moves; j++) {
      p = p * Math.exp((0.00002 - 0.5 * volatility * volatility) + volatility * gaussianRandom(0, 1));
      p = Math.max(100, p);
      if (p > high) high = p;
      if (p < low)  low  = p;
      close = p;
    }

    candles.push({ t, o: open, h: high, l: low, c: close, v: Math.floor(Math.random() * 50000 + 5000) });
    price = close;
  }

  candleData[key] = candles;
}

// ─── UPDATE LAST CANDLE from live price tick ───────────
function updateCandles(stockId, newPrice) {
  const tf = candleState.timeframe;
  const key = stockId + '_' + tf;
  if (!candleData[key] || !candleData[key].length) return;

  const now = Date.now();
  const tfMs = TF_MS[tf];
  const last = candleData[key][candleData[key].length - 1];
  const barStart = Math.floor(now / tfMs) * tfMs;

  if (last.t < barStart) {
    // New candle — CRITICAL: hard limit candle count to prevent y-scale compression
    candleData[key].push({ t: barStart, o: newPrice, h: newPrice, l: newPrice, c: newPrice, v: 0 });
    // MAX = TF_CANDLES (not *2) — prevents too many points causing flat/compressed chart
    const maxCandles = TF_CANDLES[tf] || 80;
    while (candleData[key].length > maxCandles) candleData[key].shift();
  } else {
    // Update last candle
    if (newPrice > last.h) last.h = newPrice;
    if (newPrice < last.l) last.l = newPrice;
    last.c = newPrice;
    last.v += Math.floor(Math.random() * 200 + 50);
  }
}

// ─── CALCULATE INDICATORS ─────────────────────────────
function calcMA(closes, period) {
  const result = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result[i] = sum / period;
  }
  return result;
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const result = new Array(closes.length).fill(null);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = ema;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

function calcRSI(closes, period = 14) {
  const result = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return result;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result[i] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));
  }
  return result;
}

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] !== null && emaSlow[i] !== null ? emaFast[i] - emaSlow[i] : null);
  const validMacd = macdLine.filter(v => v !== null);
  const signalEma = calcEMA(validMacd, signal);
  const signalLine = new Array(closes.length).fill(null);
  let si = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] !== null) { signalLine[i] = signalEma[si]; si++; }
  }
  const histogram = macdLine.map((v, i) => v !== null && signalLine[i] !== null ? v - signalLine[i] : null);
  return { macdLine, signalLine, histogram };
}

// ─── PROFESSIONAL CANDLESTICK RENDERER ────────────────
function drawCandleChart() {
  const canvas = document.getElementById('main-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const tf = candleState.timeframe;
  const key = state.activeStock + '_' + tf;
  const candles = candleData[key];
  if (!candles || candles.length < 2) {
    // Draw placeholder
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = '13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Memuat data candlestick…', W / 2, H / 2);
    return;
  }

  const showRSI  = candleState.indicators.rsi.active;
  const showMACD = candleState.indicators.macd.active;

  // Panel heights
  const MAIN_H = showRSI || showMACD ? H * 0.6 : H;
  const SUB_H  = H - MAIN_H - 4;
  const PAD_L  = 12, PAD_R = 72, PAD_T = 16, PAD_B = 28;

  const panOffset  = Math.max(0, Math.min(candleState.panOffset, candles.length - 20));
  const visibleN   = Math.max(10, Math.min(candleState.zoomBars, candles.length));
  const startIdx   = Math.max(0, candles.length - visibleN - panOffset);
  const endIdx     = Math.max(startIdx + 2, candles.length - panOffset);
  const visible    = candles.slice(startIdx, endIdx);

  if (visible.length < 2) return;

  ctx.clearRect(0, 0, W, H);

  const drawW = W - PAD_L - PAD_R;
  const barW  = drawW / visible.length;
  const candleW = Math.max(1, Math.min(barW * 0.7, 20));

  // Y axis — CRITICAL FIX: ensure minimum range to prevent flat chart
  const rawHi = Math.max(...visible.map(c => c.h));
  const rawLo = Math.min(...visible.map(c => c.l));
  const midPrice = (rawHi + rawLo) / 2;
  const minRange = midPrice * 0.008; // at least 0.8% range — prevents flat line
  const hi = Math.max(rawHi * 1.001, midPrice + minRange);
  const lo = Math.min(rawLo * 0.999, midPrice - minRange);
  const toY = v => PAD_T + (MAIN_H - PAD_T - PAD_B) * (1 - (v - lo) / (hi - lo));
  const toX = i => PAD_L + (i + 0.5) * barW;

  // Grid lines
  const GRID_N = 7;
  ctx.font = '9px JetBrains Mono, monospace';
  for (let i = 0; i <= GRID_N; i++) {
    const y = PAD_T + ((MAIN_H - PAD_T - PAD_B) / GRID_N) * i;
    const v = hi - ((hi - lo) / GRID_N) * i;
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(140,160,190,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(v).toLocaleString('id-ID'), W - PAD_R + 5, y + 3.5);
  }

  // Time labels
  const tlStep = Math.max(1, Math.floor(visible.length / 6));
  ctx.fillStyle = 'rgba(100,120,150,0.7)';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  visible.forEach((c, i) => {
    if (i % tlStep !== 0) return;
    const d = new Date(c.t);
    const label = tf === '1d' ? d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
      : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(label, toX(i), MAIN_H - 8);
  });

  // Volume bars
  const maxVol = Math.max(...visible.map(c => c.v));
  const volH = (MAIN_H - PAD_T - PAD_B) * 0.12;
  visible.forEach((c, i) => {
    const x  = toX(i) - candleW / 2;
    const vh = (c.v / maxVol) * volH;
    ctx.fillStyle = c.c >= c.o ? 'rgba(0,230,118,0.15)' : 'rgba(239,83,80,0.15)';
    ctx.fillRect(x, MAIN_H - PAD_B - vh, candleW, vh);
  });

  // ── Helper: draw smooth indicator line with bezier curves ──
  function drawSmoothLine(vals, toXFn, toYFn) {
    // Kumpulkan titik yang valid dulu
    const pts = [];
    vals.forEach((v, i) => { if (v !== null) pts.push({ x: toXFn(i), y: toYFn(v) }); });
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      // Catmull-Rom tension 0.35 — sangat smooth
      const cpx1 = prev.x + (curr.x - prev.x) * 0.35;
      const cpx2 = curr.x - (curr.x - prev.x) * 0.35;
      ctx.bezierCurveTo(cpx1, prev.y, cpx2, curr.y, curr.x, curr.y);
    }
    ctx.stroke();
  }

  // MA / EMA
  const closes = visible.map(c => c.c);
  if (candleState.indicators.ma.active) {
    const maVals = calcMA(closes, Math.min(candleState.indicators.ma.period, closes.length - 1));
    ctx.strokeStyle = candleState.indicators.ma.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    drawSmoothLine(maVals, toX, toY);
    ctx.stroke();
  }

  if (candleState.indicators.ema.active) {
    const emaVals = calcEMA(closes, Math.min(candleState.indicators.ema.period, closes.length - 1));
    ctx.strokeStyle = candleState.indicators.ema.color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash([3, 2]);
    drawSmoothLine(emaVals, toX, toY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Candlestick bodies
  visible.forEach((c, i) => {
    const x    = toX(i);
    const bull = c.c >= c.o;
    const bodyY = toY(Math.max(c.o, c.c));
    const bodyH = Math.max(1, Math.abs(toY(c.o) - toY(c.c)));
    const wickY1 = toY(c.h), wickY2 = toY(c.l);

    // Wick
    ctx.strokeStyle = bull ? 'rgba(0,230,118,0.8)' : 'rgba(239,83,80,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, wickY1);
    ctx.lineTo(x, wickY2);
    ctx.stroke();

    // Body
    const halfW = candleW / 2;
    ctx.fillStyle = bull ? 'rgba(0,230,118,0.85)' : 'rgba(239,83,80,0.85)';
    if (candleW < 3) {
      ctx.fillRect(x - 0.5, bodyY, 1, bodyH);
    } else {
      ctx.fillRect(x - halfW, bodyY, candleW, bodyH);
      ctx.strokeStyle = bull ? 'rgba(0,230,118,1)' : 'rgba(239,83,80,1)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x - halfW, bodyY, candleW, bodyH);
    }
  });

  // Current price line
  const lastC = visible[visible.length - 1];
  const lineY = toY(lastC.c);
  const bull = lastC.c >= lastC.o;
  ctx.strokeStyle = 'rgba(212,175,55,0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(PAD_L, lineY); ctx.lineTo(W - PAD_R, lineY); ctx.stroke();
  ctx.setLineDash([]);

  const badgeColor = bull ? '#00E676' : '#EF5350';
  const badgeW = 64, badgeH = 17;
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(W - PAD_R + 1, lineY - badgeH / 2, badgeW, badgeH, 3);
  else ctx.rect(W - PAD_R + 1, lineY - badgeH / 2, badgeW, badgeH);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = 'bold 8px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(lastC.c).toLocaleString('id-ID'), W - PAD_R + 1 + badgeW / 2, lineY + 3);

  // Crosshair
  if (candleState.crosshairX !== undefined && candleState.crosshairY !== undefined) {
    const cx = candleState.crosshairX, cy = candleState.crosshairY;
    if (cy < MAIN_H - PAD_B) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(cx, PAD_T); ctx.lineTo(cx, MAIN_H - PAD_B); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD_L, cy); ctx.lineTo(W - PAD_R, cy); ctx.stroke();
      ctx.setLineDash([]);

      // Price tag on Y axis
      const priceAtY = hi - ((cy - PAD_T) / (MAIN_H - PAD_T - PAD_B)) * (hi - lo);
      ctx.fillStyle = 'rgba(50,60,80,0.9)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(W - PAD_R + 1, cy - 8, 64, 16, 3);
      else ctx.rect(W - PAD_R + 1, cy - 8, 64, 16);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,220,255,0.9)';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(priceAtY).toLocaleString('id-ID'), W - PAD_R + 1 + 32, cy + 3);

      // Bar tooltip
      const hoverIdx = Math.round((cx - PAD_L) / barW - 0.5);
      const hc = visible[Math.max(0, Math.min(visible.length - 1, hoverIdx))];
      if (hc) {
        const d = new Date(hc.t);
        const timeStr = d.toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const bull = hc.c >= hc.o;
        const tw = 160, th = 80;
        let tx = cx + 14;
        if (tx + tw > W - PAD_R) tx = cx - tw - 14;
        const ty = Math.max(PAD_T, Math.min(MAIN_H - PAD_B - th, cy - th / 2));
        ctx.fillStyle = 'rgba(8,13,26,0.95)';
        ctx.strokeStyle = bull ? 'rgba(0,230,118,0.5)' : 'rgba(239,83,80,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(tx, ty, tw, th, 8);
        else ctx.rect(tx, ty, tw, th);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = 'rgba(100,120,150,0.8)';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(timeStr, tx + 10, ty + 16);

        const pairs = [['O', hc.o, 'var(--text-secondary)'], ['H', hc.h, '#00E676'], ['L', hc.l, '#EF5350'], ['C', hc.c, bull ? '#00E676' : '#EF5350']];
        pairs.forEach(([label, val, color], pi) => {
          ctx.fillStyle = 'rgba(120,140,160,0.7)';
          ctx.fillText(label, tx + 10 + pi * 37, ty + 34);
          ctx.fillStyle = color;
          ctx.fillText(Math.round(val).toLocaleString('id-ID'), tx + 10 + pi * 37, ty + 48);
        });

        const volStr = 'Vol: ' + (hc.v / 1000).toFixed(1) + 'K';
        ctx.fillStyle = 'rgba(100,120,150,0.7)';
        ctx.fillText(volStr, tx + 10, ty + 66);
      }
    }
  }

  // RSI Sub-panel
  if (showRSI && candles.length > 20) {
    drawRSIPanel(ctx, candles, startIdx, endIdx, W, H, MAIN_H, SUB_H, PAD_L, PAD_R, barW, toX);
  }

  // MACD Sub-panel  
  if (showMACD && candles.length > 30) {
    drawMACDPanel(ctx, candles, startIdx, endIdx, W, H, MAIN_H, SUB_H, PAD_L, PAD_R, barW, toX);
  }
}

function drawRSIPanel(ctx, candles, startIdx, endIdx, W, H, MAIN_H, SUB_H, PAD_L, PAD_R, barW, toX) {
  const visible = candles.slice(startIdx, endIdx);
  const allCloses = candles.map(c => c.c);
  const allRSI = calcRSI(allCloses, 14);
  const visRSI = allRSI.slice(startIdx, endIdx);

  const y0 = MAIN_H + 4;
  const drawH = SUB_H - 20;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(PAD_L, y0, W - PAD_L - PAD_R, drawH);

  // Label
  ctx.fillStyle = 'rgba(150,170,200,0.5)';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('RSI(14)', PAD_L + 4, y0 + 12);

  // Overbought/oversold lines
  [30, 50, 70].forEach(level => {
    const y = y0 + drawH * (1 - level / 100);
    ctx.strokeStyle = level === 50 ? 'rgba(255,255,255,0.08)' : level === 70 ? 'rgba(239,83,80,0.3)' : 'rgba(0,230,118,0.3)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = level === 70 ? 'rgba(239,83,80,0.6)' : level === 30 ? 'rgba(0,230,118,0.6)' : 'rgba(120,140,160,0.4)';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(level, W - PAD_R + 5, y + 3);
  });

  // RSI Line
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  let started = false;
  visRSI.forEach((v, i) => {
    if (v === null) return;
    const x = toX(i), y = y0 + drawH * (1 - v / 100);
    ctx.strokeStyle = v >= 70 ? '#EF5350' : v <= 30 ? '#00E676' : '#3D7EFF';
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawMACDPanel(ctx, candles, startIdx, endIdx, W, H, MAIN_H, SUB_H, PAD_L, PAD_R, barW, toX) {
  const visible = candles.slice(startIdx, endIdx);
  const allCloses = candles.map(c => c.c);
  const { macdLine, signalLine, histogram } = calcMACD(allCloses);
  const visMacd = macdLine.slice(startIdx, endIdx);
  const visSig  = signalLine.slice(startIdx, endIdx);
  const visHist = histogram.slice(startIdx, endIdx);

  const y0 = MAIN_H + 4;
  const drawH = SUB_H - 20;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(PAD_L, y0, W - PAD_L - PAD_R, drawH);

  ctx.fillStyle = 'rgba(150,170,200,0.5)';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('MACD(12,26,9)', PAD_L + 4, y0 + 12);

  const validVals = visHist.filter(v => v !== null);
  if (!validVals.length) return;
  const absMax = Math.max(...validVals.map(Math.abs), 0.001);
  const toMY = v => y0 + drawH * 0.5 - (v / absMax) * drawH * 0.45;

  // Zero line
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(PAD_L, y0 + drawH * 0.5); ctx.lineTo(W - PAD_R, y0 + drawH * 0.5); ctx.stroke();

  // Histogram
  const bw = Math.max(1, barW * 0.6);
  visHist.forEach((v, i) => {
    if (v === null) return;
    const x = toX(i), y = toMY(v), zeroY = toMY(0);
    ctx.fillStyle = v >= 0 ? 'rgba(0,230,118,0.5)' : 'rgba(239,83,80,0.5)';
    ctx.fillRect(x - bw / 2, Math.min(y, zeroY), bw, Math.abs(y - zeroY));
  });

  // MACD line
  ctx.strokeStyle = '#3D7EFF';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  let s1 = false;
  visMacd.forEach((v, i) => {
    if (v === null) return;
    const x = toX(i), y = toMY(v);
    if (!s1) { ctx.moveTo(x, y); s1 = true; } else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Signal line
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  let s2 = false;
  visSig.forEach((v, i) => {
    if (v === null) return;
    const x = toX(i), y = toMY(v);
    if (!s2) { ctx.moveTo(x, y); s2 = true; } else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

// ─── CHART INTERACTION ─────────────────────────────────
function initCandleInteraction() {
  const canvas = document.getElementById('main-chart');
  if (!canvas) return;

  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    candleState.crosshairX = (e.clientX - rect.left) * scaleX;
    candleState.crosshairY = (e.clientY - rect.top) * scaleY;
    if (candleState.isDragging) {
      const dx = e.clientX - candleState.dragStartX;
      const tf = candleState.timeframe;
      const key = state.activeStock + '_' + tf;
      const totalBars = (candleData[key] || []).length;
      const barPx = canvas.width / candleState.zoomBars;
      const deltaBars = Math.round(-dx / barPx);
      candleState.panOffset = Math.max(0, Math.min(totalBars - 20, candleState.dragStartPan + deltaBars));
    }
    drawCandleChart();
  };

  canvas.onmouseleave = () => {
    candleState.crosshairX = undefined;
    candleState.crosshairY = undefined;
    drawCandleChart();
  };

  canvas.onmousedown = e => {
    candleState.isDragging = true;
    candleState.dragStartX = e.clientX;
    candleState.dragStartPan = candleState.panOffset;
    canvas.style.cursor = 'grabbing';
  };

  canvas.onmouseup = () => {
    candleState.isDragging = false;
    canvas.style.cursor = 'crosshair';
  };

  // Smooth wheel zoom dengan debounce — tidak jerky
  let _wheelAccum = 0;
  let _wheelTimeout = null;
  canvas.onwheel = e => {
    e.preventDefault();
    e.stopPropagation();
    // Akumulasi delta wheel untuk smooth zoom
    _wheelAccum += e.deltaY;
    if (_wheelTimeout) clearTimeout(_wheelTimeout);
    _wheelTimeout = setTimeout(() => {
      const steps = Math.round(_wheelAccum / 50);  // 50px = 1 step zoom
      _wheelAccum = 0;
      if (steps !== 0) {
        const delta = steps > 0 ? Math.min(steps * 5, 30) : Math.max(steps * 5, -30);
        candleState.zoomBars = Math.max(10, Math.min(200, candleState.zoomBars + delta));
        drawCandleChart();
      }
    }, 30);
  };

  // Touch support
  let lastTouchX = 0, lastTouchDist = 0;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      lastTouchX = e.touches[0].clientX;
      candleState.dragStartPan = candleState.panOffset;
    } else if (e.touches.length === 2) {
      lastTouchDist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouchX;
      const barPx = canvas.width / candleState.zoomBars;
      const deltaBars = Math.round(-dx / barPx);
      const tf = candleState.timeframe;
      const key = state.activeStock + '_' + tf;
      const totalBars = (candleData[key] || []).length;
      candleState.panOffset = Math.max(0, Math.min(totalBars - 20, candleState.dragStartPan + deltaBars));
    } else if (e.touches.length === 2) {
      const dist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
      const ratio = lastTouchDist / dist;
      candleState.zoomBars = Math.max(10, Math.min(200, Math.round(candleState.zoomBars * ratio)));
      lastTouchDist = dist;
    }
    drawCandleChart();
  }, { passive: true });

  canvas.style.cursor = 'crosshair';
}

// ─── SWITCH TIMEFRAME ──────────────────────────────────
function switchTimeframe(tf) {
  candleState.timeframe = tf;
  candleState.panOffset = 0;

  // Build candles for this TF if needed
  STOCKS.forEach(s => buildCandles(s.id, tf));

  // Update UI
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tf === tf);
  });

  drawCandleChart();
}

// ─── TOGGLE INDICATOR ──────────────────────────────────
function toggleIndicator(ind) {
  if (candleState.indicators[ind]) {
    candleState.indicators[ind].active = !candleState.indicators[ind].active;
    const btn = document.getElementById('ind-btn-' + ind);
    if (btn) btn.classList.toggle('active', candleState.indicators[ind].active);
  }
  drawCandleChart();
}

// ═══════════════════════════════════════════════════════
// ORDER BOOK
// ═══════════════════════════════════════════════════════
function generateOrderBook(stockId) {
  const price = state.prices[stockId] || 10000;
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

  // Sort: bids descending, asks ascending
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  return { bids, asks };
}

function renderOrderBook() {
  const el = document.getElementById('order-book-body');
  if (!el) return;

  const { bids, asks } = generateOrderBook(state.activeStock);
  const maxVol = Math.max(...bids.map(b => b.vol), ...asks.map(a => a.vol));

  const asksHtml = [...asks].reverse().slice(0, 8).map(a => {
    const pct = (a.vol / maxVol) * 100;
    return `<div class="ob-row ask" style="--depth:${pct}%">
      <span class="ob-price ask">${Math.round(a.price).toLocaleString('id-ID')}</span>
      <span class="ob-vol">${a.vol.toLocaleString('id-ID')}</span>
      <span class="ob-total">${(a.total / 1000000).toFixed(1)}M</span>
    </div>`;
  }).join('');

  const price = state.prices[state.activeStock] || 0;
  const spreadPct = ((asks[0].price - bids[0].price) / price * 100).toFixed(3);
  const spreadHtml = `<div class="ob-spread">
    <span>${Math.round(price).toLocaleString('id-ID')}</span>
    <span style="color:var(--text-muted);font-size:9px">Spread ${spreadPct}%</span>
  </div>`;

  const bidsHtml = bids.slice(0, 8).map(b => {
    const pct = (b.vol / maxVol) * 100;
    return `<div class="ob-row bid" style="--depth:${pct}%">
      <span class="ob-price bid">${Math.round(b.price).toLocaleString('id-ID')}</span>
      <span class="ob-vol">${b.vol.toLocaleString('id-ID')}</span>
      <span class="ob-total">${(b.total / 1000000).toFixed(1)}M</span>
    </div>`;
  }).join('');

  el.innerHTML = asksHtml + spreadHtml + bidsHtml;
}

// ─── Update order book periodically ────────────────────
setInterval(() => {
  if (document.getElementById('order-book-body')) renderOrderBook();
}, 1500);

// ═══════════════════════════════════════════════════════
// PRICE ALERTS
// ═══════════════════════════════════════════════════════
let priceAlerts = JSON.parse(localStorage.getItem('uvm_alerts') || '[]');

function saveAlerts() {
  localStorage.setItem('uvm_alerts', JSON.stringify(priceAlerts));
  renderAlertsList();
}

function addPriceAlert() {
  const stockSel = document.getElementById('alert-stock-sel');
  const condSel  = document.getElementById('alert-cond-sel');
  const priceInp = document.getElementById('alert-price-inp');
  if (!stockSel || !condSel || !priceInp) return;

  const stock   = stockSel.value;
  const cond    = condSel.value;  // 'above' or 'below'
  const price   = parseFloat(priceInp.value);
  if (!stock || !price || isNaN(price) || price <= 0) {
    showToast('⚠️ Invalid', 'Isi semua field alert dengan benar.', 'warning');
    return;
  }

  priceAlerts.push({ id: Date.now(), stock, cond, price, triggered: false });
  priceInp.value = '';
  saveAlerts();
  showToast('🔔 Alert Set', `Alert ${cond === 'above' ? 'di atas' : 'di bawah'} ${Math.round(price).toLocaleString('id-ID')} untuk ${stock}`, 'success');
}

function removeAlert(id) {
  priceAlerts = priceAlerts.filter(a => a.id !== id);
  saveAlerts();
}

function checkAlerts(changes) {
  priceAlerts.forEach(alert => {
    if (alert.triggered) return;
    const newPrice = changes[alert.stock]?.new || state.prices[alert.stock];
    if (!newPrice) return;

    const triggered = alert.cond === 'above' ? newPrice >= alert.price : newPrice <= alert.price;
    if (triggered) {
      alert.triggered = true;
      saveAlerts();
      playAlertSound();
      showToast('🔔 Price Alert!',
        `${alert.stock} ${alert.cond === 'above' ? '▲' : '▼'} ${Math.round(alert.price).toLocaleString('id-ID')} — Harga kini ${Math.round(newPrice).toLocaleString('id-ID')}`,
        alert.cond === 'above' ? 'success' : 'error',
        8000
      );
    }
  });
}

function playAlertSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = [880, 1100, 880, 1100];
    freqs.forEach((freq, i) => {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t); osc.stop(t + 0.12);
    });
  } catch (e) {}
}

function renderAlertsList() {
  const el = document.getElementById('alerts-list');
  if (!el) return;

  if (!priceAlerts.length) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:8px 0">Belum ada alert. Tambah di atas.</div>';
    return;
  }

  el.innerHTML = priceAlerts.map(a => {
    const curPrice = state.prices[a.stock] || 0;
    const dist = ((a.price - curPrice) / curPrice * 100).toFixed(2);
    return `<div class="alert-item ${a.triggered ? 'triggered' : ''}">
      <div>
        <div style="font-family:var(--font-mono);font-size:11px;color:${a.triggered ? 'var(--text-muted)' : 'var(--text-primary)'}">
          ${a.stock} ${a.cond === 'above' ? '▲' : '▼'} ${Math.round(a.price).toLocaleString('id-ID')}
        </div>
        <div style="font-size:10px;color:${a.triggered ? 'var(--green)' : 'var(--text-muted)'}">
          ${a.triggered ? '✅ Triggered' : `Jarak: ${dist}%`}
        </div>
      </div>
      <button onclick="removeAlert(${a.id})" style="background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:14px">✕</button>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// LIMIT ORDERS
// ═══════════════════════════════════════════════════════
let limitOrders = JSON.parse(localStorage.getItem('uvm_limits') || '[]');

function saveLimitOrders() {
  localStorage.setItem('uvm_limits', JSON.stringify(limitOrders.slice(-50)));
  renderLimitOrders();
}

function placeLimitOrder(side, stockId, qty, limitPrice) {
  if (!qty || qty <= 0 || !limitPrice || limitPrice <= 0) {
    showToast('⚠️ Invalid', 'Isi qty dan harga limit yang valid.', 'warning');
    return false;
  }

  const total = qty * limitPrice;
  if (side === 'buy' && total > state.balance) {
    showToast('Saldo Tidak Cukup', `Dibutuhkan ${fmt.rp(total)} untuk limit order ini.`, 'error');
    return false;
  }

  // Reserve balance for buy limit orders
  if (side === 'buy') state.balance -= total;

  limitOrders.push({
    id: Date.now(),
    side, stockId, qty,
    limitPrice,
    total,
    ts: new Date().toLocaleString('id-ID'),
    status: 'pending',  // pending / filled / cancelled
  });

  saveLimitOrders();
  if (side === 'buy') renderAll();
  showToast('📋 Limit Order', `${side === 'buy' ? 'Beli' : 'Jual'} ${qty} ${stockId} @ ${fmt.rp(limitPrice)}`, 'info');
  return true;
}

function cancelLimitOrder(id) {
  const order = limitOrders.find(o => o.id === id);
  if (!order || order.status !== 'pending') return;

  // Refund reserved balance for buy orders
  if (order.side === 'buy') {
    state.balance += order.total;
    renderAll();
  }

  order.status = 'cancelled';
  saveLimitOrders();
  showToast('❌ Dibatalkan', `Limit order ${order.stockId} dibatalkan`, 'info');
}

function checkLimitOrders(changes) {
  const filled = [];
  limitOrders.forEach(order => {
    if (order.status !== 'pending') return;
    const price = changes[order.stockId]?.new || state.prices[order.stockId];
    if (!price) return;

    const shouldFill = order.side === 'buy' ? price <= order.limitPrice : price >= order.limitPrice;
    if (shouldFill) {
      filled.push(order);
      order.status = 'filled';

      // Execute the trade
      const s = getStock(order.stockId);
      if (order.side === 'buy') {
        // Balance already deducted, add shares
        if (!state.holdings[order.stockId]) {
          state.holdings[order.stockId] = { qty: 0, avgPrice: price };
        }
        const h = state.holdings[order.stockId];
        const newQty = h.qty + order.qty;
        h.avgPrice = ((h.avgPrice * h.qty) + (price * order.qty)) / newQty;
        h.qty = newQty;
        // Refund difference if filled at lower price
        const diff = order.total - order.qty * price;
        if (diff > 0) state.balance += diff;
      } else {
        const h = state.holdings[order.stockId];
        if (h && h.qty >= order.qty) {
          h.qty -= order.qty;
          state.balance += order.qty * price;
          if (h.qty === 0) delete state.holdings[order.stockId];
        }
      }

      state.transactions.push({
        ts: new Date().toLocaleString('id-ID'),
        type: order.side,
        stock: order.stockId,
        qty: order.qty,
        price,
        total: order.qty * price,
        orderType: 'limit',
      });

      playSound(order.side);
      showToast('✅ Limit Order Filled!',
        `${order.side === 'buy' ? 'Beli' : 'Jual'} ${order.qty} ${order.stockId} @ ${fmt.rp(price)}`,
        'success'
      );
    }
  });

  if (filled.length > 0) {
    saveLimitOrders();
    saveToStorage();
    renderAll();
  }
}

function renderLimitOrders() {
  const el = document.getElementById('limit-orders-list');
  if (!el) return;
  const pending = limitOrders.filter(o => o.status === 'pending');
  if (!pending.length) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:4px 0">Tidak ada open limit order.</div>';
    return;
  }
  el.innerHTML = pending.map(o => {
    const price = state.prices[o.stockId] || 0;
    const dist = price ? ((o.limitPrice - price) / price * 100).toFixed(2) : '—';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
      <div>
        <div style="font-size:11px"><span style="color:${o.side === 'buy' ? 'var(--green)' : '#EF5350'}">${o.side.toUpperCase()}</span> <span style="font-family:var(--font-mono)">${o.qty} ${o.stockId}</span></div>
        <div style="font-size:10px;color:var(--text-muted)">Limit: ${fmt.rp(o.limitPrice)} · Jarak: ${dist}%</div>
      </div>
      <button onclick="cancelLimitOrder(${o.id})" style="background:rgba(255,61,113,0.1);border:1px solid rgba(255,61,113,0.3);border-radius:6px;color:#EF5350;cursor:pointer;padding:3px 8px;font-size:10px">Batal</button>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// COMMUNITY FEED — Firebase Realtime (cross-device sync)
// ═══════════════════════════════════════════════════════

const COMMUNITY_SEED_POSTS = [
  { author: 'Rafi_Akbar', avatar: 'RA', color: '#D4AF37', text: 'KDOK breakout dari resistance 27000! Target selanjutnya 29000. Strong buy! 🚀', ts: '10:32', likes: 14, stock: 'KDOK', sentiment: 'bullish' },
  { author: 'Siti_Nurhaliza', avatar: 'SN', color: '#00E5FF', text: 'RSI FARM sudah oversold di 28. Ini kesempatan akumulasi yang bagus sebelum naik lagi 📊', ts: '10:15', likes: 9, stock: 'FARM', sentiment: 'bullish' },
  { author: 'Dimas_FEB', avatar: 'DF', color: '#3D7EFF', text: 'KOMM breakdown support 7500... sudah keluar semua. Wait and see dulu.', ts: '09:58', likes: 6, stock: 'KOMM', sentiment: 'bearish' },
  { author: 'Intan_Psikologi', avatar: 'IP', color: '#E040FB', text: 'PSIK habis MoU dengan perusahaan besar. Fundamental kuat, bisa hold jangka panjang 💎', ts: '09:40', likes: 18, stock: 'PSIK', sentiment: 'bullish' },
  { author: 'Budi_Trader', avatar: 'BT', color: '#FF6D00', text: 'Pattern double bottom di AKNT 10200-10300. Kalau confirmed breakout, target 11500!', ts: '09:25', likes: 11, stock: 'AKNT', sentiment: 'bullish' },
  { author: 'Mega_Invests', avatar: 'MI', color: '#69F0AE', text: 'MACD TKSP baru golden cross. Volume juga mulai naik. Masuk nyicil 🎯', ts: '09:10', likes: 7, stock: 'TKSP', sentiment: 'bullish' },
];

// In-memory cache — diisi dari Firebase atau localStorage
let communityPosts = [];
let _communityLoaded = false;

// ─── Firebase Community Helpers ───────────────────────
function _communityRef() {
  // Gunakan Firebase db jika tersedia (dari firebase.js)
  if (typeof db !== 'undefined' && db) return db.ref('community');
  return null;
}

// Load posts dari Firebase, fallback ke localStorage
async function loadCommunityPosts() {
  const ref = _communityRef();
  if (ref) {
    try {
      const snap = await ref.orderByChild('createdAt').limitToLast(30).get();
      if (snap.exists()) {
        const arr = [];
        snap.forEach(child => arr.push({ _fbKey: child.key, ...child.val() }));
        // Sort descending (newest first)
        communityPosts = arr.reverse();
      } else {
        // Seed ke Firebase jika masih kosong
        communityPosts = [...COMMUNITY_SEED_POSTS];
        await seedCommunityToFirebase();
      }
      _communityLoaded = true;
      renderCommunityFeed();
      return;
    } catch(e) { console.warn('Community Firebase load error:', e); }
  }
  // Fallback: localStorage
  communityPosts = JSON.parse(localStorage.getItem('uvm_community') || JSON.stringify(COMMUNITY_SEED_POSTS));
  _communityLoaded = true;
  renderCommunityFeed();
}

async function seedCommunityToFirebase() {
  const ref = _communityRef();
  if (!ref) return;
  try {
    for (let i = 0; i < COMMUNITY_SEED_POSTS.length; i++) {
      const p = COMMUNITY_SEED_POSTS[i];
      await ref.push({ ...p, createdAt: Date.now() - (COMMUNITY_SEED_POSTS.length - i) * 60000 });
    }
  } catch(e) { console.warn('Seed error:', e); }
}

// Start realtime listener — auto-update semua device saat ada post baru
let _communityListenerActive = false;
function startCommunityListener() {
  const ref = _communityRef();
  if (!ref || _communityListenerActive) return;
  _communityListenerActive = true;
  try {
    ref.orderByChild('createdAt').limitToLast(30).on('value', snap => {
      if (!snap.exists()) return;
      const arr = [];
      snap.forEach(child => arr.push({ _fbKey: child.key, ...child.val() }));
      communityPosts = arr.reverse();
      if (state.activeTab === 'community') renderCommunityFeed();
      // Update notif badge if not on community tab
      const badge = document.getElementById('community-notif-badge');
      if (badge && state.activeTab !== 'community') {
        badge.style.display = 'inline';
        badge.textContent = '●';
      }
    });
  } catch(e) { console.warn('Community listener error:', e); }
}

function saveCommunityPost(post) {
  const ref = _communityRef();
  if (ref) {
    return ref.push(post).catch(e => {
      console.warn('Community Firebase save error:', e);
      // Fallback: save lokal
      communityPosts.unshift({ ...post, _fbKey: 'local_' + Date.now() });
      localStorage.setItem('uvm_community', JSON.stringify(communityPosts.slice(0, 50)));
      renderCommunityFeed();
    });
  } else {
    // No Firebase — localStorage only
    communityPosts.unshift({ ...post, _fbKey: 'local_' + Date.now() });
    localStorage.setItem('uvm_community', JSON.stringify(communityPosts.slice(0, 50)));
    renderCommunityFeed();
  }
}

function saveLikeToFirebase(fbKey, newLikes) {
  const ref = _communityRef();
  if (ref && fbKey && !fbKey.startsWith('local_')) {
    ref.child(fbKey).update({ likes: newLikes }).catch(e => console.warn('Like update error:', e));
  }
}

function postCommunity() {
  const input = document.getElementById('community-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || text.length < 5) { showToast('⚠️', 'Tulis minimal 5 karakter.', 'warning'); return; }

  const name     = state.user?.displayName || state.user?.email?.split('@')[0] || 'Trader';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const uid      = state.user?.uid || 'demo';
  const sentiment = text.toLowerCase().includes('buy') || text.toLowerCase().includes('naik') || text.toLowerCase().includes('bullish') ? 'bullish'
    : text.toLowerCase().includes('jual') || text.toLowerCase().includes('turun') || text.toLowerCase().includes('bearish') ? 'bearish' : 'neutral';

  const newPost = {
    author:    name,
    avatar:    initials,
    color:     '#69F0AE',
    uid,
    text,
    ts: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now(),
    likes:     0,
    stock:     state.activeStock,
    sentiment,
    isMe:      true,
  };

  input.value = '';
  saveCommunityPost(newPost);
  showToast('✅ Posted!', 'Analisis kamu berhasil diposting ke semua trader.', 'success');
}

function likePost(idx) {
  const post = communityPosts[idx];
  if (!post) return;
  post.likes = (post.likes || 0) + 1;
  saveLikeToFirebase(post._fbKey, post.likes);
  renderCommunityFeed();
}

function renderCommunityFeed() {
  const el = document.getElementById('community-feed');
  if (!el) return;

  // Clear notif badge
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
  el.innerHTML = communityPosts.slice(0, 30).map((p, idx) => `
    <div class="community-post ${p.isMe ? 'is-me' : ''}">
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
  `).join('');
}

// Auto-load saat tab komunitas dibuka
const _origSwitchTab = typeof switchTab === 'function' ? switchTab : null;
if (_origSwitchTab) {
  window.switchTab = function(tab) {
    _origSwitchTab(tab);
    if (tab === 'community') {
      if (!_communityLoaded) loadCommunityPosts();
      startCommunityListener();
    }
  };
}

// Kick off listener immediately if Firebase is already ready
setTimeout(() => {
  loadCommunityPosts();
  startCommunityListener();
}, 2500);


// ═══════════════════════════════════════════════════════
// ORDER TYPE TOGGLE (Market / Limit)
// ═══════════════════════════════════════════════════════
let currentOrderType = 'market'; // 'market' or 'limit'

function switchOrderType(type) {
  currentOrderType = type;
  document.querySelectorAll('.order-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  const limitRow = document.getElementById('limit-price-row');
  if (limitRow) limitRow.style.display = type === 'limit' ? 'flex' : 'none';

  const btn = document.getElementById('trade-submit-btn');
  if (btn) {
    const side = state.tradeSide;
    btn.textContent = type === 'limit'
      ? (side === 'buy' ? '📋 PASANG LIMIT BELI' : '📋 PASANG LIMIT JUAL')
      : (side === 'buy' ? '▲ BELI SEKARANG' : '▼ JUAL SEKARANG');
  }
}

// Override the original executeTrade to support limit orders
const _origExecuteTrade = typeof executeTrade === 'function' ? executeTrade : null;
function executeTrade() {
  if (currentOrderType === 'limit') {
    const qtyInput = document.getElementById('trade-qty-input');
    const limitInput = document.getElementById('limit-price-input');
    const qty = parseInt(qtyInput?.value) || 0;
    const limitPrice = parseFloat(limitInput?.value) || 0;
    if (placeLimitOrder(state.tradeSide, state.activeStock, qty, limitPrice)) {
      if (qtyInput) qtyInput.value = '';
      if (limitInput) limitInput.value = '';
    }
    return;
  }

  // Fall back to market order (original logic)
  if (_origExecuteTrade) { _origExecuteTrade(); return; }

  // Inline market order if original not available
  const qtyInput = document.getElementById('trade-qty-input');
  const qty = parseInt(qtyInput?.value) || 0;
  if (qty <= 0) { showToast('Perhatian', 'Masukkan jumlah lembar yang valid.', 'warning'); return; }
  const s = getStock(state.activeStock);
  const price = state.prices[state.activeStock] || s.basePrice;
  const total = qty * price;

  if (state.tradeSide === 'buy') {
    if (total > state.balance) { showToast('Saldo Tidak Cukup', `Dibutuhkan ${fmt.rp(total)}, saldo ${fmt.rp(state.balance)}`, 'error'); return; }
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
    if (!h || h.qty < qty) { showToast('Lembar Tidak Cukup', `Anda hanya memiliki ${h?.qty || 0} lembar ${s.id}`, 'error'); return; }
    h.qty -= qty;
    state.balance += total;
    if (h.qty === 0) delete state.holdings[s.id];
    playSound('sell');
    showToast('✅ Order Berhasil!', `Jual ${qty} lembar ${s.id} @ ${fmt.rp(price)}`, 'success');
  }

  state.transactions.push({ ts: new Date().toLocaleString('id-ID'), type: state.tradeSide, stock: s.id, qty, price, total });
  if (qtyInput) qtyInput.value = '';
  saveToStorage();
  renderAll();
  syncLeaderboard?.();
}

// ═══════════════════════════════════════════════════════
// RESIZE HANDLER FOR CANDLE CHART
// ═══════════════════════════════════════════════════════
// FIX: resizeCandleCanvas tidak langsung drawCandleChart untuk hindari double-render
// drawCandleChart sudah dipanggil dari updateChartData di price loop
// CRITICAL FIX: simpan dimensi terakhir — jangan reset canvas kalau sama
let _resizeScheduled = false;
let _lastCanvasW = 0, _lastCanvasH = 0;
function resizeCandleCanvas() {
  const canvas = document.getElementById('main-chart');
  if (!canvas) return;
  const wrap = canvas.parentElement;
  if (!wrap) return;
  let W = wrap.clientWidth;
  let H = wrap.clientHeight;
  if (H < 10) H = wrap.getBoundingClientRect().height;
  if (H < 10) H = window.innerWidth <= 900 ? Math.floor(window.innerHeight * 0.48) : _lastCanvasH || 320;
  if (W < 10) W = _lastCanvasW || 600;

  // HANYA resize jika dimensi benar-benar berubah (toleransi 2px untuk subpixel)
  const wChanged = Math.abs(canvas.width - W) > 2;
  const hChanged = Math.abs(canvas.height - H) > 2;
  if (W > 10 && H > 10 && (wChanged || hChanged)) {
    _lastCanvasW = W;
    _lastCanvasH = H;
    canvas.width = W;
    canvas.height = H;
    // Debounce: hanya jadwalkan 1 redraw
    if (!_resizeScheduled) {
      _resizeScheduled = true;
      requestAnimationFrame(() => {
        _resizeScheduled = false;
        if (state.activeTab === 'trade') drawCandleChart();
      });
    }
  }
}

// ─── HOOK INTO EXISTING PRICE ENGINE ──────────────────
// Patch tickPrices sekali saja untuk update candle + alert/limit
// Guard dengan flag agar tidak re-patch saat market-engine.js atau macro-engine.js
// juga menambahkan patch mereka sendiri
(function patchPriceEngine() {
  if (window.__candlePricePatched) return;

  function tryPatch() {
    if (window.__candlePricePatched) return;
    const _orig = typeof tickPrices === 'function' ? tickPrices : null;
    if (!_orig) { setTimeout(tryPatch, 200); return; }

    window.__candlePricePatched = true;
    const patched = function() {
      const changes = _orig();
      if (changes) {
        STOCKS.forEach(s => {
          const p = changes[s.id];
          if (p) updateCandles(s.id, p.new);
        });
        checkAlerts(changes);
        checkLimitOrders(changes);
      }
      return changes;
    };
    patched._isCandlePatch = true;
    window.tickPrices = patched;
    console.log('✅ [Upgrades] tickPrices patched for candle+alert');
  }
  // Tunda agar script.js selesai dulu assign tickPrices
  setTimeout(tryPatch, 50);
})();

// ─── OVERRIDE initChart to use candlestick ─────────────
window.initChart = function() {
  const canvas = document.getElementById('main-chart');
  if (!canvas) return;

  // Cancel old animation
  if (typeof lineChartAnimId !== 'undefined' && lineChartAnimId) {
    cancelAnimationFrame(lineChartAnimId);
    lineChartAnimId = null;
  }

  const wrap = canvas.parentElement;
  canvas.width = wrap ? wrap.clientWidth : canvas.offsetWidth;
  let wH = wrap ? wrap.clientHeight : canvas.offsetHeight;
  if (wH < 10 && wrap) wH = wrap.getBoundingClientRect().height;
  if (wH < 10) wH = window.innerWidth <= 900 ? Math.floor(window.innerHeight * 0.48) : 320;
  canvas.height = wH;

  if (canvas.width < 10 || canvas.height < 10) {
    setTimeout(window.initChart, 80);
    return;
  }

  // CRITICAL: simpan dimensi awal agar resizeCandleCanvas tidak false-trigger
  _lastCanvasW = canvas.width;
  _lastCanvasH = canvas.height;

  // Build initial candles
  STOCKS.forEach(s => buildCandles(s.id, candleState.timeframe));

  // Set chart object to candle type
  state.chart = { type: 'candle', canvas };

  initCandleInteraction();
  drawCandleChart();
};

// Override updateChartData — dengan requestAnimationFrame debounce
// JANGAN panggil resizeCandleCanvas di sini — itu penyebab chart mengecil!
// resizeCandleCanvas hanya boleh dipanggil dari ResizeObserver / window resize
let _chartDrawPending = false;
window.updateChartData = function() {
  // ❌ REMOVED: resizeCandleCanvas() — was causing chart to shrink on every tick
  if (state.activeTab !== 'trade') return;
  if (_chartDrawPending) return;
  _chartDrawPending = true;
  requestAnimationFrame(() => {
    _chartDrawPending = false;
    drawCandleChart();
  });
};

// ═══════════════════════════════════════════════════════
// INIT PRO FEATURES
// ═══════════════════════════════════════════════════════
(function initProFeatures() {
  // Wait for DOM
  const tryInit = () => {
    // Inject order type buttons into trade box
    injectOrderTypeButtons();
    // Inject limit price input
    injectLimitPriceInput();
    // Render order book
    if (document.getElementById('order-book-body')) {
      renderOrderBook();
    }
    // Render alerts
    renderAlertsList();
    // Render limit orders
    renderLimitOrders();
    // Render community
    renderCommunityFeed();
    // Bind timeframe buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
      if (btn.dataset.tf) {
        btn.onclick = () => switchTimeframe(btn.dataset.tf);
      }
    });
    // Bind indicator buttons
    ['ma','ema','rsi','macd'].forEach(ind => {
      const btn = document.getElementById('ind-btn-' + ind);
      if (btn) btn.onclick = () => toggleIndicator(ind);
    });
    // Set initial indicator button states
    document.querySelectorAll('[id^="ind-btn-"]').forEach(btn => {
      const ind = btn.id.replace('ind-btn-', '');
      if (candleState.indicators[ind]) {
        btn.classList.toggle('active', candleState.indicators[ind].active);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 800));
  } else {
    setTimeout(tryInit, 800);
  }

  // Also try again after 2s in case of late init
  setTimeout(tryInit, 2000);
})();

function injectOrderTypeButtons() {
  const tradeTabs = document.querySelector('.trade-tabs');
  if (!tradeTabs || document.querySelector('.order-type-btns')) return;

  const row = document.createElement('div');
  row.className = 'order-type-btns';
  row.innerHTML = `
    <button class="order-type-btn active" data-type="market" onclick="switchOrderType('market')">Market</button>
    <button class="order-type-btn" data-type="limit" onclick="switchOrderType('limit')">Limit</button>
  `;
  tradeTabs.parentElement.insertBefore(row, tradeTabs.nextSibling);
}

function injectLimitPriceInput() {
  const qtyRow = document.querySelector('.trade-form-row');
  if (!qtyRow || document.getElementById('limit-price-row')) return;

  const limitRow = document.createElement('div');
  limitRow.className = 'trade-form-row';
  limitRow.id = 'limit-price-row';
  limitRow.style.display = 'none';
  limitRow.innerHTML = `
    <div class="trade-form-label">
      <span>Harga Limit</span>
      <span class="trade-form-avail">Order tereksekusi saat harga tercapai</span>
    </div>
    <input type="number" class="trade-input" id="limit-price-input" placeholder="Masukkan harga limit" min="1" step="1" />
  `;
  qtyRow.parentElement.insertBefore(limitRow, qtyRow.nextSibling);
}

// Gunakan ResizeObserver alih-alih setInterval untuk resize chart
// Lebih efisien dan tidak menyebabkan periodic redraw yang tidak perlu
(function setupChartResizeObserver() {
  function trySetup() {
    const canvas = document.getElementById('main-chart');
    const wrap = canvas?.parentElement;
    if (!wrap) { setTimeout(trySetup, 500); return; }

    if (window.ResizeObserver) {
      let _roDebounce = null;
      const ro = new ResizeObserver(() => {
        clearTimeout(_roDebounce);
        _roDebounce = setTimeout(() => {
          resizeCandleCanvas();
        }, 100);
      });
      ro.observe(wrap);
      console.log('✅ [Upgrades] ResizeObserver aktif untuk chart');
    } else {
      // Fallback: polling lebih jarang (5 detik) untuk browser lama
      setInterval(resizeCandleCanvas, 5000);
    }
  }
  setTimeout(trySetup, 1000);
})();


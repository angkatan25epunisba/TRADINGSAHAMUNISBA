// ═══════════════════════════════════════════════════════
// UNISBA VIRTUAL MARKET — BERITA KEUANGAN ENGINE v1.0
// berita-engine.js
//
// Fitur:
//   - Berita keuangan dinamis (tidak static, tidak berulang)
//   - Kategori: Indonesia, Global, BI/IHSG, Inflasi, Suku Bunga,
//               Rupiah/USD, Geopolitik, Saham Bank
//   - Sumber: CNBC Indonesia, Bloomberg, Reuters, Investing,
//             TradingEconomics, Yahoo Finance, Bank Indonesia
//   - Rotasi otomatis, tidak ada berita yang sama 2x berturut-turut
//   - Berita baru masuk tiap beberapa menit
//   - Pengaruh ke sentimen market secara halus
// ═══════════════════════════════════════════════════════

'use strict';

// ════════════════════════════════════════════════════════
// §1. KONFIGURASI
// ════════════════════════════════════════════════════════

const BERITA_CFG = {
  MAX_BERITA:      60,     // maksimum berita yang disimpan
  NEW_BERITA_INTERVAL: 90 * 1000,    // berita baru tiap 90 detik (lebih sering = lebih variatif)
  DISPLAY_PER_PAGE: 30,   // tampilkan max ini di grid
  ROTATE_INTERVAL:  90 * 1000,   // rotasi aktif setiap 90 detik
};

// ════════════════════════════════════════════════════════
// §2. DATABASE BERITA DINAMIS
// ════════════════════════════════════════════════════════

const BERITA_TEMPLATES = {

  // ─── INDONESIA / BI / IHSG ───────────────────────────
  INDONESIA: [
    { tpl: 'Bank Indonesia pertahankan suku bunga BI Rate di level {rate}% — mendukung stabilitas Rupiah', cat: 'BI', impact: 0.3, sentiment: 'neutral', src: 'Bank Indonesia' },
    { tpl: 'IHSG {dir} {pts} poin ({pct}%) ke level {lvl} — {actor} mendominasi perdagangan sesi {sesi}', cat: 'IHSG', impact: 0.5, sentiment: '{sentIhsg}', src: 'CNBC Indonesia' },
    { tpl: 'Bank Indonesia catat cadangan devisa USD {cad} miliar — {dir2} dari bulan sebelumnya', cat: 'BI', impact: 0.25, sentiment: '{sentCad}', src: 'Bank Indonesia' },
    { tpl: 'BPS: Inflasi Indonesia {bln} {thn} sebesar {infl}% YoY — {ket} dari target BI {targetInfl}%', cat: 'Inflasi', impact: 0.4, sentiment: '{sentInfl}', src: 'BPS / Reuters' },
    { tpl: 'Pemerintah targetkan pertumbuhan ekonomi {gdp}% di {thn} — Kemenkeu optimistis', cat: 'Ekonomi', impact: 0.2, sentiment: 'bullish', src: 'Kemenkeu' },
    { tpl: 'OJK: Total aset perbankan Indonesia capai Rp {aset} triliun — naik {pctBank}% YoY', cat: 'Perbankan', impact: 0.3, sentiment: 'bullish', src: 'OJK / Bloomberg' },
    { tpl: 'Rupiah {dirRp} ke {kursRp} per USD — {reasonRp}', cat: 'Rupiah', impact: 0.45, sentiment: '{sentRp}', src: 'Reuters' },
    { tpl: 'BI Rate dipangkas {bps} bps menjadi {newRate}% — sinyal pelonggaran moneter', cat: 'BI', impact: 0.6, sentiment: 'bullish', src: 'Bank Indonesia' },
    { tpl: 'Neraca perdagangan Indonesia surplus USD {surplus} miliar pada {bln} {thn}', cat: 'Ekonomi', impact: 0.3, sentiment: 'bullish', src: 'BPS' },
    { tpl: 'IHSG sentuh rekor tertinggi {rekor} di tengah aliran masuk dana asing Rp {asingIn} triliun', cat: 'IHSG', impact: 0.7, sentiment: 'bullish', src: 'CNBC Indonesia' },
    { tpl: 'Asing catat net sell Rp {netSell} miliar di IHSG — tekanan jual dari {aktorAsi}', cat: 'IHSG', impact: 0.5, sentiment: 'bearish', src: 'CNBC Indonesia' },
    { tpl: 'PMI Manufaktur Indonesia {pmi} di {bln} — {statusPmi} zona ekspansi', cat: 'Ekonomi', impact: 0.35, sentiment: '{sentPmi}', src: 'S&P Global / Bloomberg' },
    { tpl: 'Pemerintah naikkan anggaran infrastruktur {thn} menjadi Rp {infra} triliun', cat: 'Ekonomi', impact: 0.25, sentiment: 'bullish', src: 'Kemenkeu' },
    { tpl: 'Ekspor Indonesia {bln} {thn} naik {pctExp}% — komoditas {komoditas} penyumbang terbesar', cat: 'Ekonomi', impact: 0.3, sentiment: 'bullish', src: 'BPS' },
    { tpl: 'Kementerian Keuangan terbitkan SBN senilai Rp {sbn} triliun — oversubscribed {overSub}×', cat: 'Obligasi', impact: 0.2, sentiment: 'bullish', src: 'Kemenkeu' },
  ],

  // ─── GLOBAL ──────────────────────────────────────────
  GLOBAL: [
    { tpl: 'The Fed pertahankan suku bunga {fedRate}% — sinyal pemangkasan pada {quarter} {thn}', cat: 'Suku Bunga', impact: 0.5, sentiment: '{sentFed}', src: 'Bloomberg' },
    { tpl: 'Wall Street {dirWS}: S&P 500 {actWS} {pctWS}%, Nasdaq {pctNas}%', cat: 'Wall Street', impact: 0.4, sentiment: '{sentWS}', src: 'Reuters' },
    { tpl: 'Harga minyak Brent {dirOil} {pctOil}% ke USD {priceOil}/barel — {reasonOil}', cat: 'Komoditas', impact: 0.4, sentiment: '{sentOil}', src: 'Reuters' },
    { tpl: 'CPI AS {bln}: inflasi {inflUS}% YoY — {compUS} dari estimasi {estUS}%', cat: 'Inflasi', impact: 0.55, sentiment: '{sentInflUS}', src: 'Bloomberg' },
    { tpl: 'China PMI Manufaktur {pmiCN} — ekonomi {statusCN}', cat: 'China', impact: 0.4, sentiment: '{sentCN}', src: 'NBS / Bloomberg' },
    { tpl: 'ECB pangkas suku bunga {ecbBps} bps — stimulus pertumbuhan zona Euro', cat: 'Suku Bunga', impact: 0.35, sentiment: 'bullish', src: 'Reuters' },
    { tpl: 'USD Index (DXY) {dirDxy} ke {dxy} — menekan mata uang {emList}', cat: 'USD', impact: 0.45, sentiment: '{sentDxy}', src: 'Bloomberg' },
    { tpl: 'Harga emas {dirGold} {pctGold}% ke USD {priceGold}/troy oz — {reasonGold}', cat: 'Komoditas', impact: 0.3, sentiment: '{sentGold}', src: 'Reuters' },
    { tpl: 'IMF revisi proyeksi pertumbuhan global {thn} menjadi {growthGlb}%', cat: 'Ekonomi Global', impact: 0.3, sentiment: '{sentIMF}', src: 'IMF / Bloomberg' },
    { tpl: 'Nonfarm Payrolls AS {bln}: +{nfp} ribu pekerjaan — pengangguran {uempRate}%', cat: 'Data Ekonomi AS', impact: 0.5, sentiment: '{sentNFP}', src: 'BLS / Reuters' },
    { tpl: 'Bank of Japan pertahankan kebijakan ultra-longgar — Yen {dirYen} terhadap USD', cat: 'Jepang', impact: 0.25, sentiment: 'neutral', src: 'Bloomberg' },
    { tpl: 'MSCI Emerging Markets {dirMSCI} {pctMSCI}% — {reasonMSCI}', cat: 'Emerging Markets', impact: 0.4, sentiment: '{sentMSCI}', src: 'Bloomberg' },
    { tpl: 'Harga batu bara {dirCoal} ke USD {priceCoal}/ton — {reasonCoal}', cat: 'Komoditas', impact: 0.35, sentiment: '{sentCoal}', src: 'Reuters' },
    { tpl: 'Harga nikel {dirNi} {pctNi}% di LME — {reasonNi}', cat: 'Komoditas', impact: 0.3, sentiment: '{sentNi}', src: 'Bloomberg' },
  ],

  // ─── GEOPOLITIK ──────────────────────────────────────
  GEOPOLITIK: [
    { tpl: 'Ketegangan {region} meningkat — investor beralih ke aset safe haven', cat: 'Geopolitik', impact: 0.6, sentiment: 'bearish', src: 'Reuters' },
    { tpl: 'Kesepakatan dagang {country1}–{country2} capai {pctProgress}% kemajuan — pasar merespons positif', cat: 'Geopolitik', impact: 0.5, sentiment: 'bullish', src: 'Bloomberg' },
    { tpl: 'Sanksi baru terhadap {sanctionTarget} — rantai pasokan global terancam terganggu', cat: 'Geopolitik', impact: 0.55, sentiment: 'bearish', src: 'Reuters' },
    { tpl: 'Konflik di {conflictArea} mereda — harga komoditas {dirCommod} moderasi', cat: 'Geopolitik', impact: 0.4, sentiment: '{sentConflict}', src: 'Reuters' },
    { tpl: 'OPEC+ sepakat perpanjang pemangkasan produksi minyak {cutBbls} juta barel/hari', cat: 'OPEC', impact: 0.5, sentiment: 'bullish', src: 'Reuters' },
    { tpl: 'Krisis utang {debtCountry} membayangi pasar obligasi global', cat: 'Geopolitik', impact: 0.5, sentiment: 'bearish', src: 'Bloomberg' },
    { tpl: 'G7 umumkan paket bantuan USD {aidPkg} miliar untuk stabilisasi ekonomi global', cat: 'Geopolitik', impact: 0.3, sentiment: 'bullish', src: 'Reuters' },
    { tpl: 'Pemilihan umum di {elecCountry} diperkirakan berdampak pada kebijakan fiskal — pasar wait-and-see', cat: 'Geopolitik', impact: 0.35, sentiment: 'neutral', src: 'Bloomberg' },
  ],

  // ─── BANK & SAHAM BANK ───────────────────────────────
  BANK_SAHAM: [
    { tpl: '{bankName} raih laba bersih Rp {laba} triliun di {quarter} {thn} — {dir3} {pct3}% YoY', cat: 'Bank', impact: 0.5, sentiment: '{sentBank}', src: 'CNBC Indonesia' },
    { tpl: '{bankName} luncurkan layanan {layanan} — target {target} nasabah baru dalam {durasi} bulan', cat: 'Bank', impact: 0.3, sentiment: 'bullish', src: 'CNBC Indonesia' },
    { tpl: 'NPL perbankan nasional turun ke {npl}% — kualitas kredit membaik', cat: 'Perbankan', impact: 0.4, sentiment: 'bullish', src: 'OJK' },
    { tpl: '{bankName} umumkan rights issue Rp {ri} triliun — perkuat modal tier 1', cat: 'Bank', impact: 0.35, sentiment: 'neutral', src: 'Bloomberg' },
    { tpl: 'Saham {bankCode} {dirSaham} {pctSaham}% — {reasonSaham}', cat: 'Bank', impact: 0.45, sentiment: '{sentSaham}', src: 'CNBC Indonesia' },
    { tpl: 'Kredit perbankan tumbuh {kreditGrowth}% YoY — dipacu sektor {sektorKredit}', cat: 'Perbankan', impact: 0.35, sentiment: 'bullish', src: 'OJK / BI' },
    { tpl: 'BI longgarkan GWM menjadi {gwm}% — likuiditas perbankan meningkat', cat: 'BI', impact: 0.4, sentiment: 'bullish', src: 'Bank Indonesia' },
  ],

  // ─── TEKNOLOGI & STARTUP ─────────────────────────────
  TEKNOLOGI: [
    { tpl: 'Saham teknologi AS {dirTech} — {techReason}', cat: 'Teknologi', impact: 0.3, sentiment: '{sentTech}', src: 'Bloomberg' },
    { tpl: 'Startup fintech {fintechName} raih pendanaan Series {series} USD {funding} juta', cat: 'Startup', impact: 0.2, sentiment: 'bullish', src: 'TechCrunch' },
    { tpl: 'AI boom dorong valuasi sektor semikonduktor — {chipName} naik {pctChip}%', cat: 'Teknologi', impact: 0.35, sentiment: 'bullish', src: 'Bloomberg' },
  ],
};

// ════════════════════════════════════════════════════════
// §3. GENERATOR NILAI DINAMIS
// ════════════════════════════════════════════════════════

function _randBetween(a, b) { return a + Math.random() * (b - a); }
function _randInt(a, b) { return Math.floor(_randBetween(a, b + 1)); }
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _pct(decimals = 2) { return (_randBetween(0.1, 4.5)).toFixed(decimals); }
function _negPct(decimals = 2) { return (_randBetween(0.1, 3.8)).toFixed(decimals); }

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const BANK_NAMES = ['BRI', 'BCA', 'Mandiri', 'BNI', 'BTN', 'CIMB Niaga', 'Bank Syariah Indonesia', 'Danamon'];
const BANK_CODES = ['BBRI', 'BBCA', 'BMRI', 'BBNI', 'BRIS', 'BDMN'];
const REGIONS = ['Timur Tengah', 'Laut China Selatan', 'Eropa Timur', 'Semenanjung Korea', 'Afrika Utara'];
const COUNTRIES = ['AS', 'China', 'Jepang', 'Korea Selatan', 'Eropa', 'Inggris', 'India', 'ASEAN'];
const SESI = ['pagi', 'siang', 'sore'];
const ACTOR_IHSG = ['Sektor perbankan', 'Saham energi', 'Saham konsumer', 'Sektor telekomunikasi'];
const LAYANAN = ['super app keuangan', 'digital banking premium', 'QRIS cross-border', 'tabungan emas digital'];

function _fillTemplate(tpl, sentimentRef) {
  const thn = new Date().getFullYear();
  const bln = BULAN[new Date().getMonth()];
  const quarter = QUARTERS[Math.floor(new Date().getMonth() / 3)];

  const ihsgNow = _randInt(7200, 8100);
  const ihsgDir = Math.random() > 0.5;
  const sentIhsg = ihsgDir ? 'bullish' : 'bearish';

  const kursNow = _randInt(15600, 16400);
  const rpDir = Math.random() > 0.45;
  const sentRp = rpDir ? 'bearish' : 'bullish'; // Rupiah melemah = bearish untuk saham

  const inflNow = _randBetween(2.1, 4.8).toFixed(2);
  const targetInfl = '3.5';
  const sentInfl = parseFloat(inflNow) <= 3.5 ? 'bullish' : 'bearish';

  const fedR = _pick(['5.00', '4.75', '4.50', '5.25', '4.25']);
  const sentFed = Math.random() > 0.5 ? 'bullish' : 'neutral';

  const wsDir = Math.random() > 0.48;
  const sentWS = wsDir ? 'bullish' : 'bearish';

  const oilDir = Math.random() > 0.5;
  const sentOil = oilDir ? 'bearish' : 'bullish'; // minyak naik = bearish untuk EM

  const dxyNow = _randBetween(100.5, 107.5).toFixed(2);
  const dxyDir = Math.random() > 0.5;
  const sentDxy = dxyDir ? 'bearish' : 'bullish'; // USD kuat = bearish EM

  const goldDir = Math.random() > 0.48;
  const sentGold = goldDir ? 'bullish' : 'neutral';

  const bank = _pick(BANK_NAMES);
  const bankCode = _pick(BANK_CODES);
  const bankDir = Math.random() > 0.45;
  const sentBank = bankDir ? 'bullish' : 'bearish';
  const sahamDir = Math.random() > 0.5;
  const sentSaham = sahamDir ? 'bullish' : 'bearish';

  const pmiCN = _randBetween(48.0, 52.5).toFixed(1);
  const sentCN = parseFloat(pmiCN) >= 50 ? 'bullish' : 'bearish';

  const inflUS = _randBetween(2.1, 4.9).toFixed(1);
  const sentInflUS = parseFloat(inflUS) < 3.0 ? 'bullish' : 'bearish';

  const nfp = _randInt(100, 380);
  const sentNFP = nfp > 200 ? 'bullish' : nfp < 120 ? 'bearish' : 'neutral';

  const growthGlb = _randBetween(2.5, 3.5).toFixed(1);
  const sentIMF = parseFloat(growthGlb) > 3.0 ? 'bullish' : 'neutral';

  const msciDir = Math.random() > 0.48;
  const sentMSCI = msciDir ? 'bullish' : 'bearish';

  const coalDir = Math.random() > 0.5;
  const sentCoal = coalDir ? 'bullish' : 'neutral';

  const niDir = Math.random() > 0.5;
  const sentNi = niDir ? 'bullish' : 'neutral';

  const techDir = Math.random() > 0.5;
  const sentTech = techDir ? 'bullish' : 'bearish';

  const pmiID = _randBetween(49.5, 53.5).toFixed(1);
  const sentPmi = parseFloat(pmiID) >= 50 ? 'bullish' : 'bearish';

  const cadNow = _randBetween(135, 160).toFixed(1);
  const cadDir = Math.random() > 0.45;
  const sentCad = cadDir ? 'bullish' : 'bearish';

  if (sentimentRef) sentimentRef.value = sentIhsg;

  const replacements = {
    '{thn}': thn,
    '{bln}': bln,
    '{quarter}': quarter,
    '{rate}': _pick(['6.00', '5.75', '5.50', '6.25']),
    '{pts}': _randInt(20, 120),
    '{pct}': (Math.random() > 0.5 ? '+' : '-') + _pct(),
    '{lvl}': ihsgNow,
    '{actor}': _pick(ACTOR_IHSG),
    '{sesi}': _pick(SESI),
    '{dir}': ihsgDir ? 'menguat' : 'melemah',
    '{dir2}': cadDir ? 'meningkat' : 'menurun',
    '{dir3}': bankDir ? 'naik' : 'turun',
    '{dirRp}': rpDir ? 'melemah' : 'menguat',
    '{dirWS}': wsDir ? 'menguat' : 'melemah',
    '{dirOil}': oilDir ? 'naik' : 'turun',
    '{dirDxy}': dxyDir ? 'naik' : 'turun',
    '{dirGold}': goldDir ? 'naik' : 'turun',
    '{dirCoal}': coalDir ? 'naik' : 'turun',
    '{dirNi}': niDir ? 'naik' : 'turun',
    '{dirTech}': techDir ? 'reli' : 'terkoreksi',
    '{dirSaham}': sahamDir ? 'naik' : 'turun',
    '{dirMSCI}': msciDir ? 'naik' : 'turun',
    '{dirCommod}': Math.random() > 0.5 ? 'alami' : 'tunjukkan',
    '{kursRp}': kursNow.toLocaleString('id-ID'),
    '{infl}': inflNow,
    '{targetInfl}': targetInfl,
    '{inflUS}': inflUS,
    '{gdp}': _randBetween(4.8, 5.8).toFixed(1),
    '{aset}': _randInt(10500, 11500),
    '{pctBank}': _pct(1),
    '{laba}': _randBetween(8, 55).toFixed(1),
    '{pct3}': _pct(1),
    '{npl}': _randBetween(1.5, 3.5).toFixed(2),
    '{ri}': _randInt(5, 30),
    '{pctSaham}': _pct(2),
    '{kreditGrowth}': _randBetween(7, 15).toFixed(1),
    '{sektorKredit}': _pick(['UMKM', 'konsumsi', 'industri', 'infrastruktur']),
    '{gwm}': _randBetween(3.5, 5.5).toFixed(1),
    '{fedRate}': fedR,
    '{pctWS}': _pct(),
    '{pctNas}': _pct(),
    '{actWS}': wsDir ? 'naik' : 'turun',
    '{pctOil}': _pct(),
    '{priceOil}': _randInt(65, 95),
    '{reasonOil}': _pick(['terdorong ketegangan Timur Tengah', 'setelah keputusan OPEC+', 'di tengah data inventori AS']),
    '{compUS}': parseFloat(inflUS) < 3.5 ? 'di bawah' : 'di atas',
    '{estUS}': (parseFloat(inflUS) + _randBetween(-0.3, 0.3)).toFixed(1),
    '{pmiCN}': pmiCN,
    '{statusCN}': parseFloat(pmiCN) >= 50 ? 'ekspansi' : 'kontraksi',
    '{dxy}': dxyNow,
    '{emList}': _pick(['Rupiah, Baht, Ringgit', 'mata uang Asia', 'EM Asia']),
    '{priceGold}': _randInt(1950, 2450),
    '{reasonGold}': _pick(['safe haven demand', 'dolar melemah', 'ketidakpastian global']),
    '{growthGlb}': growthGlb,
    '{nfp}': nfp,
    '{uempRate}': _randBetween(3.5, 4.5).toFixed(1),
    '{pmiID}': pmiID,
    '{statusPmi}': parseFloat(pmiID) >= 50 ? 'di atas' : 'di bawah',
    '{cad}': cadNow,
    '{infra}': _randInt(400, 700),
    '{pctExp}': _pct(1),
    '{komoditas}': _pick(['batu bara', 'minyak sawit', 'nikel', 'karet']),
    '{sbn}': _randInt(25, 80),
    '{overSub}': _randBetween(2.5, 6).toFixed(1),
    '{bps}': _pick(['25', '50']),
    '{newRate}': (parseFloat(fedR) - 0.25).toFixed(2),
    '{surplus}': _randBetween(1.5, 5.5).toFixed(2),
    '{rekor}': _randInt(8000, 8500),
    '{asingIn}': _randInt(2, 15),
    '{netSell}': _randInt(500, 3000),
    '{aktorAsi}': _pick(['investor institusional', 'hedge fund global', 'fund ETF asing']),
    '{region}': _pick(REGIONS),
    '{country1}': _pick(COUNTRIES),
    '{country2}': _pick(COUNTRIES.filter(c => c !== 'AS')),
    '{pctProgress}': _randInt(60, 90),
    '{sanctionTarget}': _pick(['Rusia', 'Iran', 'Venezuela', 'Korea Utara']),
    '{conflictArea}': _pick(REGIONS),
    '{cutBbls}': _randBetween(0.5, 2).toFixed(1),
    '{debtCountry}': _pick(['Argentina', 'Pakistan', 'Sri Lanka', 'Zambia']),
    '{aidPkg}': _randInt(20, 100),
    '{elecCountry}': _pick(['Brazil', 'India', 'Turki', 'Mexico', 'Inggris']),
    '{bankName}': bank,
    '{bankCode}': bankCode,
    '{layanan}': _pick(LAYANAN),
    '{target}': _randInt(1, 10),
    '{durasi}': _randInt(6, 18),
    '{reasonSaham}': _pick(['didorong hasil kinerja Q kuat', 'ikuti sentimen pasar', 'aliran dana asing masuk', 'aksi profit taking']),
    '{dirTech}': techDir ? 'reli' : 'terkoreksi',
    '{techReason}': _pick(['didorong laporan keuangan Magnificent 7', 'AI spending boom berlanjut', 'tarif impor tekan sektor chip']),
    '{fintechName}': _pick(['GoPay', 'OVO', 'Dana', 'Flip', 'Xendit', 'Jenius']),
    '{series}': _pick(['A', 'B', 'C', 'D']),
    '{funding}': _randInt(20, 250),
    '{chipName}': _pick(['NVIDIA', 'AMD', 'Intel', 'TSMC', 'Qualcomm']),
    '{pctChip}': _pct(),
    '{pctMSCI}': _pct(),
    '{reasonMSCI}': _pick(['dipacu risk-on global', 'aliran modal masuk EM', 'tertekan kenaikan dolar']),
    '{priceCoal}': _randInt(120, 280),
    '{reasonCoal}': _pick(['permintaan Asia meningkat', 'cuaca ekstrem pengaruhi produksi', 'diversifikasi energi China']),
    '{pctNi}': _pct(),
    '{reasonNi}': _pick(['surplus pasokan global', 'pemangkasan produksi Indonesia', 'permintaan baterai EV']),
    // Sentiment references
    '{sentIhsg}': sentIhsg,
    '{sentRp}': sentRp,
    '{sentInfl}': sentInfl,
    '{sentCad}': sentCad,
    '{sentBank}': sentBank,
    '{sentSaham}': sentSaham,
    '{sentFed}': sentFed,
    '{sentWS}': sentWS,
    '{sentOil}': sentOil,
    '{sentDxy}': sentDxy,
    '{sentGold}': sentGold,
    '{sentCN}': sentCN,
    '{sentInflUS}': sentInflUS,
    '{sentNFP}': sentNFP,
    '{sentIMF}': sentIMF,
    '{sentMSCI}': sentMSCI,
    '{sentCoal}': sentCoal,
    '{sentNi}': sentNi,
    '{sentTech}': sentTech,
    '{sentPmi}': sentPmi,
    '{sentConflict}': Math.random() > 0.5 ? 'bullish' : 'neutral',
    '{ket}': parseFloat(inflNow) <= 3.5 ? 'di bawah' : 'di atas',
  };

  let result = tpl;
  for (const [key, val] of Object.entries(replacements)) {
    result = result.split(key).join(String(val));
  }
  return result;
}

// ════════════════════════════════════════════════════════
// §4. STATE BERITA
// ════════════════════════════════════════════════════════

let beritaList = [];           // Array berita yang sudah di-generate
let beritaActiveFilter = 'Semua'; // Filter kategori aktif
let _beritaUsedRecently = new Set(); // Hindari template sama berulang
let _beritaTextHistory  = new Set(); // CRITICAL: track teks FINAL agar tidak ada judul duplikat

const ALL_CATEGORIES = ['Semua', 'IHSG', 'BI', 'Rupiah', 'Inflasi', 'Suku Bunga', 'Ekonomi', 'Perbankan', 'Bank', 'Komoditas', 'Wall Street', 'China', 'Geopolitik', 'OPEC', 'Teknologi', 'Startup', 'Emerging Markets', 'USD', 'Obligasi'];

// ════════════════════════════════════════════════════════
// §5. GENERATE BERITA
// ════════════════════════════════════════════════════════

function _generateSingleBerita() {
  // Coba maksimal 5 kali untuk mendapatkan berita yang BELUM PERNAH muncul
  for (let attempt = 0; attempt < 5; attempt++) {
    // Pilih kategori acak dengan bobot
    const categoryWeights = [
      { key: 'INDONESIA', weight: 30 },
      { key: 'GLOBAL',    weight: 25 },
      { key: 'GEOPOLITIK', weight: 15 },
      { key: 'BANK_SAHAM', weight: 20 },
      { key: 'TEKNOLOGI',  weight: 10 },
    ];
    const totalW = categoryWeights.reduce((s, c) => s + c.weight, 0);
    let rand = Math.random() * totalW;
    let catKey = 'INDONESIA';
    for (const cw of categoryWeights) {
      rand -= cw.weight;
      if (rand <= 0) { catKey = cw.key; break; }
    }

    const templates = BERITA_TEMPLATES[catKey];
    // Hindari template yang baru dipakai
    const available = templates.filter(t => !_beritaUsedRecently.has(t.tpl));
    const tplObj = _pick(available.length ? available : templates);

    // Mark template as recently used
    _beritaUsedRecently.add(tplObj.tpl);
    if (_beritaUsedRecently.size > 25) {
      const arr = [..._beritaUsedRecently];
      _beritaUsedRecently = new Set(arr.slice(arr.length - 12));
    }

    const sentRef = { value: tplObj.sentiment };
    const text = _fillTemplate(tplObj.tpl, sentRef);

    // CRITICAL FIX: cek apakah teks ini PERSIS sama dengan berita yang sudah ada
    // Kalau sama → coba lagi (loop attempt)
    if (_beritaTextHistory.has(text)) continue;

    // Teks unik — simpan ke history
    _beritaTextHistory.add(text);
    // Bersihkan history lama agar tidak terakumulasi tanpa batas
    if (_beritaTextHistory.size > 120) {
      const arr = [..._beritaTextHistory];
      _beritaTextHistory = new Set(arr.slice(arr.length - 60));
    }

    // Resolve sentiment
    let sentiment = tplObj.sentiment;
    if (sentiment.startsWith('{sent')) {
      sentiment = sentRef.value || 'neutral';
    }

    return {
      id:        Date.now() + '_' + Math.random().toString(36).slice(2),
      text,
      cat:       tplObj.cat,
      sentiment,
      src:       tplObj.src,
      impact:    tplObj.impact,
      ts:        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      tsMs:      Date.now(),
      isNew:     true,
    };
  }

  // Fallback: jika semua attempt gagal (sangat jarang), buat berita generic
  const fallbackTexts = [
    { text: 'IHSG bergerak mixed — investor mencermati data ekonomi global terbaru', cat: 'IHSG', sentiment: 'neutral', src: 'CNBC Indonesia' },
    { text: 'Rupiah stabil di kisaran 15.800–15.900 per USD menjelang rilis data neraca perdagangan', cat: 'Rupiah', sentiment: 'neutral', src: 'Reuters' },
    { text: 'Harga komoditas global bergerak variatif — minyak turun, emas menguat', cat: 'Komoditas', sentiment: 'neutral', src: 'Bloomberg' },
    { text: 'Bank sentral Asia Tenggara pertahankan suku bunga — fokus pada stabilitas mata uang', cat: 'Suku Bunga', sentiment: 'neutral', src: 'Bloomberg' },
    { text: 'Wall Street dibuka flat — pasar menunggu data inflasi AS bulan ini', cat: 'Wall Street', sentiment: 'neutral', src: 'Reuters' },
  ];
  const fb = _pick(fallbackTexts.filter(f => !_beritaTextHistory.has(f.text)));
  const chosen = fb || _pick(fallbackTexts);
  _beritaTextHistory.add(chosen.text);
  return {
    id: Date.now() + '_fb_' + Math.random().toString(36).slice(2),
    text: chosen.text, cat: chosen.cat, sentiment: chosen.sentiment,
    src: chosen.src, impact: 0.1,
    ts: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    tsMs: Date.now(), isNew: true,
  };
}

function generateInitialBerita(count = 18) {
  beritaList = [];
  _beritaUsedRecently = new Set();
  _beritaTextHistory  = new Set(); // reset history saat init ulang
  for (let i = 0; i < count; i++) {
    const b = _generateSingleBerita();
    b.isNew = false;
    // Spread timestamps realistis ke belakang
    const minsAgo = i * _randBetween(3, 12);
    const d = new Date(Date.now() - minsAgo * 60000);
    b.ts = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    b.tsMs = d.getTime();
    beritaList.push(b);
  }
  // Urutkan: terbaru dulu
  beritaList.sort((a, b) => b.tsMs - a.tsMs);
}

function addNewBerita() {
  const b = _generateSingleBerita();

  // FIX: Deduplicate — cek apakah berita sama sudah ada (berdasarkan text)
  const isDup = beritaList.some(existing => existing.text === b.text);
  if (isDup) return; // skip duplicate, generate berita lain

  beritaList.unshift(b);

  // Trim jika terlalu panjang
  if (beritaList.length > BERITA_CFG.MAX_BERITA) {
    beritaList = beritaList.slice(0, BERITA_CFG.MAX_BERITA);
  }

  // Pengaruh ke market (opsional — sangat ringan)
  if (typeof state !== 'undefined' && b.impact > 0.4) {
    const sentMult = b.sentiment === 'bullish' ? 0.003 : b.sentiment === 'bearish' ? -0.003 : 0;
    if (sentMult !== 0 && typeof STOCKS !== 'undefined') {
      STOCKS.forEach(s => {
        if (!state.pendingNewsImpact) state.pendingNewsImpact = {};
        state.pendingNewsImpact[s.id] = (state.pendingNewsImpact[s.id] || 0) + sentMult * 0.2;
      });
    }
  }

  // Update topbar news scroll juga
  updateTopbarNewsWithBerita(b);

  renderBeritaGrid();
}

// ════════════════════════════════════════════════════════
// §6. RENDER
// ════════════════════════════════════════════════════════

function renderBeritaFilterBar() {
  const bar = document.getElementById('berita-filter-bar');
  if (!bar) return;

  // Kumpulkan kategori yang ada
  const availCats = ['Semua', ...new Set(beritaList.map(b => b.cat))];

  bar.innerHTML = availCats.slice(0, 15).map(cat => `
    <button onclick="setBeritaFilter('${cat}')" style="
      padding:5px 14px;
      border-radius:100px;
      font-family:var(--font-mono);
      font-size:10px;
      font-weight:600;
      cursor:pointer;
      border:1px solid ${beritaActiveFilter === cat ? 'var(--gold)' : 'var(--border-subtle)'};
      background:${beritaActiveFilter === cat ? 'rgba(212,175,55,0.15)' : 'var(--bg-card)'};
      color:${beritaActiveFilter === cat ? 'var(--gold)' : 'var(--text-secondary)'};
      transition:all 0.15s;
      white-space:nowrap;
    ">${cat}</button>
  `).join('');
}

function setBeritaFilter(cat) {
  beritaActiveFilter = cat;
  renderBeritaFilterBar();
  renderBeritaGrid();
}

function renderBeritaGrid() {
  const grid = document.getElementById('berita-grid');
  if (!grid) return;

  const filtered = beritaActiveFilter === 'Semua'
    ? beritaList
    : beritaList.filter(b => b.cat === beritaActiveFilter);

  if (!filtered.length) {
    grid.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);grid-column:1/-1">Tidak ada berita untuk kategori ini.</div>';
    return;
  }

  const sentColors = {
    bullish: { border: 'rgba(0,230,118,0.3)', tag: '#00E676', tagBg: 'rgba(0,230,118,0.12)', icon: '▲' },
    bearish: { border: 'rgba(239,83,80,0.3)',  tag: '#EF5350', tagBg: 'rgba(239,83,80,0.12)',  icon: '▼' },
    neutral: { border: 'rgba(212,175,55,0.2)', tag: '#D4AF37', tagBg: 'rgba(212,175,55,0.1)',  icon: '●' },
  };

  const srcIcons = {
    'CNBC Indonesia': '📺',
    'Bloomberg':      '📊',
    'Reuters':        '📰',
    'Bank Indonesia': '🏦',
    'BPS':            '📈',
    'OJK':            '🔒',
    'Kemenkeu':       '🏛️',
    'IMF / Bloomberg':'🌐',
    'S&P Global / Bloomberg': '📉',
    'TechCrunch':     '💻',
  };

  // FIX: Source URL map — news cards open real external sources in new tab
  const SRC_URLS = {
    'CNBC Indonesia':         'https://www.cnbcindonesia.com/market',
    'Bloomberg':              'https://www.bloomberg.com/markets',
    'Reuters':                'https://www.reuters.com/markets/',
    'Bank Indonesia':         'https://www.bi.go.id/id/publikasi/laporan/Pages/default.aspx',
    'BPS':                    'https://www.bps.go.id',
    'OJK':                    'https://www.ojk.go.id',
    'Kemenkeu':               'https://www.kemenkeu.go.id',
    'IMF / Bloomberg':        'https://www.imf.org/en/News',
    'S&P Global / Bloomberg': 'https://www.spglobal.com/marketintelligence',
    'TechCrunch':             'https://techcrunch.com',
    'NBS / Bloomberg':        'https://www.bloomberg.com/markets',
    'BLS / Reuters':          'https://www.bls.gov/news.release/empsit.nr0.htm',
  };

  grid.innerHTML = filtered.slice(0, BERITA_CFG.DISPLAY_PER_PAGE).map(b => {
    const sc = sentColors[b.sentiment] || sentColors.neutral;
    const srcIcon = srcIcons[b.src] || '📄';
    const isNew = b.isNew;
    // FIX: real external URL — open in new tab, NO preventDefault
    const clickUrl = SRC_URLS[b.src] || 'https://www.investing.com/news/economy';
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
         " onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
        ${isNew ? '<div style="position:absolute;top:10px;right:10px;font-family:var(--font-mono);font-size:8px;font-weight:700;color:var(--green);background:rgba(0,230,118,0.12);border:1px solid rgba(0,230,118,0.3);border-radius:100px;padding:1px 6px;letter-spacing:0.1em">NEW</div>' : ''}
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap">
          <span style="
            font-family:var(--font-mono);font-size:9px;font-weight:700;
            padding:2px 8px;border-radius:100px;
            background:${sc.tagBg};color:${sc.tag};border:1px solid ${sc.border};
            letter-spacing:0.08em;
          ">${sc.icon} ${b.sentiment.toUpperCase()}</span>
          <span style="
            font-family:var(--font-mono);font-size:9px;
            padding:2px 8px;border-radius:100px;
            background:rgba(255,255,255,0.04);color:var(--text-muted);border:1px solid var(--border-subtle);
          ">${b.cat}</span>
        </div>
        <div style="font-size:13px;font-weight:500;color:var(--text-primary);line-height:1.55;margin-bottom:10px">${b.text}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto">
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${srcIcon} ${b.src}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">${b.ts}</div>
            <div style="font-family:var(--font-mono);font-size:8px;color:var(--cyan);border:1px solid rgba(0,229,255,0.3);border-radius:4px;padding:1px 5px">↗ Baca</div>
          </div>
        </div>
      </a>
    `;
  }).join('');

  // Mark semua sebagai sudah ditampilkan (bukan new lagi)
  beritaList.forEach(b => b.isNew = false);

  renderBeritaFilterBar();
}

function updateTopbarNewsWithBerita(b) {
  const el = document.getElementById('topbar-news-scroll');
  if (!el) return;
  const icon = b.sentiment === 'bullish' ? '▲' : b.sentiment === 'bearish' ? '▼' : '●';
  const color = b.sentiment === 'bullish' ? '#00E676' : b.sentiment === 'bearish' ? '#EF5350' : '#D4AF37';
  // Prepend berita baru ke scrolling ticker
  const existing = el.innerHTML;
  const newItem = `<span style="color:${color};margin-right:4px">${icon}</span><span style="margin-right:40px">${b.text} [${b.src}]</span>`;
  el.innerHTML = newItem + existing;
}

// ════════════════════════════════════════════════════════
// §7. BANK INDONESIA BERITA (untuk tab Bank)
// ════════════════════════════════════════════════════════

function renderBankIndonesiaBerita() {
  // Inject berita BI ke dalam widget bank jika ada
  const biContainer = document.getElementById('bi-berita-panel');
  if (!biContainer) return;

  const biBerita = beritaList.filter(b => b.cat === 'BI' || b.cat === 'Perbankan' || b.cat === 'Suku Bunga').slice(0, 5);
  if (!biBerita.length) return;

  biContainer.innerHTML = biBerita.map(b => {
    const icon = b.sentiment === 'bullish' ? '▲' : b.sentiment === 'bearish' ? '▼' : '●';
    const color = b.sentiment === 'bullish' ? 'var(--green)' : b.sentiment === 'bearish' ? '#EF5350' : 'var(--gold)';
    return `
      <div style="padding:8px 0;border-bottom:1px solid var(--border-subtle)">
        <div style="display:flex;gap:6px;align-items:flex-start">
          <span style="color:${color};font-size:10px;margin-top:1px;flex-shrink:0">${icon}</span>
          <div>
            <div style="font-size:11px;color:var(--text-primary);line-height:1.4">${b.text}</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);margin-top:3px">${b.src} · ${b.ts}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════════════════════
// §8. CSS ANIMATIONS
// ════════════════════════════════════════════════════════

(function injectBeritaCSS() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes beritaFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #berita-view .panel-view { display: flex; flex-direction: column; }
    #berita-filter-bar::-webkit-scrollbar { height: 4px; }
    #berita-filter-bar::-webkit-scrollbar-thumb { background: var(--gold-dim); border-radius: 2px; }
  `;
  document.head.appendChild(style);
})();

// ════════════════════════════════════════════════════════
// §9. INIT & LOOPS
// ════════════════════════════════════════════════════════

(function initBeritaEngine() {
  function tryInit() {
    // Generate berita awal
    generateInitialBerita(20);
    renderBeritaFilterBar();

    // Render jika tab berita aktif
    if (typeof state !== 'undefined' && state.activeTab === 'berita') {
      renderBeritaGrid();
    }

    // FIX: SINGLE interval guard — prevent multiple intervals on re-init
    if (!window.__beritaLoopActive) {
      window.__beritaLoopActive = true;

      // Loop: tambah berita baru secara berkala (90 detik)
      setInterval(() => {
        addNewBerita();
        // Jika tab berita aktif, render ulang
        if (typeof state !== 'undefined' && state.activeTab === 'berita') {
          renderBeritaGrid();
        }
        // Update BI berita panel jika ada
        renderBankIndonesiaBerita();
      }, BERITA_CFG.NEW_BERITA_INTERVAL);

      // FIX: Extra rapid refresh setiap 60 detik untuk tampilan tetap segar
      setInterval(() => {
        if (typeof state !== 'undefined' && state.activeTab === 'berita') {
          renderBeritaGrid();
          renderBeritaFilterBar();
        }
      }, 60000);
    }

    // Sinkronisasi render saat tab berita dipilih
    // Patch switchTab untuk handle tab berita
    const _origSwitchTab = window.switchTab;
    if (typeof _origSwitchTab === 'function') {
      window.switchTab = function(tab) {
        _origSwitchTab(tab);
        if (tab === 'berita') {
          setTimeout(() => {
            renderBeritaGrid();
            renderBeritaFilterBar();
          }, 80);
        }
      };
    }

    console.log('✅ [BeritaEngine] Initialized — ' + beritaList.length + ' berita dimuat');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 1200));
  } else {
    setTimeout(tryInit, 1200);
  }
})();

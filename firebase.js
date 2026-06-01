// ═══════════════════════════════════════════════════════
// FIREBASE CONFIGURATION
// UNISBA VIRTUAL MARKET
// Menggunakan: Realtime Database (gratis, tanpa billing)
// ═══════════════════════════════════════════════════════
//
// ✅ SUDAH DIKONFIGURASI — project: trading-saham
//
// 🔐 LANGKAH YANG MASIH PERLU DILAKUKAN DI FIREBASE CONSOLE:
//
// 1. Aktifkan Authentication:
//    Firebase Console → Build → Authentication → Get started
//    → Sign-in method → aktifkan Email/Password & Google
//
// 2. Aktifkan Realtime Database:
//    Firebase Console → Build → Realtime Database → Create database
//    → Pilih lokasi: Singapore → Start in test mode → Enable
//
// 3. Tambahkan domain:
//    Authentication → Settings → Authorized domains
//    → Add domain → angkatan25epunisba.github.io
//
// ═══════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "AIzaSyCYvuGgF-rGd0Cp_8md1a9M5gIwA_Bpzr8",
  authDomain:        "trading-saham.firebaseapp.com",
  projectId:         "trading-saham",
  storageBucket:     "trading-saham.firebasestorage.app",
  messagingSenderId: "364734247993",
  appId:             "1:364734247993:web:bfe05e1c8e7118860849e8",
  measurementId:     "G-8CQBT7YSQB",
  databaseURL:       "https://trading-saham-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// ─── Check if config is still placeholder ───
function isPlaceholderConfig(cfg) {
  return !cfg.apiKey || cfg.apiKey.startsWith('YOUR_');
}

let db, auth, googleProvider;
let firebaseReady = false;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.info('ℹ️  Firebase SDK tidak tersedia — mode DEMO aktif');
      return false;
    }
    if (isPlaceholderConfig(firebaseConfig)) {
      console.info('ℹ️  Firebase belum dikonfigurasi — mode DEMO aktif');
      return false;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    db             = firebase.database();
    auth           = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    firebaseReady = true;
    console.log('✅ Firebase + Realtime Database initialized');
    return true;
  } catch (err) {
    console.info('ℹ️  Firebase tidak dapat diinisialisasi — mode DEMO aktif:', err.message);
    return false;
  }
}

// ─── Auth helpers ───
async function signInWithEmail(email, password) {
  if (!firebaseReady) return null;
  return auth.signInWithEmailAndPassword(email, password);
}

async function signUpWithEmail(email, password) {
  if (!firebaseReady) return null;
  return auth.createUserWithEmailAndPassword(email, password);
}

async function signInWithGoogle() {
  if (!firebaseReady) return null;
  return auth.signInWithPopup(googleProvider);
}

async function signOut() {
  if (!firebaseReady) return;
  return auth.signOut();
}

function onAuthChanged(callback) {
  if (!firebaseReady) { callback(null); return; }
  return auth.onAuthStateChanged(callback);
}

// ─── Realtime Database helpers ───
async function getUserData(uid) {
  if (!firebaseReady) return null;
  try {
    const snap = await db.ref('users/' + uid).get();
    return snap.exists() ? snap.val() : null;
  } catch (e) { console.error('getUserData error:', e); return null; }
}

async function createUserData(uid, data) {
  if (!firebaseReady) return;
  try {
    await db.ref('users/' + uid).update(data);
  } catch (e) { console.error('createUserData error:', e); }
}

async function updateUserData(uid, data) {
  if (!firebaseReady) return;
  try {
    await db.ref('users/' + uid).update(data);
  } catch (e) { console.error('updateUserData error:', e); }
}

async function getLeaderboard(limit = 50) {
  if (!firebaseReady) return [];
  try {
    const snap = await db.ref('leaderboard')
      .orderByChild('totalAssets')
      .limitToLast(limit)
      .get();
    if (!snap.exists()) return [];
    const entries = [];
    snap.forEach(child => {
      entries.push({ id: child.key, ...child.val() });
    });
    // Sort descending by totalAssets
    return entries.sort((a, b) => b.totalAssets - a.totalAssets);
  } catch (e) { console.error('getLeaderboard error:', e); return []; }
}

async function updateLeaderboard(uid, entry) {
  if (!firebaseReady) return;
  try {
    await db.ref('leaderboard/' + uid).update(entry);
  } catch (e) { console.error('updateLeaderboard error:', e); }
}

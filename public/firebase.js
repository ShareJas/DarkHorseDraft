// Loads config from Firebase Hosting when deployed.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const fallbackConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "srdwaiterdraft.firebaseapp.com",
  projectId: "srdwaiterdraft",
  storageBucket: "srdwaiterdraft.firebasestorage.app",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

async function loadConfig() {
  try {
    const res = await fetch("/__/firebase/init.json");
    if (res.ok) return await res.json();
  } catch (_) {}
  return fallbackConfig;
}

export const firebaseReady = loadConfig().then((config) => {
  const ready = Boolean(config?.apiKey) && !String(config.apiKey).startsWith("PASTE");
  if (!ready) return { ready: false, app: null, auth: null, db: null, config };
  const app = initializeApp(config);
  let db;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache() });
  } catch (_) {
    db = getFirestore(app);
  }
  return { ready: true, app, auth: getAuth(app), db, config };
});

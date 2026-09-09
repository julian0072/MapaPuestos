import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBVrAwdT55_6glwMi76cScsljO8HhRFYU0",
  authDomain: "mapadepuestos.firebaseapp.com",
  databaseURL: "https://mapadepuestos-default-rtdb.firebaseio.com",
  projectId: "mapadepuestos",
  storageBucket: "mapadepuestos.firebasestorage.app",
  messagingSenderId: "579481041761",
  appId: "1:579481041761:web:cd74c0ce41102ec68c2320"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const GROUPS_DOC = "groups/main";
const LABELS_DOC = "labels/main";
const EMPLOYEES_DOC = "employees/main";
const DESKS_COLLECTION = "desks";

export async function loadGroups() {
  try {
    const snap = await getDoc(doc(db, GROUPS_DOC));
    if (snap.exists()) return snap.data().groups;
  } catch (e) {
    console.error("Firebase loadGroups error:", e);
  }
  return null;
}

export async function loadLabels() {
  try {
    const snap = await getDoc(doc(db, LABELS_DOC));
    if (snap.exists()) return snap.data().labels;
  } catch (e) {
    console.error("Firebase loadLabels error:", e);
  }
  return null;
}

export async function saveLabels(labels) {
  try {
    const clean = JSON.parse(JSON.stringify(labels));
    await setDoc(doc(db, LABELS_DOC), { labels: clean });
  } catch (e) {
    console.error("Firebase saveLabels error:", e);
  }
}

export async function loadEmployees() {
  try {
    const snap = await getDoc(doc(db, EMPLOYEES_DOC));
    if (snap.exists()) return snap.data().employees;
  } catch (e) {
    console.error("Firebase loadEmployees error:", e);
  }
  return null;
}

export async function saveEmployees(employees) {
  try {
    const clean = JSON.parse(JSON.stringify(employees));
    await setDoc(doc(db, EMPLOYEES_DOC), { employees: clean });
  } catch (e) {
    console.error("Firebase saveEmployees error:", e);
  }
}

const DESKS_DOC = "desks_data/main";

export async function loadDesks() {
  try {
    // 1. Try single document first (fast, 1 read)
    const snap = await getDoc(doc(db, DESKS_DOC));
    if (snap.exists() && Array.isArray(snap.data().desks)) {
      return snap.data().desks;
    }
    // 2. Fallback to collection if single document not yet populated
    const colSnap = await getDocs(collection(db, DESKS_COLLECTION));
    if (!colSnap.empty) return colSnap.docs.map(d => d.data());
  } catch (e) {
    console.error("Firebase loadDesks error:", e);
  }
  return null;
}

export async function saveGroups(groups) {
  try {
    if (!groups || !Array.isArray(groups) || groups.length === 0) return;
    const clean = JSON.parse(JSON.stringify(groups));
    await setDoc(doc(db, GROUPS_DOC), { groups: clean });
  } catch (e) {
    console.error("Firebase saveGroups error:", e);
  }
}

export async function saveDesks(desks) {
  try {
    if (!desks || !Array.isArray(desks)) return;
    const cleanDeskList = JSON.parse(JSON.stringify(desks));
    // Save all desks in 1 atomic document write
    await setDoc(doc(db, DESKS_DOC), { desks: cleanDeskList });
  } catch (e) {
    console.error("Firebase saveDesks error:", e);
  }
}

export async function deleteDesk(deskId) {
  try {
    await deleteDoc(doc(db, DESKS_COLLECTION, deskId));
  } catch (e) {
    console.error("Firebase deleteDesk error:", e);
  }
}

// ─── Admin Single-Session Lock ──────────────────────────────────────────────
const ADMIN_SESSION_DOC = "sessions/admin";
const ADMIN_SESSION_TIMEOUT_MS = 45000; // 45 seconds timeout for inactive/disconnected sessions

export async function getAdminSession() {
  try {
    const snap = await getDoc(doc(db, ADMIN_SESSION_DOC));
    if (snap.exists()) {
      const data = snap.data();
      const now = Date.now();
      const isActive = data.lastActive && (now - data.lastActive < ADMIN_SESSION_TIMEOUT_MS);
      if (isActive) {
        return data;
      }
    }
  } catch (e) {
    console.error("Firebase getAdminSession error:", e);
  }
  return null;
}

export async function claimAdminSession(sessionId) {
  try {
    const now = Date.now();
    await setDoc(doc(db, ADMIN_SESSION_DOC), {
      sessionId,
      username: "administrador",
      lastActive: now,
      loggedInAt: now
    });
    return true;
  } catch (e) {
    console.error("Firebase claimAdminSession error:", e);
    return false;
  }
}

export async function pingAdminSession(sessionId) {
  try {
    const snap = await getDoc(doc(db, ADMIN_SESSION_DOC));
    if (snap.exists() && snap.data().sessionId === sessionId) {
      await setDoc(doc(db, ADMIN_SESSION_DOC), {
        ...snap.data(),
        lastActive: Date.now()
      });
      return true;
    }
  } catch (e) {
    console.error("Firebase pingAdminSession error:", e);
  }
  return false;
}

export async function releaseAdminSession(sessionId) {
  try {
    const snap = await getDoc(doc(db, ADMIN_SESSION_DOC));
    if (snap.exists() && snap.data().sessionId === sessionId) {
      await deleteDoc(doc(db, ADMIN_SESSION_DOC));
    }
  } catch (e) {
    console.error("Firebase releaseAdminSession error:", e);
  }
}

export function subscribeToAdminSession(callback) {
  return onSnapshot(doc(db, ADMIN_SESSION_DOC), (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback(null);
    }
  }, (err) => {
    console.error("subscribeToAdminSession error:", err);
  });
}

export async function migrateLocalToFirebase(localGroups, localDesks) {
  const fbGroups = await loadGroups();
  const fbDesks = await loadDesks();
  if (!fbGroups && localGroups) await saveGroups(localGroups);
  if (!fbDesks && localDesks) await saveDesks(localDesks);
}

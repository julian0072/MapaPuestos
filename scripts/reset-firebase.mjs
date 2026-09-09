import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc, collection, getDocs, writeBatch } from "firebase/firestore";

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

async function reset() {
  // Delete all desks
  const desksSnap = await getDocs(collection(db, "desks"));
  const batch = writeBatch(db);
  for (const snap of desksSnap.docs) {
    batch.delete(snap.ref);
  }
  await batch.commit();
  console.log(`Deleted ${desksSnap.size} desks`);

  // Delete groups doc
  await deleteDoc(doc(db, "groups/main"));
  console.log("Deleted groups/main");

  console.log("Firebase reset complete. Now clear localStorage and reload the app.");
}

reset().catch(console.error);

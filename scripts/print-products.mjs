import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAuDCV3qqiaMeK9noMcHeClv9ukEWVySvE",
  authDomain: "top-star-inventory.firebaseapp.com",
  projectId: "top-star-inventory",
  storageBucket: "top-star-inventory.firebasestorage.app",
};

const email = process.env.ADMIN_EMAIL || "";
const password = process.env.ADMIN_PASS || "";

if (!email || !password) {
  console.error("Missing ADMIN_EMAIL or ADMIN_PASS environment variables.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const toSafeString = (value) => (value ?? "").toString().trim();

const formatStock = (stock, spec) => {
  const safeSpec = Number.isFinite(spec) && spec > 0 ? spec : 1;
  const total = Number.isFinite(stock) ? stock : 0;
  const boxes = Math.floor(total / safeSpec);
  const items = total % safeSpec;
  return items > 0 ? `${boxes} 箱 + ${items} 个` : `${boxes} 箱`;
};

const getInitial = (name) => {
  const trimmed = toSafeString(name);
  if (!trimmed) return "#";
  return trimmed.slice(0, 1).toUpperCase();
};

try {
  await signInWithEmailAndPassword(auth, email, password);

  const snap = await getDocs(collection(db, "products"));
  const products = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  products.sort((a, b) => {
    const aName = toSafeString(a.name);
    const bName = toSafeString(b.name);
    const aInitial = getInitial(aName);
    const bInitial = getInitial(bName);
    if (aInitial !== bInitial) return aInitial.localeCompare(bInitial);
    return aName.localeCompare(bName, "zh-Hans");
  });

  console.log("款式\t首字母\t库存(箱/个)\t库存(件)");
  for (const p of products) {
    const name = toSafeString(p.name) || "(未命名)";
    const initial = getInitial(name);
    const spec = Number(p.spec) || 1;
    const stock = Number(p.stock) || 0;
    console.log(`${name}\t${initial}\t${formatStock(stock, spec)}\t${stock}`);
  }
} catch (err) {
  console.error("Failed to fetch products:", err?.message || err);
  process.exit(1);
}

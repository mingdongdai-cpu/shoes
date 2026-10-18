import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAuDCV3qqiaMeK9noMcHeClv9ukEWVySvE",
  authDomain: "top-star-inventory.firebaseapp.com",
  projectId: "top-star-inventory",
  storageBucket: "top-star-inventory.firebasestorage.app",
  messagingSenderId: "956903579953",
  appId: "1:956903579953:web:4d01a47843a20e4ae51010"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const nigeriaFirebaseConfig = {
  apiKey: "AIzaSyBmPTX-qyeU5qd74hi5dCHU3zWclu2NlJA",
  authDomain: "nigeria-shoes-store.firebaseapp.com",
  projectId: "nigeria-shoes-store",
  storageBucket: "nigeria-shoes-store.firebasestorage.app",
  messagingSenderId: "83713957251",
  appId: "1:83713957251:web:2ed54f94c50dbd8af76ab6"
};

const nigeriaApp = initializeApp(nigeriaFirebaseConfig, 'nigeria');
export const nigeriaDb = getFirestore(nigeriaApp);
export const nigeriaAuth = getAuth(nigeriaApp);

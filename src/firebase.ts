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

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

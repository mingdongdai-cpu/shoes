import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { app, db } from '../firebase';
import type { User } from '../types';

export type PushRole = Exclude<User['role'], 'order'>;

const PUSH_TOKEN_KEY = 'topstar.pushToken';

const readStoredToken = () => {
  try {
    return localStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const writeStoredToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(PUSH_TOKEN_KEY, token);
    else localStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    // Storage can be unavailable in private mode; the token doc stays the source of truth.
  }
};

export async function isPushSupported(): Promise<boolean> {
  return 'Notification' in window && 'serviceWorker' in navigator && await isSupported();
}

export function isPushEnabledOnDevice(): boolean {
  return Notification.permission === 'granted' && readStoredToken() !== null;
}

export async function registerPush(uid: string, role: PushRole): Promise<void> {
  const registration = await navigator.serviceWorker.register('/sw.js');
  const token = await getToken(getMessaging(app), { serviceWorkerRegistration: registration });
  await setDoc(doc(db, 'pushTokens', token), { uid, role, updatedAt: serverTimestamp() });
  const previousToken = readStoredToken();
  if (previousToken && previousToken !== token) await deleteDoc(doc(db, 'pushTokens', previousToken));
  writeStoredToken(token);
}

export async function enablePush(uid: string, role: PushRole): Promise<boolean> {
  if (await Notification.requestPermission() !== 'granted') return false;
  await registerPush(uid, role);
  return true;
}

export async function unregisterPush(): Promise<void> {
  const token = readStoredToken();
  if (!token) return;
  await deleteDoc(doc(db, 'pushTokens', token));
  await deleteToken(getMessaging(app));
  writeStoredToken(null);
}

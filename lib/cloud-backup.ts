import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BackupPayload } from "./order-store";

const FIREBASE_API_KEY = "AIzaSyBqFc5BUskYk6dQUvQe7Gy6kNOFvOH7YMI";
const FIREBASE_PROJECT_ID = "orders-app-84cb4";
const FIREBASE_BUCKET = "orders-app-84cb4.firebasestorage.app";
const AUTH_KEY = "orderakan.firebase.session.v1";
const LAST_BACKUP_KEY = "orderakan.firebase.lastBackup.v1";

type FirebaseSession = { email: string; localId: string; idToken: string; refreshToken: string; expiresIn: string };

async function authRequest(endpoint: string, payload: object): Promise<FirebaseSession> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${FIREBASE_API_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "AUTH_FAILED");
  const session = { email: body.email, localId: body.localId, idToken: body.idToken, refreshToken: body.refreshToken, expiresIn: body.expiresIn };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export async function signUp(email: string, password: string) { return authRequest("signUp", { email, password, returnSecureToken: true }); }
export async function signIn(email: string, password: string) { return authRequest("signInWithPassword", { email, password, returnSecureToken: true }); }
export async function signOut() { await AsyncStorage.removeItem(AUTH_KEY); }
export async function getSession(): Promise<FirebaseSession | null> { const raw = await AsyncStorage.getItem(AUTH_KEY); if (!raw) return null; try { return JSON.parse(raw) as FirebaseSession; } catch { return null; } }

export async function uploadCloudBackup(payload: BackupPayload) {
  const session = await getSession();
  if (!session) throw new Error("NOT_SIGNED_IN");
  const path = `backups/${session.localId}/latest.json`;
  const response = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(FIREBASE_BUCKET)}/o?uploadType=media&name=${encodeURIComponent(path)}`, { method: "POST", headers: { Authorization: `Bearer ${session.idToken}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("UPLOAD_FAILED");
  await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
}

export async function downloadCloudBackup(): Promise<BackupPayload> {
  const session = await getSession();
  if (!session) throw new Error("NOT_SIGNED_IN");
  const path = `backups/${session.localId}/latest.json`;
  const response = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(FIREBASE_BUCKET)}/o/${encodeURIComponent(path)}?alt=media`, { headers: { Authorization: `Bearer ${session.idToken}` } });
  if (!response.ok) throw new Error("DOWNLOAD_FAILED");
  return (await response.json()) as BackupPayload;
}

export async function shouldAutoBackup(frequency: "daily" | "monthly" | "never") {
  if (frequency === "never") return false;
  const last = await AsyncStorage.getItem(LAST_BACKUP_KEY);
  if (!last) return true;
  const elapsed = Date.now() - new Date(last).getTime();
  return frequency === "daily" ? elapsed >= 24 * 60 * 60 * 1000 : elapsed >= 28 * 24 * 60 * 60 * 1000;
}

export { FIREBASE_PROJECT_ID };

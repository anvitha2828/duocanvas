import * as SecureStore from "expo-secure-store";
import { generateId } from "./id";

const USER_ID_KEY = "duocanvas-user-id";

// SecureStore persists across app restarts (Keychain-backed), so the same
// device keeps the same userId instead of generating a new one every
// launch. This is what lets the app recognize "rooms this device created".
export async function getOrCreateUserId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(USER_ID_KEY);
  if (existing) return existing;
  const id = generateId("user-");
  await SecureStore.setItemAsync(USER_ID_KEY, id);
  return id;
}

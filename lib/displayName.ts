import * as SecureStore from "expo-secure-store";

const DISPLAY_NAME_KEY = "duocanvas-display-name";

// Separate from userId on purpose: userId is the unique, collision-proof
// identity used for data lookups, while displayName is just a label the
// user can change anytime without affecting their history.
export async function getDisplayName(): Promise<string | null> {
  return SecureStore.getItemAsync(DISPLAY_NAME_KEY);
}

export async function setDisplayName(name: string): Promise<void> {
  await SecureStore.setItemAsync(DISPLAY_NAME_KEY, name);
}

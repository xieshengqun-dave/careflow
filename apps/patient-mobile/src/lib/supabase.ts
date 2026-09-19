import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Session storage is AsyncStorage, per Supabase's React Native guidance.
// NOT expo-secure-store: SecureStore values are capped at 2048 bytes on
// Android and a Supabase session JSON (JWT + refresh token + user) is
// several KB, which corrupts/hangs session reads on cold start.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Token auto-refresh runs only while the app is foregrounded (Supabase RN
// guidance) — without this, a cold start with an expired token does the
// refresh inline inside getSession(), which is the hang-prone path.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

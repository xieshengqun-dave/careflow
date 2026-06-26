import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export async function registerForPushNotificationsAsync(): Promise<{ token?: string; error?: string }> {
  // Dynamic import keeps expo-notifications out of the module graph at startup.
  // It crashes Expo Go on SDK 53+ (remote push removed), which would poison
  // the React module state and break hooks in the entire app if imported statically.
  let Notifications: typeof import("expo-notifications");
  try {
    Notifications = await import("expo-notifications");
  } catch {
    return { error: "expo-notifications not available in this environment" };
  }

  // Expo Go (SDK 53+) removes remote push support — the module loads but
  // individual APIs throw. Wrap everything so the app never crashes here.
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      return { error: "Notification permission not granted" };
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      return { error: "No EAS project configured (extra.eas.projectId missing)" };
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const platform = Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB";

    const { error } = await supabase
      .from("device_tokens")
      .upsert({ user_id: user.id, token, platform }, { onConflict: "user_id,token" });

    if (error) return { error: error.message };
    return { token };
  } catch {
    return { error: "Push notification not supported in this environment" };
  }
}

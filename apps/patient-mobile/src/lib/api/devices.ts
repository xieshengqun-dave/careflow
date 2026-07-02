import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export async function registerForPushNotificationsAsync(): Promise<{ token?: string; error?: string }> {
  // Expo Go SDK 53+ removed remote push notifications entirely. The native module
  // throws during construction before any JS try/catch can intercept it, which
  // poisons React's module state. Bail out before touching expo-notifications.
  if (Constants.appOwnership === "expo") {
    return { error: "Push notifications require a development build, not Expo Go" };
  }

  let Notifications: typeof import("expo-notifications");
  try {
    Notifications = await import("expo-notifications");
  } catch {
    return { error: "expo-notifications not available in this environment" };
  }

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

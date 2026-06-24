import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export async function registerForPushNotificationsAsync(): Promise<{ token?: string; error?: string }> {
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
    // TODO: run `eas init` to link this app to an EAS project, then set
    // extra.eas.projectId in app.json. Until then there's no project to
    // request an Expo push token against, so registration is skipped.
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
}

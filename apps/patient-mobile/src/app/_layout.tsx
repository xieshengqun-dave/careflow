import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuthStore();

  useAuth();

  useEffect(() => {
    if (isLoading) return;
    void SplashScreen.hideAsync();

    const inAuthGroup  = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!user) {
      if (!inAuthGroup) router.replace("/(auth)/login");
    } else {
      if (inAuthGroup || inOnboarding) router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)"     options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"     options={{ headerShown: false }} />
      <Stack.Screen name="clinic/search"    options={{ headerShown: true,  title: "Find a Clinic", headerBackTitle: "Back", headerTintColor: "#0284c7" }} />
      <Stack.Screen name="clinic/[clinicId]" options={{ headerShown: true, title: "Clinic", headerBackTitle: "Back", headerTintColor: "#0284c7" }} />
      <Stack.Screen name="queue/[queueId]"  options={{ headerShown: true,  title: "Queue Status", headerBackTitle: "Back", headerTintColor: "#0284c7" }} />
      <Stack.Screen name="queue/join"       options={{ headerShown: true,  title: "Join Queue",   headerBackTitle: "Back", headerTintColor: "#0284c7" }} />
      <Stack.Screen name="booking/[doctorId]" options={{ headerShown: true, title: "Book Appointment", headerBackTitle: "Back", headerTintColor: "#0284c7" }} />
      <Stack.Screen name="booking/confirm"    options={{ headerShown: true, title: "Confirm Booking",  headerBackTitle: "Back", headerTintColor: "#0284c7" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return <RootLayoutNav />;
}

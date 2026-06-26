import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { SplashView } from "@/components/SplashView";
import { fontsToLoad } from "@/theme/typography";
import { palette } from "@/theme/careflow-tokens";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuthStore();

  useAuth();

  // Hand off from the native splash to our own branded SplashView as soon as
  // the JS layer mounts, so the gradient mockup screen shows instead of the
  // native splash's flat background while auth state is being determined.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup  = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!user) {
      if (!inAuthGroup) router.replace("/(auth)/login");
    } else {
      if (inAuthGroup || inOnboarding) router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return <SplashView />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="clinic/search"    options={{ headerShown: true,  title: "Find a Clinic", headerBackTitle: "Back", headerTintColor: palette.primary600 }} />
      <Stack.Screen name="clinic/[clinicId]" options={{ headerShown: true, title: "Clinic", headerBackTitle: "Back", headerTintColor: palette.primary600 }} />
      <Stack.Screen name="queue/[queueId]"  options={{ headerShown: true,  title: "Queue Status", headerBackTitle: "Back", headerTintColor: palette.primary600 }} />
      <Stack.Screen name="queue/join"       options={{ headerShown: true,  title: "Join Queue",   headerBackTitle: "Back", headerTintColor: palette.primary600 }} />
      <Stack.Screen name="booking/[doctorId]" options={{ headerShown: true, title: "Book Appointment", headerBackTitle: "Back", headerTintColor: palette.primary600 }} />
      <Stack.Screen name="booking/confirm"    options={{ headerShown: true, title: "Confirm Booking",  headerBackTitle: "Back", headerTintColor: palette.primary600 }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontsToLoad);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}

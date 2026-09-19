import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { SplashView } from "@/components/SplashView";
import { fontsToLoad } from "@/theme/typography";

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
    } else if (!user.fullName) {
      // Signed in but no name yet (fresh OTP signup) — capture it first
      if (!inOnboarding) router.replace("/onboarding");
    } else {
      if (inAuthGroup || inOnboarding) router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return <SplashView />;
  }

  // No native stack headers anywhere: every pushed screen draws its own
  // in-page header with a back button (matching the /UI mockups). Enabling
  // both produced a doubled header + back button on device builds.
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);

  // fontError: fonts failed to download (network issue, etc.) — proceed with system fonts
  // rather than hanging on the native splash screen forever.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}

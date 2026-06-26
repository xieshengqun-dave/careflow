import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { updateProfile } from "@/lib/auth";
import { palette } from "@/theme/careflow-tokens";

export default function OnboardingScreen() {
  const { user, loadUser } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isValid = fullName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!isValid || !user?.id) return;
    setIsLoading(true);
    try {
      const { error } = await updateProfile(user.id, { full_name: fullName.trim() });
      if (error) { Alert.alert("Error", error.message); return; }
      await loadUser();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor={palette.primary700} />
      <View style={styles.hero}>
        <SafeAreaView edges={["top"]}>
          <Text style={styles.heroText}>👋</Text>
          <Text style={styles.heroTitle}>Welcome to CareFlow</Text>
          <Text style={styles.heroSub}>Let's get your profile set up.</Text>
        </SafeAreaView>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>What's your name?</Text>
        <Text style={styles.sub}>This is how clinics will identify you.</Text>

        <TextInput
          style={[styles.input, fullName.length > 0 && styles.inputActive]}
          placeholder="Your full name"
          placeholderTextColor={palette.slate400}
          value={fullName}
          onChangeText={setFullName}
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          accessibilityLabel="Full name input"
        />

        <TouchableOpacity
          style={[styles.btn, (!isValid || isLoading) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isLoading}
          activeOpacity={0.85}
          accessibilityLabel="Save name and continue"
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>{isLoading ? "Saving…" : "Get Started"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.primary700 },
  hero: {
    flex: 1, backgroundColor: palette.primary700,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20,
    justifyContent: "flex-end",
  },
  heroText: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 30, fontWeight: "800", color: palette.surface, marginBottom: 6 },
  heroSub: { fontSize: 16, color: palette.primary100 },
  card: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48,
  },
  heading: { fontSize: 22, fontWeight: "700", color: palette.slate900, marginBottom: 6 },
  sub: { fontSize: 14, color: palette.slate500, marginBottom: 28, lineHeight: 20 },
  input: {
    borderWidth: 1.5, borderColor: palette.slate200, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 17, color: palette.slate900, marginBottom: 20,
    backgroundColor: palette.appBg,
  },
  inputActive: { borderColor: palette.primary700, backgroundColor: palette.surface },
  btn: {
    backgroundColor: palette.primary700, borderRadius: 12,
    paddingVertical: 16, alignItems: "center",
  },
  btnDisabled: { backgroundColor: palette.primary100 },
  btnText: { color: palette.surface, fontSize: 16, fontWeight: "700" },
});

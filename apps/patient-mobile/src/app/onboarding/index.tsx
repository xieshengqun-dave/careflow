import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, StatusBar, SafeAreaView,
} from "react-native";
import { useAuthStore } from "@/store/authStore";
import { updateProfile } from "@/lib/auth";

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
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />
      <View style={styles.hero}>
        <SafeAreaView>
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
          placeholderTextColor="#94a3b8"
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
  container: { flex: 1, backgroundColor: "#0284c7" },
  hero: {
    flex: 1, backgroundColor: "#0284c7",
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20,
    justifyContent: "flex-end",
  },
  heroText: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 30, fontWeight: "800", color: "#ffffff", marginBottom: 6 },
  heroSub: { fontSize: 16, color: "#bae6fd" },
  card: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48,
  },
  heading: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  sub: { fontSize: 14, color: "#64748b", marginBottom: 28, lineHeight: 20 },
  input: {
    borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 17, color: "#0f172a", marginBottom: 20,
    backgroundColor: "#f8fafc",
  },
  inputActive: { borderColor: "#0284c7", backgroundColor: "#ffffff" },
  btn: {
    backgroundColor: "#0284c7", borderRadius: 12,
    paddingVertical: 16, alignItems: "center",
  },
  btnDisabled: { backgroundColor: "#bae6fd" },
  btnText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});

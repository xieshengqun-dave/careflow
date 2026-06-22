import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "dev@careflow.my",
        password: "CareFlow2026",
      });
      if (error) {
        Alert.alert(
          "Login failed",
          "Run the dev patient SQL in Supabase first.\n\n" + error.message
        );
      }
      // Navigation handled automatically by useAuth → onAuthStateChange → loadUser
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo area */}
          <View style={styles.logoArea}>
            <Image
              source={require("../../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="CareFlow"
            />
            <Text style={styles.logoSub}>Smart Queue & Appointment Management for Clinics</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subheading}>Login to continue to your account</Text>

            <Text style={styles.label}>Mobile Number</Text>
            <View style={[styles.phoneRow, phone.length > 0 && styles.phoneRowActive]}>
              <View style={styles.prefix}>
                <Text style={styles.flag}>🇲🇾</Text>
                <Text style={styles.prefixCode}>+60</Text>
                <Icon name="chevron-down-outline" size={14} color="#64748B" />
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="12-345 6789"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 11))}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSend}
                accessibilityLabel="Phone number"
              />
            </View>
            <Text style={styles.hint}>Enter your number to continue</Text>

            <TouchableOpacity
              style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Login"
            >
              <Text style={styles.sendBtnText}>{loading ? "Signing in…" : "Continue"}</Text>
              {!loading && <Icon name="arrow-forward-outline" size={18} color="#ffffff" />}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
              <Icon name="logo-apple" size={18} color="#1E293B" />
              <Text style={styles.socialBtnText}>Continue with Apple</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing, you agree to our{" "}
              <Text style={styles.termsLink}>Terms & Conditions</Text>
              {" "}and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Help row */}
          <TouchableOpacity style={styles.helpRow} activeOpacity={0.7}>
            <View style={styles.helpIcon}>
              <Icon name="headset-outline" size={18} color="#1A6FD8" />
            </View>
            <View style={styles.helpText}>
              <Text style={styles.helpTitle}>Need help?</Text>
              <Text style={styles.helpSub}>Contact our support team</Text>
            </View>
            <Icon name="chevron-forward-outline" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FA" },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  logoArea: { alignItems: "center", paddingVertical: 32 },
  logoImage: { width: 220, height: 99, marginBottom: 8 },
  logoSub: { fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 4, maxWidth: 220, lineHeight: 18 },

  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    marginBottom: 16,
  },
  heading: { fontSize: 24, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  subheading: { fontSize: 14, color: "#64748B", marginBottom: 24, lineHeight: 20 },

  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 8 },
  phoneRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#E2E8F0",
    borderRadius: 12, overflow: "hidden",
    marginBottom: 8, backgroundColor: "#F8FAFC",
  },
  phoneRowActive: { borderColor: "#1A6FD8", backgroundColor: "#FFFFFF" },
  prefix: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 14,
    backgroundColor: "#F1F5F9",
    borderRightWidth: 1, borderRightColor: "#E2E8F0",
  },
  flag: { fontSize: 16 },
  prefixCode: { fontSize: 14, fontWeight: "600", color: "#334155" },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: "#1E293B" },
  hint: { fontSize: 12, color: "#94A3B8", marginBottom: 20, lineHeight: 18 },

  sendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1A6FD8", borderRadius: 12, paddingVertical: 15, marginBottom: 24,
  },
  sendBtnDisabled: { backgroundColor: "#93C5FD" },
  sendBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },

  socialBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12,
    paddingVertical: 13, marginBottom: 12, backgroundColor: "#FFFFFF",
  },
  googleIcon: { fontSize: 16, fontWeight: "700", color: "#1A73E8" },
  socialBtnText: { fontSize: 14, fontWeight: "600", color: "#1E293B" },

  terms: { fontSize: 11, color: "#94A3B8", textAlign: "center", lineHeight: 18, marginTop: 8 },
  termsLink: { color: "#1A6FD8", fontWeight: "500" },

  helpRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  helpIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center",
  },
  helpText: { flex: 1 },
  helpTitle: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  helpSub: { fontSize: 12, color: "#94A3B8" },
});

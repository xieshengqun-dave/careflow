import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { sendOTP } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

// Dev-only test account — see HANDOFF.md. Real phone OTP delivery is blocked
// by an invalid Twilio config on the Supabase project (not fixable from the
// app); this lets you log in and test the rest of the app in the meantime.
const DEV_TEST_EMAIL = "test.patient@careflow.asia";
const DEV_TEST_PASSWORD = "CareFlowTest2026";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);

  const handleDevLogin = async () => {
    if (devLoading) return;
    setDevLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEV_TEST_EMAIL,
        password: DEV_TEST_PASSWORD,
      });
      if (error) Alert.alert("Dev login failed", error.message);
      // Navigation handled automatically by useAuth → onAuthStateChange → loadUser
    } finally {
      setDevLoading(false);
    }
  };

  const handleSend = async () => {
    if (loading || phone.length < 9) return;
    setLoading(true);
    try {
      const fullPhone = `+60${phone}`;
      const { error } = await sendOTP(fullPhone);
      if (error) {
        Alert.alert("Could not send OTP", error.message);
        return;
      }
      router.push({ pathname: "/(auth)/otp", params: { phone: fullPhone } });
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
              source={require("../../../assets/images/careflow-mark.png")}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="CareFlow"
            />
            <Text style={styles.logoSub}>Smart Queue & Appointment Management for Clinics</Text>
          </View>

          {/* Form card */}
          <Card style={styles.card}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subheading}>Login to continue to your account</Text>

            <Text style={styles.label}>Mobile Number</Text>
            <View style={[styles.phoneRow, phone.length > 0 && styles.phoneRowActive]}>
              <View style={styles.prefix}>
                <Text style={styles.flag}>🇲🇾</Text>
                <Text style={styles.prefixCode}>+60</Text>
                <Icon name="chevron-down-outline" size={14} color={palette.slate500} />
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="12-345 6789"
                placeholderTextColor={palette.slate400}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 11))}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSend}
                accessibilityLabel="Phone number"
              />
            </View>
            <Text style={styles.hint}>We will send a 6-digit OTP to your mobile number</Text>

            <Button
              label={loading ? "Sending…" : "Send OTP"}
              onPress={handleSend}
              loading={loading}
              icon="arrow-forward"
              style={styles.sendBtn}
            />

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
              <Icon name="logo-apple" size={18} color={palette.slate900} />
              <Text style={styles.socialBtnText}>Continue with Apple</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing, you agree to our{" "}
              <Text style={styles.termsLink}>Terms & Conditions</Text>
              {" "}and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </Card>

          {__DEV__ && (
            <TouchableOpacity
              style={[styles.devBtn, devLoading && styles.devBtnDisabled]}
              onPress={handleDevLogin}
              disabled={devLoading}
              activeOpacity={0.85}
            >
              <Icon name="bug-outline" size={16} color={palette.amber700} />
              <Text style={styles.devBtnText}>
                {devLoading ? "Signing in…" : "Dev: Skip Login (Test Patient)"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Help row */}
          <Card style={styles.helpRow} padded={false}>
            <TouchableOpacity style={styles.helpRowInner} activeOpacity={0.7}>
              <View style={styles.helpIcon}>
                <Icon name="headset-outline" size={18} color={palette.primary600} />
              </View>
              <View style={styles.helpText}>
                <Text style={styles.helpTitle}>Need help?</Text>
                <Text style={styles.helpSub}>Contact our support team</Text>
              </View>
              <Icon name="chevron-forward-outline" size={16} color={palette.slate400} />
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.appBg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing["2xl"] },

  logoArea: { alignItems: "center", paddingVertical: spacing["3xl"] },
  logoImage: { width: 160, height: 114, marginBottom: spacing.xs },
  logoSub: { ...textStyle("body"), color: palette.slate400, textAlign: "center", marginTop: spacing.xs, maxWidth: 220, lineHeight: 18 },

  card: { marginBottom: spacing.lg, padding: spacing["2xl"], borderRadius: radius.xl },
  heading: { ...textStyle("h1"), color: palette.slate900, marginBottom: spacing.xs },
  subheading: { ...textStyle("body"), color: palette.slate500, marginBottom: spacing["2xl"], lineHeight: 20 },

  label: { ...textStyle("label"), color: palette.slate700, marginBottom: spacing.sm },
  phoneRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: palette.slate200,
    borderRadius: radius.md, overflow: "hidden",
    marginBottom: spacing.sm, backgroundColor: palette.slate100,
  },
  phoneRowActive: { borderColor: palette.primary600, backgroundColor: palette.surface },
  prefix: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    backgroundColor: palette.slate100,
    borderRightWidth: 1, borderRightColor: palette.slate200,
  },
  flag: { fontSize: 16 },
  prefixCode: { ...textStyle("body"), fontFamily: fontFamily(600), color: palette.slate700 },
  phoneInput: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 16, fontFamily: fontFamily(400), color: palette.slate900 },
  hint: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate400, marginBottom: spacing.xl, lineHeight: 18 },

  sendBtn: { marginBottom: spacing["2xl"] },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: palette.slate200 },
  dividerText: { ...textStyle("caption"), color: palette.slate400 },

  socialBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    borderWidth: 1.5, borderColor: palette.slate200, borderRadius: radius.md,
    paddingVertical: 13, marginBottom: spacing.md, backgroundColor: palette.surface,
  },
  googleIcon: { fontSize: 16, fontFamily: fontFamily(700), color: "#1A73E8" },
  socialBtnText: { ...textStyle("body"), fontFamily: fontFamily(600), color: palette.slate900 },

  terms: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate400, textAlign: "center", lineHeight: 18, marginTop: spacing.xs },
  termsLink: { color: palette.primary600, fontFamily: fontFamily(500) },

  devBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: palette.amber100, borderWidth: 1.5, borderColor: palette.amber500, borderStyle: "dashed",
    borderRadius: radius.md, paddingVertical: 13, marginBottom: spacing.lg,
  },
  devBtnDisabled: { opacity: 0.6 },
  devBtnText: { color: palette.amber700, ...textStyle("label") },

  helpRow: { borderRadius: radius.lg },
  helpRowInner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md,
  },
  helpIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: palette.primary50, justifyContent: "center", alignItems: "center",
  },
  helpText: { flex: 1 },
  helpTitle: { ...textStyle("body"), fontFamily: fontFamily(600), color: palette.slate900 },
  helpSub: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate400 },
});

import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { verifyOTP } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

const OTP_LEN = 6;
const RESEND_S = 60;

export default function OTPScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_S);
  const refs = useRef<(TextInput | null)[]>(Array(OTP_LEN).fill(null));

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleDigit = (text: string, i: number) => {
    const d = text.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = d; setOtp(next);
    if (d && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
    const full = next.join("");
    if (full.length === OTP_LEN && next.every((x) => x)) void verify(full);
  };
  const handleKey = (key: string, i: number) => {
    if (key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const verify = async (code: string) => {
    if (!phone) return;
    setLoading(true);
    try {
      const { error } = await verifyOTP(phone, code);
      if (error) {
        Alert.alert("Incorrect Code", "Please try again.");
        setOtp(Array(OTP_LEN).fill(""));
        refs.current[0]?.focus();
      }
    } catch { Alert.alert("Error", "Something went wrong."); }
    finally { setLoading(false); }
  };
  const resend = async () => {
    if (countdown > 0) return;
    const { sendOTP } = await import("@/lib/auth");
    const { error } = await sendOTP(phone!);
    if (error) { Alert.alert("Error", "Failed to resend."); return; }
    setCountdown(RESEND_S);
    setOtp(Array(OTP_LEN).fill(""));
    refs.current[0]?.focus();
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const masked = phone ? phone.replace(/(\+60)(\d{2})(\d+)(\d{2})/, "$1 $2-***$4") : "";
  const isComplete = otp.every((d) => d) && otp.join("").length === OTP_LEN;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <Icon name="chevron-back" size={24} color={palette.slate900} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpBtn}>
            <Icon name="help-circle-outline" size={16} color={palette.primary600} />
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.sub}>We've sent a 6-digit OTP to your{"\n"}mobile number</Text>

          <View style={styles.phoneRow}>
            <Text style={styles.phoneText}>{masked}</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* OTP boxes */}
          <View style={styles.boxes}>
            {otp.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { refs.current[i] = r; }}
                style={[styles.box, d ? styles.boxFilled : null, loading && styles.boxLoading]}
                value={d}
                onChangeText={(t) => handleDigit(t, i)}
                onKeyPress={({ nativeEvent }) => handleKey(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                editable={!loading}
                accessibilityLabel={`OTP digit ${i + 1}`}
              />
            ))}
          </View>

          {/* Security note */}
          <View style={styles.secureRow}>
            <Icon name="shield-checkmark-outline" size={14} color={palette.green600} />
            <Text style={styles.secureText}>
              Your OTP is secure and will expire in{" "}
              <Text style={styles.timer}>{pad(mins)}:{pad(secs)}</Text>
            </Text>
          </View>

          {/* Illustration placeholder */}
          <View style={styles.illustration}>
            <View style={styles.illustrationIconWrap}>
              <Icon name="phone-portrait-outline" size={40} color={palette.slate400} />
              <View style={styles.illustrationBadge}>
                <Icon name="shield-checkmark" size={18} color={palette.green600} />
              </View>
            </View>
            <Text style={styles.illustrationLabel}>[ secure OTP illustration ]</Text>
          </View>

          {/* Resend */}
          <View style={styles.resendRow}>
            <View style={styles.resendIcon}>
              <Icon name="chatbubble-outline" size={16} color={palette.slate500} />
            </View>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>Resend OTP  <Text style={styles.countdownNum}>{pad(mins)}:{pad(secs)}</Text></Text>
            ) : (
              <TouchableOpacity onPress={resend} accessibilityLabel="Resend OTP">
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Security banner */}
          <Card style={styles.securityBanner}>
            <Icon name="lock-closed-outline" size={16} color={palette.primary600} />
            <View style={styles.securityBannerText}>
              <Text style={styles.securityTitle}>Your security is our priority</Text>
              <Text style={styles.securitySub}>We never share your information with anyone.</Text>
            </View>
          </Card>

          <Button
            label={loading ? "Verifying…" : "Verify & Continue"}
            onPress={() => void verify(otp.join(""))}
            disabled={!isComplete}
            loading={loading}
            style={styles.verifyBtn}
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.surface },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  backBtn: { padding: spacing.xs },
  helpBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, padding: spacing.xs },
  helpText: { ...textStyle("body"), fontFamily: fontFamily(500), color: palette.primary600 },
  scroll: { paddingHorizontal: spacing["2xl"], paddingBottom: spacing["2xl"] },

  title: { fontSize: 26, fontFamily: fontFamily(800), color: palette.slate900, marginBottom: spacing.xs, marginTop: spacing.xs, letterSpacing: -0.3 },
  sub: { ...textStyle("body"), color: palette.slate500, lineHeight: 22, marginBottom: spacing.xl },

  phoneRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing["2xl"] },
  phoneText: { ...textStyle("body"), fontFamily: fontFamily(600), color: palette.slate900 },
  changeText: { ...textStyle("body"), fontFamily: fontFamily(500), color: palette.primary600 },

  boxes: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg, justifyContent: "center" },
  box: {
    width: 46, height: 56, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: palette.slate200,
    backgroundColor: palette.slate100,
    fontSize: 24, fontFamily: fontFamily(700), color: palette.slate900,
  },
  boxFilled: { borderColor: palette.primary600, backgroundColor: palette.primary50 },
  boxLoading: { opacity: 0.5 },

  secureRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    justifyContent: "center", marginBottom: spacing["2xl"],
  },
  secureText: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate500 },
  timer: { fontFamily: fontFamily(600), color: palette.green600 },

  illustration: {
    alignItems: "center", justifyContent: "center", gap: spacing.sm,
    marginBottom: spacing["2xl"],
    backgroundColor: palette.slate100, borderRadius: radius.lg, paddingVertical: spacing["2xl"],
  },
  illustrationIconWrap: { position: "relative", width: 56, height: 40, alignItems: "center" },
  illustrationLabel: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate400 },
  illustrationBadge: {
    position: "absolute", bottom: -8, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: palette.green50,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: palette.surface,
  },

  resendRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: palette.slate100, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.lg,
  },
  resendIcon: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: palette.slate200,
    justifyContent: "center", alignItems: "center",
  },
  resendLabel: { flex: 1, ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate500 },
  resendLink: { ...textStyle("label"), color: palette.primary600 },
  countdownText: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate400 },
  countdownNum: { fontFamily: fontFamily(600), color: palette.slate500 },

  securityBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: palette.primary50, borderWidth: 1, borderColor: "#BFDBFE",
    marginBottom: spacing.lg,
  },
  securityBannerText: { flex: 1 },
  securityTitle: { ...textStyle("label"), color: palette.slate900 },
  securitySub: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate500, marginTop: 2 },

  verifyBtn: { marginBottom: spacing.lg },
});

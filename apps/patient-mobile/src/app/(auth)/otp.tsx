import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, SafeAreaView, ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { verifyOTP } from "@/lib/auth";

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

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <Icon name="arrow-back-outline" size={22} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpBtn}>
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
            <Icon name="shield-checkmark-outline" size={14} color="#16A34A" />
            <Text style={styles.secureText}>
              Your OTP is secure and will expire in{" "}
              <Text style={styles.timer}>{pad(mins)}:{pad(secs)}</Text>
            </Text>
          </View>

          {/* Illustration */}
          <View style={styles.illustration}>
            <Text style={styles.illustrationEmoji}>📱</Text>
            <View style={styles.illustrationBadge}>
              <Icon name="shield-checkmark" size={20} color="#16A34A" />
            </View>
          </View>

          {/* Resend */}
          <View style={styles.resendRow}>
            <View style={styles.resendIcon}>
              <Icon name="chatbubble-outline" size={16} color="#64748B" />
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
          <View style={styles.securityBanner}>
            <Icon name="lock-closed-outline" size={16} color="#1A6FD8" />
            <View style={styles.securityBannerText}>
              <Text style={styles.securityTitle}>Your security is our priority</Text>
              <Text style={styles.securitySub}>We never share your information with anyone.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  helpBtn: { padding: 4 },
  helpText: { fontSize: 14, color: "#1A6FD8", fontWeight: "500" },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  title: { fontSize: 26, fontWeight: "700", color: "#1E293B", marginBottom: 8, marginTop: 8 },
  sub: { fontSize: 14, color: "#64748B", lineHeight: 22, marginBottom: 20 },

  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  phoneText: { fontSize: 15, fontWeight: "600", color: "#1E293B" },
  changeText: { fontSize: 14, color: "#1A6FD8", fontWeight: "500" },

  boxes: { flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "center" },
  box: {
    width: 46, height: 56, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    fontSize: 24, fontWeight: "700", color: "#1E293B",
  },
  boxFilled: { borderColor: "#1A6FD8", backgroundColor: "#EFF6FF" },
  boxLoading: { opacity: 0.5 },

  secureRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    justifyContent: "center", marginBottom: 28,
  },
  secureText: { fontSize: 12, color: "#64748B" },
  timer: { fontWeight: "600", color: "#16A34A" },

  illustration: {
    alignItems: "center", justifyContent: "center",
    marginBottom: 28, position: "relative",
  },
  illustrationEmoji: { fontSize: 72 },
  illustrationBadge: {
    position: "absolute", bottom: 0, right: "30%",
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#DCFCE7",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#FFFFFF",
  },

  resendRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F8FAFC", borderRadius: 12, padding: 14,
    marginBottom: 16,
  },
  resendIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#E2E8F0",
    justifyContent: "center", alignItems: "center",
  },
  resendLabel: { flex: 1, fontSize: 12, color: "#64748B" },
  resendLink: { fontSize: 13, color: "#1A6FD8", fontWeight: "600" },
  countdownText: { fontSize: 12, color: "#94A3B8" },
  countdownNum: { fontWeight: "600", color: "#64748B" },

  securityBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#EFF6FF", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  securityBannerText: { flex: 1 },
  securityTitle: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  securitySub: { fontSize: 11, color: "#64748B", marginTop: 2 },
});

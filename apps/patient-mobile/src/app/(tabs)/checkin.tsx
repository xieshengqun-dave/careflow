import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";

export default function CheckInScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check-in</Text>
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Icon name="scan-outline" size={48} color="#1A6FD8" />
        </View>
        <Text style={styles.title}>Quick Check-in</Text>
        <Text style={styles.sub}>
          Check in to your appointment or scan the clinic QR code to join the queue.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(tabs)/appointments")}
          activeOpacity={0.85}
        >
          <Icon name="calendar-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>View My Appointments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/clinic/search")}
          activeOpacity={0.85}
        >
          <Icon name="business-outline" size={18} color="#1A6FD8" />
          <Text style={styles.secondaryBtnText}>Find a Clinic</Text>
        </TouchableOpacity>

        <View style={styles.qrPlaceholder}>
          <Icon name="qr-code-outline" size={32} color="#CBD5E1" />
          <Text style={styles.qrText}>QR Scanner</Text>
          <Text style={styles.qrSub}>Coming soon</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    backgroundColor: "#1A6FD8",
    paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  content: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  iconWrap: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center", alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1E293B", textAlign: "center", marginBottom: 10 },
  sub: { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 21, marginBottom: 32, maxWidth: 280 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#1A6FD8", borderRadius: 14, paddingVertical: 15, paddingHorizontal: 28,
    marginBottom: 12, width: "100%", justifyContent: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#1A6FD8", borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28,
    marginBottom: 32, width: "100%", justifyContent: "center",
  },
  secondaryBtnText: { color: "#1A6FD8", fontSize: 15, fontWeight: "600" },
  qrPlaceholder: {
    width: 180, height: 180, borderRadius: 20,
    borderWidth: 2, borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#FFFFFF", gap: 8,
  },
  qrText: { fontSize: 14, fontWeight: "600", color: "#94A3B8" },
  qrSub: { fontSize: 11, color: "#CBD5E1" },
});

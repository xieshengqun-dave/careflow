import { ScrollView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTime12(time24: string) {
  const parts = time24.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  const d = new Date(
    Number(parts[0]),
    Number(parts[1] ?? "1") - 1,
    Number(parts[2] ?? "1"),
  );
  return d.toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Generate a random 8-character alphanumeric reference from the appointmentId */
function shortRef(appointmentId: string) {
  if (!appointmentId) return "CF000000";
  return ("CF" + appointmentId.replace(/-/g, "").toUpperCase()).slice(0, 8);
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function BookingConfirmScreen() {
  const router = useRouter();
  const {
    doctorName,
    specialty,
    clinicName,
    clinicAddress,
    date,
    time,
    appointmentId,
    fee,
  } = useLocalSearchParams<{
    doctorName?: string;
    specialty?: string;
    clinicName?: string;
    clinicAddress?: string;
    date?: string;
    time?: string;
    appointmentId?: string;
    fee?: string;
  }>();

  const refNumber = shortRef(appointmentId ?? "");
  const displayFee = fee && fee !== "0" ? `RM ${fee}` : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Green checkmark hero */}
        <View style={styles.heroSection}>
          <View style={styles.checkCircle}>
            <Icon name="checkmark" size={44} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Your appointment is confirmed!</Text>
          <Text style={styles.heroSub}>
            We've sent the details to your mobile number.
          </Text>
        </View>

        {/* Appointment details card */}
        <View style={styles.detailsCard}>

          {/* Doctor row */}
          <View style={styles.doctorRow}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorAvatarText}>
                {(doctorName ?? "D").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.doctorInfo}>
              <View style={styles.doctorNameRow}>
                <Text style={styles.doctorName}>{doctorName ?? "Doctor"}</Text>
                <Icon name="checkmark-circle" size={14} color="#1A6FD8" />
              </View>
              <Text style={styles.doctorSpec}>{specialty ?? "General Practice"}</Text>
              <View style={styles.clinicRow}>
                <Icon name="location-outline" size={12} color="#94A3B8" />
                <Text style={styles.clinicName}>{clinicName ?? ""}</Text>
              </View>
              {clinicAddress ? (
                <Text style={styles.clinicAddr} numberOfLines={2}>{clinicAddress}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Date */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: "#EFF6FF" }]}>
              <Icon name="calendar-outline" size={16} color="#1A6FD8" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(date ?? "")}</Text>
            </View>
          </View>

          {/* Time */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: "#EFF6FF" }]}>
              <Icon name="time-outline" size={16} color="#1A6FD8" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{time ? formatTime12(time) : "–"}</Text>
            </View>
          </View>

          {/* Type */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: "#F0FDF4" }]}>
              <Icon name="medkit-outline" size={16} color="#16A34A" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>In-Clinic Appointment</Text>
            </View>
          </View>

          {/* Consultation fee */}
          {displayFee ? (
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: "#FFF7ED" }]}>
                <Icon name="cash-outline" size={16} color="#EA580C" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Consultation Fee</Text>
                <View style={styles.feeRow}>
                  <Text style={styles.detailValue}>{displayFee}</Text>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>Paid</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Status + Reference */}
          <View style={styles.statusRefRow}>
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedBadgeText}>CONFIRMED</Text>
            </View>
            <View style={styles.refBox}>
              <Text style={styles.refLabel}>Booking Ref.</Text>
              <Text style={styles.refValue}>{refNumber}</Text>
            </View>
          </View>
        </View>

        {/* What happens next */}
        <View style={styles.nextSection}>
          <View style={styles.nextHeader}>
            <Icon name="information-circle-outline" size={18} color="#1A6FD8" />
            <Text style={styles.nextTitle}>What happens next?</Text>
          </View>
          {[
            "Please arrive 10 minutes early for registration.",
            "If you are unable to make it, please reschedule or cancel at least 2 hours before your appointment.",
            "Bring along your identification card and any relevant medical reports.",
          ].map((text, i) => (
            <View key={i} style={styles.nextItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.nextItemText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Add to Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.calendarSectionTitle}>Add to Calendar</Text>
          <View style={styles.calendarBtns}>
            {(
              [
                { label: "Google Calendar", icon: "logo-google" as const },
                { label: "Apple Calendar", icon: "logo-apple" as const },
                { label: "Outlook Calendar", icon: "mail-outline" as const },
              ] as const
            ).map((cal) => (
              <TouchableOpacity key={cal.label} style={styles.calendarBtn} activeOpacity={0.7}>
                <Icon name={cal.icon} size={18} color="#1A6FD8" />
                <Text style={styles.calendarBtnText}>{cal.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.viewApptBtn}
          onPress={() => router.replace("/(tabs)/appointments")}
          activeOpacity={0.85}
        >
          <Icon name="calendar-outline" size={16} color="#FFFFFF" />
          <Text style={styles.viewApptBtnText}>View My Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backHomeLink}
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={0.7}
        >
          <Text style={styles.backHomeLinkText}>Book Another Appointment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  scroll: { paddingBottom: 20 },
  bottomSpacer: { height: 130 },

  headerRow: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  // Hero
  heroSection: { alignItems: "center", paddingVertical: 32, backgroundColor: "#FFFFFF" },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSub: { fontSize: 13, color: "#64748B", textAlign: "center", paddingHorizontal: 32 },

  // Details card
  detailsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 16 },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  doctorAvatarText: { fontSize: 20, fontWeight: "800", color: "#1A6FD8" },
  doctorInfo: { flex: 1, gap: 3 },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  doctorName: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  doctorSpec: { fontSize: 12, color: "#64748B" },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  clinicName: { fontSize: 12, color: "#64748B" },
  clinicAddr: { fontSize: 11, color: "#94A3B8", lineHeight: 16 },

  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  detailContent: { flex: 1, justifyContent: "center" },
  detailLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  feeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  paidBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paidBadgeText: { fontSize: 10, fontWeight: "700", color: "#16A34A" },

  statusRefRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmedBadge: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmedBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#16A34A",
    letterSpacing: 0.5,
  },
  refBox: { alignItems: "flex-end" },
  refLabel: { fontSize: 10, color: "#94A3B8", marginBottom: 2 },
  refValue: { fontSize: 14, fontWeight: "700", color: "#1E293B" },

  // What happens next
  nextSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  nextHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  nextTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  nextItem: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1A6FD8",
    marginTop: 6,
    flexShrink: 0,
  },
  nextItemText: { fontSize: 13, color: "#64748B", lineHeight: 20, flex: 1 },

  // Calendar
  calendarSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  calendarSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
  },
  calendarBtns: { gap: 8 },
  calendarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },
  calendarBtnText: { fontSize: 14, fontWeight: "500", color: "#1E293B" },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 10,
  },
  viewApptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A6FD8",
    borderRadius: 14,
    paddingVertical: 16,
  },
  viewApptBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  backHomeLink: { alignItems: "center", paddingVertical: 4 },
  backHomeLinkText: { fontSize: 14, color: "#1A6FD8", fontWeight: "500" },
});

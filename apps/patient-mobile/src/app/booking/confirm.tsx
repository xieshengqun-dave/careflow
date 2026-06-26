import { ScrollView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

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
          <Icon name="chevron-back" size={20} color={palette.slate900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Green checkmark hero */}
        <View style={styles.heroSection}>
          <View style={styles.checkCircle}>
            <Icon name="checkmark" size={44} color={palette.surface} />
          </View>
          <Text style={styles.heroTitle}>Your appointment is confirmed!</Text>
          <Text style={styles.heroSub}>
            We've sent the details to your mobile number.
          </Text>
        </View>

        {/* Appointment details card */}
        <Card style={styles.detailsCard}>

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
                <Icon name="checkmark-circle" size={14} color={palette.primary600} />
              </View>
              <Text style={styles.doctorSpec}>{specialty ?? "General Practice"}</Text>
              <View style={styles.clinicRow}>
                <Icon name="location-outline" size={12} color={palette.slate400} />
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
            <View style={[styles.detailIconBox, { backgroundColor: palette.primary50 }]}>
              <Icon name="calendar-outline" size={16} color={palette.primary600} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(date ?? "")}</Text>
            </View>
          </View>

          {/* Time */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: palette.primary50 }]}>
              <Icon name="time-outline" size={16} color={palette.primary600} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{time ? formatTime12(time) : "–"}</Text>
            </View>
          </View>

          {/* Type */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: palette.green50 }]}>
              <Icon name="medkit-outline" size={16} color={palette.green600} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>In-Clinic Appointment</Text>
            </View>
          </View>

          {/* Consultation fee */}
          {displayFee ? (
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: palette.amber100 }]}>
                <Icon name="cash-outline" size={16} color={palette.amber700} />
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
        </Card>

        {/* What happens next */}
        <Card style={styles.nextSection}>
          <View style={styles.nextHeader}>
            <Icon name="information-circle-outline" size={18} color={palette.primary600} />
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
        </Card>

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
                <Icon name={cal.icon} size={18} color={palette.primary600} />
                <Text style={styles.calendarBtnText}>{cal.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <Button
          label="View My Appointments"
          icon="calendar-outline"
          iconPosition="left"
          onPress={() => router.replace("/(tabs)/appointments")}
        />
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
  container: { flex: 1, backgroundColor: palette.appBg },
  scroll: { paddingBottom: 20 },
  bottomSpacer: { height: 130 },

  headerRow: {
    paddingTop: 52,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: palette.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.slate100,
    justifyContent: "center",
    alignItems: "center",
  },

  // Hero
  heroSection: { alignItems: "center", paddingVertical: spacing["3xl"], backgroundColor: palette.surface },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.green500,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
    shadowColor: palette.green500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: fontFamily(800),
    color: palette.slate900,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  heroSub: { fontSize: 13, color: palette.slate500, textAlign: "center", paddingHorizontal: spacing["2xl"] },

  // Details card
  detailsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  doctorRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", marginBottom: spacing.lg },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.primary50,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  doctorAvatarText: { fontSize: 20, fontFamily: fontFamily(800), color: palette.primary600 },
  doctorInfo: { flex: 1, gap: 3 },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  doctorName: { fontSize: 15, fontFamily: fontFamily(700), color: palette.slate900 },
  doctorSpec: { fontSize: 12, color: palette.slate500 },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  clinicName: { fontSize: 12, color: palette.slate500 },
  clinicAddr: { fontSize: 11, color: palette.slate400, lineHeight: 16 },

  divider: { height: 1, backgroundColor: palette.slate100, marginVertical: spacing.md },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  detailContent: { flex: 1, justifyContent: "center" },
  detailLabel: {
    fontSize: 11,
    color: palette.slate400,
    fontFamily: fontFamily(600),
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailValue: { fontSize: 14, fontFamily: fontFamily(600), color: palette.slate900 },
  feeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  paidBadge: {
    backgroundColor: palette.green50,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  paidBadgeText: { fontSize: 10, fontFamily: fontFamily(700), color: palette.green600 },

  statusRefRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmedBadge: {
    backgroundColor: palette.green50,
    borderWidth: 1,
    borderColor: palette.green500,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  confirmedBadgeText: {
    fontSize: 12,
    fontFamily: fontFamily(800),
    color: palette.green600,
    letterSpacing: 0.5,
  },
  refBox: { alignItems: "flex-end" },
  refLabel: { fontSize: 10, color: palette.slate400, marginBottom: 2 },
  refValue: { fontSize: 14, fontFamily: fontFamily(700), color: palette.slate900 },

  // What happens next
  nextSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  nextHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  nextTitle: { fontSize: 14, fontFamily: fontFamily(700), color: palette.slate900 },
  nextItem: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", marginBottom: spacing.sm },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.primary600,
    marginTop: 6,
    flexShrink: 0,
  },
  nextItemText: { fontSize: 13, color: palette.slate500, lineHeight: 20, flex: 1 },

  // Calendar
  calendarSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  calendarSectionTitle: {
    fontSize: 14,
    fontFamily: fontFamily(700),
    color: palette.slate900,
    marginBottom: spacing.sm,
  },
  calendarBtns: { gap: spacing.sm },
  calendarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
    padding: spacing.md,
  },
  calendarBtnText: { fontSize: 14, fontFamily: fontFamily(500), color: palette.slate900 },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: spacing.sm,
  },
  backHomeLink: { alignItems: "center", paddingVertical: spacing.xs },
  backHomeLinkText: { fontSize: 14, color: palette.primary600, fontFamily: fontFamily(500) },
});

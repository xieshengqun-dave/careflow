import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { getMYTToday } from "@careflow/shared";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TodayAppointment {
  id: string;
  startTime: string;
  status: string;
  doctorName: string;
  specialization: string | null;
  clinicName: string;
  queueEntryId: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DOCTOR_COLORS = [
  palette.primary600,
  palette.green600,
  palette.purple600,
  "#DC2626",
  "#D97706",
  "#059669",
];

function doctorColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return DOCTOR_COLORS[h % DOCTOR_COLORS.length] ?? DOCTOR_COLORS[0]!;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTime(t: string): string {
  const parts = t.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function appointmentCode(id: string): string {
  return id.replace(/-/g, "").slice(-6).toUpperCase();
}

// ─── Data ──────────────────────────────────────────────────────────────────────

async function fetchTodayAppointments(): Promise<TodayAppointment[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const today = getMYTToday();

  const { data } = await supabase
    .from("appointments")
    .select(`
      id,
      status,
      time_slots ( start_time ),
      doctors (
        specialization,
        clinic_staff ( full_name )
      ),
      clinics ( name ),
      queue_entries ( id, status )
    `)
    .eq("patient_id", user.id)
    .eq("appointment_date", today)
    .in("status", ["PENDING", "CONFIRMED", "CHECKED_IN"])
    .order("appointment_date", { ascending: true });

  if (!data) return [];

  return data.map((appt) => {
    const slot = appt.time_slots as unknown as { start_time: string } | null;
    const doc = appt.doctors as unknown as {
      specialization: string | null;
      clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
    } | null;
    const clinic = appt.clinics as unknown as { name: string } | null;
    const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;
    const entries = appt.queue_entries as unknown as Array<{ id: string; status: string }> | null;
    const activeEntry = entries?.find((e) =>
      ["WAITING", "CALLED", "IN_CONSULTATION"].includes(e.status)
    );

    return {
      id: appt.id,
      startTime: slot ? slot.start_time.slice(0, 5) : "",
      status: appt.status,
      doctorName: staff?.full_name ?? "Doctor",
      specialization: doc?.specialization ?? null,
      clinicName: clinic?.name ?? "",
      queueEntryId: activeEntry?.id ?? null,
    };
  });
}

// ─── Appointment check-in card ─────────────────────────────────────────────────

function CheckInCard({
  appt,
  onTrack,
}: {
  appt: TodayAppointment;
  onTrack: (entryId: string) => void;
}) {
  const color = doctorColor(appt.doctorName);
  const ini = initials(appt.doctorName);
  const isCheckedIn = appt.status === "CHECKED_IN";
  const code = appointmentCode(appt.id);

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: isCheckedIn ? palette.green500 : palette.primary600 }]} />

      <View style={styles.cardBody}>
        {/* Doctor row */}
        <View style={styles.doctorRow}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <Text style={styles.avatarText}>{ini}</Text>
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{appt.doctorName}</Text>
            <Text style={styles.specialization}>
              {appt.specialization ?? "General Practitioner"}
            </Text>
            <View style={styles.clinicRow}>
              <Icon name="location-outline" size={11} color={palette.slate400} />
              <Text style={styles.clinicText} numberOfLines={1}>{appt.clinicName}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, isCheckedIn ? styles.pillCheckedIn : styles.pillConfirmed]}>
            <Text style={[styles.statusText, isCheckedIn ? styles.statusTextCheckedIn : styles.statusTextConfirmed]}>
              {isCheckedIn ? "Checked In" : appt.status === "CONFIRMED" ? "Confirmed" : "Pending"}
            </Text>
          </View>
        </View>

        {/* Time */}
        <View style={styles.timeRow}>
          <Icon name="time-outline" size={14} color={palette.slate400} />
          <Text style={styles.timeText}>{formatTime(appt.startTime)}</Text>
          <Text style={styles.timeLabel}>today</Text>
        </View>

        {isCheckedIn ? (
          <View style={styles.checkedInSection}>
            <View style={styles.checkedInBadge}>
              <Icon name="checkmark-circle" size={16} color={palette.green600} />
              <Text style={styles.checkedInLabel}>You're in the queue</Text>
            </View>
            {appt.queueEntryId && (
              <TouchableOpacity
                style={styles.trackBtn}
                onPress={() => onTrack(appt.queueEntryId!)}
                activeOpacity={0.85}
              >
                <Icon name="pulse-outline" size={15} color={palette.surface} />
                <Text style={styles.trackBtnText}>Track Queue</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Show this code at the reception desk</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeValue}>{code}</Text>
            </View>
            <Text style={styles.codeHint}>
              Staff will enter this code to check you in
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchTodayAppointments();
    setAppointments(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check-in</Text>
          <Text style={styles.headerSub}>Today's appointments</Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary600} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            appointments.length === 0 && styles.scrollEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={palette.primary600}
            />
          }
        >
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="calendar-outline" size={40} color={palette.primary600} />
              </View>
              <Text style={styles.emptyTitle}>No appointments today</Text>
              <Text style={styles.emptySub}>
                You don't have any appointments scheduled for today.
              </Text>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push("/(tabs)/appointments")}
                activeOpacity={0.85}
              >
                <Icon name="calendar-outline" size={16} color={palette.surface} />
                <Text style={styles.primaryBtnText}>View All Appointments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push("/clinic/search")}
                activeOpacity={0.85}
              >
                <Icon name="search-outline" size={16} color={palette.primary600} />
                <Text style={styles.secondaryBtnText}>Find a Clinic</Text>
              </TouchableOpacity>

              <View style={styles.walkInHint}>
                <Icon name="walk-outline" size={15} color={palette.slate400} />
                <Text style={styles.walkInText}>
                  Walking in? Find a clinic and join a walk-in queue directly.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} today
              </Text>

              {appointments.map((appt) => (
                <CheckInCard
                  key={appt.id}
                  appt={appt}
                  onTrack={(entryId) => router.push(`/queue/${entryId}`)}
                />
              ))}

              <View style={styles.walkInCard}>
                <View style={styles.walkInHeader}>
                  <Icon name="walk-outline" size={20} color={palette.green600} />
                  <Text style={styles.walkInTitle}>Walk-in Queue</Text>
                </View>
                <Text style={styles.walkInCardText}>
                  Need to see another doctor? Find a nearby clinic and join their walk-in queue.
                </Text>
                <TouchableOpacity
                  style={styles.walkInBtn}
                  onPress={() => router.push("/clinic/search")}
                  activeOpacity={0.85}
                >
                  <Text style={styles.walkInBtnText}>Find Clinic</Text>
                  <Icon name="chevron-forward-outline" size={14} color={palette.green600} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },

  headerWrap: { backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerTitle: { ...textStyle("h1"), color: palette.slate900 },
  headerSub: { fontSize: 12, color: palette.slate400, fontFamily: fontFamily(400), marginTop: 2 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  scroll: { padding: spacing.lg, paddingBottom: 100 },
  scrollEmpty: { flex: 1 },

  sectionTitle: {
    fontSize: 11, fontFamily: fontFamily(700), color: palette.slate400,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.md,
  },

  card: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md },

  doctorRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.sm },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontFamily: fontFamily(700), color: palette.surface },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 14, fontFamily: fontFamily(700), color: palette.slate900, marginBottom: 1 },
  specialization: { fontSize: 11, color: palette.primary600, fontFamily: fontFamily(500), marginBottom: 2 },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  clinicText: { fontSize: 11, color: palette.slate400, flex: 1 },

  statusPill: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  pillConfirmed: { backgroundColor: palette.primary50 },
  pillCheckedIn: { backgroundColor: palette.green50 },
  statusText: { fontSize: 10, fontFamily: fontFamily(700) },
  statusTextConfirmed: { color: palette.primary700 },
  statusTextCheckedIn: { color: palette.green700 },

  timeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.md },
  timeText: { fontSize: 13, fontFamily: fontFamily(700), color: palette.slate700 },
  timeLabel: { fontSize: 12, color: palette.slate400, fontFamily: fontFamily(400) },

  codeSection: { alignItems: "center", paddingTop: 2 },
  codeLabel: { fontSize: 12, color: palette.slate500, fontFamily: fontFamily(500), marginBottom: spacing.sm, textAlign: "center" },
  codeBox: {
    backgroundColor: palette.primary50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.primary100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.sm,
  },
  codeValue: { fontSize: 28, fontFamily: fontFamily(800), color: palette.primary700, letterSpacing: 6 },
  codeHint: { fontSize: 11, color: palette.slate400, textAlign: "center" },

  checkedInSection: { gap: spacing.sm },
  checkedInBadge: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: palette.green50, borderRadius: radius.sm,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    alignSelf: "flex-start",
  },
  checkedInLabel: { fontSize: 12, fontFamily: fontFamily(600), color: palette.green700 },
  trackBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs,
    backgroundColor: palette.green600, borderRadius: radius.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  trackBtnText: { fontSize: 13, fontFamily: fontFamily(700), color: palette.surface },

  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: spacing["3xl"], paddingTop: 40,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: radius.xl,
    backgroundColor: palette.primary50,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...textStyle("h2"), color: palette.slate900, textAlign: "center", marginBottom: spacing.sm },
  emptySub: {
    fontSize: 13, color: palette.slate400, textAlign: "center",
    lineHeight: 20, marginBottom: spacing["2xl"],
  },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: palette.primary700, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm, width: "100%", justifyContent: "center",
  },
  primaryBtnText: { fontSize: 15, fontFamily: fontFamily(700), color: palette.surface },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    borderWidth: 1.5, borderColor: palette.primary600, borderRadius: radius.md,
    paddingVertical: 13, paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl, width: "100%", justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 15, fontFamily: fontFamily(600), color: palette.primary600 },
  walkInHint: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.sm,
    backgroundColor: palette.green50, borderRadius: radius.md,
    padding: spacing.md, width: "100%",
  },
  walkInText: { flex: 1, fontSize: 12, color: palette.slate500, lineHeight: 18 },

  walkInCard: {
    backgroundColor: palette.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: palette.green500 + "33",
    padding: spacing.md, marginTop: spacing.xs,
  },
  walkInHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  walkInTitle: { fontSize: 14, fontFamily: fontFamily(700), color: palette.slate900 },
  walkInCardText: { fontSize: 12, color: palette.slate500, lineHeight: 18, marginBottom: spacing.md },
  walkInBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: palette.green50, borderRadius: radius.sm,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
  },
  walkInBtnText: { fontSize: 13, fontFamily: fontFamily(600), color: palette.green600 },
});

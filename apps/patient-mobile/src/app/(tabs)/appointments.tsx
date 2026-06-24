import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { StatusPill, type StatusKey } from "@/components/ui/StatusPill";
import { supabase } from "@/lib/supabase";
import { cancelAppointment } from "@/lib/api/appointments";
import { getMYTToday } from "@careflow/shared";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FullAppointment {
  id: string;
  date: string;
  startTime: string;
  status: string;
  doctorName: string;
  specialization: string | null;
  clinicName: string;
  clinicAddress: string;
  fee: number | null;
  duration: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const DOCTOR_COLORS = [palette.primary600, palette.green600, palette.purple600, "#DC2626", "#D97706", "#059669"];

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
  if (!t) return "";
  const parts = t.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]!) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
}

function slotDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh! * 60 + em!) - (sh! * 60 + sm!);
}

function daysFromToday(dateStr: string): number {
  const today = getMYTToday();
  const [ty, tm, td] = today.split("-").map(Number);
  const [dy, dm, dd] = dateStr.split("-").map(Number);
  const a = new Date(ty!, tm! - 1, td!);
  const b = new Date(dy!, dm! - 1, dd!);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

const STATUS_KEY: Record<string, StatusKey> = {
  CONFIRMED: "confirmed",
  CHECKED_IN: "checkedIn",
  PENDING: "waitingNext",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW: "noShow",
};
const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

type TabKey = "upcoming" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming",  label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

// ─── Data fetching ──────────────────────────────────────────────────────────────

async function fetchAppointments(tab: TabKey): Promise<FullAppointment[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let statuses: string[];
  if (tab === "upcoming") statuses = ["PENDING", "CONFIRMED", "CHECKED_IN"];
  else if (tab === "completed") statuses = ["COMPLETED"];
  else statuses = ["CANCELLED", "NO_SHOW"];

  const { data } = await supabase
    .from("appointments")
    .select(`
      id,
      appointment_date,
      status,
      time_slots (
        start_time,
        end_time
      ),
      doctors (
        specialization,
        clinic_staff (
          full_name
        )
      ),
      clinics (
        name,
        address
      )
    `)
    .eq("patient_id", user.id)
    .in("status", statuses)
    .order("appointment_date", { ascending: tab === "upcoming" });

  if (!data) return [];

  return data.map((appt) => {
    const slot = appt.time_slots as unknown as {
      start_time: string;
      end_time: string;
    } | null;
    const doc = appt.doctors as unknown as {
      specialization: string | null;
      clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
    } | null;
    const clinic = appt.clinics as unknown as { name: string; address: string } | null;
    const staff = Array.isArray(doc?.clinic_staff)
      ? doc?.clinic_staff[0]
      : doc?.clinic_staff;

    return {
      id: appt.id,
      date: appt.appointment_date,
      startTime: slot ? slot.start_time.slice(0, 5) : "",
      status: appt.status,
      doctorName: staff?.full_name ?? "Doctor",
      specialization: doc?.specialization ?? null,
      clinicName: clinic?.name ?? "",
      clinicAddress: clinic?.address ?? "",
      fee: null,
      duration: slot ? slotDurationMinutes(slot.start_time, slot.end_time) : null,
    };
  });
}

// ─── Card component ─────────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  tab,
  accentColor,
  onCancel,
  onBookAgain,
  onReschedule,
}: {
  appt: FullAppointment;
  tab: TabKey;
  accentColor?: string;
  onCancel: (id: string) => void;
  onBookAgain: () => void;
  onReschedule: (id: string) => void;
}) {
  const statusKey = STATUS_KEY[appt.status] ?? "waitingNext";
  const statusLabel = STATUS_LABEL[appt.status] ?? appt.status;
  const color = doctorColor(appt.doctorName);
  const ini = initials(appt.doctorName);
  const isGreyed = tab === "cancelled";

  return (
    <Card
      style={[
        styles.card,
        isGreyed && styles.cardGreyed,
        accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : null,
      ]}
    >
      {/* Top: avatar + info + status */}
      <View style={styles.cardHeader}>
        <View style={[styles.doctorAvatar, { backgroundColor: color }]}>
          <Text style={styles.doctorAvatarText}>{ini}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <View style={styles.doctorNameRow}>
            <Text style={[styles.doctorName, isGreyed && styles.textGreyed]}>
              {appt.doctorName}
            </Text>
            <Icon name="checkmark-circle" size={14} color={isGreyed ? palette.slate200 : palette.primary600} />
          </View>
          <Text style={[styles.specialization, isGreyed && styles.textMuted]}>
            {appt.specialization ?? "General Practitioner"}
          </Text>
          <View style={styles.clinicRow}>
            <Icon name="location-outline" size={11} color={isGreyed ? palette.slate200 : palette.primary600} />
            <Text style={[styles.clinicText, isGreyed && styles.textMuted]} numberOfLines={1}>
              {appt.clinicName}
            </Text>
          </View>
        </View>
        <StatusPill status={statusKey} label={statusLabel} />
      </View>

      <View style={styles.divider} />

      {/* Date / time / fee / duration row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="calendar-outline" size={13} color={isGreyed ? palette.slate200 : palette.slate500} />
          <Text style={[styles.metaText, isGreyed && styles.textMuted]}>
            {formatDateShort(appt.date)}
          </Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Icon name="time-outline" size={13} color={isGreyed ? palette.slate200 : palette.slate500} />
          <Text style={[styles.metaText, isGreyed && styles.textMuted]}>
            {formatTime(appt.startTime)}
          </Text>
        </View>
      </View>

      <View style={styles.feeRow}>
        <View style={styles.feeBlock}>
          <Text style={[styles.feeLabel, isGreyed && styles.textMuted]}>Consultation Fee</Text>
          <Text style={[styles.feeValue, isGreyed && styles.textGreyed]}>
            {appt.fee != null ? `RM ${appt.fee.toFixed(2)}` : "—"}
          </Text>
        </View>
        {appt.duration != null && (
          <View style={styles.durationBlock}>
            <Icon name="hourglass-outline" size={13} color={isGreyed ? palette.slate200 : palette.slate500} />
            <Text style={[styles.durationText, isGreyed && styles.textMuted]}>
              {appt.duration} mins
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {tab === "upcoming" && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.rescheduleBtn}
            onPress={() => onReschedule(appt.id)}
            activeOpacity={0.75}
          >
            <Icon name="calendar-outline" size={14} color={palette.primary600} />
            <Text style={styles.rescheduleBtnText}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => onCancel(appt.id)}
            activeOpacity={0.75}
          >
            <Icon name="close-circle-outline" size={14} color={palette.red600} />
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === "completed" && (
        <TouchableOpacity
          style={styles.bookAgainBtn}
          onPress={onBookAgain}
          activeOpacity={0.8}
        >
          <Icon name="refresh-outline" size={14} color={palette.primary600} />
          <Text style={styles.bookAgainText}>Book Again</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");
  const [appointments, setAppointments] = useState<FullAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (tab: TabKey = activeTab) => {
      const data = await fetchAppointments(tab);
      setAppointments(data);
      setLoading(false);
      setRefreshing(false);
    },
    [activeTab],
  );

  useEffect(() => {
    setLoading(true);
    void load(activeTab);
  }, [activeTab, load]);

  function handleTabChange(tab: TabKey) {
    if (tab === activeTab) return;
    setActiveTab(tab);
  }

  function handleCancel(id: string) {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment? This cannot be undone.",
      [
        { text: "Keep It", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            const result = await cancelAppointment(id);
            if (result.error) {
              Alert.alert("Error", result.error);
            } else {
              void load(activeTab);
            }
          },
        },
      ],
    );
  }

  function handleReschedule(_id: string) {
    // Navigate to home to initiate a new booking flow
    router.push("/(tabs)/index");
  }

  function handleBookAgain() {
    router.push("/(tabs)/index");
  }

  // Banner count for upcoming — only appointments actually scheduled for today
  const todayCount =
    activeTab === "upcoming" ? appointments.filter((a) => a.date === getMYTToday()).length : 0;

  // Group upcoming appointments into Today / Upcoming / Later, each with an accent color
  const sections =
    activeTab === "upcoming"
      ? (() => {
          const today: FullAppointment[] = [];
          const upcoming: FullAppointment[] = [];
          const later: FullAppointment[] = [];
          for (const a of appointments) {
            const diff = daysFromToday(a.date);
            if (diff <= 0) today.push(a);
            else if (diff <= 7) upcoming.push(a);
            else later.push(a);
          }
          return [
            { title: "Today", data: today, accent: palette.green500 },
            { title: "Upcoming", data: upcoming, accent: palette.primary600 },
            { title: "Later", data: later, accent: palette.purple600 },
          ].filter((s) => s.data.length > 0);
        })()
      : [{ title: "", data: appointments, accent: undefined }];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.appBg} />

      {/* Header */}
      <SafeAreaView style={styles.headerBg}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Appointments</Text>
        </View>

        {/* Tab row */}
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => handleTabChange(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
              {activeTab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* Upcoming banner */}
      {activeTab === "upcoming" && !loading && todayCount > 0 && (
        <View style={styles.banner}>
          <Icon name="information-circle-outline" size={16} color={palette.primary600} />
          <Text style={styles.bannerText}>
            You have {todayCount} appointment{todayCount !== 1 ? "s" : ""} today.
          </Text>
          <TouchableOpacity>
            <Text style={styles.bannerAction}>View Today</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary600} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            appointments.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load(activeTab);
              }}
              tintColor={palette.primary600}
            />
          }
        >
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="calendar-outline" size={36} color={palette.primary600} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === "upcoming"
                  ? "No upcoming appointments"
                  : activeTab === "completed"
                  ? "No completed appointments"
                  : "No cancelled appointments"}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === "upcoming"
                  ? "Book an appointment from the home screen."
                  : "Your past appointments will appear here."}
              </Text>
            </View>
          ) : (
            <>
              {sections.map((section) => (
                <View key={section.title || "all"}>
                  {section.title ? (
                    <Text style={styles.sectionLabel}>{section.title}</Text>
                  ) : null}
                  {section.data.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      tab={activeTab}
                      accentColor={section.accent}
                      onCancel={handleCancel}
                      onBookAgain={handleBookAgain}
                      onReschedule={handleReschedule}
                    />
                  ))}
                </View>
              ))}

              {/* Footer hint */}
              <View style={styles.footerHint}>
                <Icon name="information-circle-outline" size={14} color={palette.slate400} />
                <Text style={styles.footerHintText}>
                  Need to make a change?{"\n"}You can reschedule or cancel your appointment up to 2 hours before.
                </Text>
                <TouchableOpacity>
                  <Text style={styles.footerHintLink}>View Policy</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },
  headerBg:  { backgroundColor: palette.surface },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTitle: { ...textStyle("h1"), color: palette.slate900 },

  // Tabs
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    marginTop: spacing.xs,
  },
  tabItem: {
    marginRight: spacing["2xl"],
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    alignItems: "center",
    position: "relative",
  },
  tabLabel: { ...textStyle("body"), fontFamily: fontFamily(500), color: palette.slate400 },
  tabLabelActive: { color: palette.primary600, fontFamily: fontFamily(600) },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: palette.primary600,
    borderRadius: 1,
  },

  // Banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#DBEAFE",
  },
  bannerText: { flex: 1, fontSize: 12, color: "#1E40AF", fontFamily: fontFamily(500) },
  bannerAction: { fontSize: 12, color: palette.primary600, fontFamily: fontFamily(600) },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  list: { padding: spacing.lg, paddingBottom: 100 },
  listEmpty: { flex: 1 },

  sectionLabel: {
    fontSize: 12, fontFamily: fontFamily(700), color: palette.slate400,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.xs,
  },

  // Card
  card: {
    marginBottom: spacing.md,
  },
  cardGreyed: {
    opacity: 0.65,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  doctorAvatarText: {
    fontSize: 18,
    fontFamily: fontFamily(700),
    color: "#FFFFFF",
  },
  cardHeaderInfo: { flex: 1 },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 15,
    fontFamily: fontFamily(700),
    color: palette.slate900,
  },
  specialization: {
    fontSize: 12,
    color: palette.primary600,
    fontFamily: fontFamily(500),
    marginBottom: 3,
  },
  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  clinicText: {
    fontSize: 11,
    color: palette.slate500,
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: palette.slate100,
    marginVertical: spacing.md,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 12,
    color: palette.slate500,
    fontFamily: fontFamily(500),
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.slate200,
  },

  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  feeBlock: {},
  feeLabel: {
    fontSize: 10,
    color: palette.slate400,
    fontFamily: fontFamily(500),
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  feeValue: {
    fontSize: 15,
    fontFamily: fontFamily(700),
    color: palette.slate900,
  },
  durationBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.slate100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  durationText: {
    fontSize: 12,
    color: palette.slate500,
    fontFamily: fontFamily(500),
  },

  // Action buttons
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rescheduleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: palette.primary600,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  rescheduleBtnText: {
    fontSize: 13,
    fontFamily: fontFamily(600),
    color: palette.primary600,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: palette.red600,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: fontFamily(600),
    color: palette.red600,
  },

  bookAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: palette.primary600,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  bookAgainText: {
    fontSize: 13,
    fontFamily: fontFamily(600),
    color: palette.primary600,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: spacing["3xl"],
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: palette.primary50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily(700),
    color: palette.slate900,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: palette.slate400,
    textAlign: "center",
    lineHeight: 20,
  },

  // Footer hint
  footerHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  footerHintText: {
    flex: 1,
    fontSize: 12,
    color: palette.slate500,
    lineHeight: 18,
  },
  footerHintLink: {
    fontSize: 12,
    fontFamily: fontFamily(600),
    color: palette.primary600,
  },

  // Greyed text
  textGreyed: { color: palette.slate400 },
  textMuted:  { color: palette.slate200 },
});

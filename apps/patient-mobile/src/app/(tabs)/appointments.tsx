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
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { cancelAppointment } from "@/lib/api/appointments";

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

const DOCTOR_COLORS = ["#1A6FD8", "#0D9488", "#7C3AED", "#DC2626", "#D97706", "#059669"];

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

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  CONFIRMED:  { bg: "#DCFCE7", text: "#16A34A", label: "Confirmed" },
  CHECKED_IN: { bg: "#DBEAFE", text: "#1D4ED8", label: "Checked In" },
  PENDING:    { bg: "#FEF9C3", text: "#CA8A04", label: "Pending" },
  CANCELLED:  { bg: "#FEE2E2", text: "#DC2626", label: "Cancelled" },
  COMPLETED:  { bg: "#F1F5F9", text: "#64748B", label: "Completed" },
  NO_SHOW:    { bg: "#FEF2F2", text: "#EF4444", label: "No Show" },
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
      consultation_fee,
      time_slots (
        start_time,
        duration_minutes
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
      duration_minutes: number | null;
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
      fee: (appt as unknown as { consultation_fee: number | null }).consultation_fee ?? null,
      duration: slot?.duration_minutes ?? null,
    };
  });
}

// ─── Card component ─────────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  tab,
  onCancel,
  onBookAgain,
  onReschedule,
}: {
  appt: FullAppointment;
  tab: TabKey;
  onCancel: (id: string) => void;
  onBookAgain: () => void;
  onReschedule: (id: string) => void;
}) {
  const statusCfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG["PENDING"]!;
  const color = doctorColor(appt.doctorName);
  const ini = initials(appt.doctorName);
  const isGreyed = tab === "cancelled";

  return (
    <View style={[styles.card, isGreyed && styles.cardGreyed]}>
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
            <Icon name="checkmark-circle" size={14} color={isGreyed ? "#CBD5E1" : "#1A6FD8"} />
          </View>
          <Text style={[styles.specialization, isGreyed && styles.textMuted]}>
            {appt.specialization ?? "General Practitioner"}
          </Text>
          {appt.clinicAddress ? (
            <View style={styles.clinicRow}>
              <Icon name="location-outline" size={11} color={isGreyed ? "#CBD5E1" : "#1A6FD8"} />
              <Text style={[styles.clinicText, isGreyed && styles.textMuted]} numberOfLines={1}>
                {appt.clinicName}
              </Text>
            </View>
          ) : (
            <View style={styles.clinicRow}>
              <Icon name="business-outline" size={11} color={isGreyed ? "#CBD5E1" : "#1A6FD8"} />
              <Text style={[styles.clinicText, isGreyed && styles.textMuted]} numberOfLines={1}>
                {appt.clinicName}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Date / time / fee / duration row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="calendar-outline" size={13} color={isGreyed ? "#CBD5E1" : "#64748B"} />
          <Text style={[styles.metaText, isGreyed && styles.textMuted]}>
            {formatDateShort(appt.date)}
          </Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Icon name="time-outline" size={13} color={isGreyed ? "#CBD5E1" : "#64748B"} />
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
            <Icon name="hourglass-outline" size={13} color={isGreyed ? "#CBD5E1" : "#64748B"} />
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
            <Icon name="calendar-outline" size={14} color="#1A6FD8" />
            <Text style={styles.rescheduleBtnText}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => onCancel(appt.id)}
            activeOpacity={0.75}
          >
            <Icon name="close-circle-outline" size={14} color="#DC2626" />
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
          <Icon name="refresh-outline" size={14} color="#1A6FD8" />
          <Text style={styles.bookAgainText}>Book Again</Text>
        </TouchableOpacity>
      )}
    </View>
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

  // Banner count for upcoming
  const upcomingCount = activeTab === "upcoming" ? appointments.length : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

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
      {activeTab === "upcoming" && !loading && upcomingCount > 0 && (
        <View style={styles.banner}>
          <Icon name="information-circle-outline" size={16} color="#1A6FD8" />
          <Text style={styles.bannerText}>
            You have {upcomingCount} appointment{upcomingCount !== 1 ? "s" : ""} today.
          </Text>
          <TouchableOpacity>
            <Text style={styles.bannerAction}>View Today</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1A6FD8" size="large" />
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
              tintColor="#1A6FD8"
            />
          }
        >
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="calendar-outline" size={36} color="#1A6FD8" />
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
              {appointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  tab={activeTab}
                  onCancel={handleCancel}
                  onBookAgain={handleBookAgain}
                  onReschedule={handleReschedule}
                />
              ))}

              {/* Footer hint */}
              <View style={styles.footerHint}>
                <Icon name="information-circle-outline" size={14} color="#94A3B8" />
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
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  headerBg:  { backgroundColor: "#FFFFFF" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E293B",
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginTop: 6,
  },
  tabItem: {
    marginRight: 24,
    paddingBottom: 10,
    paddingTop: 6,
    alignItems: "center",
    position: "relative",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
  },
  tabLabelActive: {
    color: "#1A6FD8",
    fontWeight: "600",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#1A6FD8",
    borderRadius: 1,
  },

  // Banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DBEAFE",
  },
  bannerText: { flex: 1, fontSize: 12, color: "#1E40AF", fontWeight: "500" },
  bannerAction: { fontSize: 12, color: "#1A6FD8", fontWeight: "600" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  list: { padding: 16, paddingBottom: 100 },
  listEmpty: { flex: 1 },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardGreyed: {
    opacity: 0.65,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
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
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardHeaderInfo: { flex: 1 },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  specialization: {
    fontSize: 12,
    color: "#1A6FD8",
    fontWeight: "500",
    marginBottom: 3,
  },
  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  clinicText: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E1",
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
    color: "#94A3B8",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  feeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  durationBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  // Action buttons
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  rescheduleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: "#1A6FD8",
    borderRadius: 10,
    paddingVertical: 10,
  },
  rescheduleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A6FD8",
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },

  bookAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#1A6FD8",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
  },
  bookAgainText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A6FD8",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },

  // Footer hint
  footerHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  footerHintText: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  footerHintLink: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A6FD8",
  },

  // Greyed text
  textGreyed: { color: "#94A3B8" },
  textMuted:  { color: "#CBD5E1" },
});

import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { getDoctorSlotsForDate, type GeneratedSlot } from "@/lib/api/slots";
import { bookAppointment } from "@/lib/api/appointments";
import { palette, radius, spacing, status as statusTokens } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [palette.primary600, palette.green600, palette.purple600, "#DB2777", "#EA580C", "#65A30D"];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? palette.primary600;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildDateRange(count = 8) {
  const today = new Date();
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      iso: toISODate(d),
      day: DAY_NAMES[d.getDay()] ?? "",
      date: d.getDate(),
      month: MONTH_NAMES[d.getMonth()] ?? "",
    };
  });
}

function formatTime12(time24: string) {
  const parts = time24.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function slotPeriod(slot: GeneratedSlot): "Morning" | "Afternoon" | "Evening" {
  const h = slot.startMinutes / 60;
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

// ─── types ───────────────────────────────────────────────────────────────────

interface DoctorInfo {
  id: string;
  fullName: string;
  specialization: string | null;
  clinicName: string;
  clinicId: string;
  consultationFee: number | null;
  consultationDuration: number;
  waitingCount: number;
}

// ─── SlotGroup sub-component ─────────────────────────────────────────────────

function SlotGroup({
  title,
  slots,
  selected,
  onSelect,
}: {
  title: string;
  slots: GeneratedSlot[];
  selected: GeneratedSlot | null;
  onSelect: (s: GeneratedSlot) => void;
}) {
  return (
    <View style={styles.slotGroup}>
      <Text style={styles.slotGroupTitle}>{title}</Text>
      {slots.map((slot) => {
        const isSelected = selected?.start === slot.start;
        const isBooked = slot.status === "BOOKED";
        const isBreak = slot.status === "BREAK";
        const unavailable = isBooked || isBreak;

        let badge: { bg: string; text: string; label: string };
        if (isBreak) badge = { bg: palette.slate100, text: palette.slate400, label: "Break" };
        else if (isBooked) badge = { bg: statusTokens.cancelled.bg, text: statusTokens.cancelled.fg, label: "Booked" };
        else if (isSelected) badge = { bg: statusTokens.confirmed.bg, text: statusTokens.confirmed.fg, label: "Selected" };
        else badge = { bg: statusTokens.open.bg, text: statusTokens.open.fg, label: "Available" };

        return (
          <TouchableOpacity
            key={slot.start}
            style={[
              styles.slotRow,
              isSelected && styles.slotRowSelected,
              unavailable && styles.slotRowUnavailable,
            ]}
            onPress={() => { if (!unavailable) onSelect(slot); }}
            disabled={unavailable}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.slotTime,
                isSelected && styles.slotTimeSelected,
                unavailable && styles.slotTimeGray,
              ]}
            >
              {formatTime12(slot.start)}
            </Text>
            <View style={[styles.slotBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.slotBadgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            {!unavailable && (
              <Icon
                name="chevron-forward-outline"
                size={14}
                color={isSelected ? palette.primary600 : palette.slate200}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function DoctorBookingScreen() {
  const router = useRouter();
  const { doctorId, clinicId: paramClinicId } = useLocalSearchParams<{
    doctorId: string;
    clinicId?: string;
  }>();
  const { user } = useAuthStore();

  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const dateRange = buildDateRange();
  const [selectedDate, setSelectedDate] = useState(dateRange[0]!.iso);
  const [slots, setSlots] = useState<GeneratedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [booking, setBooking] = useState(false);

  // fetch doctor info
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("doctors")
        .select(`
          id,
          specialization,
          consultation_duration_minutes,
          clinic_staff!inner (
            full_name,
            clinic_id,
            clinics ( id, name )
          )
        `)
        .eq("id", doctorId)
        .single();

      if (!data) { setLoading(false); return; }

      const staff = data.clinic_staff as unknown as {
        full_name: string;
        clinic_id: string;
        clinics: { id: string; name: string } | null;
      };

      const today = toISODate(new Date());
      const { data: queueData } = await supabase
        .from("queues")
        .select("queue_entries ( status )")
        .eq("doctor_id", data.id)
        .eq("queue_date", today)
        .eq("is_active", true)
        .maybeSingle();

      const entries = queueData?.queue_entries as unknown as Array<{ status: string }> | null;
      const waitingCount = entries?.filter((e) => e.status === "WAITING").length ?? 0;

      setDoctor({
        id: data.id,
        fullName: staff.full_name ?? "Doctor",
        specialization: data.specialization ?? null,
        clinicName: staff.clinics?.name ?? "",
        clinicId: (paramClinicId as string | undefined) ?? staff.clinic_id,
        consultationFee: null,
        consultationDuration: data.consultation_duration_minutes ?? 15,
        waitingCount,
      });
      setLoading(false);
    }
    void load();
  }, [doctorId, paramClinicId]);

  const loadSlots = useCallback(async (date: string) => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    const result = await getDoctorSlotsForDate(doctorId as string, date);
    setSlots(result);
    setSlotsLoading(false);
  }, [doctorId]);

  useEffect(() => { void loadSlots(selectedDate); }, [selectedDate, loadSlots]);

  const handleBookAppointment = async () => {
    if (!selectedSlot) {
      Alert.alert("Select a time slot", "Please choose an available time slot.");
      return;
    }
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to book an appointment.");
      return;
    }
    if (!doctor) return;

    setBooking(true);
    const result = await bookAppointment({
      patientId: user.id,
      doctorId: doctorId as string,
      clinicId: doctor.clinicId,
      date: selectedDate,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
    });
    setBooking(false);

    if ("error" in result) {
      Alert.alert("Booking failed", result.error);
      return;
    }

    router.push({
      pathname: "/booking/confirm",
      params: {
        doctorId: doctorId as string,
        doctorName: doctor.fullName,
        specialty: doctor.specialization ?? "",
        clinicName: doctor.clinicName,
        clinicId: doctor.clinicId,
        date: selectedDate,
        time: selectedSlot.start,
        appointmentId: result.appointmentId,
        fee: String(doctor.consultationFee ?? 0),
      },
    });
  };

  const handleJoinQueue = () => {
    if (!doctor) return;
    router.push({
      pathname: "/queue/join",
      params: { clinicId: doctor.clinicId },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary600} />
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Doctor not found.</Text>
      </View>
    );
  }

  const color = avatarColor(doctor.fullName);
  const estWaitMins = doctor.waitingCount * doctor.consultationDuration;
  const morningSlots = slots.filter((s) => slotPeriod(s) === "Morning");
  const afternoonSlots = slots.filter((s) => slotPeriod(s) === "Afternoon");
  const eveningSlots = slots.filter((s) => slotPeriod(s) === "Evening");

  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const monthYearLabel = selectedDateObj.toLocaleString("en-MY", { month: "long", year: "numeric" });
  const fullDateLabel = selectedDateObj.toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={20} color={palette.slate900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Schedule</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Icon name="share-outline" size={20} color={palette.slate900} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Doctor info card */}
        <Card style={styles.doctorCard}>
          <View style={styles.doctorCardTop}>
            {/* Avatar */}
            <View style={[styles.doctorAvatar, { backgroundColor: color }]}>
              <Text style={styles.doctorAvatarText}>{getInitials(doctor.fullName)}</Text>
            </View>

            {/* Details */}
            <View style={styles.doctorDetails}>
              <View style={styles.doctorNameRow}>
                <Text style={styles.doctorName} numberOfLines={1}>{doctor.fullName}</Text>
                <Icon name="checkmark-circle" size={16} color={palette.primary600} />
              </View>
              <Text style={styles.doctorSpec}>{doctor.specialization ?? "General Practice"}</Text>
              <View style={styles.ratingRow}>
                <Icon name="star" size={12} color={palette.star} />
                <Text style={styles.ratingNum}>4.8</Text>
                <Text style={styles.ratingCount}>(320 reviews)</Text>
              </View>
              <Text style={styles.expText}>10+ years experience</Text>
              <View style={styles.clinicRow}>
                <Icon name="location-outline" size={12} color={palette.slate500} />
                <Text style={styles.clinicText} numberOfLines={1}>{doctor.clinicName}</Text>
              </View>
            </View>

            {/* Fee */}
            <View style={styles.feeBox}>
              <Text style={styles.feeLabel}>Consultation Fee</Text>
              <Text style={styles.feeAmount}>
                RM {doctor.consultationFee != null ? String(doctor.consultationFee) : "–"}
              </Text>
              <Text style={styles.feePerVisit}>Per Visit</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="people-outline" size={16} color={palette.primary600} />
              <Text style={styles.statValue}>{doctor.waitingCount} patients</Text>
              <Text style={styles.statLabel}>Current Queue</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="time-outline" size={16} color={palette.primary600} />
              <Text style={styles.statValue}>
                {estWaitMins > 0 ? `~${estWaitMins} mins` : "Available now"}
              </Text>
              <Text style={styles.statLabel}>Estimated Wait</Text>
            </View>
          </View>
        </Card>

        {/* Date picker section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <View style={styles.monthPill}>
              <Icon name="calendar-outline" size={12} color={palette.primary600} />
              <Text style={styles.monthPillText}>{monthYearLabel}</Text>
              <Icon name="chevron-down-outline" size={12} color={palette.primary600} />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScroll}
          >
            {dateRange.map((d) => {
              const active = d.iso === selectedDate;
              return (
                <TouchableOpacity
                  key={d.iso}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  onPress={() => setSelectedDate(d.iso)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateChipDay, active && styles.dateChipActiveText]}>
                    {d.day}
                  </Text>
                  <Text style={[styles.dateChipNum, active && styles.dateChipActiveText]}>
                    {d.date}
                  </Text>
                  <Text style={[styles.dateChipMonth, active && styles.dateChipActiveText]}>
                    {d.month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Legend */}
          <View style={styles.legendRow}>
            {(
              [
                { label: "Available", color: palette.green500 },
                { label: "Booked", color: palette.red500 },
                { label: "Break", color: palette.slate400 },
                { label: "Selected", color: palette.primary600 },
              ] as const
            ).map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Time slots section */}
        <View style={styles.section}>
          <Text style={styles.slotDateLabel}>{fullDateLabel}</Text>

          {slotsLoading ? (
            <ActivityIndicator color={palette.primary600} style={styles.slotsLoader} />
          ) : slots.length === 0 ? (
            <View style={styles.noSlots}>
              <Icon name="calendar-outline" size={32} color={palette.slate200} />
              <Text style={styles.noSlotsText}>No slots available for this date.</Text>
            </View>
          ) : (
            <>
              {morningSlots.length > 0 && (
                <SlotGroup
                  title="Morning"
                  slots={morningSlots}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                />
              )}
              {afternoonSlots.length > 0 && (
                <SlotGroup
                  title="Afternoon"
                  slots={afternoonSlots}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                />
              )}
              {eveningSlots.length > 0 && (
                <SlotGroup
                  title="Evening"
                  slots={eveningSlots}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                />
              )}
            </>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.bottomBar}>
        {/* Join Queue Now (outline) */}
        <TouchableOpacity
          style={styles.joinQueueBtn}
          onPress={handleJoinQueue}
          activeOpacity={0.85}
        >
          <Icon name="people-outline" size={16} color={palette.primary600} />
          <View>
            <Text style={styles.joinQueueTitle}>Join Queue Now</Text>
            <Text style={styles.joinQueueSub}>
              Est. wait: {estWaitMins > 0 ? `${estWaitMins} mins` : "–"}
            </Text>
          </View>
          <Icon name="chevron-forward-outline" size={14} color={palette.primary600} />
        </TouchableOpacity>

        {/* Book Appointment (filled) */}
        <TouchableOpacity
          style={[styles.bookBtn, booking && styles.bookBtnDisabled]}
          onPress={handleBookAppointment}
          disabled={booking}
          activeOpacity={0.85}
        >
          {booking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="calendar-outline" size={16} color="#FFFFFF" />
              <View>
                <Text style={styles.bookBtnTitle}>Book Appointment</Text>
                {selectedSlot ? (
                  <Text style={styles.bookBtnSub}>
                    {formatTime12(selectedSlot.start)}
                  </Text>
                ) : null}
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { ...textStyle("body"), color: palette.slate500 },
  scroll: { paddingBottom: 20 },
  bottomSpacer: { height: 120 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 52,
    paddingBottom: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.slate100,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { ...textStyle("h3"), color: palette.slate900 },

  // Doctor card
  doctorCard: {
    margin: spacing.lg,
  },
  doctorCardTop: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  doctorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  doctorAvatarText: { fontSize: 22, fontFamily: fontFamily(800), color: "#FFFFFF" },
  doctorDetails: { flex: 1, gap: 3 },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  doctorName: {
    fontSize: 14,
    fontFamily: fontFamily(700),
    color: palette.slate900,
    flexShrink: 1,
  },
  doctorSpec: { fontSize: 12, color: palette.slate500 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  ratingNum: { fontSize: 12, fontFamily: fontFamily(700), color: palette.slate900 },
  ratingCount: { fontSize: 11, color: palette.slate400 },
  expText: { fontSize: 11, color: palette.slate500 },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  clinicText: { fontSize: 11, color: palette.slate500, flex: 1 },
  feeBox: { alignItems: "flex-end", flexShrink: 0 },
  feeLabel: { fontSize: 10, color: palette.slate400, textAlign: "right" },
  feeAmount: { fontSize: 16, fontFamily: fontFamily(800), color: palette.primary600 },
  feePerVisit: { fontSize: 10, color: palette.slate400 },

  statsRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statDivider: { width: 1, height: 36, backgroundColor: palette.slate200 },
  statValue: { fontSize: 12, fontFamily: fontFamily(700), color: palette.slate900 },
  statLabel: { fontSize: 10, color: palette.slate400 },

  // Sections
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: { ...textStyle("h3"), fontSize: 15, color: palette.slate900 },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  monthPillText: { fontSize: 11, color: palette.primary600, fontFamily: fontFamily(600) },

  // Date strip
  dateScroll: { gap: spacing.sm, paddingRight: spacing.xs },
  dateChip: {
    width: 54,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.slate200,
    gap: 2,
  },
  dateChipActive: { backgroundColor: palette.primary700, borderColor: palette.primary700 },
  dateChipDay: { fontSize: 11, color: palette.slate400, fontFamily: fontFamily(500) },
  dateChipNum: { fontSize: 18, fontFamily: fontFamily(800), color: palette.slate900 },
  dateChipMonth: { fontSize: 10, color: palette.slate400 },
  dateChipActiveText: { color: "#FFFFFF" },

  // Legend
  legendRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: palette.slate500 },

  // Slot list
  slotDateLabel: {
    fontSize: 13,
    fontFamily: fontFamily(600),
    color: palette.slate500,
    marginBottom: spacing.md,
  },
  slotsLoader: { marginVertical: spacing["2xl"] },
  noSlots: { alignItems: "center", paddingVertical: spacing["2xl"], gap: spacing.sm },
  noSlotsText: { fontSize: 13, color: palette.slate400 },

  slotGroup: { marginBottom: spacing.lg },
  slotGroupTitle: {
    fontSize: 11,
    fontFamily: fontFamily(700),
    color: palette.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  slotRowSelected: { borderColor: palette.primary600, backgroundColor: palette.primary50 },
  slotRowUnavailable: { backgroundColor: palette.slate100, opacity: 0.7 },
  slotTime: { fontSize: 14, fontFamily: fontFamily(600), color: palette.slate900, flex: 1 },
  slotTimeSelected: { color: palette.primary600 },
  slotTimeGray: { color: palette.slate400 },
  slotBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  slotBadgeText: { fontSize: 11, fontFamily: fontFamily(600) },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  joinQueueBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: palette.primary600,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  joinQueueTitle: { fontSize: 12, fontFamily: fontFamily(700), color: palette.primary600 },
  joinQueueSub: { fontSize: 10, color: palette.slate500, marginTop: 1 },
  bookBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: palette.primary700,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnTitle: { fontSize: 12, fontFamily: fontFamily(700), color: "#FFFFFF" },
  bookBtnSub: { fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 1 },
});

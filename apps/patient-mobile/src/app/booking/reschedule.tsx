import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { getDoctorSlotsForDate, type GeneratedSlot } from "@/lib/api/slots";
import { rescheduleAppointment } from "@/lib/api/appointments";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

// ─── helpers ───────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDateRange(count = 10) {
  const today = new Date();
  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1); // start from tomorrow (can't reschedule to today)
    return { iso: toISODate(d), day: DAY[d.getDay()] ?? "", date: d.getDate(), month: MON[d.getMonth()] ?? "" };
  });
}

function fmt12(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h ?? "0", 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

const DATE_RANGE = buildDateRange();

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function RescheduleScreen() {
  const router = useRouter();
  const { appointmentId, doctorId, doctorName, currentDate, currentTime } =
    useLocalSearchParams<{
      appointmentId: string;
      doctorId: string;
      doctorName?: string;
      currentDate?: string;
      currentTime?: string;
    }>();

  const [selectedDate, setSelectedDate] = useState(DATE_RANGE[0]?.iso ?? "");
  const [slots, setSlots] = useState<GeneratedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSlots = useCallback(
    async (date: string) => {
      if (!doctorId) return;
      setLoadingSlots(true);
      setSelectedSlot(null);
      const data = await getDoctorSlotsForDate(doctorId, date);
      setSlots(data);
      setLoadingSlots(false);
    },
    [doctorId],
  );

  useEffect(() => {
    void loadSlots(selectedDate);
  }, [selectedDate, loadSlots]);

  const availableSlots = slots.filter((s) => s.status === "AVAILABLE");

  function slotPeriod(s: GeneratedSlot): "Morning" | "Afternoon" | "Evening" {
    const h = s.startMinutes / 60;
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  }

  const grouped = availableSlots.reduce<Record<string, GeneratedSlot[]>>((acc, s) => {
    const period = slotPeriod(s);
    (acc[period] ??= []).push(s);
    return acc;
  }, {});

  const PERIOD_ICONS: Record<string, string> = {
    Morning: "sunny-outline",
    Afternoon: "partly-sunny-outline",
    Evening: "moon-outline",
  };

  async function handleConfirm() {
    if (!selectedSlot || !appointmentId) return;
    setSubmitting(true);
    const result = await rescheduleAppointment(
      appointmentId,
      selectedDate,
      selectedSlot.start,
      selectedSlot.end,
    );
    setSubmitting(false);

    if (result.error) {
      Alert.alert("Reschedule Failed", result.error);
      return;
    }

    Alert.alert(
      "Appointment Rescheduled",
      `Your appointment has been moved to ${fmt12(selectedSlot.start)} on ${selectedDate}.`,
      [{ text: "View Appointments", onPress: () => router.replace("/(tabs)/appointments") }],
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-back" size={22} color={palette.slate900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reschedule</Text>
          <View style={{ width: 32 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Current appointment info */}
        <View style={styles.currentCard}>
          <View style={styles.currentIcon}>
            <Icon name="calendar-outline" size={18} color={palette.primary600} />
          </View>
          <View>
            <Text style={styles.currentLabel}>Current appointment</Text>
            <Text style={styles.currentValue}>
              {doctorName ?? "Doctor"} · {currentDate ?? "—"} at {currentTime ? fmt12(currentTime) : "—"}
            </Text>
          </View>
        </View>

        {/* Date picker */}
        <Text style={styles.sectionLabel}>Choose a new date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {DATE_RANGE.map((d) => {
            const isSelected = d.iso === selectedDate;
            return (
              <TouchableOpacity
                key={d.iso}
                style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                onPress={() => setSelectedDate(d.iso)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextSelected]}>{d.day}</Text>
                <Text style={[styles.dateChipDate, isSelected && styles.dateChipTextSelected]}>{d.date}</Text>
                <Text style={[styles.dateChipMonth, isSelected && styles.dateChipTextSelected]}>{d.month}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Slot picker */}
        <Text style={styles.sectionLabel}>Choose a new time</Text>

        {loadingSlots ? (
          <ActivityIndicator color={palette.primary600} size="small" style={styles.slotLoader} />
        ) : availableSlots.length === 0 ? (
          <View style={styles.noSlots}>
            <Icon name="calendar-outline" size={28} color={palette.slate200} />
            <Text style={styles.noSlotsText}>No available slots on this day</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([period, periodSlots]) => (
            <View key={period} style={styles.periodGroup}>
              <View style={styles.periodHeader}>
                <Icon name={PERIOD_ICONS[period] as string} size={14} color={palette.slate500} />
                <Text style={styles.periodLabel}>{period}</Text>
              </View>
              <View style={styles.slotGrid}>
                {periodSlots.map((s) => {
                  const isSelected = selectedSlot?.start === s.start;
                  return (
                    <TouchableOpacity
                      key={s.start}
                      style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                      onPress={() => setSelectedSlot(s)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.slotTime, isSelected && styles.slotTimeSelected]}>
                        {fmt12(s.start)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Confirm CTA */}
      <View style={styles.footer}>
        {selectedSlot && (
          <Text style={styles.footerSummary}>
            {fmt12(selectedSlot.start)} · {selectedDate}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.confirmBtn, (!selectedSlot || submitting) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!selectedSlot || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={palette.surface} size="small" />
          ) : (
            <>
              <Icon name="calendar-outline" size={16} color={palette.surface} />
              <Text style={styles.confirmBtnText}>Confirm Reschedule</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },

  headerWrap: { backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: { width: 32 },
  headerTitle: { ...textStyle("h2"), color: palette.slate900 },

  scroll: { padding: spacing.lg, paddingBottom: 120 },

  currentCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: palette.primary50, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: palette.primary100,
  },
  currentIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.surface,
    justifyContent: "center", alignItems: "center",
  },
  currentLabel: { fontSize: 11, color: palette.primary600, fontFamily: fontFamily(500), marginBottom: 2 },
  currentValue: { fontSize: 13, color: palette.primary800, fontFamily: fontFamily(600) },

  sectionLabel: {
    fontSize: 13, fontFamily: fontFamily(700), color: palette.slate700,
    marginBottom: spacing.sm,
  },

  // Date picker
  dateRow: { paddingBottom: spacing.lg, gap: spacing.sm },
  dateChip: {
    alignItems: "center", width: 54,
    borderRadius: radius.md, padding: spacing.sm,
    backgroundColor: palette.surface,
    borderWidth: 1, borderColor: palette.border,
  },
  dateChipSelected: { backgroundColor: palette.primary700, borderColor: palette.primary700 },
  dateChipDay: { fontSize: 11, fontFamily: fontFamily(600), color: palette.slate500, marginBottom: 2 },
  dateChipDate: { fontSize: 18, fontFamily: fontFamily(800), color: palette.slate900 },
  dateChipMonth: { fontSize: 10, color: palette.slate400, fontFamily: fontFamily(500) },
  dateChipTextSelected: { color: palette.surface },

  // Slots
  slotLoader: { marginVertical: spacing.xl },
  noSlots: {
    alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  noSlotsText: { fontSize: 13, color: palette.slate400 },

  periodGroup: { marginBottom: spacing.lg },
  periodHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  periodLabel: { fontSize: 12, fontFamily: fontFamily(600), color: palette.slate500, textTransform: "uppercase", letterSpacing: 0.5 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slotChip: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, borderWidth: 1, borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  slotChipSelected: { backgroundColor: palette.primary50, borderColor: palette.primary600 },
  slotTime: { fontSize: 13, fontFamily: fontFamily(600), color: palette.slate700 },
  slotTimeSelected: { color: palette.primary700 },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border,
    padding: spacing.lg, paddingBottom: spacing.xl + spacing.md,
  },
  footerSummary: {
    fontSize: 12, color: palette.slate500, textAlign: "center", marginBottom: spacing.sm,
  },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: palette.primary700, borderRadius: radius.md, paddingVertical: 15,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { fontSize: 15, fontFamily: fontFamily(700), color: palette.surface },
});

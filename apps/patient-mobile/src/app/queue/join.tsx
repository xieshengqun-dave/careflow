import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { joinQueue } from "@/lib/api/queues";
import { getMYTToday, estimateWaitMinutes } from "@careflow/shared";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

// ─── types ───────────────────────────────────────────────────────────────────

interface ActiveQueue {
  queueId: string;
  doctorId: string;
  doctorName: string;
  specialization: string | null;
  consultationDuration: number;
  actualConsultationMinutes: number | null;
  waitingCount: number;
  isPaused: boolean;
  clinicName: string;
  clinicAddress: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [palette.primary600, palette.green600, palette.purple600, "#DB2777", "#EA580C", "#65A30D"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? palette.primary600;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function JoinQueueScreen() {
  const router = useRouter();
  const { clinicId, queueId: paramQueueId } = useLocalSearchParams<{
    clinicId?: string;
    queueId?: string;
  }>();

  const [queue, setQueue] = useState<ActiveQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function fetchQueue() {
      // If a specific queueId was passed, use it directly
      // Otherwise fetch the active queue for the clinic
      const today = getMYTToday();

      let query = supabase
        .from("queues")
        .select(`
          id,
          is_paused,
          doctors (
            id,
            specialization,
            consultation_duration_minutes,
            clinic_staff ( full_name )
          ),
          clinics ( name, address ),
          queue_entries ( status, called_at, completed_at )
        `)
        .eq("is_active", true)
        .eq("queue_date", today);

      if (paramQueueId) {
        query = query.eq("id", paramQueueId as string);
      } else if (clinicId) {
        query = query.eq("clinic_id", clinicId as string);
      }

      const { data } = await query.maybeSingle();

      if (!data) { setLoading(false); return; }

      const doc = data.doctors as unknown as {
        id: string;
        specialization: string | null;
        consultation_duration_minutes: number;
        clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
      } | null;
      const clinic = data.clinics as unknown as { name: string; address: string } | null;
      const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;
      const entries = data.queue_entries as unknown as Array<{
        status: string;
        called_at: string | null;
        completed_at: string | null;
      }> | null;
      const waitingCount = entries?.filter((e) => e.status === "WAITING").length ?? 0;

      // Compute actual median consultation pace from today's completed entries
      const completedTimings = (entries ?? [])
        .filter((e) => e.status === "COMPLETED" && e.called_at && e.completed_at)
        .map((e) => (new Date(e.completed_at!).getTime() - new Date(e.called_at!).getTime()) / 60000)
        .sort((a, b) => a - b);
      const actualConsultationMinutes =
        completedTimings.length > 0
          ? Math.round(completedTimings[Math.floor(completedTimings.length / 2)]!)
          : null;

      setQueue({
        queueId: data.id,
        doctorId: doc?.id ?? "",
        doctorName: (staff as { full_name: string } | null)?.full_name ?? "Doctor",
        specialization: doc?.specialization ?? null,
        consultationDuration: doc?.consultation_duration_minutes ?? 15,
        actualConsultationMinutes,
        waitingCount,
        isPaused: (data.is_paused as unknown as boolean) ?? false,
        clinicName: clinic?.name ?? "",
        clinicAddress: clinic?.address ?? "",
      });
      setLoading(false);
    }
    void fetchQueue();
  }, [clinicId, paramQueueId]);

  const handleJoinQueue = async () => {
    if (!queue) return;
    setJoining(true);
    const result = await joinQueue(queue.queueId);
    setJoining(false);

    if ("error" in result) {
      Alert.alert("Could not join queue", result.error);
      return;
    }

    router.replace({ pathname: "/queue/[queueId]", params: { queueId: result.entryId } });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary600} />
      </View>
    );
  }

  const perPatient = queue
    ? (queue.actualConsultationMinutes ?? queue.consultationDuration)
    : 15;
  const estWaitMin = queue
    ? estimateWaitMinutes(queue.waitingCount, queue.consultationDuration, queue.actualConsultationMinutes ?? undefined)
    : 0;
  const estWaitMax = estWaitMin + Math.round(perPatient);
  const color = queue ? avatarColor(queue.doctorName) : palette.primary600;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={20} color={palette.slate900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Queue</Text>
        <TouchableOpacity style={styles.howItWorksBtn}>
          <Icon name="help-circle-outline" size={16} color={palette.primary600} />
          <Text style={styles.howItWorksText}>How it works</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {!queue ? (
          /* No active queue */
          <View style={styles.noQueueCard}>
            <Icon name="calendar-outline" size={40} color={palette.slate200} />
            <Text style={styles.noQueueTitle}>No Active Queue</Text>
            <Text style={styles.noQueueText}>
              There is no active queue for this clinic right now. Please check back later or book an appointment instead.
            </Text>
          </View>
        ) : (
          <>
            {/* Doctor card */}
            <Card style={styles.doctorCard}>
              <View style={styles.doctorCardLeft}>
                <View style={[styles.doctorAvatar, { backgroundColor: color }]}>
                  <Text style={styles.doctorAvatarText}>{getInitials(queue.doctorName)}</Text>
                </View>
                <View style={styles.doctorInfo}>
                  <View style={styles.doctorNameRow}>
                    <Text style={styles.doctorName}>{queue.doctorName}</Text>
                    <Icon name="checkmark-circle" size={14} color={palette.primary600} />
                  </View>
                  <Text style={styles.doctorSpec}>{queue.specialization ?? "General Practice"}</Text>
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={12} color={palette.star} />
                    <Text style={styles.ratingNum}>4.8</Text>
                    <Text style={styles.ratingCount}>(320 reviews)</Text>
                  </View>
                  <View style={styles.clinicRow}>
                    <Icon name="location-outline" size={12} color={palette.slate500} />
                    <Text style={styles.clinicName}>{queue.clinicName}</Text>
                  </View>
                  {queue.clinicAddress ? (
                    <Text style={styles.clinicAddr}>{queue.clinicAddress}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.feeBox}>
                <Text style={styles.feeLabel}>Fee</Text>
                <Text style={styles.feeAmount}>—</Text>
              </View>
            </Card>

            {/* Queue stats card */}
            <Card style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Current Queue</Text>
              <View style={styles.waitingRow}>
                <Text style={styles.waitingNum}>{queue.waitingCount}</Text>
                <Text style={styles.waitingLabel}>patients ahead</Text>
              </View>
              <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</Text>

              <View style={styles.statsDivider} />

              <Text style={styles.estimateLabel}>Estimated Waiting Time</Text>
              {queue?.isPaused ? (
                <View style={styles.pausedBanner}>
                  <Icon name="pause-circle-outline" size={18} color={palette.amber700} />
                  <Text style={styles.pausedText}>Queue is currently paused</Text>
                </View>
              ) : (
                <>
                  <View style={styles.estimateRow}>
                    <Icon name="time-outline" size={20} color={palette.green600} />
                    <Text style={styles.estimateWait}>
                      {estWaitMin} – {estWaitMax} mins
                    </Text>
                  </View>
                  <Text style={styles.estimateNote}>
                    {queue?.actualConsultationMinutes
                      ? `Based on today's actual pace (avg ${queue.actualConsultationMinutes} min/patient).`
                      : "Estimate based on configured slot duration."}
                  </Text>
                </>
              )}
            </Card>

            {/* You'll be notified banner */}
            <Card style={styles.notifyBanner}>
              <Text style={styles.notifyTitle}>You'll be notified when it's your turn</Text>
              <View style={styles.notifySteps}>
                {[
                  { icon: "notifications-outline" as const, text: "We'll notify you\nwhen you're next" },
                  { icon: "call-outline" as const, text: "Please keep your\nphone nearby" },
                  { icon: "walk-outline" as const, text: "Arrive at the clinic\nwhen called" },
                ].map((step, i) => (
                  <View key={i} style={styles.notifyStep}>
                    <View style={styles.notifyStepIcon}>
                      <Icon name={step.icon} size={18} color={palette.green600} />
                    </View>
                    <Text style={styles.notifyStepText}>{step.text}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Queue validity notice */}
            <View style={styles.validityCard}>
              <View style={styles.validityHeader}>
                <Icon name="shield-checkmark-outline" size={16} color={palette.green600} />
                <Text style={styles.validityTitle}>Your queue is valid for today only</Text>
              </View>
              <Text style={styles.validityText}>
                Please be nearby and available. If you leave the queue, you'll need to join again.
              </Text>
            </View>

            {/* Why Join Queue */}
            <Text style={styles.whyTitle}>Why Join Queue?</Text>
            <View style={styles.whyRow}>
              {[
                { icon: "person-outline" as const, text: "See a doctor\nsooner without booking" },
                { icon: "time-outline" as const, text: "Real-time updates\non wait time" },
                { icon: "exit-outline" as const, text: "No commitment,\nleave queue anytime" },
              ].map((item, i) => (
                <View key={i} style={styles.whyItem}>
                  <Icon name={item.icon} size={20} color={palette.green600} />
                  <Text style={styles.whyText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {queue ? (
          <Button
            label={joining ? "" : "Join Queue Now"}
            onPress={handleJoinQueue}
            loading={joining}
            icon="people-outline"
            iconPosition="left"
          />
        ) : (
          <Button
            label="Book Appointment Instead"
            onPress={() => router.back()}
            icon="calendar-outline"
            iconPosition="left"
          />
        )}
      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingBottom: 20 },
  bottomSpacer: { height: 110 },

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
  howItWorksBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  howItWorksText: { fontSize: 13, fontFamily: fontFamily(600), color: palette.primary600 },

  // No queue
  noQueueCard: {
    alignItems: "center",
    padding: spacing["3xl"],
    gap: spacing.md,
    backgroundColor: palette.surface,
    margin: spacing.lg,
    borderRadius: radius.lg,
  },
  noQueueTitle: { fontSize: 18, fontFamily: fontFamily(700), color: palette.slate900 },
  noQueueText: { fontSize: 13, color: palette.slate500, textAlign: "center", lineHeight: 20 },

  // Doctor card
  doctorCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  doctorCardLeft: { flex: 1, flexDirection: "row", gap: spacing.md },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  doctorAvatarText: { fontSize: 20, fontFamily: fontFamily(800), color: "#FFFFFF" },
  doctorInfo: { flex: 1, gap: 3 },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  doctorName: { fontSize: 14, fontFamily: fontFamily(700), color: palette.slate900 },
  doctorSpec: { fontSize: 12, color: palette.slate500 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  ratingNum: { fontSize: 12, fontFamily: fontFamily(700), color: palette.slate900 },
  ratingCount: { fontSize: 11, color: palette.slate400 },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  clinicName: { fontSize: 11, color: palette.slate500 },
  clinicAddr: { fontSize: 10, color: palette.slate400 },
  feeBox: { alignItems: "flex-end", flexShrink: 0, gap: 2 },
  feeLabel: { fontSize: 10, color: palette.slate400 },
  feeAmount: { fontSize: 16, fontFamily: fontFamily(800), color: palette.primary600 },

  // Stats card
  statsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statsCardTitle: { fontSize: 13, fontFamily: fontFamily(700), color: palette.slate900, marginBottom: spacing.sm },
  waitingRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  waitingNum: { fontSize: 36, fontFamily: fontFamily(800), color: palette.primary600 },
  waitingLabel: { fontSize: 14, color: palette.slate500 },
  lastUpdated: { fontSize: 11, color: palette.slate400, marginTop: 2 },
  statsDivider: { height: 1, backgroundColor: palette.slate100, marginVertical: spacing.md },
  estimateLabel: { fontSize: 12, fontFamily: fontFamily(600), color: palette.slate500, marginBottom: spacing.xs },
  estimateRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  estimateWait: { fontSize: 22, fontFamily: fontFamily(800), color: palette.slate900 },
  estimateNote: { fontSize: 11, color: palette.slate400, marginTop: spacing.xs, lineHeight: 16 },
  pausedBanner: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  pausedText: { fontSize: 14, fontFamily: fontFamily(600), color: palette.amber700 },

  // Notify banner
  notifyBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: palette.surface,
  },
  notifyTitle: { fontSize: 14, fontFamily: fontFamily(700), color: palette.slate900, textAlign: "center", marginBottom: spacing.md },

  // Notify steps
  notifySteps: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  notifyStep: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  notifyStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.green50,
    justifyContent: "center",
    alignItems: "center",
  },
  notifyStepText: { fontSize: 11, color: palette.slate500, textAlign: "center", lineHeight: 16 },

  // Validity card
  validityCard: {
    backgroundColor: palette.green50,
    borderWidth: 1,
    borderColor: palette.green500,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  validityHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  validityTitle: { fontSize: 13, fontFamily: fontFamily(700), color: palette.green600 },
  validityText: { fontSize: 12, color: palette.green700, lineHeight: 18 },

  // Why Join
  whyTitle: {
    fontSize: 15,
    fontFamily: fontFamily(700),
    color: palette.slate900,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  whyRow: { flexDirection: "row", marginHorizontal: spacing.lg, gap: spacing.sm },
  whyItem: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  whyText: { fontSize: 11, color: palette.slate500, textAlign: "center", lineHeight: 16 },

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
  },
});

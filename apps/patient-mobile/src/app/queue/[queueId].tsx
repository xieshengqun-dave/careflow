import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { getQueueEntryStatus, leaveQueue, type QueueEntryStatus } from "@/lib/api/queues";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

// ─── types ───────────────────────────────────────────────────────────────────

interface LiveUpdate {
  id: string;
  time: string;
  message: string;
  type: "join" | "progress" | "doctor" | "system";
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

function formatTimeShort(isoOrHHMM: string) {
  // handles full ISO or "HH:MM"
  try {
    const d = new Date(isoOrHHMM);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
    }
  } catch (_e) {
    // ignore parse errors
  }
  return isoOrHHMM.slice(0, 5);
}

/** Builds the live updates feed purely from this entry's own real timestamps — no fabricated data. */
function buildLiveUpdates(entry: QueueEntryStatus): LiveUpdate[] {
  const updates: LiveUpdate[] = [
    {
      id: "join",
      time: formatTimeShort(entry.joinedAt),
      message: "You joined the queue",
      type: "join",
    },
  ];

  if (entry.status === "CALLED" || entry.status === "IN_CONSULTATION") {
    updates.push({
      id: "called",
      time: entry.calledAt ? formatTimeShort(entry.calledAt) : "–",
      message: "You have been called",
      type: "doctor",
    });
  }

  if (entry.status === "IN_CONSULTATION") {
    updates.push({
      id: "consult",
      time: entry.calledAt ? formatTimeShort(entry.calledAt) : "–",
      message: "Now with the doctor",
      type: "doctor",
    });
  }

  return updates.reverse();
}

// Progress step definitions
const PROGRESS_STEPS = [
  { key: "joined", label: "Joined" },
  { key: "in_queue", label: "In Queue" },
  { key: "almost", label: "Almost Your Turn" },
  { key: "consultation", label: "Consultation" },
] as const;

function getProgressStep(entry: QueueEntryStatus): number {
  // returns the index of the current step (0–3)
  if (entry.status === "IN_CONSULTATION") return 3;
  if (entry.status === "CALLED") return 2;
  if (entry.status === "WAITING" && entry.position <= 3) return 2;
  if (entry.status === "WAITING") return 1;
  return 0;
}

// ─── PulseRing component ─────────────────────────────────────────────────────

function PulseRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.5, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

// ─── ProgressStep component ───────────────────────────────────────────────────

function ProgressStep({
  label,
  state,
  isLast,
}: {
  label: string;
  state: "done" | "current" | "future";
  isLast: boolean;
}) {
  return (
    <View style={styles.progressStepWrap}>
      <View style={styles.progressStepInner}>
        {/* Circle */}
        <View style={styles.progressCircleWrap}>
          {state === "current" && <PulseRing />}
          <View
            style={[
              styles.progressCircle,
              state === "done" && styles.progressCircleDone,
              state === "current" && styles.progressCircleCurrent,
              state === "future" && styles.progressCircleFuture,
            ]}
          >
            {state === "done" ? (
              <Icon name="checkmark" size={12} color="#FFFFFF" />
            ) : (
              <View
                style={[
                  styles.progressDot,
                  state === "current" && styles.progressDotCurrent,
                ]}
              />
            )}
          </View>
        </View>
        <Text
          style={[
            styles.progressLabel,
            state === "future" && styles.progressLabelFuture,
            state === "current" && styles.progressLabelCurrent,
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
      {!isLast && (
        <View
          style={[
            styles.progressLine,
            state === "done" && styles.progressLineDone,
          ]}
        />
      )}
    </View>
  );
}

// ─── icon helper for live updates ─────────────────────────────────────────────

function liveUpdateIcon(type: LiveUpdate["type"]) {
  switch (type) {
    case "join": return "log-in-outline";
    case "progress": return "people-outline";
    case "doctor": return "medkit-outline";
    default: return "information-circle-outline";
  }
}

function liveUpdateColor(type: LiveUpdate["type"]) {
  switch (type) {
    case "join": return palette.primary600;
    case "progress": return palette.slate500;
    case "doctor": return palette.green600;
    default: return palette.slate400;
  }
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function QueueTrackingScreen() {
  const router = useRouter();
  const { queueId } = useLocalSearchParams<{ queueId: string }>();

  const [entry, setEntry] = useState<QueueEntryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const load = useCallback(async () => {
    const data = await getQueueEntryStatus(queueId as string);
    setEntry(data);
    setLoading(false);
    setLastUpdated(
      new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })
    );
  }, [queueId]);

  useEffect(() => { void load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!entry?.queueId) return;

    const channel = supabase
      .channel(`queue-tracking-${queueId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "queue_entries",
          filter: `id=eq.${queueId}`,
        },
        () => { void load(); }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "queue_entries",
          filter: `queue_id=eq.${entry.queueId}`,
        },
        () => { void load(); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [entry?.queueId, queueId, load]);

  const handleLeaveQueue = () => {
    Alert.alert(
      "Leave Queue",
      "Are you sure you want to leave the queue? You will lose your position.",
      [
        { text: "Stay in Queue", style: "cancel" },
        {
          text: "Leave Queue",
          style: "destructive",
          onPress: async () => {
            setLeaving(true);
            await leaveQueue(queueId as string);
            setLeaving(false);
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary600} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Queue entry not found.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDone = entry.status === "COMPLETED" || entry.status === "REMOVED" || entry.status === "SKIPPED";
  const isActive = !isDone;
  const estWaitMins = entry.position * entry.consultationDuration;
  const color = avatarColor(entry.doctorName);
  const progressStep = getProgressStep(entry);
  const liveUpdates = buildLiveUpdates(entry);
  const queueLabel = `Q-${String(entry.queueNumber).padStart(3, "0")}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="chevron-back" size={20} color={palette.slate900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue Tracking</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => void load()}>
          <Icon name="refresh-outline" size={16} color={palette.primary600} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Status banner */}
        <Card style={styles.statusBanner}>
          <View style={styles.statusBannerLeft}>
            <View style={styles.bellIconBox}>
              <Icon name="notifications-outline" size={20} color={palette.primary600} />
            </View>
            <View>
              <Text style={styles.statusBannerTitle}>You're in the queue!</Text>
              <Text style={styles.statusBannerSub}>
                We'll notify you when it's your turn. Please keep your phone nearby.
              </Text>
            </View>
          </View>
        </Card>

        {/* Doctor info card */}
        <Card style={styles.doctorCard}>
          <View style={styles.doctorCardLeft}>
            <View style={[styles.doctorAvatar, { backgroundColor: color }]}>
              <Text style={styles.doctorAvatarText}>{getInitials(entry.doctorName)}</Text>
            </View>
            <View style={styles.doctorInfo}>
              <View style={styles.doctorNameRow}>
                <Text style={styles.doctorName}>{entry.doctorName}</Text>
                <Icon name="checkmark-circle" size={14} color={palette.primary600} />
              </View>
              <View style={styles.clinicRow}>
                <Icon name="location-outline" size={12} color={palette.slate500} />
                <Text style={styles.clinicName}>{entry.clinicName}</Text>
              </View>
            </View>
          </View>
          <View style={styles.feeBox}>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeAmount}>—</Text>
          </View>
        </Card>

        {/* Large queue number + stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statColLabel}>Your Queue Number</Text>
              <Text style={styles.queueNumber}>{queueLabel}</Text>
            </View>
            <View style={styles.statColDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statColLabel}>Estimated Wait</Text>
              <Text style={styles.statColBig}>
                {estWaitMins > 0 ? `${estWaitMins} mins` : "< 5 min"}
              </Text>
              <Text style={styles.statColSub}>
                Estimated time: {
                  new Date(Date.now() + estWaitMins * 60 * 1000).toLocaleTimeString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
              </Text>
            </View>
            <View style={styles.statColDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statColLabel}>People Ahead of You</Text>
              <View style={styles.peopleAheadRow}>
                <Icon name="people-outline" size={16} color={palette.primary600} />
                <Text style={styles.statColBig}>{entry.position}</Text>
              </View>
              <Text style={styles.statColSub}>Last updated: {lastUpdated}</Text>
            </View>
          </View>
        </Card>

        {/* Progress tracker */}
        <Card style={styles.progressCard}>
          <View style={styles.progressTracker}>
            {PROGRESS_STEPS.map((step, i) => {
              let state: "done" | "current" | "future";
              if (i < progressStep) state = "done";
              else if (i === progressStep) state = "current";
              else state = "future";

              return (
                <ProgressStep
                  key={step.key}
                  label={step.label}
                  state={state}
                  isLast={i === PROGRESS_STEPS.length - 1}
                />
              );
            })}
          </View>
        </Card>

        {/* Live Queue Updates */}
        <View style={styles.liveSection}>
          <Text style={styles.liveSectionTitle}>Live Queue Updates</Text>
          <Card style={styles.liveList} padded={false}>
            {liveUpdates.map((update, i) => (
              <View key={update.id} style={[styles.liveItem, i === liveUpdates.length - 1 && styles.liveItemLast]}>
                <View style={[styles.liveIconBox, { backgroundColor: liveUpdateColor(update.type) + "15" }]}>
                  <Icon name={liveUpdateIcon(update.type)} size={16} color={liveUpdateColor(update.type)} />
                </View>
                <View style={styles.liveContent}>
                  <Text style={styles.liveMessage}>{update.message}</Text>
                </View>
                <Text style={styles.liveTime}>{update.time}</Text>
              </View>
            ))}
          </Card>
        </View>

        {/* Please Note */}
        <View style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Icon name="information-circle-outline" size={16} color={palette.amber700} />
            <Text style={styles.noteTitle}>Please Note</Text>
          </View>
          <View style={styles.noteList}>
            <View style={styles.noteItem}>
              <View style={styles.noteBullet} />
              <Text style={styles.noteText}>
                Queue status may change as consultation times vary.
              </Text>
            </View>
            <View style={styles.noteItem}>
              <View style={styles.noteBullet} />
              <Text style={styles.noteText}>
                For any assistance, please inform our clinic staff.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInfo}>
          <Icon name="time-outline" size={14} color={palette.slate500} />
          <Text style={styles.bottomBarInfoText}>
            You will be notified when it's your turn
          </Text>
        </View>
        {isActive && (
          <TouchableOpacity
            style={[styles.leaveBtn, leaving && styles.leaveBtnDisabled]}
            onPress={handleLeaveQueue}
            disabled={leaving}
            activeOpacity={0.8}
          >
            {leaving ? (
              <ActivityIndicator size="small" color={palette.red500} />
            ) : (
              <Text style={styles.leaveBtnText}>Leave Queue</Text>
            )}
          </TouchableOpacity>
        )}
        {isDone && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Back to Home</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  errorText: { fontSize: 15, color: palette.slate500 },
  backLink: { paddingVertical: spacing.sm },
  backLinkText: { fontSize: 14, color: palette.primary600, fontFamily: fontFamily(600) },
  scroll: { paddingBottom: 20 },
  bottomSpacer: { height: 140 },

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
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.primary50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  refreshText: { fontSize: 12, color: palette.primary600, fontFamily: fontFamily(600) },

  // Status banner
  statusBanner: {
    backgroundColor: palette.primary50,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  statusBannerLeft: { flex: 1, flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  bellIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primary100,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  statusBannerTitle: { fontSize: 14, fontFamily: fontFamily(700), color: palette.slate900, marginBottom: 3 },
  statusBannerSub: { fontSize: 12, color: palette.slate500, lineHeight: 17, flex: 1 },

  // Doctor card
  doctorCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  doctorCardLeft: { flex: 1, flexDirection: "row", gap: spacing.sm },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  doctorAvatarText: { fontSize: 18, fontFamily: fontFamily(800), color: palette.surface },
  doctorInfo: { flex: 1, gap: 3 },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  doctorName: { fontSize: 14, fontFamily: fontFamily(700), color: palette.slate900 },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  clinicName: { fontSize: 11, color: palette.slate500, flex: 1 },
  feeBox: { alignItems: "flex-end", gap: 2, flexShrink: 0 },
  feeLabel: { fontSize: 10, color: palette.slate400 },
  feeAmount: { fontSize: 15, fontFamily: fontFamily(800), color: palette.primary600 },

  // Stats card
  statsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statsRow: { flexDirection: "row", alignItems: "flex-start" },
  statCol: { flex: 1, alignItems: "center", gap: spacing.xs },
  statColDivider: { width: 1, backgroundColor: palette.slate200, alignSelf: "stretch", marginHorizontal: spacing.xs },
  statColLabel: {
    fontSize: 10,
    color: palette.slate400,
    fontFamily: fontFamily(600),
    textAlign: "center",
    lineHeight: 14,
  },
  queueNumber: { fontSize: 36, fontFamily: fontFamily(800), color: palette.primary600, lineHeight: 44 },
  statColBig: { fontSize: 24, fontFamily: fontFamily(800), color: palette.slate900 },
  statColSub: { fontSize: 10, color: palette.slate400, textAlign: "center", lineHeight: 14 },
  peopleAheadRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },

  // Progress tracker
  progressCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.xl,
  },
  progressTracker: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  progressStepWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  progressStepInner: {
    alignItems: "center",
    flex: 1,
  },
  progressCircleWrap: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  pulseRing: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.primary600,
  },
  progressCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  progressCircleDone: { backgroundColor: palette.primary600 },
  progressCircleCurrent: { backgroundColor: palette.primary600 },
  progressCircleFuture: { backgroundColor: palette.slate200 },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.slate200,
  },
  progressDotCurrent: { backgroundColor: palette.surface },
  progressLabel: {
    fontSize: 10,
    color: palette.slate400,
    textAlign: "center",
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  progressLabelCurrent: { color: palette.primary600, fontFamily: fontFamily(700) },
  progressLabelFuture: { color: palette.slate200 },
  progressLine: {
    flex: 0.5,
    height: 2,
    backgroundColor: palette.slate200,
    marginTop: 11,
    alignSelf: "flex-start",
  },
  progressLineDone: { backgroundColor: palette.primary600 },

  // Live updates
  liveSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  liveSectionTitle: {
    fontSize: 15,
    fontFamily: fontFamily(700),
    color: palette.slate900,
    marginBottom: spacing.sm,
  },
  liveList: {
    padding: spacing.xs,
  },
  liveItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.slate100,
  },
  liveItemLast: { borderBottomWidth: 0 },
  liveIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  liveContent: { flex: 1 },
  liveMessage: { fontSize: 13, color: palette.slate900, fontFamily: fontFamily(500) },
  liveTime: { fontSize: 11, color: palette.slate400, flexShrink: 0 },

  // Note card
  noteCard: {
    backgroundColor: palette.amber100,
    borderWidth: 1,
    borderColor: palette.amber500,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  noteTitle: { fontSize: 13, fontFamily: fontFamily(700), color: palette.amber700 },
  noteList: { gap: spacing.xs },
  noteItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  noteBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.amber700,
    marginTop: 6,
    flexShrink: 0,
  },
  noteText: { fontSize: 12, color: palette.amber700, lineHeight: 18, flex: 1 },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: spacing.sm,
  },
  bottomBarInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  bottomBarInfoText: { fontSize: 12, color: palette.slate500 },

  leaveBtn: {
    borderWidth: 1.5,
    borderColor: palette.red500,
    backgroundColor: palette.red50,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  leaveBtnDisabled: { opacity: 0.5 },
  leaveBtnText: { fontSize: 15, fontFamily: fontFamily(700), color: palette.red500 },
  doneBtn: {
    backgroundColor: palette.primary700,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 15, fontFamily: fontFamily(700), color: palette.surface },
});

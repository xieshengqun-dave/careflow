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
import { supabase } from "@/lib/supabase";
import { getQueueEntryStatus, leaveQueue, type QueueEntryStatus } from "@/lib/api/queues";

// ─── types ───────────────────────────────────────────────────────────────────

interface LiveUpdate {
  id: string;
  time: string;
  message: string;
  type: "join" | "progress" | "doctor" | "system";
}

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#1A6FD8", "#0D9488", "#7C3AED", "#DB2777", "#EA580C", "#65A30D"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? "#1A6FD8";
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

function buildLiveUpdates(entry: QueueEntryStatus): LiveUpdate[] {
  const updates: LiveUpdate[] = [
    {
      id: "join",
      time: formatTimeShort(entry.joinedAt),
      message: "Queue joined",
      type: "join",
    },
  ];

  if (entry.position < 10) {
    updates.push({
      id: "pos",
      time: formatTimeShort(new Date(Date.now() - 5 * 60 * 1000).toISOString()),
      message: `${entry.position + 5} people ahead`,
      type: "progress",
    });
  }

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
    case "join": return "#1A6FD8";
    case "progress": return "#64748B";
    case "doctor": return "#16A34A";
    default: return "#94A3B8";
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
        <ActivityIndicator size="large" color="#1A6FD8" />
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
          <Icon name="arrow-back-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue Tracking</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => void load()}>
          <Icon name="refresh-outline" size={16} color="#1A6FD8" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Status banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusBannerLeft}>
            <View style={styles.bellIconBox}>
              <Icon name="notifications-outline" size={20} color="#1A6FD8" />
            </View>
            <View>
              <Text style={styles.statusBannerTitle}>You're in the queue!</Text>
              <Text style={styles.statusBannerSub}>
                We'll notify you when it's your turn. Please keep your phone nearby.
              </Text>
            </View>
          </View>
          {/* Decorative illustration placeholder */}
          <View style={styles.bannerIllustration}>
            <Icon name="people" size={32} color="#DBEAFE" />
          </View>
        </View>

        {/* Doctor info card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorCardLeft}>
            <View style={[styles.doctorAvatar, { backgroundColor: color }]}>
              <Text style={styles.doctorAvatarText}>{getInitials(entry.doctorName)}</Text>
            </View>
            <View style={styles.doctorInfo}>
              <View style={styles.doctorNameRow}>
                <Text style={styles.doctorName}>{entry.doctorName}</Text>
                <Icon name="checkmark-circle" size={14} color="#1A6FD8" />
              </View>
              <Text style={styles.doctorSpec}>Family Medicine Specialist</Text>
              <View style={styles.clinicRow}>
                <Icon name="location-outline" size={12} color="#64748B" />
                <Text style={styles.clinicName}>{entry.clinicName}</Text>
              </View>
            </View>
          </View>
          <View style={styles.feeBox}>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeAmount}>RM 50</Text>
            <Text style={styles.feePerVisit}>Per Visit</Text>
          </View>
        </View>

        {/* Large queue number + stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statColLabel}>Your Queue Number</Text>
              <Text style={styles.queueNumber}>{queueLabel}</Text>
              <Text style={styles.statColSub}>{entry.position * 2 + 3} of patients</Text>
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
                <Icon name="people-outline" size={16} color="#1A6FD8" />
                <Text style={styles.statColBig}>{entry.position}</Text>
              </View>
              <Text style={styles.statColSub}>Last updated: {lastUpdated}</Text>
            </View>
          </View>
        </View>

        {/* Progress tracker */}
        <View style={styles.progressCard}>
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

          {/* Step counts */}
          <View style={styles.progressStepNums}>
            <Text style={styles.progressStepNum}>2:20</Text>
            <Text style={styles.progressStepNum}>2:20</Text>
            <Text style={styles.progressStepNum}>2:22</Text>
            <Text style={styles.progressStepNum}>4</Text>
          </View>
        </View>

        {/* Live Queue Updates */}
        <View style={styles.liveSection}>
          <Text style={styles.liveSectionTitle}>Live Queue Updates</Text>
          <View style={styles.liveList}>
            {liveUpdates.map((update) => (
              <View key={update.id} style={styles.liveItem}>
                <View style={[styles.liveIconBox, { backgroundColor: liveUpdateColor(update.type) + "15" }]}>
                  <Icon name={liveUpdateIcon(update.type)} size={16} color={liveUpdateColor(update.type)} />
                </View>
                <View style={styles.liveContent}>
                  <Text style={styles.liveMessage}>{update.message}</Text>
                </View>
                <Text style={styles.liveTime}>{update.time}</Text>
              </View>
            ))}

            {/* Simulated additional updates from mockup */}
            {[
              { label: "Patient #1 has been called in", time: "9:36 AM", color: "#1A6FD8", icon: "megaphone-outline" },
              { label: "Patient #2 has been called in", time: "9:39 AM", color: "#1A6FD8", icon: "megaphone-outline" },
              { label: "Patient #3 has been called in", time: "9:41 AM", color: "#1A6FD8", icon: "megaphone-outline" },
              { label: "Patient #4 is now with the doctor", time: "9:42 AM", color: "#16A34A", icon: "medkit-outline" },
              { label: "Patient #5 is now with the doctor", time: "9:45 AM", color: "#16A34A", icon: "medkit-outline" },
            ].map((item, i) => (
              <View key={i} style={styles.liveItem}>
                <View style={[styles.liveIconBox, { backgroundColor: item.color + "15" }]}>
                  <Icon name={item.icon} size={16} color={item.color} />
                </View>
                <View style={styles.liveContent}>
                  <Text style={styles.liveMessage}>{item.label}</Text>
                </View>
                <Text style={styles.liveTime}>{item.time}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Please Note */}
        <View style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Icon name="information-circle-outline" size={16} color="#EA580C" />
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
          <Icon name="time-outline" size={14} color="#64748B" />
          <Text style={styles.bottomBarInfoText}>
            Queue closes at 9:00 PM Today
          </Text>
          <Text style={styles.bottomBarNotify}>
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
              <ActivityIndicator size="small" color="#EF4444" />
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
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 15, color: "#64748B" },
  backLink: { paddingVertical: 8 },
  backLinkText: { fontSize: 14, color: "#1A6FD8", fontWeight: "600" },
  scroll: { paddingBottom: 20 },
  bottomSpacer: { height: 140 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshText: { fontSize: 12, color: "#1A6FD8", fontWeight: "600" },

  // Status banner
  statusBanner: {
    backgroundColor: "#EFF6FF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  statusBannerLeft: { flex: 1, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  bellIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  statusBannerTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 3 },
  statusBannerSub: { fontSize: 12, color: "#64748B", lineHeight: 17, flex: 1 },
  bannerIllustration: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#BFDBFE",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginLeft: 8,
  },

  // Doctor card
  doctorCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  doctorCardLeft: { flex: 1, flexDirection: "row", gap: 10 },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  doctorAvatarText: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  doctorInfo: { flex: 1, gap: 3 },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  doctorName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  doctorSpec: { fontSize: 11, color: "#64748B" },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  clinicName: { fontSize: 11, color: "#64748B", flex: 1 },
  feeBox: { alignItems: "flex-end", gap: 2, flexShrink: 0 },
  feeLabel: { fontSize: 10, color: "#94A3B8" },
  feeAmount: { fontSize: 15, fontWeight: "800", color: "#1A6FD8" },
  feePerVisit: { fontSize: 10, color: "#94A3B8" },

  // Stats card
  statsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statsRow: { flexDirection: "row", alignItems: "flex-start" },
  statCol: { flex: 1, alignItems: "center", gap: 4 },
  statColDivider: { width: 1, backgroundColor: "#E2E8F0", alignSelf: "stretch", marginHorizontal: 4 },
  statColLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },
  queueNumber: { fontSize: 36, fontWeight: "800", color: "#1A6FD8", lineHeight: 44 },
  statColBig: { fontSize: 24, fontWeight: "800", color: "#1E293B" },
  statColSub: { fontSize: 10, color: "#94A3B8", textAlign: "center", lineHeight: 14 },
  peopleAheadRow: { flexDirection: "row", alignItems: "center", gap: 4 },

  // Progress tracker
  progressCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
    marginBottom: 6,
  },
  pulseRing: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1A6FD8",
  },
  progressCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  progressCircleDone: { backgroundColor: "#1A6FD8" },
  progressCircleCurrent: { backgroundColor: "#1A6FD8" },
  progressCircleFuture: { backgroundColor: "#E2E8F0" },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  progressDotCurrent: { backgroundColor: "#FFFFFF" },
  progressLabel: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  progressLabelCurrent: { color: "#1A6FD8", fontWeight: "700" },
  progressLabelFuture: { color: "#CBD5E1" },
  progressLine: {
    flex: 0.5,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginTop: 11,
    alignSelf: "flex-start",
  },
  progressLineDone: { backgroundColor: "#1A6FD8" },
  progressStepNums: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  progressStepNum: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // Live updates
  liveSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  liveSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
  },
  liveList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  liveItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  liveIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  liveContent: { flex: 1 },
  liveMessage: { fontSize: 13, color: "#1E293B", fontWeight: "500" },
  liveTime: { fontSize: 11, color: "#94A3B8", flexShrink: 0 },

  // Note card
  noteCard: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
  },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  noteTitle: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  noteList: { gap: 6 },
  noteItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D97706",
    marginTop: 6,
    flexShrink: 0,
  },
  noteText: { fontSize: 12, color: "#78350F", lineHeight: 18, flex: 1 },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 10,
  },
  bottomBarInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  bottomBarInfoText: { fontSize: 12, color: "#64748B" },
  bottomBarNotify: { fontSize: 12, color: "#64748B" },

  leaveBtn: {
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF1F2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  leaveBtnDisabled: { opacity: 0.5 },
  leaveBtnText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
  doneBtn: {
    backgroundColor: "#1A6FD8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});

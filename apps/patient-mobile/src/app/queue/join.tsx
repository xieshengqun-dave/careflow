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
import { supabase } from "@/lib/supabase";
import { joinQueue } from "@/lib/api/queues";

// ─── types ───────────────────────────────────────────────────────────────────

interface ActiveQueue {
  queueId: string;
  doctorId: string;
  doctorName: string;
  specialization: string | null;
  consultationDuration: number;
  consultationFee: number | null;
  waitingCount: number;
  clinicName: string;
  clinicAddress: string;
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
      const today = new Date().toISOString().slice(0, 10);

      let query = supabase
        .from("queues")
        .select(`
          id,
          doctors (
            id,
            specialization,
            consultation_duration,
            consultation_fee,
            clinic_staff ( full_name )
          ),
          clinics ( name, address ),
          queue_entries ( status )
        `)
        .eq("status", "ACTIVE")
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
        consultation_duration: number;
        consultation_fee: number | null;
        clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
      } | null;
      const clinic = data.clinics as unknown as { name: string; address: string } | null;
      const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;
      const entries = data.queue_entries as unknown as Array<{ status: string }> | null;
      const waitingCount = entries?.filter((e) => e.status === "WAITING").length ?? 0;

      setQueue({
        queueId: data.id,
        doctorId: doc?.id ?? "",
        doctorName: (staff as { full_name: string } | null)?.full_name ?? "Doctor",
        specialization: doc?.specialization ?? null,
        consultationDuration: doc?.consultation_duration ?? 15,
        consultationFee: doc?.consultation_fee ?? null,
        waitingCount,
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

    router.replace({ pathname: `/queue/${result.entryId}` });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1A6FD8" />
      </View>
    );
  }

  const estWaitMin = queue ? queue.waitingCount * queue.consultationDuration : 0;
  const estWaitMax = estWaitMin + (queue?.consultationDuration ?? 0);
  const color = queue ? avatarColor(queue.doctorName) : "#1A6FD8";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Icon name="arrow-back-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Queue</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Icon name="information-circle-outline" size={20} color="#1A6FD8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {!queue ? (
          /* No active queue */
          <View style={styles.noQueueCard}>
            <Icon name="calendar-outline" size={40} color="#CBD5E1" />
            <Text style={styles.noQueueTitle}>No Active Queue</Text>
            <Text style={styles.noQueueText}>
              There is no active queue for this clinic right now. Please check back later or book an appointment instead.
            </Text>
          </View>
        ) : (
          <>
            {/* Doctor card */}
            <View style={styles.doctorCard}>
              <View style={styles.doctorCardLeft}>
                <View style={[styles.doctorAvatar, { backgroundColor: color }]}>
                  <Text style={styles.doctorAvatarText}>{getInitials(queue.doctorName)}</Text>
                </View>
                <View style={styles.doctorInfo}>
                  <View style={styles.doctorNameRow}>
                    <Text style={styles.doctorName}>{queue.doctorName}</Text>
                    <Icon name="checkmark-circle" size={14} color="#1A6FD8" />
                  </View>
                  <Text style={styles.doctorSpec}>{queue.specialization ?? "General Practice"}</Text>
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingNum}>4.8</Text>
                    <Text style={styles.ratingCount}>(320 reviews)</Text>
                  </View>
                  <View style={styles.clinicRow}>
                    <Icon name="location-outline" size={12} color="#64748B" />
                    <Text style={styles.clinicName}>{queue.clinicName}</Text>
                  </View>
                  {queue.clinicAddress ? (
                    <Text style={styles.clinicAddr}>{queue.clinicAddress}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.feeBox}>
                <Text style={styles.feeLabel}>Consultation Fee</Text>
                <Text style={styles.feeAmount}>
                  RM {queue.consultationFee != null ? String(queue.consultationFee) : "–"}
                </Text>
                <Text style={styles.feePerVisit}>Per Visit</Text>
              </View>
            </View>

            {/* Queue stats card */}
            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Current Queue</Text>
              <View style={styles.waitingRow}>
                <Text style={styles.waitingNum}>{queue.waitingCount}</Text>
                <Text style={styles.waitingLabel}> patients ahead of you</Text>
              </View>
              <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</Text>

              <View style={styles.statsDivider} />

              <View style={styles.estimateRow}>
                <Icon name="time-outline" size={20} color="#1A6FD8" />
                <View>
                  <Text style={styles.estimateWait}>
                    {estWaitMin} – {estWaitMax} mins
                  </Text>
                  <Text style={styles.estimateLabel}>Estimated Waiting Time</Text>
                  <Text style={styles.estimateNote}>
                    This may vary depending on consultation time.
                  </Text>
                </View>
              </View>
            </View>

            {/* You'll be notified banner */}
            <View style={styles.notifyBanner}>
              <Icon name="notifications-outline" size={20} color="#1A6FD8" />
              <Text style={styles.notifyText}>
                You'll be notified when it's your turn
              </Text>
            </View>

            {/* Notification steps */}
            <View style={styles.notifySteps}>
              {[
                { icon: "phone-portrait-outline", text: "We'll notify you\nwhen you're next" },
                { icon: "phone-portrait-outline", text: "Please keep your\nphone nearby" },
                { icon: "walk-outline", text: "Arrive at the clinic\nwhen called" },
              ].map((step, i) => (
                <View key={i} style={styles.notifyStep}>
                  <View style={styles.notifyStepIcon}>
                    <Icon name={step.icon} size={20} color="#1A6FD8" />
                  </View>
                  <Text style={styles.notifyStepText}>{step.text}</Text>
                </View>
              ))}
            </View>

            {/* Queue validity notice */}
            <View style={styles.validityCard}>
              <View style={styles.validityHeader}>
                <Icon name="shield-checkmark-outline" size={16} color="#16A34A" />
                <Text style={styles.validityTitle}>Your queue is valid for today only</Text>
              </View>
              <Text style={styles.validityText}>
                If you leave the queue, it is now free and available. If you leave the queue, you'll need to join again.
              </Text>
            </View>

            {/* Why Join Queue */}
            <Text style={styles.whyTitle}>Why Join Queue?</Text>
            <View style={styles.whyRow}>
              {[
                { icon: "calendar-clear-outline", text: "See a doctor\nwithout booking" },
                { icon: "bar-chart-outline", text: "Real-time updates\non wait time" },
                { icon: "exit-outline", text: "No commitment,\nleave queue anytime" },
              ].map((item, i) => (
                <View key={i} style={styles.whyItem}>
                  <View style={styles.whyIcon}>
                    <Icon name={item.icon} size={20} color="#1A6FD8" />
                  </View>
                  <Text style={styles.whyText}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Before you join checklist */}
            <Text style={styles.beforeTitle}>Before you join</Text>
            <View style={styles.beforeList}>
              {[
                { icon: "card-outline", text: "Please bring your identification card and any relevant medical reports." },
                { icon: "people-outline", text: "Walk-ins are for non-emergency cases only." },
                { icon: "time-outline", text: "Queue closes at 9:00 PM today." },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={styles.beforeItem} activeOpacity={0.7}>
                  <View style={styles.beforeItemIcon}>
                    <Icon name={item.icon} size={18} color="#1A6FD8" />
                  </View>
                  <Text style={styles.beforeItemText}>{item.text}</Text>
                  <Icon name="chevron-forward-outline" size={14} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {queue ? (
          <TouchableOpacity
            style={[styles.joinBtn, joining && styles.joinBtnDisabled]}
            onPress={handleJoinQueue}
            disabled={joining}
            activeOpacity={0.85}
          >
            {joining ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="people-outline" size={18} color="#FFFFFF" />
                <View>
                  <Text style={styles.joinBtnTitle}>Join Queue Now</Text>
                  <Text style={styles.joinBtnSub}>
                    #{queue.waitingCount + 1} added to the queue
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.bookApptBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Icon name="calendar-outline" size={18} color="#FFFFFF" />
            <Text style={styles.bookApptBtnText}>Book Appointment Instead</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingBottom: 20 },
  bottomSpacer: { height: 110 },

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

  // No queue
  noQueueCard: {
    alignItems: "center",
    padding: 40,
    gap: 12,
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
  },
  noQueueTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
  noQueueText: { fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20 },

  // Doctor card
  doctorCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorCardLeft: { flex: 1, flexDirection: "row", gap: 12 },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  doctorAvatarText: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  doctorInfo: { flex: 1, gap: 3 },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  doctorName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  doctorSpec: { fontSize: 12, color: "#64748B" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingNum: { fontSize: 12, fontWeight: "700", color: "#1E293B" },
  ratingCount: { fontSize: 11, color: "#94A3B8" },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  clinicName: { fontSize: 11, color: "#64748B" },
  clinicAddr: { fontSize: 10, color: "#94A3B8" },
  feeBox: { alignItems: "flex-end", flexShrink: 0, gap: 2 },
  feeLabel: { fontSize: 10, color: "#94A3B8" },
  feeAmount: { fontSize: 16, fontWeight: "800", color: "#1A6FD8" },
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
  statsCardTitle: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  waitingRow: { flexDirection: "row", alignItems: "baseline", gap: 0 },
  waitingNum: { fontSize: 36, fontWeight: "800", color: "#1A6FD8" },
  waitingLabel: { fontSize: 14, color: "#64748B" },
  lastUpdated: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  statsDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 14 },
  estimateRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  estimateWait: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  estimateLabel: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  estimateNote: { fontSize: 11, color: "#94A3B8", marginTop: 2, lineHeight: 16 },

  // Notify banner
  notifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notifyText: { fontSize: 14, fontWeight: "600", color: "#1A6FD8", flex: 1 },

  // Notify steps
  notifySteps: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  notifyStep: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  notifyStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  notifyStepText: { fontSize: 11, color: "#64748B", textAlign: "center", lineHeight: 16 },

  // Validity card
  validityCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  validityHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  validityTitle: { fontSize: 13, fontWeight: "700", color: "#16A34A" },
  validityText: { fontSize: 12, color: "#15803D", lineHeight: 18 },

  // Why Join
  whyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  whyRow: { flexDirection: "row", marginHorizontal: 16, gap: 8 },
  whyItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  whyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  whyText: { fontSize: 11, color: "#64748B", textAlign: "center", lineHeight: 16 },

  // Before you join
  beforeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  beforeList: { marginHorizontal: 16, gap: 8 },
  beforeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  beforeItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  beforeItemText: { fontSize: 13, color: "#64748B", flex: 1, lineHeight: 19 },

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
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#1A6FD8",
    borderRadius: 14,
    paddingVertical: 16,
  },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  joinBtnSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  bookApptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A6FD8",
    borderRadius: 14,
    paddingVertical: 16,
  },
  bookApptBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});

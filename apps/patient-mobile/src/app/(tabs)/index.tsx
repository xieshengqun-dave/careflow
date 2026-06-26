import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Icon, type IoniconName } from "@/components/Icon";
import { useAuthStore } from "@/store/authStore";
import { getMyAppointments, type MyAppointment } from "@/lib/api/appointments";
import { getMyActiveQueueEntries, type QueueEntryStatus } from "@/lib/api/queues";
import { searchClinics, type ClinicWithDoctors } from "@/lib/api/clinics";
import { getNotifications } from "@/lib/api/notifications";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { gradients, palette, radius, shadow, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function firstName(name: string | null) {
  if (!name) return "there";
  return name.split(" ")[0] ?? name;
}

const CLINIC_COLORS = [palette.primary600, palette.green600, palette.purple600, "#DB2777", "#EA580C", "#65A30D"];
function clinicColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CLINIC_COLORS[Math.abs(hash) % CLINIC_COLORS.length] ?? palette.primary600;
}

function ClinicCard({ clinic }: { clinic: ClinicWithDoctors }) {
  const router = useRouter();
  const color = clinicColor(clinic.name);
  const specialties = [...new Set(clinic.doctors.map((d) => d.specialization).filter(Boolean))].slice(0, 2);

  return (
    <TouchableOpacity
      style={styles.clinicCardWrap}
      onPress={() => router.push(`/clinic/${clinic.id}`)}
      activeOpacity={0.88}
    >
      <Card style={styles.clinicCard} padded={false}>
        <View style={[styles.clinicPhoto, { backgroundColor: color }]}>
          <Text style={styles.clinicPhotoText}>{clinic.name.charAt(0)}</Text>
          <View style={styles.openBadge}>
            <View style={styles.openDot} />
            <Text style={styles.openText}>Open</Text>
          </View>
        </View>
        <View style={styles.clinicCardInfo}>
          <Text style={styles.clinicCardName} numberOfLines={1}>{clinic.name}</Text>
          {clinic.address ? (
            <View style={styles.clinicAddressRow}>
              <Icon name="location-outline" size={11} color={palette.slate400} />
              <Text style={styles.clinicAddressText} numberOfLines={1}>{clinic.address}</Text>
            </View>
          ) : null}
          <View style={styles.tagRow}>
            {specialties.map((s, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
            {clinic.doctors.length > 0 && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>+{clinic.doctors.length} doctors</Text>
              </View>
            )}
          </View>
          <View style={styles.clinicMeta}>
            <View style={styles.ratingRow}>
              <Icon name="star" size={11} color={palette.star} />
              <Text style={styles.ratingText}>4.8</Text>
              <Text style={styles.ratingCount}>(320)</Text>
            </View>
            <Text style={styles.distanceText}>1.2 km</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [, setUpcomingAppt] = useState<MyAppointment | null>(null);
  const [queues, setQueues] = useState<QueueEntryStatus[]>([]);
  const [clinics, setClinics] = useState<ClinicWithDoctors[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [appts, queueData, clinicData, notifs] = await Promise.all([
      getMyAppointments(),
      getMyActiveQueueEntries(),
      searchClinics(),
      getNotifications(),
    ]);
    setUpcomingAppt(appts[0] ?? null);
    setQueues(queueData);
    setClinics(clinicData.slice(0, 5));
    setUnreadCount(notifs.filter((n) => !n.read).length);
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeQueue = queues[0] ?? null;

  const QUICK_ACTIONS: {
    icon: IoniconName;
    label: string;
    tint: string;
    iconColor: string;
    labelColor: string;
    onPress: () => void;
  }[] = [
    {
      icon: "calendar-outline",
      label: "Book Appointment",
      tint: palette.primary100,
      iconColor: palette.primary600,
      labelColor: palette.primary800,
      onPress: () => router.push("/clinic/search"),
    },
    {
      icon: "people-outline",
      label: "Join Queue",
      tint: palette.green50,
      iconColor: palette.green600,
      labelColor: palette.green700,
      onPress: () => router.push("/clinic/search"),
    },
    {
      icon: "time-outline",
      label: "Track Queue",
      tint: palette.purple50,
      iconColor: palette.purple600,
      labelColor: palette.purple600,
      onPress: () => router.push("/(tabs)/notifications"),
    },
    {
      icon: "business-outline",
      label: "Find Clinics",
      tint: palette.amber50,
      iconColor: palette.amber700,
      labelColor: palette.amber700,
      onPress: () => router.push("/clinic/search"),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.appBg} />

      {/* Header */}
      <SafeAreaView style={styles.headerBg} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarPlaceholder}>
              <Icon name="person-outline" size={20} color={palette.primary600} />
            </View>
            <View>
              <Text style={styles.greet}>{greeting()},</Text>
              <Text style={styles.name}>{firstName(user?.fullName ?? null)} 👋</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push("/(tabs)/notifications")}
            accessibilityLabel="Notifications"
          >
            <Icon name="notifications-outline" size={22} color={palette.slate900} />
            <Badge count={unreadCount} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(); }}
            tintColor={palette.primary600}
          />
        }
      >
        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/clinic/search")}
          activeOpacity={0.9}
        >
          <Icon name="search-outline" size={18} color={palette.slate400} />
          <Text style={styles.searchText}>Search clinic, doctor or service</Text>
          <Icon name="options-outline" size={18} color={palette.slate500} />
        </TouchableOpacity>

        {/* Active queue hero card */}
        {activeQueue && (
          <TouchableOpacity
            onPress={() => router.push(`/queue/${activeQueue.entryId}`)}
            activeOpacity={0.92}
            style={styles.queueCardWrap}
          >
            <LinearGradient
              colors={gradients.hero}
              style={styles.queueCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.queueDecorCircleLg} />
              <View style={styles.queueDecorCircleSm} />
              <View style={styles.queueCardTop}>
                <View>
                  <View style={styles.queueLabelRow}>
                    <Text style={styles.queueCardLabel}>Your Current Queue</Text>
                    <Icon name="information-circle-outline" size={13} color="rgba(255,255,255,0.8)" />
                  </View>
                  <Text style={styles.queueCardClinic}>{activeQueue.clinicName}</Text>
                </View>
                <View style={styles.queueDoctorBadge}>
                  <Text style={styles.queueDoctorInitial}>{activeQueue.doctorName.charAt(0)}</Text>
                </View>
              </View>
              <Text style={styles.queueNumber}>
                #{activeQueue.queueNumber.toString().padStart(3, "0")}
              </Text>
              <View style={styles.queueCardBottom}>
                <View style={styles.queueMeta}>
                  <Icon name="people-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.queueMetaText}>{activeQueue.position} people ahead of you</Text>
                </View>
              </View>
              <View style={styles.queueDivider} />
              <View style={styles.queueEstimateRow}>
                <View>
                  <Text style={styles.queueEstimateLabel}>Estimated waiting time</Text>
                  <View style={styles.queueEstimateValueRow}>
                    <Icon name="time-outline" size={14} color={palette.surface} />
                    <Text style={styles.queueEstimateValue}>
                      {activeQueue.position * activeQueue.consultationDuration} mins
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.queueDetailsBtn}
                  onPress={() => router.push(`/queue/${activeQueue.entryId}`)}
                >
                  <Text style={styles.queueDetailsBtnText}>View Queue Details</Text>
                  <Icon name="arrow-forward" size={14} color={palette.primary700} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick actions — 4-column single row */}
        <Text style={styles.sectionTitle}>What would you like to do?</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionBox, { backgroundColor: a.tint }]}
              onPress={a.onPress}
              activeOpacity={0.8}
            >
              <Icon name={a.icon} size={24} color={a.iconColor} />
              <Text style={[styles.actionLabel, { color: a.labelColor }]}>
                {a.label}
                <Text style={styles.actionArrow}> ›</Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nearby clinics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Clinics</Text>
          <TouchableOpacity onPress={() => router.push("/clinic/search")} accessibilityLabel="See all clinics">
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {clinics.map((clinic) => (
          <ClinicCard key={clinic.id} clinic={clinic} />
        ))}

        {/* Notification opt-in banner */}
        <Card style={styles.notifBanner}>
          <View style={styles.notifBannerIcon}>
            <Icon name="notifications-outline" size={22} color={palette.primary600} />
          </View>
          <View style={styles.notifBannerText}>
            <Text style={styles.notifBannerTitle}>Get Notified, Stay Updated</Text>
            <Text style={styles.notifBannerSub}>
              Turn on notifications to receive updates about your queue and appointments.
            </Text>
          </View>
          <TouchableOpacity style={styles.enableBtn}>
            <Text style={styles.enableBtnText}>Enable</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },
  headerBg: { backgroundColor: palette.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: palette.primary50,
    alignItems: "center", justifyContent: "center",
  },
  greet: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate400 },
  name: { fontSize: 18, fontFamily: fontFamily(800), color: palette.slate900 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: palette.slate100,
    justifyContent: "center", alignItems: "center", position: "relative",
  },

  scroll: { paddingBottom: 100 },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: palette.surface,
    marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.lg,
    borderRadius: 15, paddingHorizontal: spacing.lg, paddingVertical: 14,
    ...shadow.card,
    borderWidth: 1, borderColor: palette.border,
  },
  searchText: { flex: 1, ...textStyle("body"), color: palette.slate400 },

  // Hero queue card
  queueCardWrap: {
    marginHorizontal: spacing.lg, marginBottom: spacing.xl,
    ...shadow.float,
    borderRadius: radius.xl,
  },
  queueCard: { borderRadius: radius.xl, padding: spacing.xl, overflow: "hidden" },
  queueDecorCircleLg: {
    position: "absolute", top: -40, right: -30, width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  queueDecorCircleSm: {
    position: "absolute", top: 50, right: 30, width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  queueCardTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  queueLabelRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  queueCardLabel: { ...textStyle("caption"), fontFamily: fontFamily(500), color: "rgba(255,255,255,0.85)" },
  queueCardClinic: { ...textStyle("body"), fontFamily: fontFamily(600), color: palette.surface, marginTop: 2 },
  queueDoctorBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
  },
  queueDoctorInitial: { fontSize: 15, fontFamily: fontFamily(700), color: palette.surface },
  queueNumber: {
    fontSize: 48, fontFamily: fontFamily(800), color: palette.surface,
    lineHeight: 54, marginBottom: spacing.sm,
  },
  queueCardBottom: { flexDirection: "row", gap: spacing.lg, marginBottom: spacing.md },
  queueMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  queueMetaText: { ...textStyle("caption"), fontFamily: fontFamily(400), color: "rgba(255,255,255,0.9)" },
  queueDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: spacing.md },
  queueEstimateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  queueEstimateLabel: {
    ...textStyle("caption"), fontFamily: fontFamily(400), color: "rgba(255,255,255,0.8)", marginBottom: 4,
  },
  queueEstimateValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  queueEstimateValue: { fontSize: 18, fontFamily: fontFamily(800), color: palette.surface },
  queueDetailsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs,
    backgroundColor: palette.surface, borderRadius: radius.md,
    paddingVertical: 11, paddingHorizontal: spacing.md,
  },
  queueDetailsBtnText: { fontSize: 13, fontFamily: fontFamily(700), color: palette.primary700 },

  sectionTitle: {
    ...textStyle("h3"), color: palette.slate900,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingRight: spacing.lg,
  },
  seeAll: { ...textStyle("label"), color: palette.primary600 },

  // Quick actions — 4-column single row
  actionsGrid: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing["2xl"],
  },
  actionBox: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 11,
    gap: spacing.sm,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: fontFamily(700),
    lineHeight: 16,
  },
  actionArrow: { opacity: 0.6 },

  // Clinic cards
  clinicCardWrap: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  clinicCard: { flexDirection: "row", overflow: "hidden" },
  clinicPhoto: {
    width: 100, height: 110, justifyContent: "center", alignItems: "center",
    position: "relative",
  },
  clinicPhotoText: { fontSize: 36, fontFamily: fontFamily(800), color: "rgba(255,255,255,0.6)" },
  openBadge: {
    position: "absolute", top: spacing.sm, right: spacing.sm,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: radius.sm,
    paddingHorizontal: spacing.xs, paddingVertical: 3,
  },
  openDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.green500 },
  openText: { fontSize: 9, color: palette.surface, fontFamily: fontFamily(600) },
  clinicCardInfo: { flex: 1, padding: spacing.md },
  clinicCardName: { ...textStyle("body"), fontFamily: fontFamily(700), color: palette.slate900, marginBottom: spacing.xs },
  clinicAddressRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: spacing.sm },
  clinicAddressText: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate400, flex: 1 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  tag: { backgroundColor: palette.primary50, borderRadius: 5, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  tagText: { fontSize: 10, color: palette.primary600, fontFamily: fontFamily(500) },
  clinicMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12, fontFamily: fontFamily(600), color: palette.slate900 },
  ratingCount: { fontSize: 11, color: palette.slate400 },
  distanceText: { fontSize: 11, color: palette.slate400 },

  // Notification opt-in banner
  notifBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    marginHorizontal: spacing.lg, padding: spacing.md,
    borderWidth: 1, borderColor: palette.border,
    marginTop: spacing.xs,
  },
  notifBannerIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: palette.primary50, justifyContent: "center", alignItems: "center",
  },
  notifBannerText: { flex: 1 },
  notifBannerTitle: { ...textStyle("label"), color: palette.slate900 },
  notifBannerSub: {
    ...textStyle("caption"), fontFamily: fontFamily(400),
    color: palette.slate500, marginTop: 2, lineHeight: 16,
  },
  enableBtn: {
    backgroundColor: palette.primary700, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 7,
  },
  enableBtnText: { fontSize: 12, fontFamily: fontFamily(600), color: palette.surface },
});

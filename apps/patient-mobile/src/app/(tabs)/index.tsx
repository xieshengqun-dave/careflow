import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, TextInput, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { useAuthStore } from "@/store/authStore";
import { getMyAppointments, type MyAppointment } from "@/lib/api/appointments";
import { getMyActiveQueueEntries, type QueueEntryStatus } from "@/lib/api/queues";
import { searchClinics, type ClinicWithDoctors } from "@/lib/api/clinics";

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

// Colored placeholder for clinic "photo"
const CLINIC_COLORS = ["#1A6FD8", "#0D9488", "#7C3AED", "#DB2777", "#EA580C", "#65A30D"];
function clinicColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CLINIC_COLORS[Math.abs(hash) % CLINIC_COLORS.length] ?? "#1A6FD8";
}

function ClinicCard({ clinic }: { clinic: ClinicWithDoctors }) {
  const router = useRouter();
  const color = clinicColor(clinic.name);
  const specialties = [...new Set(clinic.doctors.map((d) => d.specialization).filter(Boolean))].slice(0, 2);

  return (
    <TouchableOpacity
      style={styles.clinicCard}
      onPress={() => router.push(`/clinic/${clinic.id}`)}
      activeOpacity={0.88}
    >
      {/* Photo placeholder */}
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
            <Icon name="location-outline" size={11} color="#94A3B8" />
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
            <Icon name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingText}>4.8</Text>
            <Text style={styles.ratingCount}>(320)</Text>
          </View>
          <Text style={styles.distanceText}>1.2 km</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [upcomingAppt, setUpcomingAppt] = useState<MyAppointment | null>(null);
  const [queues, setQueues] = useState<QueueEntryStatus[]>([]);
  const [clinics, setClinics] = useState<ClinicWithDoctors[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [appts, queueData, clinicData] = await Promise.all([
      getMyAppointments(),
      getMyActiveQueueEntries(),
      searchClinics(),
    ]);
    setUpcomingAppt(appts[0] ?? null);
    setQueues(queueData);
    setClinics(clinicData.slice(0, 5));
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeQueue = queues[0] ?? null;

  const QUICK_ACTIONS = [
    { icon: "calendar-outline" as const, label: "Book\nAppointment", onPress: () => router.push("/clinic/search") },
    { icon: "people-outline" as const, label: "Join\nQueue", onPress: () => router.push("/clinic/search") },
    { icon: "location-outline" as const, label: "Track\nQueue", onPress: () => router.push("/(tabs)/notifications") },
    { icon: "business-outline" as const, label: "Find\nClinics", onPress: () => router.push("/clinic/search") },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      {/* Header */}
      <SafeAreaView style={styles.headerBg} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greet}>{greeting()},</Text>
            <Text style={styles.name}>{firstName(user?.fullName ?? null)} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push("/(tabs)/notifications")}
            accessibilityLabel="Notifications"
          >
            <Icon name="notifications-outline" size={22} color="#1E293B" />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#1A6FD8" />}
      >
        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/clinic/search")}
          activeOpacity={0.9}
        >
          <Icon name="search-outline" size={18} color="#94A3B8" />
          <Text style={styles.searchText}>Search clinic, doctor or service</Text>
          <Icon name="options-outline" size={18} color="#64748B" />
        </TouchableOpacity>

        {/* Active queue card */}
        {activeQueue && (
          <TouchableOpacity
            style={styles.queueCard}
            onPress={() => router.push(`/queue/${activeQueue.entryId}`)}
            activeOpacity={0.9}
          >
            <View style={styles.queueCardTop}>
              <View>
                <Text style={styles.queueCardLabel}>Your Current Queue ⓘ</Text>
                <Text style={styles.queueCardClinic}>{activeQueue.clinicName}</Text>
              </View>
              <View style={styles.queueDoctorBadge}>
                <Text style={styles.queueDoctorInitial}>{activeQueue.doctorName.charAt(0)}</Text>
              </View>
            </View>
            <Text style={styles.queueNumber}>#{activeQueue.queueNumber.toString().padStart(3, "0")}</Text>
            <View style={styles.queueCardBottom}>
              <View style={styles.queueMeta}>
                <Icon name="people-outline" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.queueMetaText}>{activeQueue.position} people ahead of you</Text>
              </View>
              <View style={styles.queueMeta}>
                <Icon name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.queueMetaText}>
                  ~{activeQueue.position * activeQueue.consultationDuration} mins
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.queueDetailsBtn}
              onPress={() => router.push(`/queue/${activeQueue.entryId}`)}
            >
              <Text style={styles.queueDetailsBtnText}>View Queue Details</Text>
              <Icon name="arrow-forward-outline" size={14} color="#1A6FD8" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>What would you like to do?</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionBox}
              onPress={a.onPress}
              activeOpacity={0.8}
            >
              <View style={styles.actionIcon}>
                <Icon name={a.icon} size={24} color="#1A6FD8" />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
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

        {/* Notification banner */}
        <View style={styles.notifBanner}>
          <View style={styles.notifBannerIcon}>
            <Icon name="notifications-outline" size={22} color="#1A6FD8" />
          </View>
          <View style={styles.notifBannerText}>
            <Text style={styles.notifBannerTitle}>Get Notified, Stay Updated</Text>
            <Text style={styles.notifBannerSub}>Turn on notifications to receive updates about your queue and appointments.</Text>
          </View>
          <TouchableOpacity style={styles.enableBtn}>
            <Text style={styles.enableBtnText}>Enable</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  headerBg: { backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  headerLeft: {},
  greet: { fontSize: 13, color: "#94A3B8", fontWeight: "400" },
  name: { fontSize: 22, fontWeight: "700", color: "#1E293B" },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", position: "relative" },
  bellBadge: { position: "absolute", top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#FFFFFF" },

  scroll: { paddingBottom: 100 },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 12, marginBottom: 16,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: "#F1F5F9",
  },
  searchText: { flex: 1, fontSize: 14, color: "#94A3B8" },

  queueCard: {
    backgroundColor: "#1A6FD8", marginHorizontal: 16, borderRadius: 20,
    padding: 18, marginBottom: 20,
  },
  queueCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  queueCardLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  queueCardClinic: { fontSize: 13, color: "#FFFFFF", fontWeight: "600", marginTop: 2 },
  queueDoctorBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  queueDoctorInitial: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  queueNumber: { fontSize: 52, fontWeight: "800", color: "#FFFFFF", lineHeight: 58, marginBottom: 10 },
  queueCardBottom: { flexDirection: "row", gap: 16, marginBottom: 14 },
  queueMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  queueMetaText: { fontSize: 12, color: "rgba(255,255,255,0.9)" },
  queueDetailsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#FFFFFF", borderRadius: 10, paddingVertical: 10,
  },
  queueDetailsBtnText: { fontSize: 13, fontWeight: "600", color: "#1A6FD8" },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 16 },
  seeAll: { fontSize: 13, color: "#1A6FD8", fontWeight: "500" },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10, marginBottom: 24 },
  actionBox: {
    width: "47%", backgroundColor: "#FFFFFF", borderRadius: 16,
    padding: 16, alignItems: "flex-start", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center",
  },
  actionLabel: { fontSize: 13, fontWeight: "600", color: "#1E293B", lineHeight: 18 },

  clinicCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, marginHorizontal: 16,
    marginBottom: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    flexDirection: "row",
  },
  clinicPhoto: {
    width: 100, height: 110, justifyContent: "center", alignItems: "center",
    position: "relative",
  },
  clinicPhotoText: { fontSize: 36, fontWeight: "800", color: "rgba(255,255,255,0.6)" },
  openBadge: {
    position: "absolute", top: 8, right: 8,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  openDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#22C55E" },
  openText: { fontSize: 9, color: "#FFFFFF", fontWeight: "600" },
  clinicCardInfo: { flex: 1, padding: 12 },
  clinicCardName: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  clinicAddressRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 6 },
  clinicAddressText: { fontSize: 11, color: "#94A3B8", flex: 1 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  tag: { backgroundColor: "#EFF6FF", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10, color: "#1A6FD8", fontWeight: "500" },
  clinicMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12, fontWeight: "600", color: "#1E293B" },
  ratingCount: { fontSize: 11, color: "#94A3B8" },
  distanceText: { fontSize: 11, color: "#94A3B8" },

  notifBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", marginHorizontal: 16, borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    borderWidth: 1, borderColor: "#E2E8F0",
    marginTop: 8,
  },
  notifBannerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  notifBannerText: { flex: 1 },
  notifBannerTitle: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  notifBannerSub: { fontSize: 11, color: "#64748B", marginTop: 2, lineHeight: 16 },
  enableBtn: { backgroundColor: "#1A6FD8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  enableBtnText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
});

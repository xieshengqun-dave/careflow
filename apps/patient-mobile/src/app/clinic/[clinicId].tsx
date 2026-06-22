import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { searchClinics, type ClinicWithDoctors } from "@/lib/api/clinics";
import { getClinicActiveQueues, type ClinicQueue } from "@/lib/api/queues";

const CLINIC_COLORS = ["#1A6FD8","#0D9488","#7C3AED","#DB2777","#EA580C","#65A30D"];
function clinicColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return CLINIC_COLORS[Math.abs(h) % CLINIC_COLORS.length] ?? "#1A6FD8";
}

function DoctorCard({
  doctor,
  clinic,
  queue,
}: {
  doctor: ClinicWithDoctors["doctors"][number];
  clinic: ClinicWithDoctors;
  queue: ClinicQueue | null;
}) {
  const router = useRouter();
  const initials = doctor.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() =>
        router.push({
          pathname: `/booking/${doctor.doctorId}`,
          params: { clinicId: clinic.id, clinicName: clinic.name, doctorName: doctor.fullName },
        })
      }
      activeOpacity={0.85}
    >
      <View style={styles.doctorAvatar}>
        <Text style={styles.doctorAvatarText}>{initials}</Text>
      </View>
      <View style={styles.doctorInfo}>
        <View style={styles.doctorNameRow}>
          <Text style={styles.doctorName}>{doctor.fullName}</Text>
          <View style={styles.verifiedBadge}>
            <Icon name="checkmark-circle" size={14} color="#1A6FD8" />
          </View>
        </View>
        <Text style={styles.doctorSpec}>{doctor.specialization ?? "General Practice"}</Text>
        <Text style={styles.doctorSlot}>
          {queue ? `Next: ${queue.waitingCount > 0 ? `~${queue.waitingCount * queue.consultationDuration} min wait` : "Available now"}` : "Schedule available"}
        </Text>
      </View>
      <Icon name="chevron-forward-outline" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );
}

export default function ClinicDetailsScreen() {
  const router = useRouter();
  const { clinicId } = useLocalSearchParams<{ clinicId: string }>();
  const [clinic, setClinic] = useState<ClinicWithDoctors | null>(null);
  const [queues, setQueues] = useState<ClinicQueue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [all, activeQueues] = await Promise.all([
        searchClinics(),
        getClinicActiveQueues(clinicId as string),
      ]);
      setClinic(all.find((c) => c.id === clinicId) ?? null);
      setQueues(activeQueues);
      setLoading(false);
    }
    void load();
  }, [clinicId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1A6FD8" /></View>;
  }
  if (!clinic) {
    return <View style={styles.center}><Text style={styles.errorText}>Clinic not found.</Text></View>;
  }

  const color = clinicColor(clinic.name);
  const queueByDoctor = Object.fromEntries(queues.map((q) => [q.doctorId, q]));
  const services = [...new Set(clinic.doctors.flatMap((d) => d.specialization ? [d.specialization] : []))];
  const anyQueue = queues[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Photo header */}
        <View style={[styles.photoHeader, { backgroundColor: color }]}>
          {/* Overlay buttons */}
          <View style={styles.photoOverlay}>
            <TouchableOpacity style={styles.overlayBtn} onPress={() => router.back()}>
              <Icon name="arrow-back-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.overlayRight}>
              <TouchableOpacity style={styles.overlayBtn}>
                <Icon name="heart-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.overlayBtn}>
                <Icon name="share-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.photoHeaderText}>{clinic.name.charAt(0)}</Text>
        </View>

        {/* Avatar overlapping photo */}
        <View style={styles.avatarOverlap}>
          <View style={[styles.clinicAvatar, { borderColor: color }]}>
            <Text style={[styles.clinicAvatarText, { color }]}>{clinic.name.charAt(0)}</Text>
          </View>
        </View>

        {/* Clinic info */}
        <View style={styles.clinicInfo}>
          <Text style={styles.clinicName}>{clinic.name}</Text>
          <View style={styles.typeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {services[0] ?? "General Practice"}
              </Text>
            </View>
          </View>
          <View style={styles.ratingHoursRow}>
            <View style={styles.ratingInline}>
              <Icon name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingNum}>4.8</Text>
              <Text style={styles.ratingCount}>(320 Reviews)</Text>
            </View>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.hoursText}>8:00 AM – 10:00 PM</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {([
            { icon: "call-outline", label: "Call" },
            { icon: "navigate-outline", label: "Directions" },
            { icon: "bookmark-outline", label: "Save" },
            { icon: "globe-outline", label: "Website" },
          ] as const).map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionBtn} activeOpacity={0.7}>
              <View style={styles.actionBtnIcon}>
                <Icon name={a.icon} size={18} color="#1A6FD8" />
              </View>
              <Text style={styles.actionBtnLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Address */}
        {clinic.address ? (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#EFF6FF" }]}>
                <Icon name="location-outline" size={16} color="#1A6FD8" />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {clinic.address}{clinic.city ? `, ${clinic.city}` : ""}
                </Text>
              </View>
            </View>
            <View style={[styles.infoRow, { marginTop: 12 }]}>
              <View style={[styles.infoIcon, { backgroundColor: "#F0FDF4" }]}>
                <Icon name="time-outline" size={16} color="#16A34A" />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Operating Hours</Text>
                <Text style={styles.infoValue}>8:00 AM – 10:00 PM  <Text style={styles.openNow}>Open Now</Text></Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Clinic</Text>
          <Text style={styles.aboutText}>
            {clinic.name} provides comprehensive primary care and specialist services for the whole family.
            Our experienced doctors are committed to delivering quality healthcare in a comfortable environment.
          </Text>
        </View>

        {/* Services */}
        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services Available</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceScroll}>
              {services.map((s, i) => (
                <View key={i} style={styles.serviceChip}>
                  <Icon name="checkmark-circle-outline" size={12} color="#1A6FD8" />
                  <Text style={styles.serviceChipText}>{s}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Doctors */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Doctors ({clinic.doctors.length})</Text>
            <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
          </View>
          {clinic.doctors.length === 0 ? (
            <Text style={styles.emptyDoctors}>No doctors available.</Text>
          ) : (
            clinic.doctors.map((doc) => (
              <DoctorCard key={doc.doctorId} doctor={doc} clinic={clinic} queue={queueByDoctor[doc.doctorId] ?? null} />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {anyQueue ? (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() =>
              router.push({
                pathname: "/queue/join",
                params: {
                  queueId: anyQueue.queueId,
                  doctorName: anyQueue.doctorName,
                  clinicName: clinic.name,
                  waitingCount: String(anyQueue.waitingCount),
                  consultationDuration: String(anyQueue.consultationDuration),
                },
              })
            }
            activeOpacity={0.85}
          >
            <Icon name="people-outline" size={17} color="#1A6FD8" />
            <Text style={styles.joinBtnText}>Join Queue</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.joinBtn, styles.joinBtnDisabled]}>
            <Icon name="people-outline" size={17} color="#94A3B8" />
            <Text style={[styles.joinBtnText, { color: "#94A3B8" }]}>No Queue</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => {
            if (clinic.doctors[0]) {
              router.push({
                pathname: `/booking/${clinic.doctors[0].doctorId}`,
                params: { clinicId: clinic.id, clinicName: clinic.name, doctorName: clinic.doctors[0].fullName },
              });
            } else {
              Alert.alert("No doctors available for booking.");
            }
          }}
          activeOpacity={0.85}
        >
          <Icon name="calendar-outline" size={17} color="#FFFFFF" />
          <Text style={styles.bookBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, color: "#64748B" },
  scroll: { paddingBottom: 20 },

  photoHeader: { height: 180, justifyContent: "flex-end", alignItems: "center" },
  photoOverlay: {
    position: "absolute", top: 44, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  overlayBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center", alignItems: "center",
  },
  overlayRight: { flexDirection: "row", gap: 8 },
  photoHeaderText: { fontSize: 72, fontWeight: "800", color: "rgba(255,255,255,0.3)", marginBottom: 24 },

  avatarOverlap: { alignItems: "center", marginTop: -36, marginBottom: 8, zIndex: 10 },
  clinicAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#FFFFFF", borderWidth: 3,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 8, elevation: 4,
  },
  clinicAvatarText: { fontSize: 28, fontWeight: "800" },

  clinicInfo: { alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  clinicName: { fontSize: 22, fontWeight: "700", color: "#1E293B", textAlign: "center", marginBottom: 8 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  typeBadge: { backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, color: "#1A6FD8", fontWeight: "600" },
  ratingHoursRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingInline: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingNum: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  ratingCount: { fontSize: 12, color: "#94A3B8" },
  dot: { color: "#CBD5E1" },
  hoursText: { fontSize: 12, color: "#64748B" },

  actionButtons: {
    flexDirection: "row", justifyContent: "space-around",
    backgroundColor: "#FFFFFF", marginHorizontal: 16, borderRadius: 16,
    paddingVertical: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  actionBtn: { alignItems: "center", gap: 6 },
  actionBtnIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center",
  },
  actionBtnLabel: { fontSize: 11, color: "#64748B", fontWeight: "500" },

  infoCard: {
    backgroundColor: "#FFFFFF", marginHorizontal: 16, borderRadius: 16,
    padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  infoIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  infoValue: { fontSize: 13, color: "#1E293B", lineHeight: 19 },
  openNow: { color: "#16A34A", fontWeight: "600" },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  viewAll: { fontSize: 13, color: "#1A6FD8", fontWeight: "500" },
  aboutText: { fontSize: 13, color: "#64748B", lineHeight: 21 },
  serviceScroll: { gap: 8 },
  serviceChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  serviceChipText: { fontSize: 12, color: "#1A6FD8", fontWeight: "500" },
  emptyDoctors: { fontSize: 13, color: "#94A3B8", padding: 12 },

  doctorCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  doctorAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center",
  },
  doctorAvatarText: { fontSize: 18, fontWeight: "700", color: "#1A6FD8" },
  doctorInfo: { flex: 1 },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  doctorName: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  verifiedBadge: {},
  doctorSpec: { fontSize: 12, color: "#64748B", marginBottom: 4 },
  doctorSlot: { fontSize: 11, color: "#1A6FD8", fontWeight: "500" },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: "#E2E8F0",
  },
  joinBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    borderWidth: 1.5, borderColor: "#1A6FD8", borderRadius: 12, paddingVertical: 14,
  },
  joinBtnDisabled: { borderColor: "#E2E8F0" },
  joinBtnText: { fontSize: 14, fontWeight: "600", color: "#1A6FD8" },
  bookBtn: {
    flex: 1.3, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: "#1A6FD8", borderRadius: 12, paddingVertical: 14,
  },
  bookBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});

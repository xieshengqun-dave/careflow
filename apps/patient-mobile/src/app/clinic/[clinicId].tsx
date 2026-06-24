import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { searchClinics, type ClinicWithDoctors } from "@/lib/api/clinics";
import { getClinicActiveQueues, type ClinicQueue } from "@/lib/api/queues";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

const CLINIC_COLORS = [palette.primary600, palette.green600, palette.purple600, "#DB2777", "#EA580C", "#65A30D"];
function clinicColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return CLINIC_COLORS[Math.abs(h) % CLINIC_COLORS.length] ?? palette.primary600;
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
      onPress={() =>
        router.push({
          pathname: `/booking/${doctor.doctorId}`,
          params: { clinicId: clinic.id, clinicName: clinic.name, doctorName: doctor.fullName },
        })
      }
      activeOpacity={0.85}
    >
      <Card style={styles.doctorCard}>
        <View style={styles.doctorAvatar}>
          <Text style={styles.doctorAvatarText}>{initials}</Text>
        </View>
        <View style={styles.doctorInfo}>
          <View style={styles.doctorNameRow}>
            <Text style={styles.doctorName}>{doctor.fullName}</Text>
            <Icon name="checkmark-circle" size={14} color={palette.primary600} />
          </View>
          <Text style={styles.doctorSpec}>{doctor.specialization ?? "General Practice"}</Text>
          <Text style={styles.doctorSlot}>
            {queue ? `Next: ${queue.waitingCount > 0 ? `~${queue.waitingCount * queue.consultationDuration} min wait` : "Available now"}` : "Schedule available"}
          </Text>
        </View>
        <Icon name="chevron-forward-outline" size={16} color={palette.slate400} />
      </Card>
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
    return <View style={styles.center}><ActivityIndicator size="large" color={palette.primary600} /></View>;
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
              <Icon name="chevron-back" size={20} color={palette.slate900} />
            </TouchableOpacity>
            <View style={styles.overlayRight}>
              <TouchableOpacity style={styles.overlayBtn}>
                <Icon name="heart-outline" size={20} color={palette.slate900} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.overlayBtn}>
                <Icon name="share-outline" size={20} color={palette.slate900} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.photoHeaderLabel}>[ clinic interior photo ]</Text>
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
              <Icon name="checkmark-circle" size={12} color={palette.primary600} />
              <Text style={styles.typeBadgeText}>
                {services[0] ?? "General Practice"}
              </Text>
            </View>
          </View>
          <View style={styles.ratingHoursRow}>
            <View style={styles.ratingInline}>
              <Icon name="star" size={13} color={palette.star} />
              <Text style={styles.ratingNum}>4.8</Text>
              <Text style={styles.ratingCount}>(320 Reviews)</Text>
            </View>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.openNowInline}>Open</Text>
            <Text style={styles.hoursText}>· 8:00 AM – 10:00 PM</Text>
          </View>
        </View>

        {/* Action buttons */}
        <Card style={styles.actionButtons}>
          {([
            { icon: "call-outline", label: "Call" },
            { icon: "navigate-outline", label: "Directions" },
            { icon: "bookmark-outline", label: "Save" },
            { icon: "globe-outline", label: "Website" },
          ] as const).map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionBtn} activeOpacity={0.7}>
              <View style={styles.actionBtnIcon}>
                <Icon name={a.icon} size={18} color={palette.primary600} />
              </View>
              <Text style={styles.actionBtnLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Address */}
        {clinic.address ? (
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: palette.primary50 }]}>
                <Icon name="location-outline" size={16} color={palette.primary600} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {clinic.address}{clinic.city ? `, ${clinic.city}` : ""}
                </Text>
              </View>
            </View>
            <View style={[styles.infoRow, { marginTop: spacing.md }]}>
              <View style={[styles.infoIcon, { backgroundColor: palette.green50 }]}>
                <Icon name="time-outline" size={16} color={palette.green600} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Operating Hours</Text>
                <Text style={styles.infoValue}>8:00 AM – 10:00 PM  <Text style={styles.openNow}>Open Now</Text></Text>
              </View>
            </View>
          </Card>
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
                  <Icon name="checkmark-circle-outline" size={12} color={palette.primary600} />
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
          <Button
            label="Join Queue"
            variant="secondary"
            icon="people-outline"
            iconPosition="left"
            fullWidth={false}
            style={styles.flexBtn}
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
          />
        ) : (
          <View style={[styles.flexBtn, styles.joinBtnDisabled]}>
            <Icon name="people-outline" size={17} color={palette.slate400} />
            <Text style={styles.joinBtnDisabledText}>No Queue</Text>
          </View>
        )}
        <Button
          label="Book Appointment"
          icon="calendar-outline"
          iconPosition="left"
          fullWidth={false}
          style={[styles.flexBtn, styles.bookBtnFlex]}
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
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { ...textStyle("body"), color: palette.slate500 },
  scroll: { paddingBottom: 20 },

  photoHeader: { height: 180, justifyContent: "flex-end", alignItems: "center" },
  photoOverlay: {
    position: "absolute", top: 44, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  overlayBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center",
  },
  overlayRight: { flexDirection: "row", gap: spacing.sm },
  photoHeaderText: { fontSize: 72, fontFamily: fontFamily(800), color: "rgba(255,255,255,0.3)", marginBottom: 4 },
  photoHeaderLabel: { ...textStyle("caption"), fontFamily: fontFamily(400), color: "rgba(255,255,255,0.7)", marginBottom: spacing.lg },

  avatarOverlap: { alignItems: "center", marginTop: -36, marginBottom: spacing.sm, zIndex: 10 },
  clinicAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: palette.surface, borderWidth: 3,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 8, elevation: 4,
  },
  clinicAvatarText: { fontSize: 28, fontFamily: fontFamily(800) },

  clinicInfo: { alignItems: "center", paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  clinicName: { ...textStyle("h1"), color: palette.slate900, textAlign: "center", marginBottom: spacing.sm },
  typeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: palette.primary50, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  typeBadgeText: { ...textStyle("label"), color: palette.primary600 },
  ratingHoursRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ratingInline: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  ratingNum: { fontSize: 13, fontFamily: fontFamily(700), color: palette.slate900 },
  ratingCount: { fontSize: 12, color: palette.slate400 },
  dot: { color: palette.slate200 },
  openNowInline: { fontSize: 12, fontFamily: fontFamily(600), color: palette.green600 },
  hoursText: { fontSize: 12, color: palette.slate500 },

  actionButtons: {
    flexDirection: "row", justifyContent: "space-around",
    marginHorizontal: spacing.lg, paddingVertical: spacing.lg, marginBottom: spacing.md,
  },
  actionBtn: { alignItems: "center", gap: spacing.xs },
  actionBtnIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: palette.primary50, justifyContent: "center", alignItems: "center",
  },
  actionBtnLabel: { fontSize: 11, color: palette.slate500, fontFamily: fontFamily(500) },

  infoCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  infoRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  infoIcon: { width: 36, height: 36, borderRadius: radius.sm, justifyContent: "center", alignItems: "center" },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: palette.slate400, fontFamily: fontFamily(600), textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  infoValue: { fontSize: 13, color: palette.slate900, lineHeight: 19 },
  openNow: { color: palette.green600, fontFamily: fontFamily(600) },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sectionTitle: { ...textStyle("h3"), color: palette.slate900, marginBottom: spacing.md },
  viewAll: { ...textStyle("label"), color: palette.primary600 },
  aboutText: { fontSize: 13, color: palette.slate500, lineHeight: 21 },
  serviceScroll: { gap: spacing.sm },
  serviceChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: palette.primary50, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  serviceChipText: { fontSize: 12, color: palette.primary600, fontFamily: fontFamily(500) },
  emptyDoctors: { fontSize: 13, color: palette.slate400, padding: spacing.md },

  doctorCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    marginBottom: spacing.sm,
  },
  doctorAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: palette.primary50, justifyContent: "center", alignItems: "center",
  },
  doctorAvatarText: { fontSize: 18, fontFamily: fontFamily(700), color: palette.primary600 },
  doctorInfo: { flex: 1 },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: 2 },
  doctorName: { fontSize: 14, fontFamily: fontFamily(600), color: palette.slate900 },
  doctorSpec: { fontSize: 12, color: palette.slate500, marginBottom: spacing.xs },
  doctorSlot: { fontSize: 11, color: palette.primary600, fontFamily: fontFamily(500) },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: spacing.md,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: palette.border,
  },
  flexBtn: { flex: 1 },
  joinBtnDisabled: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs,
    borderWidth: 1.5, borderColor: palette.slate200, borderRadius: radius.md, paddingVertical: spacing.md,
  },
  joinBtnDisabledText: { fontSize: 14, fontFamily: fontFamily(600), color: palette.slate400 },
  bookBtnFlex: { flexGrow: 1.3 },
});

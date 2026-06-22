import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { searchClinics, type ClinicWithDoctors } from "@/lib/api/clinics";

const FILTERS = ["All Clinics", "GP / Family", "Dental", "Paediatrics", "More"] as const;
const CLINIC_COLORS = ["#1A6FD8","#0D9488","#7C3AED","#DB2777","#EA580C","#65A30D"];
function clinicColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return CLINIC_COLORS[Math.abs(h) % CLINIC_COLORS.length] ?? "#1A6FD8";
}

function ClinicCard({ clinic }: { clinic: ClinicWithDoctors }) {
  const router = useRouter();
  const color = clinicColor(clinic.name);
  const specialties = [...new Set(clinic.doctors.map((d) => d.specialization).filter(Boolean))].slice(0, 3);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/clinic/${clinic.id}`)}
      activeOpacity={0.88}
      accessibilityLabel={`${clinic.name}`}
    >
      {/* Photo placeholder */}
      <View style={[styles.photo, { backgroundColor: color }]}>
        <Text style={styles.photoInitial}>{clinic.name.charAt(0)}</Text>
        <View style={styles.openBadge}>
          <View style={styles.openDot} />
          <Text style={styles.openText}>Open</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.clinicName} numberOfLines={1}>{clinic.name}</Text>
        {clinic.address ? (
          <View style={styles.addrRow}>
            <Icon name="location-outline" size={11} color="#94A3B8" />
            <Text style={styles.addrText} numberOfLines={1}>
              {clinic.address}{clinic.city ? `, ${clinic.city}` : ""}
            </Text>
          </View>
        ) : null}

        {/* Tags */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
          {specialties.map((s, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
          {clinic.doctors.length > 0 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{clinic.doctors.length} Doctors</Text>
            </View>
          )}
        </ScrollView>

        {/* Rating + distance + hours */}
        <View style={styles.metaRow}>
          <View style={styles.ratingWrap}>
            <Icon name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingNum}>4.8</Text>
            <Text style={styles.ratingCount}>(320)</Text>
          </View>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.distanceText}>1.2 km</Text>
        </View>
        <View style={styles.hoursRow}>
          <Icon name="time-outline" size={11} color="#94A3B8" />
          <Text style={styles.hoursText}>8:00 AM – 10:00 PM</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ClinicSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All Clinics");
  const [clinics, setClinics] = useState<ClinicWithDoctors[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    const data = await searchClinics(q || undefined);
    setClinics(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void doSearch("");
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [doSearch]);

  useEffect(() => {
    const t = setTimeout(() => void doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <Icon name="arrow-back-outline" size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Find Clinics</Text>
          <TouchableOpacity style={styles.locationChip}>
            <Icon name="location-outline" size={13} color="#1A6FD8" />
            <Text style={styles.locationText}>Kuala Lumpur</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={17} color="#94A3B8" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Clinic name, specialty, area…"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {loading ? (
            <ActivityIndicator size="small" color="#1A6FD8" />
          ) : (
            <TouchableOpacity style={styles.filterIcon}>
              <Icon name="options-outline" size={17} color="#1A6FD8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
              accessibilityLabel={f}
            >
              <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Results count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{clinics.length} clinics found</Text>
        <TouchableOpacity style={styles.sortBtn}>
          <Text style={styles.sortText}>Sort by: Nearest</Text>
          <Icon name="chevron-down-outline" size={13} color="#64748B" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={clinics}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ClinicCard clinic={item} />}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Icon name="business-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No clinics found</Text>
              <Text style={styles.emptySub}>Try adjusting your search.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  topBar: { backgroundColor: "#FFFFFF", paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  topRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { padding: 4, marginRight: 8 },
  topTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#1E293B" },
  locationChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  locationText: { fontSize: 12, color: "#1A6FD8", fontWeight: "500" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 12, marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1E293B" },
  filterIcon: { padding: 2 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF",
  },
  filterChipActive: { backgroundColor: "#1A6FD8", borderColor: "#1A6FD8" },
  filterChipText: { fontSize: 13, color: "#64748B", fontWeight: "500" },
  filterChipTextActive: { color: "#FFFFFF", fontWeight: "600" },

  countRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
  },
  countText: { fontSize: 13, color: "#64748B" },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sortText: { fontSize: 13, color: "#64748B" },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 16,
    marginBottom: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  photo: { width: 90, minHeight: 120, justifyContent: "center", alignItems: "center" },
  photoInitial: { fontSize: 36, fontWeight: "800", color: "rgba(255,255,255,0.5)" },
  openBadge: {
    position: "absolute", top: 8, right: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  openDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#22C55E" },
  openText: { fontSize: 9, color: "#FFFFFF", fontWeight: "600" },
  info: { flex: 1, padding: 12 },
  clinicName: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 6 },
  addrText: { fontSize: 11, color: "#94A3B8", flex: 1 },
  tagScroll: { marginBottom: 8 },
  tag: { backgroundColor: "#F1F5F9", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 6 },
  tagText: { fontSize: 10, color: "#475569", fontWeight: "500" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingNum: { fontSize: 12, fontWeight: "700", color: "#1E293B" },
  ratingCount: { fontSize: 11, color: "#94A3B8" },
  dot: { fontSize: 11, color: "#CBD5E1" },
  distanceText: { fontSize: 12, color: "#64748B" },
  hoursRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  hoursText: { fontSize: 11, color: "#94A3B8" },
  empty: { paddingTop: 60, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  emptySub: { fontSize: 13, color: "#94A3B8" },
});

import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { searchClinics, type ClinicWithDoctors } from "@/lib/api/clinics";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

const FILTERS = ["All Clinics", "GP / Family", "Dental", "Paediatrics", "More"] as const;
const CLINIC_COLORS = [palette.primary600, palette.green600, palette.purple600, "#DB2777", "#EA580C", "#65A30D"];
function clinicColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return CLINIC_COLORS[Math.abs(h) % CLINIC_COLORS.length] ?? palette.primary600;
}

function ClinicCard({ clinic }: { clinic: ClinicWithDoctors }) {
  const router = useRouter();
  const color = clinicColor(clinic.name);
  const specialties = [...new Set(clinic.doctors.map((d) => d.specialization).filter(Boolean))].slice(0, 3);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/clinic/${clinic.id}`)}
      activeOpacity={0.88}
      accessibilityLabel={`${clinic.name}`}
    >
      <Card style={styles.card} padded={false}>
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
              <Icon name="location-outline" size={11} color={palette.slate400} />
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
              <Icon name="star" size={11} color={palette.star} />
              <Text style={styles.ratingNum}>4.8</Text>
              <Text style={styles.ratingCount}>(320)</Text>
            </View>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.distanceText}>1.2 km</Text>
          </View>
          <View style={styles.hoursRow}>
            <Icon name="time-outline" size={11} color={palette.slate400} />
            <Text style={styles.hoursText}>8:00 AM – 10:00 PM</Text>
          </View>
        </View>
      </Card>
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
      <StatusBar barStyle="dark-content" backgroundColor={palette.surface} />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <Icon name="chevron-back" size={24} color={palette.slate900} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Find Clinics</Text>
          <TouchableOpacity style={styles.locationChip}>
            <Icon name="location-outline" size={13} color={palette.primary600} />
            <Text style={styles.locationText}>Kuala Lumpur</Text>
            <Icon name="chevron-down" size={12} color={palette.primary600} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={17} color={palette.slate400} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Clinic name, specialty, area…"
            placeholderTextColor={palette.slate400}
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {loading ? (
            <ActivityIndicator size="small" color={palette.primary600} />
          ) : (
            <TouchableOpacity style={styles.filterIconBtn}>
              <Icon name="options-outline" size={17} color={palette.slate700} />
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
          <Icon name="chevron-down-outline" size={13} color={palette.slate500} />
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
              <Icon name="business-outline" size={44} color={palette.slate200} />
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
  container: { flex: 1, backgroundColor: palette.appBg },
  topBar: { backgroundColor: palette.surface, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.border },
  topRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  topTitle: { flex: 1, ...textStyle("h3"), color: palette.slate900 },
  locationChip: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: palette.primary50, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  locationText: { ...textStyle("caption"), color: palette.primary600 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: palette.slate100, borderWidth: 1, borderColor: palette.slate200,
    borderRadius: radius.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 11,
  },
  searchInput: { flex: 1, ...textStyle("body"), color: palette.slate900 },
  filterIconBtn: { padding: 2 },
  filterRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: 1, borderColor: palette.slate200, backgroundColor: palette.surface,
  },
  filterChipActive: { backgroundColor: palette.primary700, borderColor: palette.primary700 },
  filterChipText: { ...textStyle("label"), color: palette.slate500 },
  filterChipTextActive: { color: palette.surface, fontFamily: fontFamily(700) },

  countRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  countText: { ...textStyle("label"), fontFamily: fontFamily(400), color: palette.slate500 },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  sortText: { ...textStyle("label"), fontFamily: fontFamily(400), color: palette.slate500 },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  card: { flexDirection: "row", marginBottom: spacing.md, overflow: "hidden" },
  photo: { width: 90, minHeight: 120, justifyContent: "center", alignItems: "center" },
  photoInitial: { fontSize: 36, fontFamily: fontFamily(800), color: "rgba(255,255,255,0.5)" },
  openBadge: {
    position: "absolute", top: spacing.sm, right: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: radius.sm,
    paddingHorizontal: spacing.xs, paddingVertical: 3,
  },
  openDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.green500 },
  openText: { fontSize: 9, color: palette.surface, fontFamily: fontFamily(600) },
  info: { flex: 1, padding: spacing.md },
  clinicName: { ...textStyle("body"), fontFamily: fontFamily(700), color: palette.slate900, marginBottom: spacing.xs },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: spacing.sm },
  addrText: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate400, flex: 1 },
  tagScroll: { marginBottom: spacing.sm },
  tag: { backgroundColor: palette.slate100, borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 3, marginRight: spacing.xs },
  tagText: { fontSize: 10, color: palette.slate600, fontFamily: fontFamily(500) },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs },
  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingNum: { fontSize: 12, fontFamily: fontFamily(700), color: palette.slate900 },
  ratingCount: { fontSize: 11, color: palette.slate400 },
  dot: { fontSize: 11, color: palette.slate200 },
  distanceText: { fontSize: 12, color: palette.slate500 },
  hoursRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  hoursText: { fontSize: 11, color: palette.slate400 },
  empty: { paddingTop: 60, alignItems: "center", gap: spacing.md },
  emptyTitle: { ...textStyle("body"), fontFamily: fontFamily(600), color: palette.slate900 },
  emptySub: { ...textStyle("label"), fontFamily: fontFamily(400), color: palette.slate400 },
});

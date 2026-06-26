import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { palette, radius } from "@/theme/careflow-tokens";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: palette.slate200, opacity },
        style,
      ]}
    />
  );
}

// ─── Preset skeleton layouts ────────────────────────────────────────────────────

export function SkeletonAppointmentCard() {
  return (
    <View style={presets.card}>
      <View style={presets.cardHeader}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={presets.cardInfo}>
          <Skeleton width="60%" height={14} style={presets.mb6} />
          <Skeleton width="40%" height={11} style={presets.mb6} />
          <Skeleton width="50%" height={11} />
        </View>
        <Skeleton width={60} height={22} borderRadius={radius.sm} />
      </View>
      <Skeleton width="100%" height={1} style={[presets.my12, { borderRadius: 0 }]} />
      <Skeleton width="45%" height={12} style={presets.mb6} />
      <View style={presets.row}>
        <Skeleton width="30%" height={32} borderRadius={radius.sm} />
        <Skeleton width="30%" height={32} borderRadius={radius.sm} style={{ marginLeft: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonClinicCard() {
  return (
    <View style={presets.clinicCard}>
      <Skeleton width={100} height={110} borderRadius={0} />
      <View style={presets.clinicInfo}>
        <Skeleton width="65%" height={14} style={presets.mb6} />
        <Skeleton width="45%" height={11} style={presets.mb6} />
        <View style={[presets.row, { gap: 6, marginBottom: 8 }]}>
          <Skeleton width={70} height={18} borderRadius={4} />
          <Skeleton width={60} height={18} borderRadius={4} />
        </View>
        <Skeleton width="55%" height={11} />
      </View>
    </View>
  );
}

export function SkeletonHeroCard() {
  return (
    <View style={presets.heroCard}>
      <Skeleton width="50%" height={16} style={presets.mb12} />
      <Skeleton width="75%" height={22} style={presets.mb12} />
      <Skeleton width="40%" height={13} />
    </View>
  );
}

const presets = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  cardInfo: { flex: 1 },
  row: { flexDirection: "row" },
  clinicCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  clinicInfo: { flex: 1, padding: 12 },
  heroCard: {
    backgroundColor: palette.primary700,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 16,
  },
  mb6: { marginBottom: 6 },
  mb12: { marginBottom: 12 },
  my12: { marginVertical: 12 },
});

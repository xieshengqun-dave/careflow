import { StyleSheet, Text, View } from "react-native";
import { status as statusTokens, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily } from "@/theme/typography";

export type StatusKey = keyof typeof statusTokens;

interface StatusPillProps {
  status: StatusKey;
  label: string;
}

export function StatusPill({ status, label }: StatusPillProps) {
  const tone = statusTokens[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.label, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  label: { fontFamily: fontFamily(700), fontSize: 11 },
});

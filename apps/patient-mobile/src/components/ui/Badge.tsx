import { StyleSheet, Text, View } from "react-native";
import { palette } from "@/theme/careflow-tokens";
import { fontFamily } from "@/theme/typography";

interface BadgeProps {
  count: number;
  max?: number;
}

/** Small red numeric badge — e.g. notification bell unread count. */
export function Badge({ count, max = 9 }: BadgeProps) {
  if (count <= 0) return null;
  const label = count > max ? `${max}+` : String(count);

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.red500,
    borderWidth: 1.5,
    borderColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  text: { fontFamily: fontFamily(700), fontSize: 10, color: "#FFFFFF" },
});

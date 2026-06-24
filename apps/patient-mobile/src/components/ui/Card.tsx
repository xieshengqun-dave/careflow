import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { palette, radius, shadow, spacing } from "@/theme/careflow-tokens";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** Surface card — 16px radius, subtle shadow, per the design system's "Card surface" spec. */
export function Card({ children, style, padded = true }: CardProps) {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  padded: { padding: spacing.lg },
});

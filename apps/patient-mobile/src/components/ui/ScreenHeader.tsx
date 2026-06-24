import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { palette, spacing } from "@/theme/careflow-tokens";
import { textStyle } from "@/theme/typography";
import { Icon, type IoniconName } from "@/components/Icon";

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  trailingIcon?: IoniconName;
  onTrailingPress?: () => void;
  trailing?: React.ReactNode;
}

/** Shared top header: optional back chevron, title, optional trailing icon/slot. */
export function ScreenHeader({ title, showBack, onBack, trailingIcon, onTrailingPress, trailing }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            onPress={onBack ?? (() => router.back())}
            style={styles.backBtn}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <Icon name="chevron-back" size={24} color={palette.slate900} />
          </TouchableOpacity>
        )}
        <Text style={[textStyle("h1"), styles.title]}>{title}</Text>
      </View>

      {trailing ?? (trailingIcon && (
        <TouchableOpacity
          onPress={onTrailingPress}
          style={styles.trailingBtn}
          accessibilityRole="button"
        >
          <Icon name={trailingIcon} size={22} color={palette.slate900} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  backBtn: { padding: spacing.xs },
  title: { color: palette.slate900 },
  trailingBtn: { padding: spacing.xs },
});

import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily } from "@/theme/typography";
import { Icon, type IoniconName } from "@/components/Icon";

export type ButtonVariant = "primary" | "secondary" | "success" | "destructive";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IoniconName;
  iconPosition?: "left" | "right";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; border?: string; text: string }> = {
  primary:     { bg: palette.primary700, text: "#FFFFFF" },
  secondary:   { bg: palette.surface, border: palette.primary600, text: palette.primary600 },
  success:     { bg: palette.green50,  text: palette.green600 },
  destructive: { bg: palette.surface, border: palette.red500, text: palette.red500 },
};

export function Button({
  label, onPress, variant = "primary", icon, iconPosition = "right",
  disabled, loading, fullWidth = true, style,
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1.5 : 0 },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === "left" && <Icon name={icon} size={18} color={v.text} />}
          <Text style={[styles.label, { color: v.text }]}>{label}</Text>
          {icon && iconPosition === "right" && <Icon name={icon} size={18} color={v.text} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.5 },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  label: { fontFamily: fontFamily(700), fontSize: 16 },
});

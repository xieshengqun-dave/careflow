import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, palette, spacing } from "@/theme/careflow-tokens";
import { fontFamily } from "@/theme/typography";

export function SplashView() {
  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.splash} style={styles.gradient}>
        <Image
          source={require("../../assets/images/careflow-mark.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="CareFlow"
        />
        <Text style={styles.subtitle}>Smart Queue & Appointment{"\n"}Management for Clinics</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: { width: 196, height: 140, marginBottom: spacing.lg },
  subtitle: { fontFamily: fontFamily(500), fontSize: 14, color: palette.slate500, textAlign: "center", lineHeight: 21 },
});

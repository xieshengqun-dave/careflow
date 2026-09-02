import { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, Image,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

export default function OnboardingScreen() {
  const { user, loadUser } = useAuthStore();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (saving || trimmed.length < 2) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await updateProfile(session.user.id, { full_name: trimmed });

      // The phone-OTP trigger normally creates the profile row before we get
      // here; insert only for legacy accounts that predate the trigger.
      const { data: row } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!row) {
        const phone = session.user.phone
          ? session.user.phone.startsWith("+")
            ? session.user.phone
            : `+${session.user.phone}`
          : null;
        if (!phone) {
          Alert.alert("Error", "This account has no phone number. Please sign in with your mobile number.");
          return;
        }
        const { error } = await supabase
          .from("profiles")
          .insert({ id: session.user.id, full_name: trimmed, phone_number: phone });
        if (error) {
          Alert.alert("Error", "Could not save your profile. Please try again.");
          return;
        }
      }

      // loadUser picks up the name; the root layout then routes to the app.
      await loadUser();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <Image
              source={require("../../../assets/images/careflow-mark.png")}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="CareFlow"
            />
          </View>

          <Card style={styles.card}>
            <View style={styles.welcomeIcon}>
              <Icon name="person-circle-outline" size={40} color={palette.primary600} />
            </View>
            <Text style={styles.heading}>Welcome to CareFlow!</Text>
            <Text style={styles.subheading}>
              You&apos;re almost set. What should clinics call you?
            </Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g. Ali Hassan"
              placeholderTextColor={palette.slate400}
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              accessibilityLabel="Full name"
            />
            <Text style={styles.hint}>
              This name appears on your appointments and queue tickets.
            </Text>

            {user?.phone ? (
              <View style={styles.phoneRow}>
                <Icon name="call-outline" size={14} color={palette.slate500} />
                <Text style={styles.phoneText}>Registered number: {user.phone}</Text>
              </View>
            ) : null}

            <Button
              label={saving ? "Saving…" : "Continue"}
              onPress={handleContinue}
              loading={saving}
              disabled={name.trim().length < 2}
              icon="arrow-forward"
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.appBg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing["2xl"], justifyContent: "center" },

  logoArea: { alignItems: "center", paddingVertical: spacing["2xl"] },
  logoImage: { width: 140, height: 100 },

  card: { padding: spacing["2xl"], borderRadius: radius.xl },
  welcomeIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: palette.primary50,
    justifyContent: "center", alignItems: "center",
    alignSelf: "center", marginBottom: spacing.lg,
  },
  heading: { ...textStyle("h1"), color: palette.slate900, textAlign: "center", marginBottom: spacing.xs },
  subheading: { ...textStyle("body"), color: palette.slate500, textAlign: "center", marginBottom: spacing["2xl"], lineHeight: 20 },

  label: { ...textStyle("label"), color: palette.slate700, marginBottom: spacing.sm },
  nameInput: {
    borderWidth: 1.5, borderColor: palette.slate200, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    fontSize: 16, fontFamily: fontFamily(400), color: palette.slate900,
    backgroundColor: palette.surface, marginBottom: spacing.sm,
  },
  hint: { ...textStyle("caption"), fontFamily: fontFamily(400), color: palette.slate400, marginBottom: spacing.lg, lineHeight: 18 },

  phoneRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: palette.slate100, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.xl,
  },
  phoneText: { ...textStyle("caption"), fontFamily: fontFamily(500), color: palette.slate500 },
});

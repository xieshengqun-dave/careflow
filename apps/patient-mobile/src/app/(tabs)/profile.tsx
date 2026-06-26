import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IoniconName } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/store/authStore";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SettingsRow {
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

interface SettingsSection {
  title: string;
  rows: SettingsRow[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function SettingsCard({ section }: { section: SettingsSection }) {
  return (
    <View style={styles.settingsCard}>
      <Text style={styles.settingsSectionTitle}>{section.title}</Text>
      <Card style={styles.settingsCardInner} padded={false}>
        {section.rows.map((row, idx) => (
          <TouchableOpacity
            key={row.label}
            style={[
              styles.settingsRow,
              idx < section.rows.length - 1 && styles.settingsRowBorder,
            ]}
            onPress={row.onPress}
            activeOpacity={row.rightElement ? 1 : 0.7}
            accessibilityLabel={row.label}
            accessibilityRole="button"
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: row.iconBg }]}>
              <Icon name={row.icon} size={17} color={row.iconColor} />
            </View>
            <Text style={styles.settingsLabel}>{row.label}</Text>
            {row.rightElement ?? (
              <Icon name="chevron-forward-outline" size={16} color={palette.slate200} />
            )}
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [notifEnabled, setNotifEnabled] = useState(true);

  const ini = getInitials(user?.fullName ?? null);

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await useAuthStore.getState().signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const sections: SettingsSection[] = [
    {
      title: "Account",
      rows: [
        {
          icon: "person-outline",
          iconColor: palette.primary600,
          iconBg: palette.primary50,
          label: "Edit Profile",
          onPress: () => {},
        },
        {
          icon: "call-outline",
          iconColor: palette.green600,
          iconBg: palette.green50,
          label: "Change Phone Number",
          onPress: () => {},
        },
      ],
    },
    {
      title: "Preferences",
      rows: [
        {
          icon: "notifications-outline",
          iconColor: palette.purple600,
          iconBg: palette.purple50,
          label: "Notifications",
          rightElement: (
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: palette.slate200, true: palette.primary100 }}
              thumbColor={notifEnabled ? palette.primary600 : palette.slate400}
            />
          ),
        },
        {
          icon: "language-outline",
          iconColor: palette.amber700,
          iconBg: palette.amber100,
          label: "Language",
          onPress: () => {},
        },
      ],
    },
    {
      title: "Support",
      rows: [
        {
          icon: "help-circle-outline",
          iconColor: palette.green700,
          iconBg: palette.green50,
          label: "Help & FAQ",
          onPress: () => {},
        },
        {
          icon: "chatbubble-ellipses-outline",
          iconColor: palette.primary600,
          iconBg: palette.primary50,
          label: "Contact Support",
          onPress: () => {},
        },
        {
          icon: "star-outline",
          iconColor: palette.amber700,
          iconBg: palette.amber100,
          label: "Rate App",
          onPress: () => {},
        },
      ],
    },
    {
      title: "About",
      rows: [
        {
          icon: "shield-checkmark-outline",
          iconColor: palette.slate500,
          iconBg: palette.slate100,
          label: "Privacy Policy",
          onPress: () => {},
        },
        {
          icon: "document-text-outline",
          iconColor: palette.slate500,
          iconBg: palette.slate100,
          label: "Terms of Service",
          onPress: () => {},
        },
        {
          icon: "information-circle-outline",
          iconColor: palette.slate500,
          iconBg: palette.slate100,
          label: "App Version",
          rightElement: <Text style={styles.versionValue}>1.0.0</Text>,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.appBg} />

      <SafeAreaView style={styles.headerBg} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Avatar + Info */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{ini}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.fullName ?? "—"}</Text>
          {user?.phone ? (
            <Text style={styles.userPhone}>{user.phone}</Text>
          ) : null}
          <TouchableOpacity style={styles.editProfileBtn} activeOpacity={0.8}>
            <Icon name="create-outline" size={14} color={palette.primary600} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </Card>

        {/* Settings sections */}
        {sections.map((section) => (
          <SettingsCard key={section.title} section={section} />
        ))}

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <Icon name="log-out-outline" size={18} color={palette.red600} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },
  headerBg: { backgroundColor: palette.surface },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: { ...textStyle("h1"), color: palette.slate900 },

  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },

  // Profile card
  profileCard: {
    borderRadius: radius.xl,
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: palette.primary50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primary600,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 28, fontFamily: fontFamily(700), color: palette.surface },
  userName: { fontSize: 20, fontFamily: fontFamily(700), color: palette.slate900, marginBottom: spacing.xs },
  userPhone: { fontSize: 14, color: palette.slate500, marginBottom: spacing.md },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: palette.primary600,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  editProfileBtnText: { fontSize: 13, fontFamily: fontFamily(600), color: palette.primary600 },

  // Settings card
  settingsCard: { marginBottom: spacing.lg },
  settingsSectionTitle: {
    fontSize: 11,
    fontFamily: fontFamily(600),
    color: palette.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  settingsCardInner: { overflow: "hidden" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.slate100,
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  settingsLabel: { flex: 1, fontSize: 15, color: palette.slate900, fontFamily: fontFamily(500) },
  versionValue: { fontSize: 13, color: palette.slate400, fontFamily: fontFamily(500) },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: palette.red500,
    backgroundColor: palette.red50,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xs,
  },
  signOutText: { fontSize: 15, fontFamily: fontFamily(600), color: palette.red600 },

  footerSpacer: { height: 20 },
});

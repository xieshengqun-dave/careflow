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
import { useAuthStore } from "@/store/authStore";

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
      <View style={styles.settingsCardInner}>
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
              <Icon name="chevron-forward-outline" size={16} color="#CBD5E1" />
            )}
          </TouchableOpacity>
        ))}
      </View>
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
          iconColor: "#1A6FD8",
          iconBg: "#EFF6FF",
          label: "Edit Profile",
          onPress: () => {},
        },
        {
          icon: "call-outline",
          iconColor: "#0D9488",
          iconBg: "#CCFBF1",
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
          iconColor: "#7C3AED",
          iconBg: "#F3E8FF",
          label: "Notifications",
          rightElement: (
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: "#E2E8F0", true: "#BFDBFE" }}
              thumbColor={notifEnabled ? "#1A6FD8" : "#94A3B8"}
            />
          ),
        },
        {
          icon: "language-outline",
          iconColor: "#D97706",
          iconBg: "#FEF3C7",
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
          iconColor: "#059669",
          iconBg: "#D1FAE5",
          label: "Help & FAQ",
          onPress: () => {},
        },
        {
          icon: "chatbubble-ellipses-outline",
          iconColor: "#1A6FD8",
          iconBg: "#EFF6FF",
          label: "Contact Support",
          onPress: () => {},
        },
        {
          icon: "star-outline",
          iconColor: "#D97706",
          iconBg: "#FEF3C7",
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
          iconColor: "#64748B",
          iconBg: "#F1F5F9",
          label: "Privacy Policy",
          onPress: () => {},
        },
        {
          icon: "document-text-outline",
          iconColor: "#64748B",
          iconBg: "#F1F5F9",
          label: "Terms of Service",
          onPress: () => {},
        },
        {
          icon: "information-circle-outline",
          iconColor: "#64748B",
          iconBg: "#F1F5F9",
          label: "App Version",
          rightElement: <Text style={styles.versionValue}>1.0.0</Text>,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

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
        <View style={styles.profileCard}>
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
            <Icon name="create-outline" size={14} color="#1A6FD8" />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

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
          <Icon name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  headerBg: { backgroundColor: "#FFFFFF" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E293B",
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Profile card
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A6FD8",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 14,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#1A6FD8",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A6FD8",
  },

  // Settings card
  settingsCard: {
    marginBottom: 16,
  },
  settingsSectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  settingsCardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  versionValue: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DC2626",
  },

  footerSpacer: { height: 20 },
});

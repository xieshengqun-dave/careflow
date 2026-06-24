import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IoniconName } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { getDerivedNotifications, type AppNotification } from "@/lib/api/notifications";
import { palette, radius, spacing } from "@/theme/careflow-tokens";
import { fontFamily, textStyle } from "@/theme/typography";

// ─── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = "All" | "Appointments" | "Queue" | "Promotions" | "System";

interface Section {
  title: string;
  data: AppNotification[];
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const FILTER_TABS: FilterTab[] = ["All", "Appointments", "Queue", "Promotions", "System"];

const TYPE_CONFIG: Record<
  AppNotification["type"],
  { icon: IoniconName; color: string; bg: string }
> = {
  APPOINTMENT: { icon: "calendar-outline",  color: palette.primary600, bg: palette.primary50 },
  QUEUE:       { icon: "people-outline",    color: palette.green600, bg: palette.green50 },
  SYSTEM:      { icon: "notifications-outline", color: palette.slate500, bg: palette.slate100 },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (itemDay.getTime() === today.getTime()) return "Today";
  if (itemDay.getTime() === yesterday.getTime()) return "Yesterday";

  // Check if same week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  if (itemDay >= startOfWeek) return "This Week";

  return d.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
}

function groupBySections(items: AppNotification[]): Section[] {
  const map = new Map<string, AppNotification[]>();

  for (const item of items) {
    const label = dateLabel(item.timestamp);
    const existing = map.get(label);
    if (existing) {
      existing.push(item);
    } else {
      map.set(label, [item]);
    }
  }

  const ORDER = ["Today", "Yesterday", "This Week"];
  const sections: Section[] = [];

  // Insert in order: today first, then yesterday, then this week, then the rest
  for (const key of ORDER) {
    const items = map.get(key);
    if (items && items.length > 0) {
      sections.push({ title: key, data: items });
      map.delete(key);
    }
  }
  // Remaining (older dates)
  for (const [title, data] of map) {
    sections.push({ title, data });
  }

  return sections;
}

function filterNotifications(
  all: AppNotification[],
  tab: FilterTab,
): AppNotification[] {
  if (tab === "All") return all;
  if (tab === "Appointments") return all.filter((n) => n.type === "APPOINTMENT");
  if (tab === "Queue") return all.filter((n) => n.type === "QUEUE");
  // Promotions and System: no data yet
  return [];
}

// ─── Notification Item ──────────────────────────────────────────────────────────

function NotifItem({
  notif,
  isLast,
}: {
  notif: AppNotification;
  isLast: boolean;
}) {
  const router = useRouter();
  const cfg = TYPE_CONFIG[notif.type];

  function handlePress() {
    if (notif.actionRoute) {
      router.push(notif.actionRoute as never);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.notifItem, !isLast && styles.notifItemBorder]}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityLabel={`${notif.title}: ${notif.body}`}
    >
      {/* Icon circle */}
      <View style={[styles.notifIconCircle, { backgroundColor: cfg.bg }]}>
        <Icon name={cfg.icon} size={20} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle} numberOfLines={1}>
          {notif.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>
          {notif.body}
        </Text>
        <Text style={styles.notifTime}>{relativeTime(notif.timestamp)}</Text>
      </View>

      {/* Right side: unread dot + chevron */}
      <View style={styles.notifRight}>
        {!notif.read && <View style={styles.unreadDot} />}
        <Icon name="chevron-forward-outline" size={14} color={palette.slate200} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [allNotifs, setAllNotifs] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getDerivedNotifications();
    setAllNotifs(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function markAllRead() {
    const ids = new Set(allNotifs.map((n) => n.id));
    setReadIds(ids);
  }

  // Merge read state with fetched data
  const displayNotifs = allNotifs.map((n) =>
    readIds.has(n.id) ? { ...n, read: true } : n,
  );

  const filtered = filterNotifications(displayNotifs, activeTab);
  const sections = groupBySections(filtered);
  const unreadCount = displayNotifs.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.appBg} />

      {/* Header */}
      <SafeAreaView style={styles.headerBg} edges={["top"]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
            <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllDisabled]}>
              Mark all as read
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter tabs (horizontal scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContent}
          style={styles.filterTabs}
        >
          {FILTER_TABS.map((tab) => {
            const count =
              tab === "All"
                ? unreadCount
                : tab === "Appointments"
                ? displayNotifs.filter((n) => n.type === "APPOINTMENT" && !n.read).length
                : tab === "Queue"
                ? displayNotifs.filter((n) => n.type === "QUEUE" && !n.read).length
                : 0;

            return (
              <TouchableOpacity
                key={tab}
                style={styles.filterTabItem}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <View style={styles.filterTabInner}>
                  <Text
                    style={[
                      styles.filterTabLabel,
                      activeTab === tab && styles.filterTabLabelActive,
                    ]}
                  >
                    {tab}
                  </Text>
                  {count > 0 && (
                    <View style={styles.filterTabBadge}>
                      <Text style={styles.filterTabBadgeText}>{count}</Text>
                    </View>
                  )}
                </View>
                {activeTab === tab && <View style={styles.filterTabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary600} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filtered.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={palette.primary600}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="notifications-off-outline" size={36} color={palette.primary600} />
              </View>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySub}>
                {activeTab === "Promotions"
                  ? "Promotional offers will appear here."
                  : activeTab === "System"
                  ? "System messages will appear here."
                  : "Appointment and queue alerts will appear here."}
              </Text>
            </View>
          ) : (
            <>
              {sections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text style={styles.sectionLabel}>{section.title}</Text>
                  <Card style={styles.sectionCard} padded={false}>
                    {section.data.map((notif, idx) => (
                      <NotifItem
                        key={notif.id}
                        notif={notif}
                        isLast={idx === section.data.length - 1}
                      />
                    ))}
                  </Card>
                </View>
              ))}

              {/* Stay Updated banner */}
              <Card style={styles.stayUpdatedBanner}>
                <View style={styles.stayUpdatedIcon}>
                  <Icon name="notifications-outline" size={20} color={palette.primary600} />
                </View>
                <View style={styles.stayUpdatedText}>
                  <Text style={styles.stayUpdatedTitle}>Stay Updated</Text>
                  <Text style={styles.stayUpdatedSub}>
                    Turn on notifications to receive real-time updates about your appointments and queue.
                  </Text>
                </View>
                <TouchableOpacity style={styles.enableBtn}>
                  <Text style={styles.enableBtnText}>Enable</Text>
                </TouchableOpacity>
              </Card>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.appBg },
  headerBg: { backgroundColor: palette.surface },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTitle: { ...textStyle("h1"), color: palette.slate900 },
  markAllText: { fontSize: 13, color: palette.primary600, fontFamily: fontFamily(500) },
  markAllDisabled: { color: palette.slate200 },

  // Filter tabs
  filterTabs: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  filterTabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  filterTabItem: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: 0,
    alignItems: "center",
    position: "relative",
    marginRight: spacing.xs,
  },
  filterTabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingBottom: spacing.sm,
  },
  filterTabLabel: { fontSize: 13, fontFamily: fontFamily(500), color: palette.slate400 },
  filterTabLabelActive: { color: palette.primary600, fontFamily: fontFamily(600) },
  filterTabBadge: {
    backgroundColor: palette.primary600,
    borderRadius: radius.sm,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  filterTabBadgeText: { fontSize: 9, fontFamily: fontFamily(700), color: "#FFFFFF" },
  filterTabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: palette.primary600,
    borderRadius: 1,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  list: { paddingTop: spacing.lg, paddingBottom: 100 },
  listEmpty: { flex: 1 },

  // Section
  section: { marginBottom: spacing.sm },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fontFamily(600),
    color: palette.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    overflow: "hidden",
  },

  // Notification item
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  notifItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.slate100,
  },
  notifIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontFamily: fontFamily(600),
    color: palette.slate900,
    marginBottom: 3,
  },
  notifBody: {
    fontSize: 12,
    color: palette.slate500,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  notifTime: {
    fontSize: 11,
    color: palette.slate400,
  },
  notifRight: {
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary600,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: spacing["3xl"],
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: palette.primary50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily(700),
    color: palette.slate900,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: palette.slate400,
    textAlign: "center",
    lineHeight: 20,
  },

  // Stay updated banner
  stayUpdatedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  stayUpdatedIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.primary50,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  stayUpdatedText: { flex: 1 },
  stayUpdatedTitle: { fontSize: 13, fontFamily: fontFamily(600), color: palette.slate900, marginBottom: 2 },
  stayUpdatedSub: { fontSize: 11, color: palette.slate500, lineHeight: 16 },
  enableBtn: {
    backgroundColor: palette.primary700,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    flexShrink: 0,
  },
  enableBtnText: { fontSize: 12, fontFamily: fontFamily(600), color: "#FFFFFF" },
});

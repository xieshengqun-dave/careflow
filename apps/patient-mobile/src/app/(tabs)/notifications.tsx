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
import { getDerivedNotifications, type AppNotification } from "@/lib/api/notifications";

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
  APPOINTMENT: { icon: "calendar-outline",  color: "#1A6FD8", bg: "#EFF6FF" },
  QUEUE:       { icon: "people-outline",    color: "#0D9488", bg: "#CCFBF1" },
  SYSTEM:      { icon: "notifications-outline", color: "#64748B", bg: "#F1F5F9" },
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
        <Icon name="chevron-forward-outline" size={14} color="#CBD5E1" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

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
          <ActivityIndicator color="#1A6FD8" size="large" />
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
              tintColor="#1A6FD8"
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="notifications-off-outline" size={36} color="#1A6FD8" />
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
                  <View style={styles.sectionCard}>
                    {section.data.map((notif, idx) => (
                      <NotifItem
                        key={notif.id}
                        notif={notif}
                        isLast={idx === section.data.length - 1}
                      />
                    ))}
                  </View>
                </View>
              ))}

              {/* Stay Updated banner */}
              <View style={styles.stayUpdatedBanner}>
                <View style={styles.stayUpdatedIcon}>
                  <Icon name="notifications-outline" size={20} color="#1A6FD8" />
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
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  headerBg: { backgroundColor: "#FFFFFF" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E293B",
  },
  markAllText: {
    fontSize: 13,
    color: "#1A6FD8",
    fontWeight: "500",
  },
  markAllDisabled: {
    color: "#CBD5E1",
  },

  // Filter tabs
  filterTabs: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  filterTabItem: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 0,
    alignItems: "center",
    position: "relative",
    marginRight: 4,
  },
  filterTabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingBottom: 10,
  },
  filterTabLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#94A3B8",
  },
  filterTabLabelActive: {
    color: "#1A6FD8",
    fontWeight: "600",
  },
  filterTabBadge: {
    backgroundColor: "#1A6FD8",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  filterTabBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  filterTabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#1A6FD8",
    borderRadius: 1,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  list: { paddingTop: 16, paddingBottom: 100 },
  listEmpty: { flex: 1 },

  // Section
  section: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },

  // Notification item
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  notifItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  notifIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 3,
  },
  notifBody: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  notifRight: {
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1A6FD8",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },

  // Stay updated banner
  stayUpdatedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stayUpdatedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  stayUpdatedText: { flex: 1 },
  stayUpdatedTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  stayUpdatedSub: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  enableBtn: {
    backgroundColor: "#1A6FD8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 0,
  },
  enableBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

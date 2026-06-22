import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";

function CheckInButton({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.checkInWrap}
      activeOpacity={0.85}
      accessibilityLabel="Check-in"
      accessibilityRole="button"
    >
      <View style={styles.checkInCircle}>
        <Icon name="scan-outline" size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.checkInLabel}>Check-in</Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1A6FD8",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Icon name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          tabBarIcon: ({ color, size }) => <Icon name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: "",
          tabBarIcon: () => null,
          tabBarButton: (props) => <CheckInButton onPress={props.onPress ?? undefined} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Queue",
          tabBarIcon: ({ color, size }) => <Icon name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Icon name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 65,
    paddingBottom: 8,
    paddingTop: 4,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: { fontSize: 10, fontWeight: "500", marginTop: 1 },
  checkInWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
  },
  checkInCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1A6FD8",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -18,
    shadowColor: "#1A6FD8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  checkInLabel: { fontSize: 10, color: "#94A3B8", marginTop: 3, fontWeight: "500" },
});

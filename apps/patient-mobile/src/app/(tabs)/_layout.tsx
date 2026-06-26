import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Icon } from "@/components/Icon";
import { palette } from "@/theme/careflow-tokens";
import { fontFamily } from "@/theme/typography";

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
        <Icon name="scan-outline" size={24} color={palette.surface} />
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
        tabBarActiveTintColor: palette.primary600,
        tabBarInactiveTintColor: palette.slate400,
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
          tabBarButton: (props) => <CheckInButton onPress={props.onPress as (() => void) | undefined} />,
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
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    elevation: 10,
    shadowColor: palette.slate900,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: { fontSize: 10, fontFamily: fontFamily(500), marginTop: 1 },
  checkInWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
  },
  checkInCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.primary700,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -22,
    borderWidth: 4,
    borderColor: palette.surface,
    shadowColor: palette.primary700,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  checkInLabel: { fontSize: 10, color: palette.slate400, marginTop: 3, fontFamily: fontFamily(500) },
});

import { Tabs, useRouter } from "expo-router";
import {
  Map,
  ScanLine,
  ClipboardList,
  UserRound,
  LayoutDashboard,
  Bell,
  Settings,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
export default function RoleTabs({ tanod = false }: { tanod?: boolean }) {
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accent = tanod ? C.warn : C.accent;
  const screens = tanod
    ? [
        { name: "dashboard", title: "Dashboard", icon: LayoutDashboard },
        { name: "reports", title: "Assignments", icon: ClipboardList },
        { name: "map", title: "Field map", icon: Map },
        { name: "profile", title: "Profile", icon: UserRound },
      ]
    : [
        { name: "map", title: "Map", icon: Map },
        { name: "capture", title: "Report", icon: ScanLine },
        { name: "reports", title: "Reports", icon: ClipboardList },
        { name: "profile", title: "Profile", icon: UserRound },
      ];
  return (
    <Tabs
      initialRouteName={tanod ? "dashboard" : "map"}
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: C.textSub,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
          backgroundColor: C.surface,
          borderTopColor: C.border,
        },
        header: ({ options }) => (
          <View
            style={{
              paddingTop: insets.top + 6,
              paddingBottom: 10,
              paddingHorizontal: 16,
              backgroundColor: C.bg,
              borderBottomColor: C.border,
              borderBottomWidth: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: accent,
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                {tanod ? "TANOD WORKSPACE" : "AEDEX COMMUNITY"}
              </Text>
              <Text
                style={{
                  color: C.text,
                  fontSize: 18,
                  fontWeight: "700",
                  marginTop: 3,
                }}
              >
                {options.title}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Notifications"
              onPress={() => router.push("/notifications")}
              style={{ padding: 11 }}
            >
              <Bell color={C.textSub} size={20} />
            </Pressable>
            <Pressable
              accessibilityLabel="Settings"
              onPress={() => router.push("/settings")}
              style={{ padding: 11 }}
            >
              <Settings color={C.textSub} size={20} />
            </Pressable>
          </View>
        ),
      }}
    >
      {screens.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            headerShown: name !== "profile",
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}

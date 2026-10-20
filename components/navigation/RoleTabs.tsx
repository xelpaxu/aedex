import { Tabs, useRouter } from "expo-router";
import {
  Map,
  LayoutDashboard,
  ScanLine,
  ClipboardList,
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
        { name: "map", title: "Map", icon: Map },
        { name: "reports", title: "Reports", icon: ClipboardList },
      ]
    : [
        { name: "map", title: "Map", icon: Map },
        { name: "capture", title: "Capture", icon: ScanLine },
        { name: "reports", title: "Reports", icon: ClipboardList },
      ];
  return (
    <Tabs
      initialRouteName={tanod ? "dashboard" : "map"}
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: C.textSub,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          position: "absolute",
          left: 18,
          right: 18,
          bottom: Math.max(insets.bottom, 12),
          height: 70,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 26,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.borderBright,
          borderTopWidth: 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 18,
          elevation: 12,
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
                {tanod ? "Field workspace" : "Aedex community"}
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
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => router.push("/notifications")}
              style={{
                padding: 11,
                backgroundColor: C.surfaceRaised,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Bell color={C.textSub} size={20} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => router.push("/settings")}
              style={{
                padding: 11,
                backgroundColor: C.surfaceRaised,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Settings color={C.textSub} size={20} />
            </Pressable>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{ href: null, headerShown: false }}
      />
      {tanod && <Tabs.Screen name="capture" options={{ href: null }} />}
      {screens.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            headerShown: true,
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: name === "capture" ? 52 : 44,
                  height: name === "capture" ? 52 : 32,
                  marginTop: name === "capture" ? -20 : 0,
                  borderRadius: name === "capture" ? 19 : 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    name === "capture"
                      ? accent
                      : focused
                        ? tanod
                          ? C.warnGlow
                          : C.accentGlow
                        : "transparent",
                  borderWidth: name === "capture" ? 3 : 0,
                  borderColor: C.surface,
                }}
              >
                <Icon
                  color={
                    name === "capture" ? (tanod ? "#111827" : "#FFFFFF") : color
                  }
                  size={name === "capture" ? 26 : 21}
                  strokeWidth={focused ? 2.5 : 1.8}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

import UserAvatar from "@/components/UserAvatar";
import AnimatedTabBar from "./AnimatedTabBar";
import { Tabs, useRouter } from "expo-router";
import {
  Map,
  ScanLine,
  ClipboardList,
  Bell,
} from "lucide-react-native";
import { Image, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
export default function RoleTabs({ tanod = false }: { tanod?: boolean }) {
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const unread = (useQuery(api.notifications.getUnreadCount) as number | undefined) ?? 0;
  const accent = tanod ? C.warn : C.accent;
  const screens = [
    { name: "map", title: "Map", icon: Map },
    { name: "capture", title: "Capture", icon: ScanLine },
    { name: "reports", title: "Reports", icon: ClipboardList },
  ];
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} tanod={tanod} />}
      initialRouteName="map"
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: C.textSub,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 3 },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarIconStyle: { height: 36 },
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          position: "absolute",
          marginHorizontal: Math.max(24, (width - 420) / 2),
          bottom: Math.max(insets.bottom, 12),
          height: 76,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 38,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.borderBright,
          borderTopWidth: 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.16,
          shadowRadius: 24,
          elevation: 6,
        },
        header: ({ options }) => (
          <View
            style={{
              paddingTop: insets.top + 12,
              paddingBottom: 16,
              paddingHorizontal: 20,
              backgroundColor: C.surface,
              borderBottomColor: C.border,
              borderBottomWidth: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 18, overflow: "hidden", backgroundColor: "#00191D", borderWidth: 1, borderColor: C.border }}>
              <Image source={require("@/assets/logo/aedex.png")} resizeMode="cover" accessible accessibilityLabel="Aedex logo" style={{ width: 78, height: 52, alignSelf: "center" }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: C.textSub,
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                {tanod ? "AEDEX / FIELD TEAM" : "AEDEX / COMMUNITY"}
              </Text>
              <Text
                style={{
                  color: C.text,
                  fontSize: 23,
                  fontFamily: "Manrope_700Bold",
                  marginTop: 3,
                }}
              >
                {options.title}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`}
              onPress={() => router.push("/notifications")}
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: C.surfaceRaised,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Bell color={C.textSub} size={20} />
              {unread > 0 && <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unread > 99 ? '99+' : unread}</Text>
              </View>}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Your profile"
              onPress={() => router.push(tanod ? "/(root)/(tanod-tabs)/profile" : "/(root)/(tabs)/profile")}
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: C.surfaceRaised,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <UserAvatar size={42} />
            </Pressable>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{ href: null, title: "Profile", headerShown: false }}
      />
      {tanod && <Tabs.Screen name="dashboard" options={{ href: null, title: "Dashboard" }} />}
      {screens.map(({ name, title }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            headerShown: true,
          }}
        />
      ))}
    </Tabs>
  );
}

import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { Tabs, useRouter } from "expo-router";
import { BarChart2, Bell, Map, ScanLine, Settings2 } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemeColors, useTheme } from "@/context/ThemeContext";
import { api } from "../../../../convex/_generated/api";

// ─── Custom tab bar button (centre capture tab for citizen) ────────────────────
const CaptureTabIcon = ({ focused }: { focused: boolean }) => {
  const { colors: C } = useTheme();
  return (
    <View
      style={[
        ctb.outer,
        { backgroundColor: C.surface, borderColor: C.border },
        focused && { backgroundColor: C.accent, borderColor: C.accent },
      ]}
    >
      <View
        style={[
          ctb.inner,
          { backgroundColor: C.bg },
          focused && { backgroundColor: "transparent" },
        ]}
      >
        <ScanLine
          color={focused ? "#FFFFFF" : C.textSub}
          size={35}
          strokeWidth={2.5}
        />
      </View>
    </View>
  );
};

const ctb = StyleSheet.create({
  outer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 35,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  inner: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Custom tab icon wrapper ──────────────────────────────────────────────────
const TabIcon = ({
  Icon,
  focused,
  size = 20,
}: {
  Icon: React.ComponentType<any>;
  focused: boolean;
  size?: number;
}) => {
  const { colors: C } = useTheme();
  return (
    <View style={ti.wrap}>
      <Icon
        color={focused ? C.accent : C.textDim}
        size={size}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
};

const ti = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 25,
    gap: 4,
  },
});

// ─── Citizen Layout ───────────────────────────────────────────────────────────
export default function TabLayout() {
  const { colors: C } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const currentUser = useQuery(api.users.getMe);
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,

        // ── Shared header ──────────────────────────────────────────────────
        header: ({ options }) => (
          <View style={styles.header}>
            {/* Avatar → settings */}
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push("/settings")}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri:
                    user?.imageUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser?.fullName || "User"
                    )}&background=1a2240&color=4F8EF7&bold=true`,
                }}
                style={styles.avatarImg}
              />
              {/* Online dot */}
              <View style={styles.onlineDot} />
            </TouchableOpacity>

            {/* Screen title */}
            <View style={styles.titleWrap}>
              <Text style={styles.headerTitle}>
                {options.title?.toUpperCase()}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={styles.iconBtn}
                onPress={() => router.push("/notifications")}
              >
                <Bell color={C.textSub} size={18} strokeWidth={2} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => router.push("/settings")}
              >
                <Settings2 color={C.textSub} size={18} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        ),

        // ── Tab bar ────────────────────────────────────────────────────────
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textDim,
        tabBarIconStyle: {
          marginTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map View",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Map} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarIcon: ({ focused }) => <CaptureTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={BarChart2} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    // ── Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: C.bg,
      paddingTop: Platform.OS === "ios" ? 56 : 40,
      paddingBottom: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    avatarBtn: {
      position: "relative",
      width: 38,
      height: 38,
    },
    avatarImg: {
      width: 38,
      height: 38,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: C.border,
      backgroundColor: C.surfaceRaised,
    },
    onlineDot: {
      position: "absolute",
      bottom: -1,
      right: -1,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: C.safe,
      borderWidth: 2,
      borderColor: C.bg,
      shadowColor: C.safe,
      shadowOpacity: 0.9,
      shadowRadius: 4,
      elevation: 4,
    },
    titleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.text,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Tab bar
    tabBar: {
      position: "absolute",
      bottom: 28,
      left: 40,
      right: 40,
      height: 70,
      width: 350,
      marginLeft: 30,
      borderRadius: 50,
      backgroundColor: C.surface,
      borderTopWidth: 1,
      borderTopColor: C.border,
      borderWidth: 1,
      borderColor: C.border,
      paddingBottom: 0,
      paddingTop: 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 16,
      alignItems: "center",
      justifyContent: "center",
    },
  });

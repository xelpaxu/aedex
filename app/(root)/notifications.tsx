import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../../convex/_generated/api";
import { ThemeColors, useTheme } from "../../context/ThemeContext";

const typeIcon = (type: string, C: ThemeColors) => {
  switch (type) {
    case "assignment":
      return { icon: "📋", color: C.accent };
    case "status_change":
      return { icon: "🔄", color: C.warn };
    case "resolved":
      return { icon: "✅", color: C.safe };
    default:
      return { icon: "🔔", color: C.textSub };
  }
};

const formatTime = (time: number) => {
  const diff = Date.now() - time;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors: C, isDark } = useTheme();
  const notifications = useQuery(api.notifications.getMyNotifications);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = async (notif: any) => {
    if (!notif.read) {
      await markAsRead({ notificationId: notif._id });
    }
    if (notif.reportId) {
      router.push({
        pathname: "/results",
        params: { reportId: notif.reportId },
      });
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── TOP NAV ── */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft color={C.text} size={17} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.navCenter}>

          <Text style={styles.navTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={styles.markAllBtn}
            activeOpacity={0.7}
          >
            <CheckCheck color={C.accent} size={16} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* ── Content ── */}
      {notifications === undefined ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Bell color={C.textDim} size={28} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySub}>
            You will see assignment notifications and status updates here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const typeInfo = typeIcon(item.type, C);
            return (
              <TouchableOpacity
                style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.notifIcon,
                    { backgroundColor: typeInfo.color + "18" },
                  ]}
                >
                  <Text style={styles.notifEmoji}>{typeInfo.icon}</Text>
                </View>
                <View style={styles.notifInfo}>
                  <Text
                    style={[
                      styles.notifTitle,
                      !item.read && styles.notifTitleUnread,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.notifMsg} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text style={styles.notifTime}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </Animated.View>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },
    topNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "ios" ? 58 : 24,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.bg,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    navCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
    navTitle: {
      fontSize: 20,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.text,
    },
    unreadBadge: {
      backgroundColor: C.danger,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
    },
    unreadText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#FFF",
    },
    markAllBtn: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: C.accentGlow,
      borderWidth: 1,
      borderColor: C.accent + "30",
      alignItems: "center",
      justifyContent: "center",
    },
    loadingWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: { padding: 16 },
    separator: { height: 8 },
    emptyWrap: {
      alignItems: "center",
      paddingTop: 80,
      paddingHorizontal: 40,
      gap: 12,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: C.text },
    emptySub: {
      fontSize: 12,
      color: C.textSub,
      textAlign: "center",
      lineHeight: 18,
    },
    notifCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      padding: 14,
    },
    notifCardUnread: {
      borderColor: C.accent + "50",
      backgroundColor: C.accentGlow,
    },
    notifIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    notifEmoji: { fontSize: 18 },
    notifInfo: { flex: 1, gap: 3 },
    notifTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: C.text,
    },
    notifTitleUnread: {
      color: C.accent,
    },
    notifMsg: {
      fontSize: 11,
      color: C.textSub,
      lineHeight: 16,
    },
    notifTime: {
      fontSize: 11,
      color: C.textDim,
      marginTop: 2,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: C.accent,
    },
  });

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useTheme } from "@/context/ThemeContext";

type Notification = Doc<"notifications">;
const kinds = {
  assignment: { label: "Assignment", icon: ClipboardList },
  status_change: { label: "Status update", icon: RefreshCw },
  resolved: { label: "Resolved", icon: CheckCircle2 },
};
const kindOf = (type: string) =>
  kinds[type as keyof typeof kinds] || {
    label: "Community update",
    icon: Bell,
  };
const formatTime = (time: number) => {
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  return minutes < 1
    ? "Just now"
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : new Date(time).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const notifications = useQuery(api.notifications.getMyNotifications);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unread = notifications?.filter((n) => !n.read).length ?? 0;
  const visible = notifications?.filter((n) => !unreadOnly || !n.read);
  const detail =
    notifications?.find((n) => n._id === selected?._id) ?? selected;
  const open = (notification: Notification) => {
    setSelected(notification);
    setError("");
    if (!notification.read)
      void markAsRead({ notificationId: notification._id }).catch(() =>
        setError(
          "Could not mark this update as read. Close and reopen it to retry.",
        ),
      );
  };
  const readAll = async () => {
    setBusy(true);
    setError("");
    try {
      await markAllAsRead();
    } catch {
      setError("Could not mark updates as read. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const DetailIcon = kindOf(detail?.type || "").icon;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 18,
          gap: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(root)")
            }
            style={{
              padding: 12,
              borderRadius: 14,
              backgroundColor: C.surface,
            }}
          >
            <ArrowLeft size={20} color={C.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            disabled={!unread || busy}
            onPress={readAll}
            style={{
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
              padding: 12,
              opacity: unread ? 1 : 0.4,
            }}
          >
            {busy ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <CheckCheck size={18} color={C.accent} />
            )}
            <Text style={{ color: C.accent, fontSize: 12, fontWeight: "600" }}>
              Mark all read
            </Text>
          </Pressable>
        </View>
        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: C.text,
              fontSize: 28,
              fontFamily: "Manrope_700Bold",
            }}
          >
            Notifications
          </Text>
          <Text style={{ color: C.textSub, fontSize: 14 }}>
            {unread
              ? `${unread} unread ${unread === 1 ? "update" : "updates"} from your community`
              : "Your reports and community updates, in one place."}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[false, true].map((value) => (
            <Pressable
              key={String(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: unreadOnly === value }}
              onPress={() => setUnreadOnly(value)}
              style={{
                minHeight: 44,
                paddingHorizontal: 18,
                justifyContent: "center",
                borderRadius: 22,
                backgroundColor: unreadOnly === value ? C.accent : C.surface,
                borderWidth: 1,
                borderColor: unreadOnly === value ? C.accent : C.border,
              }}
            >
              <Text
                style={{
                  color: unreadOnly === value ? "#fff" : C.textSub,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {value ? `Unread (${unread})` : "All updates"}
              </Text>
            </Pressable>
          ))}
        </View>
        {!!error && !detail && (
          <Text accessibilityRole="alert" style={{ color: C.danger }}>
            {error}
          </Text>
        )}
      </View>
      {notifications === undefined ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={C.accent} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", padding: 32, gap: 12 }}>
              <View
                style={{
                  padding: 22,
                  borderRadius: 28,
                  backgroundColor: C.accentGlow,
                }}
              >
                <Bell color={C.accent} size={30} />
              </View>
              <Text
                style={{
                  color: C.text,
                  fontSize: 18,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                {unreadOnly ? "You're all caught up" : "No updates yet"}
              </Text>
              <Text
                style={{
                  color: C.textSub,
                  textAlign: "center",
                  lineHeight: 21,
                }}
              >
                {unreadOnly
                  ? "New unread notifications will appear here."
                  : "Report activity and assignments will appear here. Tap an update to see its details."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const { icon: Icon, label } = kindOf(item.type);
            const color = item.type === "resolved" ? C.safe : C.accent;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.read ? "" : "Unread: "}${item.title}. View details`}
                onPress={() => open(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: item.read ? C.border : C.accent + "60",
                }}
              >
                <View
                  style={{
                    padding: 11,
                    backgroundColor:
                      item.type === "resolved" ? C.safeGlow : C.accentGlow,
                    borderRadius: 14,
                  }}
                >
                  <Icon size={20} color={color} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color,
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </Text>
                    {!item.read && (
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: C.accent,
                        }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      color: C.text,
                      fontSize: 15,
                      fontFamily: "Inter_600SemiBold",
                      lineHeight: 21,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{ color: C.textSub, fontSize: 13, lineHeight: 20 }}
                  >
                    {item.message}
                  </Text>
                  <Text
                    style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}
                  >
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
                <ChevronRight
                  size={16}
                  color={C.textDim}
                  style={{ alignSelf: "center" }}
                />
              </Pressable>
            );
          }}
        />
      )}
      <Modal
        visible={!!detail}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                color: C.text,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Notification details
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close notification details"
              onPress={() => setSelected(null)}
              style={{ padding: 12 }}
            >
              <X size={22} color={C.text} />
            </Pressable>
          </View>
          {detail && (
            <ScrollView
              contentContainerStyle={{
                padding: 24,
                gap: 22,
                width: "100%",
                maxWidth: 600,
                alignSelf: "center",
              }}
            >
              <View
                style={{
                  alignSelf: "flex-start",
                  padding: 18,
                  borderRadius: 22,
                  backgroundColor: C.accentGlow,
                }}
              >
                <DetailIcon size={30} color={C.accent} />
              </View>
              <View style={{ gap: 10 }}>
                <Text
                  style={{ color: C.accent, fontWeight: "600", fontSize: 13 }}
                >
                  {kindOf(detail.type).label}
                </Text>
                <Text
                  style={{
                    color: C.text,
                    fontSize: 26,
                    lineHeight: 34,
                    fontFamily: "Manrope_700Bold",
                  }}
                >
                  {detail.title}
                </Text>
                <Text style={{ color: C.textSub, fontSize: 13 }}>
                  {new Date(detail.createdAt).toLocaleString(undefined, {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: C.border }} />
              <Text
                selectable
                style={{ color: C.text, fontSize: 16, lineHeight: 27 }}
              >
                {detail.message}
              </Text>
              {detail.reportId && (
                <View
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    backgroundColor: C.surface,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: C.text, fontWeight: "600" }}>
                    Related report
                  </Text>
                  <Text selectable style={{ color: C.textSub, fontSize: 12 }}>
                    Reference: {detail.reportId}
                  </Text>
                  <Text
                    style={{ color: C.textSub, fontSize: 13, lineHeight: 20 }}
                  >
                    Open the report to see the site, evidence and current
                    status.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setSelected(null);
                      router.push({
                        pathname: "/results",
                        params: { reportId: detail.reportId! },
                      });
                    }}
                    style={{
                      marginTop: 6,
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 48,
                      borderRadius: 12,
                      backgroundColor: C.accent,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                      View report
                    </Text>
                    <ArrowRight size={18} color="#fff" />
                  </Pressable>
                </View>
              )}
              {!!error && (
                <Text accessibilityRole="alert" style={{ color: C.danger }}>
                  {error}
                </Text>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

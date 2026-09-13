import { useUser } from "@clerk/clerk-expo";
import * as Haptics from "expo-haptics";
import {
  Flame,
  MessageCircle,
  Send,
  Shield,
  ShieldCheck,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface CommentItem {
  id: string;
  reportId: string;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  userBarangay?: string;
  text: string;
  timestamp: number;
}

interface CommunityCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  report: {
    _id: string;
    locationName?: string;
    barangay?: string;
    userName?: string;
    status?: string;
    processedImage?: string;
    imageUri?: string;
    image?: string;
    _creationTime?: number;
  } | null;
  comments: CommentItem[];
  onAddComment: (
    reportId: string,
    text: string,
    profile?: {
      userName?: string;
      userAvatar?: string;
      userRole?: string;
      userBarangay?: string;
    },
  ) => void;
  currentUser?: {
    name?: string;
    _id?: string;
    avatar?: string;
    imageUrl?: string;
    role?: string;
    barangay?: string;
  } | null;
}

const formatCommentTime = (time: number) => {
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const normalizeImageUri = (uri?: string) => {
  if (!uri) return "";
  if (uri.startsWith("data:") || uri.startsWith("http")) return uri;
  return `data:image/jpeg;base64,${uri}`;
};

export default function CommunityCommentsModal({
  visible,
  onClose,
  report,
  comments,
  onAddComment,
  currentUser,
}: CommunityCommentsModalProps) {
  const { colors: C } = useTheme();
  const { user: clerkUser } = useUser();
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Resolve current user's real name and profile avatar
  const realName =
    currentUser?.name ||
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    clerkUser?.username ||
    "Citizen";

  const realAvatar =
    clerkUser?.imageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      realName,
    )}&background=1a2240&color=4F8EF7&bold=true`;

  const realRole = currentUser?.role;
  const realBarangay = currentUser?.barangay;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !report?._id || isSubmitting) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }

    setIsSubmitting(true);
    onAddComment(report._id, trimmed, {
      userName: realName,
      userAvatar: realAvatar,
      userRole: realRole,
      userBarangay: realBarangay,
    });
    setInputText("");
    setIsSubmitting(false);

    // Scroll to bottom after adding
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const isCritical = report?.status === "CRITICAL";
  const statusColor = isCritical ? C.danger : C.safe;
  const imageSource = report
    ? normalizeImageUri(
      report.processedImage || report.imageUri || report.image,
    )
    : "";

  const styles = useMemo(() => createStyles(C), [C]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Slide-up Container */}
        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Grab handle */}
          <View style={styles.handleWrap}>
            <View style={styles.grabHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            {imageSource ? (
              <Image source={{ uri: imageSource }} style={styles.reportThumb} />
            ) : (
              <View style={[styles.reportThumb, styles.placeholderThumb]}>
                <MessageCircle color={C.accent} size={18} />
              </View>
            )}

            <View style={styles.headerInfo}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {report?.barangay
                    ? `Brgy. ${report.barangay.replace(/^(Barangay|Brgy\.?)\s*/i, "")}`
                    : report?.locationName || "Surveillance Report"}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: statusColor + "18",
                      borderColor: statusColor + "40",
                    },
                  ]}
                >
                  {isCritical ? (
                    <Flame size={9} color={statusColor} />
                  ) : (
                    <ShieldCheck size={9} color={statusColor} />
                  )}
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {report?.status || "REPORT"}
                  </Text>
                </View>
              </View>
              <Text style={styles.headerSub}>
                {comments.length}{" "}
                {comments.length === 1 ? "Comment" : "Comments"} • Community
                Updates
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X color={C.text} size={16} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Comments List */}
          <FlatList
            ref={flatListRef}
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.commentsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                  <MessageCircle color={C.accent} size={28} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>No Comments Yet</Text>
                <Text style={styles.emptySub}>
                  Be the first to share an observation, treatment note, or
                  helpful tip for this location.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const avatar =
                item.userAvatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  item.userName || "User",
                )}&background=1a2240&color=4F8EF7&bold=true`;

              const isTanodOfficer = item.userRole === "tanod";

              return (
                <View style={styles.commentRow}>
                  <Image
                    source={{ uri: avatar }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentBubble}>
                    <View style={styles.commentMetaRow}>
                      <View style={styles.commentAuthorRow}>
                        <Text style={styles.commentAuthor}>
                          {item.userName || "Citizen"}
                        </Text>
                        {isTanodOfficer && (
                          <View style={styles.tanodBadge}>
                            <Shield size={8} color={C.accent} />
                            <Text style={styles.tanodBadgeText}>TANOD</Text>
                          </View>
                        )}
                        {item.userBarangay && (
                          <Text style={styles.commentBarangayText}>
                            • Brgy.{" "}
                            {item.userBarangay.replace(
                              /^(Barangay|Brgy\.?)\s*/i,
                              "",
                            )}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.commentTime}>
                        {formatCommentTime(item.timestamp)}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Input Bar */}
          <View style={styles.inputBarContainer}>
            <Image source={{ uri: realAvatar }} style={styles.inputAvatar} />
            <View style={styles.inputFieldWrap}>
              <TextInput
                style={styles.input}
                placeholder={`Comment as ${realName}...`}
                placeholderTextColor={C.textDim}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={400}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                inputText.trim().length > 0
                  ? styles.sendBtnActive
                  : styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={inputText.trim().length === 0 || isSubmitting}
              activeOpacity={0.75}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send
                  size={15}
                  color={
                    inputText.trim().length > 0 ? "#FFFFFF" : C.textDim
                  }
                  strokeWidth={2.5}
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.65)",
    },
    sheetContainer: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: C.border,
      maxHeight: SCREEN_HEIGHT * 0.85,
      minHeight: SCREEN_HEIGHT * 0.55,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 20,
    },
    handleWrap: {
      alignItems: "center",
      paddingTop: 10,
      paddingBottom: 6,
    },
    grabHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.borderBright,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
    },
    reportThumb: {
      width: 44,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surfaceRaised,
    },
    placeholderThumb: {
      alignItems: "center",
      justifyContent: "center",
    },
    headerInfo: {
      flex: 1,
      gap: 3,
    },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: C.text,
      flexShrink: 1,
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 7,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusText: {
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.8,
    },
    headerSub: {
      fontSize: 11,
      color: C.textSub,
      fontWeight: "600",
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    divider: {
      height: 1,
      backgroundColor: C.border,
    },
    commentsList: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 14,
      flexGrow: 1,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
      gap: 10,
    },
    emptyIconBg: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: C.accentGlow,
      borderWidth: 1,
      borderColor: C.accent + "30",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: C.text,
    },
    emptySub: {
      fontSize: 12,
      color: C.textSub,
      textAlign: "center",
      lineHeight: 18,
    },
    commentRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    commentAvatar: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.borderBright,
      marginTop: 2,
    },
    commentBubble: {
      flex: 1,
      backgroundColor: C.surfaceRaised,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: C.border,
      gap: 4,
    },
    commentMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 2,
    },
    commentAuthorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      flex: 1,
    },
    commentAuthor: {
      fontSize: 12,
      fontWeight: "800",
      color: C.text,
    },
    tanodBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: C.accentGlow,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: C.accent + "30",
    },
    tanodBadgeText: {
      fontSize: 8,
      fontWeight: "900",
      color: C.accent,
      letterSpacing: 0.5,
    },
    commentBarangayText: {
      fontSize: 10,
      color: C.textDim,
      fontWeight: "600",
    },
    commentTime: {
      fontSize: 10,
      color: C.textDim,
      fontWeight: "500",
      marginLeft: 6,
    },
    commentText: {
      fontSize: 13,
      color: C.text,
      lineHeight: 18,
    },
    inputBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 16,
      borderTopWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      gap: 10,
    },
    inputAvatar: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.borderBright,
    },
    inputFieldWrap: {
      flex: 1,
      backgroundColor: C.surfaceRaised,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 8 : 4,
      maxHeight: 90,
    },
    input: {
      fontSize: 13,
      color: C.text,
      padding: 0,
      minHeight: 24,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnActive: {
      backgroundColor: C.accent,
      shadowColor: C.accent,
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 4,
    },
    sendBtnDisabled: {
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
    },
  });

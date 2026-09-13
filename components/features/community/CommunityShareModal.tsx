import * as Haptics from "expo-haptics";
import {
  FileText,
  Flame,
  Image as ImageIcon,
  Share2,
  ShieldCheck,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ShareReportOptions,
  shareReportImage,
  shareReportText,
} from "../../../services/sharing_service";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CommunityShareModalProps {
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
    accuracy?: string;
    reasoning?: string;
    aiMessage?: string;
    verified?: boolean;
    lat?: number;
    lng?: number;
    description?: string;
  } | null;
}

const normalizeImageUri = (uri?: string) => {
  if (!uri) return "";
  if (uri.startsWith("data:") || uri.startsWith("http")) return uri;
  return `data:image/jpeg;base64,${uri}`;
};

export default function CommunityShareModal({
  visible,
  onClose,
  report,
}: CommunityShareModalProps) {
  const { colors: C } = useTheme();

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getShareOptions = (): ShareReportOptions | null => {
    if (!report) return null;
    const imageUri = normalizeImageUri(
      report.processedImage || report.imageUri || report.image,
    );
    return {
      reportId: report._id,
      locationName: report.locationName || "Iloilo City",
      barangay: report.barangay,
      status: report.status || (report.verified ? "CRITICAL" : "LOW RISK"),
      userName: report.userName || "Community Citizen",
      creationTime: report._creationTime,
      imageUri,
      accuracy: report.accuracy,
      reasoning: report.reasoning || report.aiMessage,
      verified: report.verified,
      lat: report.lat,
      lng: report.lng,
      description: report.description,
    };
  };

  const handleShareText = () => {
    const opts = getShareOptions();
    if (!opts) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onClose();
    setTimeout(() => {
      shareReportText(opts);
    }, 250);
  };

  const handleShareImage = () => {
    const opts = getShareOptions();
    if (!opts) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onClose();
    setTimeout(() => {
      shareReportImage(opts);
    }, 250);
  };

  const isCritical =
    report?.status === "CRITICAL" || report?.status === "HIGH RISK";
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
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Slide-up sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.grabHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            {imageSource ? (
              <Image source={{ uri: imageSource }} style={styles.reportThumb} />
            ) : (
              <View style={[styles.reportThumb, styles.placeholderThumb]}>
                <Share2 color={C.accent} size={18} />
              </View>
            )}

            <View style={styles.headerInfo}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {report?.barangay
                    ? `Brgy. ${report.barangay.replace(/^(Barangay|Brgy\.?)\s*/i, "")}`
                    : report?.locationName || "Surveillance Alert"}
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
                    {report?.status || "ACTIVE"}
                  </Text>
                </View>
              </View>
              <Text style={styles.headerSub} numberOfLines={1}>
                {report?.locationName || "Vector surveillance alert"}
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

          {/* Share Options */}
          <View style={styles.optionsList}>
            {/* Option 1: Full Report with AI Details */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.75}
              onPress={handleShareText}
            >
              <View
                style={[
                  styles.optionIconBg,
                  { backgroundColor: C.accentGlow, borderColor: C.accent + "40" },
                ]}
              >
                <FileText color={C.accent} size={20} strokeWidth={2.2} />
              </View>
              <View style={styles.optionBody}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>
                    Share Full Alert & Diagnostics
                  </Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                  </View>
                </View>
                <Text style={styles.optionDesc}>
                  Sends complete AI findings, threat severity, GPS location,
                  and recommended preventative actions via WhatsApp, Messenger,
                  or SMS.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Field Photo Evidence */}
            {imageSource ? (
              <TouchableOpacity
                style={styles.optionCard}
                activeOpacity={0.75}
                onPress={handleShareImage}
              >
                <View
                  style={[
                    styles.optionIconBg,
                    {
                      backgroundColor: C.safeGlow,
                      borderColor: C.safe + "40",
                    },
                  ]}
                >
                  <ImageIcon color={C.safe} size={20} strokeWidth={2.2} />
                </View>
                <View style={styles.optionBody}>
                  <Text style={styles.optionTitle}>
                    Share Field Photo Evidence
                  </Text>
                  <Text style={styles.optionDesc}>
                    Sends the high-resolution photo snapshot to Instagram
                    Stories, media groups, or chats.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      </View>
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
      paddingBottom: Platform.OS === "ios" ? 36 : 24,
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
      fontWeight: "500",
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
      marginBottom: 16,
    },
    optionsList: {
      paddingHorizontal: 16,
      gap: 12,
    },
    optionCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
      backgroundColor: C.surfaceRaised,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    optionIconBg: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    optionBody: {
      flex: 1,
      gap: 4,
    },
    optionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: C.text,
    },
    recommendedBadge: {
      backgroundColor: C.accentGlow,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: C.accent + "30",
    },
    recommendedBadgeText: {
      fontSize: 8,
      fontWeight: "800",
      color: C.accent,
      letterSpacing: 0.8,
    },
    optionDesc: {
      fontSize: 12,
      color: C.textSub,
      lineHeight: 17,
    },
  });

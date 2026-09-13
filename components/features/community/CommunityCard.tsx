import {
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Share2,
  ThumbsUp,
} from "lucide-react-native";
import React, { useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";

const { width } = Dimensions.get("window");

const badgeCfg = (status: string, C: ThemeColors) => {
  if (status === "CRITICAL")
    return { color: C.danger, glow: C.dangerGlow, mid: C.danger + "40" };
  if (status === "LOW RISK" || status === "VERIFIED")
    return { color: C.safe, glow: C.safeGlow, mid: C.safe + "40" };
  return { color: C.warn, glow: C.warnGlow, mid: C.warn + "40" };
};

const SocialBtn = ({
  icon: Icon,
  label,
  color,
  activeColor,
  isActive,
  onPress,
}: {
  icon: any;
  label: string;
  color: string;
  activeColor?: string;
  isActive?: boolean;
  onPress?: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.82,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 90,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) onPress();
  };

  const finalColor = isActive ? activeColor || color : color;

  return (
    <TouchableOpacity
      style={[
        sb.btn,
        isActive && {
          backgroundColor: finalColor + "18",
        },
      ]}
      activeOpacity={0.65}
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Icon
          color={finalColor}
          size={14}
          strokeWidth={isActive ? 2.5 : 2}
          fill={isActive ? finalColor : "transparent"}
        />
        <Text
          style={[
            sb.text,
            { color: finalColor, fontWeight: isActive ? "800" : "600" },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};
const sb = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});

export default function PostCard({
  image,
  userName,
  userAvatar,
  location,
  timestamp,
  status,
  isFullWidth,
  onPress,
  onHelpfulPress,
  isHelpful,
  helpfulCount = 0,
  onCommentPress,
  commentCount = 0,
  onSharePress,
}: any) {
  const { colors: C } = useTheme();
  const cardWidth = isFullWidth ? width - 32 : (width - 52) / 2;
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      tension: 140,
      friction: 12,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 140,
      friction: 12,
    }).start();

  const imgSrc = typeof image === "string" ? { uri: image } : image;
  const avatarSrc =
    typeof userAvatar === "string" ? { uri: userAvatar } : userAvatar;
  const badge = badgeCfg(status, C);
  const styles = useMemo(() => createStyles(C), [C]);

  const helpfulLabel =
    helpfulCount > 0
      ? `${helpfulCount} Helpful`
      : "Helpful";

  const commentLabel =
    commentCount > 0
      ? `${commentCount} ${commentCount === 1 ? "Comment" : "Comments"}`
      : "Comment";

  return (
    <Animated.View
      style={[styles.card, { width: cardWidth, transform: [{ scale }] }]}
    >
      {/* ── CARD BODY (Tapping this area opens the report) ── */}
      <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        {/* IMAGE — clean, no text overlay */}
        <View style={styles.imgWrap}>
          <Image source={imgSrc} style={styles.img} resizeMode="cover" />

          {/* Status pill — top left */}
          <View
            style={[
              styles.pill,
              { backgroundColor: C.surface + "E6", borderColor: badge.mid },
            ]}
          >
            <View
              style={[
                styles.pillDot,
                { backgroundColor: badge.color, shadowColor: badge.color },
              ]}
            />
            <Text style={[styles.pillText, { color: badge.color }]}>
              {status}
            </Text>
          </View>

          {/* Timestamp — top right */}
          <View style={styles.tsChip}>
            <Clock color={C.textSub} size={9} strokeWidth={2.5} />
            <Text style={styles.tsText}>{timestamp}</Text>
          </View>
        </View>

        {/* META ROW — avatar + name + location + view cta */}
        <View style={styles.meta}>
          <Image source={avatarSrc} style={styles.avatar} />
          <View style={styles.metaBody}>
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
            <View style={styles.locRow}>
              <MapPin color={C.accent} size={9} strokeWidth={2.5} />
              <Text style={styles.locText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onPress}
            style={styles.viewBtn}
            activeOpacity={0.8}
          >
            <ExternalLink color="#FFFFFF" size={12} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </Pressable>

      {/* ── SOCIAL BAR (Independent from report tap area — avoids misclicks) ── */}
      <View style={styles.socialBar}>
        <SocialBtn
          icon={ThumbsUp}
          label={helpfulLabel}
          color={C.textSub}
          activeColor={C.accent}
          isActive={isHelpful}
          onPress={onHelpfulPress}
        />
        <View style={styles.dot} />
        <SocialBtn
          icon={MessageCircle}
          label={commentLabel}
          color={C.textSub}
          activeColor={C.safe}
          isActive={commentCount > 0}
          onPress={onCommentPress}
        />
        <View style={styles.dot} />
        <SocialBtn
          icon={Share2}
          label="Share"
          color={C.textSub}
          onPress={onSharePress}
        />
      </View>
    </Animated.View>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      marginBottom: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: C.border,
    },

    imgWrap: {
      width: "100%",
      height: 200,
      backgroundColor: C.surfaceRaised,
      position: "relative",
    },
    img: { width: "100%", height: "100%" },

    pill: {
      position: "absolute",
      top: 10,
      left: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: 7,
      borderWidth: 1,
    },
    pillDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.85,
      shadowRadius: 4,
      elevation: 4,
    },
    pillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.9 },

    tsChip: {
      position: "absolute",
      top: 10,
      right: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: C.surface + "E6",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.border,
    },
    tsText: { fontSize: 10, color: C.textSub, fontWeight: "600" },

    meta: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 9,
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.borderBright,
    },
    metaBody: { flex: 1, gap: 4 },
    userName: { fontSize: 13, fontWeight: "800", color: C.text },
    locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    locText: { fontSize: 10, color: C.textSub, fontWeight: "500", flex: 1 },

    viewBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: C.accent,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 5,
    },

    socialBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingVertical: 11,
      backgroundColor: C.surfaceRaised,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: C.borderBright,
    },
  });

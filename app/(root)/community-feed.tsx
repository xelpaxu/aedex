import PostCard from "@/components/features/community/CommunityCard";
import CommunityCommentsModal, {
  CommentItem,
} from "@/components/features/community/CommunityCommentsModal";
import CommunityShareModal from "@/components/features/community/CommunityShareModal";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ArrowLeft, Globe, MapPin, Zap } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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

const STORAGE_KEY_HELPFUL = "@aedex_helpful_reactions_v1";
const STORAGE_KEY_COMMENTS = "@aedex_community_comments_v1";

const normalizeImageUri = (uri?: string) => {
  if (!uri) return "";
  if (uri.startsWith("data:") || uri.startsWith("http")) return uri;
  return `data:image/jpeg;base64,${uri}`;
};

// ─── Skeleton card for loading state ─────────────────────────────────────────
const SkeletonCard = ({
  delay = 0,
  C,
}: {
  delay?: number;
  C: ThemeColors;
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  return (
    <Animated.View
      style={[
        sk.card,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
          opacity,
        },
      ]}
    >
      <View style={[sk.image, { backgroundColor: C.border }]} />
      <View style={sk.body}>
        <View style={sk.row}>
          <View style={[sk.avatar, { backgroundColor: C.border }]} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[sk.lineShort, { backgroundColor: C.border }]} />
            <View style={[sk.lineLong, { backgroundColor: C.border }]} />
          </View>
        </View>
        <View
          style={[sk.lineLong, { backgroundColor: C.border, marginTop: 12, width: "60%" }]}
        />
      </View>
    </Animated.View>
  );
};
const sk = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  image: { width: "100%", height: 180 },
  body: { padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  lineShort: {
    height: 10,
    width: "40%",
    borderRadius: 4,
  },
  lineLong: {
    height: 10,
    width: "80%",
    borderRadius: 4,
  },
});

// ─── List header component ────────────────────────────────────────────────────
const ListHeader = ({
  count,
  barangay,
  C,
}: {
  count: number;
  barangay?: string;
  C: ThemeColors;
}) => (
  <View style={lh.wrap}>
    <View style={lh.left}>
      <Text style={[lh.title, { color: C.text }]}>Community Reports</Text>
      {barangay && barangay !== "All" && (
        <View style={lh.barangayRow}>
          <MapPin color={C.safe} size={12} />
          <Text style={[lh.barangayText, { color: C.safe }]}>{barangay}</Text>
        </View>
      )}
    </View>
    <View
      style={[
        lh.countBox,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
        },
      ]}
    >
      <Text style={[lh.countNum, { color: C.accent }]}>{count}</Text>
      <Text style={[lh.countLabel, { color: C.textSub }]}>Posts</Text>
    </View>
  </View>
);
const lh = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  left: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  countBox: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 16,
  },
  countNum: { fontSize: 22, fontWeight: "700" },
  countLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  barangayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  barangayText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

// ─── Separator ────────────────────────────────────────────────────────────────
const Separator = () => <View style={{ height: 10 }} />;

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ C }: { C: ThemeColors }) => (
  <View style={es.wrap}>
    <View
      style={[
        es.iconBg,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
        },
      ]}
    >
      <Globe color={C.textDim} size={28} strokeWidth={1.5} />
    </View>
    <Text style={[es.title, { color: C.text }]}>No Reports Yet</Text>
    <Text style={[es.sub, { color: C.textSub }]}>
      Community reports will appear here once submitted.
    </Text>
  </View>
);
const es = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CommunityFeedScreen() {
  const router = useRouter();
  const { colors: C, isDark } = useTheme();
  const allReports = useQuery(api.reports.getAllReports);
  const currentUser = useQuery(api.users.getMe);

  // Reactions & Comments state
  const [helpfulState, setHelpfulState] = useState<
    Record<string, { count: number; isHelpful: boolean }>
  >({});
  const [commentsState, setCommentsState] = useState<
    Record<string, CommentItem[]>
  >({});
  const [activeCommentReport, setActiveCommentReport] = useState<any | null>(
    null,
  );
  const [activeShareReport, setActiveShareReport] = useState<any | null>(null);

  // Load saved reactions & comments from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const [savedHelpful, savedComments] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_HELPFUL),
          AsyncStorage.getItem(STORAGE_KEY_COMMENTS),
        ]);
        if (savedHelpful) setHelpfulState(JSON.parse(savedHelpful));
        if (savedComments) setCommentsState(JSON.parse(savedComments));
      } catch (err) {
        console.warn("Could not load local community reactions:", err);
      }
    })();
  }, []);

  // Toggle Helpful reaction
  const handleHelpfulPress = async (reportId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { }

    setHelpfulState((prev) => {
      const current = prev[reportId] || { count: 0, isHelpful: false };
      const nextIsHelpful = !current.isHelpful;
      const nextCount = nextIsHelpful
        ? current.count + 1
        : Math.max(0, current.count - 1);
      const updated = {
        ...prev,
        [reportId]: {
          count: nextCount,
          isHelpful: nextIsHelpful,
        },
      };
      AsyncStorage.setItem(
        STORAGE_KEY_HELPFUL,
        JSON.stringify(updated),
      ).catch(() => { });
      return updated;
    });
  };

  const { user: clerkUser } = useUser();

  // Add Comment
  const handleAddComment = (
    reportId: string,
    text: string,
    profile?: {
      userName?: string;
      userAvatar?: string;
      userRole?: string;
      userBarangay?: string;
    },
  ) => {
    const authorName =
      profile?.userName ||
      currentUser?.name ||
      clerkUser?.fullName ||
      clerkUser?.firstName ||
      clerkUser?.username ||
      "Citizen";

    const authorAvatar =
      profile?.userAvatar ||
      clerkUser?.imageUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        authorName,
      )}&background=1a2240&color=4F8EF7&bold=true`;

    const newComment: CommentItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reportId,
      userName: authorName,
      userAvatar: authorAvatar,
      userRole: profile?.userRole || currentUser?.role,
      userBarangay: profile?.userBarangay || currentUser?.barangay,
      text,
      timestamp: Date.now(),
    };

    setCommentsState((prev) => {
      const list = prev[reportId] || [];
      const updated = {
        ...prev,
        [reportId]: [...list, newComment],
      };
      AsyncStorage.setItem(
        STORAGE_KEY_COMMENTS,
        JSON.stringify(updated),
      ).catch(() => { });
      return updated;
    });
  };

  // Share report
  const handleSharePress = (report: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
    setActiveShareReport(report);
  };

  // Fade in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const communityReports = useMemo(() => {
    if (!allReports) return [];
    return [...allReports].sort(
      (a: any, b: any) => (b._creationTime || 0) - (a._creationTime || 0),
    );
  }, [allReports]);

  const userBarangay = currentUser?.barangay ?? "All";
  const isLoading = allReports === undefined;
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

          <Text style={styles.navTitle}>Community</Text>
        </View>

        <View style={styles.navBadge}>
          <Zap color={C.accent} size={10} />
          <Text style={styles.navBadgeText}>Live</Text>
        </View>
      </View>

      {/* ── LOADING ── */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          {[0, 150, 300].map((delay) => (
            <SkeletonCard key={delay} delay={delay} C={C} />
          ))}
        </View>
      ) : (
        <FlatList
          data={communityReports}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <ListHeader
              count={communityReports?.length ?? 0}
              barangay={userBarangay}
              C={C}
            />
          }
          ListEmptyComponent={<EmptyState C={C} />}
          renderItem={({ item }) => {
            const date = new Date(item._creationTime).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
              },
            );

            const imageUri = normalizeImageUri(
              item.processedImage || item.imageUri || (item as any).image,
            );
            const authorName = item.userName || "Community Member";
            const locationDisplay = item.barangay
              ? `Brgy. ${item.barangay.replace(/^(Barangay|Brgy\.?)\s*/i, "")}`
              : item.locationName || "Iloilo City";

            const helpfulInfo = helpfulState[item._id] || {
              count: 0,
              isHelpful: false,
            };
            const commentsList = commentsState[item._id] || [];

            return (
              <View style={styles.cardWrap}>
                <PostCard
                  image={imageUri}
                  userName={authorName}
                  location={locationDisplay}
                  timestamp={date}
                  status={
                    item.status || (item.verified ? "CRITICAL" : "LOW RISK")
                  }
                  userAvatar={`https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=1a2240&color=4F8EF7&bold=true`}
                  isFullWidth
                  onPress={() =>
                    router.push({
                      pathname: "/results",
                      params: { reportId: item._id },
                    })
                  }
                  isHelpful={helpfulInfo.isHelpful}
                  helpfulCount={helpfulInfo.count}
                  onHelpfulPress={() => handleHelpfulPress(item._id)}
                  commentCount={commentsList.length}
                  onCommentPress={() => setActiveCommentReport(item)}
                  onSharePress={() => handleSharePress(item)}
                />
              </View>
            );
          }}
        />
      )}

      {/* ── COMMENTS MODAL ── */}
      <CommunityCommentsModal
        visible={!!activeCommentReport}
        onClose={() => setActiveCommentReport(null)}
        report={activeCommentReport}
        comments={
          activeCommentReport ? commentsState[activeCommentReport._id] || [] : []
        }
        onAddComment={handleAddComment}
        currentUser={currentUser}
      />

      {/* ── SHARE MODAL ── */}
      <CommunityShareModal
        visible={!!activeShareReport}
        onClose={() => setActiveShareReport(null)}
        report={activeShareReport}
      />
    </Animated.View>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },

    // Nav
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
    navBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: C.accentGlow,
      borderWidth: 1,
      borderColor: C.accent + "30",
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    navBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.accent,
    },

    // Content
    listContent: { paddingBottom: 100 },
    cardWrap: { paddingHorizontal: 16 },

    // Loading
    loadingWrap: { paddingTop: 20 },
  });
